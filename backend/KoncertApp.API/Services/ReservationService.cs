using KoncertApp.API.Data;
using KoncertApp.API.DTOs;
using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Services;

public class ReservationService : IReservationService
{
    private readonly AppDbContext _context;
    private readonly IPricingService _pricing;

    public ReservationService(AppDbContext context, IPricingService pricing)
    {
        _context = context;
        _pricing = pricing;
    }

    public async Task<ReservationResponseDto> CreateAsync(CreateReservationDto dto)
    {
        // 1. Zona mora da postoji
        var zone = await _context.Zones
            .Include(z => z.Concert)
            .FirstOrDefaultAsync(z => z.Id == dto.ZoneId)
            ?? throw new InvalidOperationException("Zona nije pronađena.");

        // 2. Provjera slobodnih mesta
        int occupied = await _context.Reservations
            .Where(r => r.ZoneId == dto.ZoneId && r.Status == ReservationStatus.Active)
            .SumAsync(r => (int?)r.TicketCount) ?? 0;

        int available = zone.Capacity - occupied;
        if (available < dto.TicketCount)
            throw new InvalidOperationException(
                $"Nema dovoljno slobodnih mesta u zoni '{zone.Name}'. Dostupno: {available}.");

        // 3. Validacija promo koda (opcionalno)
        PromoCode? usedPromo = null;
        if (!string.IsNullOrWhiteSpace(dto.PromoCode))
        {
            usedPromo = await _context.PromoCodes
                .FirstOrDefaultAsync(p => p.Code == dto.PromoCode && p.Status == PromoCodeStatus.Active)
                ?? throw new InvalidOperationException("Promo kod nije validan ili je već iskorišćen.");
        }

        // 4. Obračun cene
        bool isEarlyBird = DateTime.UtcNow <= zone.Concert.EarlyBirdDeadline;
        decimal total = _pricing.CalculateTotal(zone.PricePerTicket, dto.TicketCount, isEarlyBird, usedPromo is not null);

        // 5. Kreiranje rezervacije i promo koda u transakciji
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var reservation = new Reservation
            {
                ZoneId       = dto.ZoneId,
                Status       = ReservationStatus.Active,
                Token        = Guid.NewGuid().ToString("N"),
                TicketCount  = dto.TicketCount,
                TotalPrice   = total,
                IsEarlyBird  = isEarlyBird,
                CreatedAt    = DateTime.UtcNow,
                FirstName    = dto.FirstName,
                LastName     = dto.LastName,
                Company      = dto.Company,
                Address1     = dto.Address1,
                Address2     = dto.Address2,
                PostalCode   = dto.PostalCode,
                City         = dto.City,
                Country      = dto.Country,
                Email        = dto.Email
            };

            _context.Reservations.Add(reservation);
            await _context.SaveChangesAsync();

            // Generiši promo kod za ovu rezervaciju
            var ownedPromo = new PromoCode
            {
                Code                = GeneratePromoCode(),
                Status              = PromoCodeStatus.Active,
                OwnerReservationId  = reservation.Id
            };
            _context.PromoCodes.Add(ownedPromo);

            // Označi iskorišćeni promo kod
            if (usedPromo is not null)
            {
                usedPromo.Status              = PromoCodeStatus.Used;
                usedPromo.UsedByReservationId = reservation.Id;
                reservation.UsedPromoCodeId   = usedPromo.Id;
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapToResponse(reservation, zone.Name, ownedPromo.Code);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ReservationResponseDto> GetByTokenAsync(string email, string token)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Zone)
            .Include(r => r.OwnedPromoCode)
            .FirstOrDefaultAsync(r =>
                r.Token == token &&
                r.Email == email &&
                r.Status == ReservationStatus.Active)
            ?? throw new InvalidOperationException("Rezervacija nije pronađena ili je otkazana.");

        return MapToResponse(reservation, reservation.Zone.Name, reservation.OwnedPromoCode?.Code ?? string.Empty);
    }

    public async Task<ReservationResponseDto> UpdateAsync(UpdateReservationDto dto)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Zone)
                .ThenInclude(z => z.Concert)
            .Include(r => r.OwnedPromoCode)
            .FirstOrDefaultAsync(r =>
                r.Token == dto.Token &&
                r.Email == dto.Email &&
                r.Status == ReservationStatus.Active)
            ?? throw new InvalidOperationException("Rezervacija nije pronađena ili je otkazana.");

        // Provjera kapaciteta (isključi tekuću rezervaciju iz zbira)
        int occupied = await _context.Reservations
            .Where(r => r.ZoneId == reservation.ZoneId &&
                        r.Status == ReservationStatus.Active &&
                        r.Id != reservation.Id)
            .SumAsync(r => (int?)r.TicketCount) ?? 0;

        int available = reservation.Zone.Capacity - occupied;
        if (available < dto.TicketCount)
            throw new InvalidOperationException(
                $"Nema dovoljno slobodnih mesta. Dostupno: {available}.");

        // Ponovi obračun cene sa novim brojem karata
        bool isEarlyBird = DateTime.UtcNow <= reservation.Zone.Concert.EarlyBirdDeadline;
        bool hasPromo    = reservation.UsedPromoCodeId.HasValue;
        decimal total    = _pricing.CalculateTotal(reservation.Zone.PricePerTicket, dto.TicketCount, isEarlyBird, hasPromo);

        reservation.TicketCount = dto.TicketCount;
        reservation.TotalPrice  = total;
        reservation.IsEarlyBird = isEarlyBird;

        await _context.SaveChangesAsync();

        return MapToResponse(reservation, reservation.Zone.Name, reservation.OwnedPromoCode?.Code ?? string.Empty);
    }

    public async Task CancelAsync(CancelReservationDto dto)
    {
        var reservation = await _context.Reservations
            .Include(r => r.OwnedPromoCode)
            .FirstOrDefaultAsync(r =>
                r.Token == dto.Token &&
                r.Email == dto.Email &&
                r.Status == ReservationStatus.Active)
            ?? throw new InvalidOperationException("Rezervacija nije pronađena ili je već otkazana.");

        reservation.Status = ReservationStatus.Cancelled;

        // Promo kod ove rezervacije postaje Cancelled (ako još nije iskorišćen)
        if (reservation.OwnedPromoCode?.Status == PromoCodeStatus.Active)
            reservation.OwnedPromoCode.Status = PromoCodeStatus.Cancelled;

        await _context.SaveChangesAsync();
    }

    // Generiše 8-karakterni uppercase promo kod
    private static string GeneratePromoCode()
        => Guid.NewGuid().ToString("N")[..8].ToUpper();

    private static ReservationResponseDto MapToResponse(Reservation r, string zoneName, string promoCode)
        => new()
        {
            Id                  = r.Id,
            Token               = r.Token,
            Status              = r.Status.ToString(),
            ZoneId              = r.ZoneId,
            ZoneName            = zoneName,
            TicketCount         = r.TicketCount,
            TotalPrice          = r.TotalPrice,
            IsEarlyBird         = r.IsEarlyBird,
            GeneratedPromoCode  = promoCode,
            CreatedAt           = r.CreatedAt,
            FirstName           = r.FirstName,
            LastName            = r.LastName,
            Email               = r.Email,
            Company             = r.Company,
            Address1            = r.Address1,
            Address2            = r.Address2,
            PostalCode          = r.PostalCode,
            City                = r.City,
            Country             = r.Country
        };
}

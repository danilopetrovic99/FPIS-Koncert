using KoncertApp.API.Data;
using KoncertApp.API.DTOs;
using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Services;

public class ConcertService : IConcertService
{
    private readonly AppDbContext _context;

    public ConcertService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ConcertInfoDto?> GetConcertInfoAsync()
    {
        var concert = await _context.Concerts
            .Include(c => c.Zones)
            .FirstOrDefaultAsync();

        if (concert is null) return null;

        var zoneIds = concert.Zones.Select(z => z.Id).ToList();
        var occupiedByZone = await _context.Reservations
            .Where(r => zoneIds.Contains(r.ZoneId) && r.Status == ReservationStatus.Active)
            .GroupBy(r => r.ZoneId)
            .Select(g => new { ZoneId = g.Key, Occupied = g.Sum(r => r.TicketCount) })
            .ToDictionaryAsync(x => x.ZoneId, x => x.Occupied);

        return new ConcertInfoDto
        {
            Id = concert.Id,
            Name = concert.Name,
            City = concert.City,
            Location = concert.Location,
            ConcertDates = concert.ConcertDates,
            AdditionalInfo = concert.AdditionalInfo,
            EarlyBirdDeadline = concert.EarlyBirdDeadline,
            IsEarlyBirdActive = DateTime.UtcNow <= concert.EarlyBirdDeadline,
            Zones = concert.Zones.Select(z => new ZoneInfoDto
            {
                Id = z.Id,
                Name = z.Name,
                Capacity = z.Capacity,
                PricePerTicket = z.PricePerTicket,
                AvailableSeats = z.Capacity - occupiedByZone.GetValueOrDefault(z.Id, 0)
            }).ToList()
        };
    }
}

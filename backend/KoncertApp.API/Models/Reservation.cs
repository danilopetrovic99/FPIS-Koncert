namespace KoncertApp.API.Models;

public class Reservation
{
    public int Id { get; set; }
    public int ZoneId { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Active;
    public string Token { get; set; } = string.Empty;
    public int TicketCount { get; set; }
    public decimal TotalPrice { get; set; }
    public bool IsEarlyBird { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int? UsedPromoCodeId { get; set; }

    public Zone Zone { get; set; } = null!;
    public PromoCode? UsedPromoCode { get; set; }

    public PromoCode? OwnedPromoCode { get; set; }
}

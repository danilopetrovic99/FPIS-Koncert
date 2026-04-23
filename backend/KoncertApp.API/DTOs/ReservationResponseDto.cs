namespace KoncertApp.API.DTOs;

public class ReservationResponseDto
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public int TicketCount { get; set; }
    public decimal TotalPrice { get; set; }
    public bool IsEarlyBird { get; set; }
    public string GeneratedPromoCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Podaci kupca
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

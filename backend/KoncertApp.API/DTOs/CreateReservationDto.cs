using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class CreateReservationDto
{
    [Required]
    public int ZoneId { get; set; }

    [Required, Range(1, 50)]
    public int TicketCount { get; set; }

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Company { get; set; }

    [Required, MaxLength(200)]
    public string Address1 { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Address2 { get; set; }

    [Required, MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    public string? PromoCode { get; set; }
}

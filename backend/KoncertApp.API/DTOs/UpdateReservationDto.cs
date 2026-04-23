using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class UpdateReservationDto
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, Range(1, 50)]
    public int TicketCount { get; set; }
}

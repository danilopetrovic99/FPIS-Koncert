using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class CancelReservationDto
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

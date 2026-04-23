namespace KoncertApp.API.DTOs;

public class ZoneInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int AvailableSeats { get; set; }
    public decimal PricePerTicket { get; set; }
}

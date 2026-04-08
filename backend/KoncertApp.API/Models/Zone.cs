namespace KoncertApp.API.Models;

public class Zone
{
    public int Id { get; set; }
    public int ConcertId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public decimal PricePerTicket { get; set; }

    public Concert Concert { get; set; } = null!;
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}

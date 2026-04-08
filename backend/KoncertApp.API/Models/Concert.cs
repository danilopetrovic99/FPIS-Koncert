namespace KoncertApp.API.Models;

public class Concert
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ConcertDates { get; set; } = string.Empty;
    public string? AdditionalInfo { get; set; }
    public DateTime EarlyBirdDeadline { get; set; }

    public ICollection<Zone> Zones { get; set; } = new List<Zone>();
}

namespace KoncertApp.API.DTOs;

public class ConcertInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ConcertDates { get; set; } = string.Empty;
    public string? AdditionalInfo { get; set; }
    public DateTime EarlyBirdDeadline { get; set; }
    public bool IsEarlyBirdActive { get; set; }
    public List<ZoneInfoDto> Zones { get; set; } = new();
}

namespace KoncertApp.API.Models;

public class PromoCode
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public PromoCodeStatus Status { get; set; } = PromoCodeStatus.Active;

    public int OwnerReservationId { get; set; }

    public int? UsedByReservationId { get; set; }

    public Reservation OwnerReservation { get; set; } = null!;
    public Reservation? UsedByReservation { get; set; }
}

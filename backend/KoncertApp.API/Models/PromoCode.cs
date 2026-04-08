namespace KoncertApp.API.Models;

public class PromoCode
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public PromoCodeStatus Status { get; set; } = PromoCodeStatus.Active;

    // Which reservation generated this promo code
    public int OwnerReservationId { get; set; }

    // Which reservation used this promo code (null if not yet used)
    public int? UsedByReservationId { get; set; }

    public Reservation OwnerReservation { get; set; } = null!;
    public Reservation? UsedByReservation { get; set; }
}

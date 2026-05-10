namespace KoncertApp.API.Services;

public interface IPricingService
{
    decimal CalculateTotal(decimal basePrice, int ticketCount, bool isEarlyBird, bool hasPromoCode);
}

namespace KoncertApp.API.Services;

public interface IPricingService
{
    /// <summary>
    /// Obračunava ukupnu cenu rezervacije po sledećem redosledu:
    /// 1. Early bird -10% na baznu cenu karte
    /// 2. Svaka 5. karta u zoni -50% (od već snižene cene)
    /// 3. Promo kod -5% na ukupan zbir
    /// </summary>
    decimal CalculateTotal(decimal basePrice, int ticketCount, bool isEarlyBird, bool hasPromoCode);
}

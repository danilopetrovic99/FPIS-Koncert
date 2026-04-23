namespace KoncertApp.API.Services;

public class PricingService : IPricingService
{
    private const decimal EarlyBirdDiscount   = 0.10m; // -10%
    private const decimal FifthTicketDiscount = 0.50m; // -50%
    private const decimal PromoDiscount       = 0.05m; // -5%

    public decimal CalculateTotal(decimal basePrice, int ticketCount, bool isEarlyBird, bool hasPromoCode)
    {
        // Korak 1: early bird na jediničnu cenu
        decimal unitPrice = isEarlyBird
            ? basePrice * (1 - EarlyBirdDiscount)
            : basePrice;

        // Korak 2: zbir svih karata, svaka 5. dobija -50% od već snižene cene
        decimal total = ApplyFifthTicketDiscount(unitPrice, ticketCount);

        // Korak 3: promo kod -5% na ukupan zbir
        if (hasPromoCode)
            total *= (1 - PromoDiscount);

        return Math.Round(total, 2);
    }

    private static decimal ApplyFifthTicketDiscount(decimal unitPrice, int count)
    {
        decimal total = 0;
        for (int i = 1; i <= count; i++)
            total += (i % 5 == 0) ? unitPrice * (1 - FifthTicketDiscount) : unitPrice;
        return total;
    }
}

namespace KoncertApp.API.Services;

public class PricingService : IPricingService
{
    private const decimal EarlyBirdDiscount = 0.10m;
    private const decimal FifthTicketDiscount = 0.50m;
    private const decimal PromoDiscount = 0.05m;

    public decimal CalculateTotal(decimal basePrice, int ticketCount, bool isEarlyBird, bool hasPromoCode)
    {
        decimal unitPrice = isEarlyBird
            ? basePrice * (1 - EarlyBirdDiscount)
            : basePrice;

        decimal total = ApplyFifthTicketDiscount(unitPrice, ticketCount);

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

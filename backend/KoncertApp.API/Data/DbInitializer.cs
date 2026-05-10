using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

        if (await context.Concerts.AnyAsync())
            return;

        var concert = new Concert
        {
            Name = "Eros Ramazzotti – Battito Infinito World Tour",
            City = "Beograd",
            Location = "Štark Arena",
            ConcertDates = "12. jul 2026.",
            AdditionalInfo =
                "Jedinstveno muzičko iskustvo italijanskog maestra uživo. " +
                "Ulaz od 19:00, početak koncerta u 21:00. " +
                "Parking dostupan u okviru kompleksa.",
            EarlyBirdDeadline = DateTime.UtcNow.AddDays(30),
            Zones = new List<Zone>
            {
                new() { Name = "VIP Parter", Capacity = 200, PricePerTicket = 12000m },
                new() { Name = "Parter", Capacity = 800, PricePerTicket = 7500m },
                new() { Name = "Tribina Istok", Capacity = 1200, PricePerTicket = 5500m },
                new() { Name = "Tribina Zapad", Capacity = 1200, PricePerTicket = 5500m },
                new() { Name = "Balkon", Capacity = 1500, PricePerTicket = 3900m }
            }
        };

        context.Concerts.Add(concert);
        await context.SaveChangesAsync();
    }
}

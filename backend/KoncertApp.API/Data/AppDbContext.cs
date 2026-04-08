using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Concert> Concerts => Set<Concert>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<PromoCode> PromoCodes => Set<PromoCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Zone → Concert
        modelBuilder.Entity<Zone>()
            .HasOne(z => z.Concert)
            .WithMany(c => c.Zones)
            .HasForeignKey(z => z.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        // Reservation → Zone
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Zone)
            .WithMany(z => z.Reservations)
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        // Reservation → PromoCode used (nullable)
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.UsedPromoCode)
            .WithOne(p => p.UsedByReservation)
            .HasForeignKey<PromoCode>(p => p.UsedByReservationId)
            .OnDelete(DeleteBehavior.NoAction);

        // PromoCode → OwnerReservation
        modelBuilder.Entity<PromoCode>()
            .HasOne(p => p.OwnerReservation)
            .WithOne(r => r.OwnedPromoCode)
            .HasForeignKey<PromoCode>(p => p.OwnerReservationId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique constraints
        modelBuilder.Entity<Reservation>()
            .HasIndex(r => r.Token)
            .IsUnique();

        modelBuilder.Entity<PromoCode>()
            .HasIndex(p => p.Code)
            .IsUnique();

        // Store enums as strings for readability in DB
        modelBuilder.Entity<Reservation>()
            .Property(r => r.Status)
            .HasConversion<string>();

        modelBuilder.Entity<PromoCode>()
            .Property(p => p.Status)
            .HasConversion<string>();

        // Decimal precision
        modelBuilder.Entity<Zone>()
            .Property(z => z.PricePerTicket)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Reservation>()
            .Property(r => r.TotalPrice)
            .HasPrecision(10, 2);
    }
}

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
        modelBuilder.Entity<Zone>()
            .HasOne(z => z.Concert)
            .WithMany(c => c.Zones)
            .HasForeignKey(z => z.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Zone)
            .WithMany(z => z.Reservations)
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.UsedPromoCode)
            .WithOne(p => p.UsedByReservation)
            .HasForeignKey<PromoCode>(p => p.UsedByReservationId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<PromoCode>()
            .HasOne(p => p.OwnerReservation)
            .WithOne(r => r.OwnedPromoCode)
            .HasForeignKey<PromoCode>(p => p.OwnerReservationId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Reservation>()
            .HasIndex(r => r.Token)
            .IsUnique();

        modelBuilder.Entity<PromoCode>()
            .HasIndex(p => p.Code)
            .IsUnique();

        modelBuilder.Entity<Reservation>()
            .Property(r => r.Status)
            .HasConversion<string>();

        modelBuilder.Entity<PromoCode>()
            .Property(p => p.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Zone>()
            .Property(z => z.PricePerTicket)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Reservation>()
            .Property(r => r.TotalPrice)
            .HasPrecision(10, 2);
    }
}

# KoncertApp — Tehnička dokumentacija za odbranu

> Sve što treba znati o tome kako je aplikacija napravljena, od baze do browsera.

---

## Sadržaj

1. [Arhitektura sistema](#1-arhitektura-sistema)
2. [Tech stack](#2-tech-stack)
3. [Baza podataka i modeli](#3-baza-podataka-i-modeli)
4. [Backend — .NET Web API](#4-backend--net-web-api)
5. [Poslovna logika — obračun cene](#5-poslovna-logika--obračun-cene)
6. [Frontend — React + TypeScript](#6-frontend--react--typescript)
7. [Tok podataka end-to-end](#7-tok-podataka-end-to-end)
8. [Pokretanje aplikacije](#8-pokretanje-aplikacije)
9. [Pitanja koja mogu da se pojave na odbrani](#9-pitanja-koja-mogu-da-se-pojave-na-odbrani)

---

## 1. Arhitektura sistema

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│         React SPA  (localhost:5173)                 │
│                                                     │
│   Home  →  Book  →  Confirmation  →  MyReservation  │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP / JSON (axios)
                       │  CORS dozvoljen samo za :5173
                       ▼
┌─────────────────────────────────────────────────────┐
│              .NET Web API (localhost:5225)           │
│                                                     │
│  ConcertController   ReservationController          │
│       │                     │                       │
│  ConcertService         ReservationService          │
│                              │                      │
│                         PricingService              │
│                              │                      │
│                         AppDbContext (EF Core)       │
└──────────────────────┬──────────────────────────────┘
                       │  Npgsql / PostgreSQL driver
                       ▼
┌─────────────────────────────────────────────────────┐
│           PostgreSQL  (localhost:5433)               │
│              Docker container                       │
│                                                     │
│   Concerts  Zones  Reservations  PromoCodes         │
└─────────────────────────────────────────────────────┘
```

**Tri sloja:**
- **Frontend** — React SPA, komunicira samo putem HTTP poziva ka API-ju
- **Backend** — .NET 8 Web API, sadrži svu poslovnu logiku
- **Baza** — PostgreSQL u Docker kontejneru, pristupa joj samo backend

---

## 2. Tech stack

### Backend
| Tehnologija | Verzija | Zašto |
|---|---|---|
| .NET | 8 | Stabilan LTS release |
| ASP.NET Core Web API | 8 | REST API framework |
| Entity Framework Core | 8 | ORM — mapiranje C# klasa u SQL tabele |
| Npgsql | — | PostgreSQL driver za EF Core |
| PostgreSQL | 16 | Relaciona baza podataka |
| Docker | — | Izolovano pokretanje baze |

### Frontend
| Tehnologija | Verzija | Zašto |
|---|---|---|
| React | 19 | UI library, komponentni pristup |
| TypeScript | 5.9 | Tip-safe JavaScript |
| Vite | 8 | Build tool, dev server sa HMR |
| React Router DOM | 7 | Client-side routing (SPA) |
| Axios | 1.14 | HTTP klijent za API pozive |

---

## 3. Baza podataka i modeli

### 3.1 Kako se baza pokreće

PostgreSQL radi u Docker kontejneru, definisan u `backend/docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    container_name: koncertapp-db
    environment:
      POSTGRES_DB: koncertapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: admin123
    ports:
      - "5433:5432"   # host:5433 → container:5432
    volumes:
      - koncertapp_pgdata:/var/lib/postgresql/data
```

`5433:5432` znači: sa mašine se pristupa na portu 5433, unutar kontejnera PostgreSQL sluša na 5432 (standardni port).

Connection string je u `appsettings.json`:
```json
"DefaultConnection": "Host=localhost;Port=5433;Database=koncertapp;Username=postgres;Password=admin123"
```

### 3.2 Modeli (C# klase = tabele u bazi)

#### Concert
```csharp
public class Concert
{
    public int Id { get; set; }
    public string Name { get; set; }        // naziv koncerta
    public string City { get; set; }        // grad
    public string Location { get; set; }    // sala/venue
    public string ConcertDates { get; set; } // datumi kao string
    public string? AdditionalInfo { get; set; } // nullable — opciono
    public DateTime EarlyBirdDeadline { get; set; } // do kada važi early bird

    public ICollection<Zone> Zones { get; set; } // navigaciono svojstvo
}
```

#### Zone
```csharp
public class Zone
{
    public int Id { get; set; }
    public int ConcertId { get; set; }      // FK → Concerts
    public string Name { get; set; }        // npr. "VIP", "Parter"
    public int Capacity { get; set; }       // ukupan broj mesta
    public decimal PricePerTicket { get; set; } // cena po karti

    public Concert Concert { get; set; }    // navigaciono svojstvo (parent)
    public ICollection<Reservation> Reservations { get; set; }
}
```

#### Reservation
```csharp
public class Reservation
{
    public int Id { get; set; }
    public int ZoneId { get; set; }          // FK → Zones
    public ReservationStatus Status { get; set; } // Active | Cancelled
    public string Token { get; set; }        // jedinstveni pristupni token (Guid)
    public int TicketCount { get; set; }
    public decimal TotalPrice { get; set; }  // izračunata ukupna cena
    public bool IsEarlyBird { get; set; }    // da li je primenjen early bird
    public DateTime CreatedAt { get; set; }

    // Podaci kupca
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string? Company { get; set; }     // nullable
    public string Address1 { get; set; }
    public string? Address2 { get; set; }   // nullable
    public string PostalCode { get; set; }
    public string City { get; set; }
    public string Country { get; set; }
    public string Email { get; set; }

    // Promo kod koji je OVA rezervacija iskoristila (nullable)
    public int? UsedPromoCodeId { get; set; }

    // Navigaciona svojstva
    public Zone Zone { get; set; }
    public PromoCode? UsedPromoCode { get; set; }
    public PromoCode? OwnedPromoCode { get; set; } // promo koji JE OVA rezervacija generisala
}
```

#### PromoCode
```csharp
public class PromoCode
{
    public int Id { get; set; }
    public string Code { get; set; }          // 8-char uppercase (npr. "AB12CD34")
    public PromoCodeStatus Status { get; set; } // Active | Used | Cancelled

    public int OwnerReservationId { get; set; } // rezervacija koja ga je generisala
    public int? UsedByReservationId { get; set; } // rezervacija koja ga je iskoristila (nullable)

    public Reservation OwnerReservation { get; set; }
    public Reservation? UsedByReservation { get; set; }
}
```

#### Enum-ovi
```csharp
public enum ReservationStatus { Active, Cancelled }
public enum PromoCodeStatus   { Active, Used, Cancelled }
```

### 3.3 Veze između tabela (Entity Relationships)

```
Concert (1) ──── (N) Zone
Zone    (1) ──── (N) Reservation
Reservation (1) ──── (1) PromoCode [owned — 1:1]
Reservation (1) ──── (0..1) PromoCode [used — opciono]
```

**Svaka rezervacija**:
- pripada jednoj **zoni**
- generiše tačno jedan **promo kod** (OwnedPromoCode)
- može da iskoristi tuđi **promo kod** (UsedPromoCode, opciono)

### 3.4 AppDbContext — konfiguracija EF Core-a

`AppDbContext` je klasa koja nasljeđuje `DbContext` i predstavlja **most između C# koda i baze**.

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // DbSet = tabela u bazi
    public DbSet<Concert>     Concerts     => Set<Concert>();
    public DbSet<Zone>        Zones        => Set<Zone>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<PromoCode>   PromoCodes   => Set<PromoCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Zone → Concert: kaskadni brisanje
        modelBuilder.Entity<Zone>()
            .HasOne(z => z.Concert)
            .WithMany(c => c.Zones)
            .HasForeignKey(z => z.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        // Reservation → Zone: RESTRICT (ne može se obrisati zona sa aktivnim rezervacijama)
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Zone)
            .WithMany(z => z.Reservations)
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique constraint na Token (svaki token mora biti jedinstven)
        modelBuilder.Entity<Reservation>()
            .HasIndex(r => r.Token)
            .IsUnique();

        // Unique constraint na Code (svaki promo kod jedinstven)
        modelBuilder.Entity<PromoCode>()
            .HasIndex(p => p.Code)
            .IsUnique();

        // Enumi se čuvaju kao string u bazi (čitljivije od broja)
        modelBuilder.Entity<Reservation>()
            .Property(r => r.Status)
            .HasConversion<string>();

        // Preciznost decimalnog broja: max 10 cifara, 2 decimale
        modelBuilder.Entity<Zone>()
            .Property(z => z.PricePerTicket)
            .HasPrecision(10, 2);
    }
}
```

### 3.5 Migracije

Migracije su mehanizam kojim EF Core **prevodi C# modele u SQL CREATE TABLE naredbe**.

```bash
# Kreiranje migracije (jednom)
dotnet ef migrations add InitialCreate

# Primena na bazu (pokreće se automatski pri startu aplikacije)
dotnet ef database update
```

U aplikaciji, migracije se primenjuju automatski pri startu kroz `DbInitializer.InitializeAsync(db)` u `Program.cs`. Ovo znači: svaki put kad se aplikacija pokrene, proverava se da li postoje neprimenjene migracije i primenjuju se.

---

## 4. Backend — .NET Web API

### 4.1 Struktura projekta

```
KoncertApp.API/
├── Controllers/
│   ├── ConcertController.cs      ← GET /api/concert
│   └── ReservationController.cs  ← POST/GET/PUT/DELETE /api/reservation
├── Data/
│   └── AppDbContext.cs           ← EF Core kontekst + konfiguracija
├── DTOs/
│   ├── ConcertInfoDto.cs         ← šta vraćamo klijentu o koncertu
│   ├── ZoneInfoDto.cs            ← info o zoni
│   ├── CreateReservationDto.cs   ← šta prima POST /reservation
│   ├── UpdateReservationDto.cs   ← šta prima PUT /reservation
│   ├── CancelReservationDto.cs   ← šta prima DELETE /reservation
│   └── ReservationResponseDto.cs ← šta vraćamo klijentu o rezervaciji
├── Models/
│   ├── Concert.cs
│   ├── Zone.cs
│   ├── Reservation.cs
│   └── PromoCode.cs
├── Services/
│   ├── IPricingService.cs + PricingService.cs
│   ├── IConcertService.cs  + ConcertService.cs
│   └── IReservationService.cs + ReservationService.cs
├── Migrations/               ← auto-generisano od EF Core
├── Program.cs                ← entry point, DI konfiguracija
└── appsettings.json
```

### 4.2 Šta su DTO-ovi i zašto postoje?

**DTO (Data Transfer Object)** je klasa koja definiše tačno koji podaci putuju kroz API.

**Zašto ne koristimo direktno model?**
- Model (`Reservation`) sadrži sve podatke uključujući interne (navigaciona svojstva, etc.)
- DTO filtrira samo ono što klijent treba / sme da vidi
- Validacija se radi na DTO-u, ne na modelu

Primer: `CreateReservationDto` ima `[Required]`, `[EmailAddress]`, `[Range]` atribute — ASP.NET automatski validira ovo pre nego što uđe u servis.

```csharp
public class CreateReservationDto
{
    [Required] public int ZoneId { get; set; }
    [Required, Range(1, 50)] public int TicketCount { get; set; }
    [Required, MaxLength(100)] public string FirstName { get; set; }
    [Required, EmailAddress, MaxLength(200)] public string Email { get; set; }
    public string? PromoCode { get; set; } // opciono, nema [Required]
    // ... ostala polja
}
```

### 4.3 Dependency Injection (DI)

U `Program.cs` su registrovani svi servisi:

```csharp
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connectionString));

builder.Services.AddScoped<IPricingService,     PricingService>();
builder.Services.AddScoped<IConcertService,     ConcertService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
```

**`AddScoped`** znači: jedna instanca servisa po HTTP requestu. Svaki novi request dobija svežu instancu.

**Zašto interfejsi?** (`IPricingService` umjesto direktno `PricingService`)
- Olakšava testiranje — možeš podmetnuti mock implementaciju
- Loose coupling — kontroler ne zna za konkretnu klasu

Kad `ReservationController` primi request, ASP.NET automatski ubacuje (`inject`) `IReservationService`:
```csharp
public ReservationController(IReservationService service)
{
    _service = service; // ASP.NET je sam kreirao ReservationService i dao ga ovde
}
```

### 4.4 ConcertService — N+1 problem i rešenje

```csharp
public async Task<ConcertInfoDto?> GetConcertInfoAsync()
{
    var concert = await _context.Concerts
        .Include(c => c.Zones)    // JOIN sa Zones tabelom
        .FirstOrDefaultAsync();

    // Dohvati zauzeta mesta za SVE zone u JEDNOM upitu (izbegava N+1)
    var zoneIds = concert.Zones.Select(z => z.Id).ToList();
    var occupiedByZone = await _context.Reservations
        .Where(r => zoneIds.Contains(r.ZoneId) && r.Status == ReservationStatus.Active)
        .GroupBy(r => r.ZoneId)
        .Select(g => new { ZoneId = g.Key, Occupied = g.Sum(r => r.TicketCount) })
        .ToDictionaryAsync(x => x.ZoneId, x => x.Occupied);

    // AvailableSeats = Capacity - zauzeto
    Zones = concert.Zones.Select(z => new ZoneInfoDto
    {
        AvailableSeats = z.Capacity - occupiedByZone.GetValueOrDefault(z.Id, 0)
    }).ToList()
}
```

**N+1 problem**: ako imamo 4 zone, bez grupnog upita bismo radili 4 zasebna SELECT-a (jedan po zoni). Ovde se radi 1 upit sa GROUP BY koji vraća sve zone odjednom.

### 4.5 ReservationService — kreiranje rezervacije korak po korak

```csharp
public async Task<ReservationResponseDto> CreateAsync(CreateReservationDto dto)
{
    // Korak 1: Da li zona postoji?
    var zone = await _context.Zones
        .Include(z => z.Concert)
        .FirstOrDefaultAsync(z => z.Id == dto.ZoneId)
        ?? throw new InvalidOperationException("Zona nije pronađena.");

    // Korak 2: Da li ima slobodnih mesta?
    int occupied = await _context.Reservations
        .Where(r => r.ZoneId == dto.ZoneId && r.Status == ReservationStatus.Active)
        .SumAsync(r => (int?)r.TicketCount) ?? 0;

    int available = zone.Capacity - occupied;
    if (available < dto.TicketCount)
        throw new InvalidOperationException($"Nema dovoljno mesta. Dostupno: {available}.");

    // Korak 3: Validacija promo koda (ako je prosleđen)
    PromoCode? usedPromo = null;
    if (!string.IsNullOrWhiteSpace(dto.PromoCode))
    {
        usedPromo = await _context.PromoCodes
            .FirstOrDefaultAsync(p => p.Code == dto.PromoCode
                                   && p.Status == PromoCodeStatus.Active)
            ?? throw new InvalidOperationException("Promo kod nije validan.");
    }

    // Korak 4: Obračun cene
    bool isEarlyBird = DateTime.UtcNow <= zone.Concert.EarlyBirdDeadline;
    decimal total = _pricing.CalculateTotal(
        zone.PricePerTicket, dto.TicketCount, isEarlyBird, usedPromo is not null);

    // Korak 5: Sve u transakciji (atomično — ili sve ili ništa)
    await using var tx = await _context.Database.BeginTransactionAsync();
    try
    {
        var reservation = new Reservation
        {
            Token = Guid.NewGuid().ToString("N"), // 32-char hex string
            // ... ostala polja
        };
        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync(); // da dobijemo reservation.Id

        // Generiši promo kod za ovu rezervaciju
        var ownedPromo = new PromoCode
        {
            Code = Guid.NewGuid().ToString("N")[..8].ToUpper(), // 8 char
            Status = PromoCodeStatus.Active,
            OwnerReservationId = reservation.Id
        };
        _context.PromoCodes.Add(ownedPromo);

        // Označi iskorišćeni promo kod kao Used
        if (usedPromo is not null)
        {
            usedPromo.Status = PromoCodeStatus.Used;
            usedPromo.UsedByReservationId = reservation.Id;
        }

        await _context.SaveChangesAsync();
        await tx.CommitAsync(); // potvrdi transakciju
    }
    catch
    {
        await tx.RollbackAsync(); // ako išta pukne, poništi sve
        throw;
    }
}
```

**Zašto transakcija?** Ako se rezervacija snimi ali kreiranje promo koda ne uspe, bili bismo u nekonzistentnom stanju. Transakcija garantuje: ili se sve snimi, ili se ništa ne snimi.

### 4.6 Otkazivanje rezervacije

```csharp
public async Task CancelAsync(CancelReservationDto dto)
{
    var reservation = await _context.Reservations
        .Include(r => r.OwnedPromoCode)
        .FirstOrDefaultAsync(r =>
            r.Token == dto.Token &&
            r.Email == dto.Email &&
            r.Status == ReservationStatus.Active) // samo aktivne se mogu otkazati
        ?? throw new InvalidOperationException("Rezervacija nije pronađena.");

    reservation.Status = ReservationStatus.Cancelled;

    // Promo kod postaje Cancelled SAMO ako još nije iskorišćen
    // (ako je Used, ostaje Used — neko ga je već iskoristio)
    if (reservation.OwnedPromoCode?.Status == PromoCodeStatus.Active)
        reservation.OwnedPromoCode.Status = PromoCodeStatus.Cancelled;

    await _context.SaveChangesAsync();
}
```

### 4.7 Kontroleri — HTTP → Servis → HTTP

Kontroleri su tanki — samo primaju request, prosleđuju servisu, vraćaju odgovor:

```csharp
[ApiController]
[Route("api/[controller]")]  // api/reservation
public class ReservationController : ControllerBase
{
    [HttpPost]   // POST /api/reservation
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(..., result); // 201 Created
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message }); // 400 Bad Request
        }
    }

    [HttpGet]    // GET /api/reservation?email=...&token=...
    public async Task<IActionResult> Get([FromQuery] string email, [FromQuery] string token)

    [HttpPut]    // PUT /api/reservation
    public async Task<IActionResult> Update([FromBody] UpdateReservationDto dto)

    [HttpDelete] // DELETE /api/reservation (body sadrži token+email)
    public async Task<IActionResult> Cancel([FromBody] CancelReservationDto dto)
}
```

**HTTP status kodovi:**
- `200 OK` — uspešno dohvatanje/ažuriranje
- `201 Created` — uspešno kreiranje
- `204 No Content` — uspešno otkazivanje (nema body-a)
- `400 Bad Request` — validaciona greška ili biznis pravilo nije zadovoljeno
- `404 Not Found` — resurs ne postoji

### 4.8 CORS konfiguracija

Frontend (`:5173`) i backend (`:5225`) su na različitim portovima — browser blokira cross-origin zahteve. Rešenje:

```csharp
builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactApp", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

app.UseCors("ReactApp"); // mora biti pre app.MapControllers()
```

---

## 5. Poslovna logika — obračun cene

Ovo je **najvažniji deo** za odbranu. Zna se napamet.

### Algoritam (3 koraka, primenjuju se redosledom)

```
Korak 1 — Early Bird (-10% na jediničnu cenu):
  unitPrice = isEarlyBird ? basePrice * 0.90 : basePrice

Korak 2 — Svaka 5. karta -50% (prolazimo kroz svaku kartu):
  for i = 1 to ticketCount:
    if i % 5 == 0:
      total += unitPrice * 0.50  // 5., 10., 15. karta
    else:
      total += unitPrice

Korak 3 — Promo kod (-5% na ukupan zbir):
  if hasPromoCode:
    total = total * 0.95
```

### C# implementacija (PricingService.cs)

```csharp
public decimal CalculateTotal(decimal basePrice, int ticketCount,
                               bool isEarlyBird, bool hasPromoCode)
{
    // Korak 1
    decimal unitPrice = isEarlyBird ? basePrice * 0.90m : basePrice;

    // Korak 2
    decimal total = ApplyFifthTicketDiscount(unitPrice, ticketCount);

    // Korak 3
    if (hasPromoCode) total *= 0.95m;

    return Math.Round(total, 2);
}

private static decimal ApplyFifthTicketDiscount(decimal unitPrice, int count)
{
    decimal total = 0;
    for (int i = 1; i <= count; i++)
        total += (i % 5 == 0) ? unitPrice * 0.50m : unitPrice;
    return total;
}
```

### Primer izračuna

**Scenario**: 6 karata, zona 3000 din/karta, early bird aktivan, promo kod DA

```
Korak 1: unitPrice = 3000 * 0.90 = 2700 din

Korak 2:
  Karta 1: 2700
  Karta 2: 2700
  Karta 3: 2700
  Karta 4: 2700
  Karta 5: 2700 * 0.50 = 1350  ← svaka 5.
  Karta 6: 2700
  Subtotal = 5 * 2700 + 1350 = 13500 + 1350 = 14850

Korak 3: 14850 * 0.95 = 14107.50 din
```

### Ista logika na frontendu (pricing.ts)

Frontend ima **identičan algoritam** u TypeScript-u — koristi se za **live preračun** dok korisnik bira zonu, broj karata i unosi promo kod. To je UI feedback, pravi obračun uvek radi backend.

```typescript
export function calculatePricing(basePrice, ticketCount, isEarlyBird, hasPromo) {
  const unitPrice = isEarlyBird ? basePrice * 0.90 : basePrice;

  let subtotal = 0;
  for (let i = 1; i <= ticketCount; i++) {
    subtotal += (i % 5 === 0) ? unitPrice * 0.50 : unitPrice;
  }

  const promoSavings = hasPromo ? subtotal * 0.05 : 0;
  return { total: subtotal - promoSavings, ... };
}
```

---

## 6. Frontend — React + TypeScript

### 6.1 Struktura projekta

```
src/
├── api/
│   ├── client.ts      ← axios instanca, error helper
│   ├── endpoints.ts   ← sve API funkcije (getConcert, createReservation, ...)
│   └── types.ts       ← TypeScript interfejsi koji odgovaraju backend DTO-ovima
├── lib/
│   ├── format.ts      ← formatRsd(), formatDate()
│   └── pricing.ts     ← isti algoritam cene kao backend
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ZoneCard.tsx   ← prikaz jedne zone
│   ├── Field.tsx      ← wrapper za input polje sa labelom
│   ├── TicketCounter.tsx ← dugme - broj + dugme
│   └── Alert.tsx      ← poruka greška/uspeh/info/upozorenje
├── pages/
│   ├── Home.tsx        ← Feature 1: info o koncertu + zone
│   ├── Book.tsx        ← Feature 2: forma za rezervaciju
│   ├── Confirmation.tsx ← prikazuje token i promo kod
│   └── MyReservation.tsx ← Feature 3+4: izmena i otkazivanje
├── App.tsx             ← routing
├── App.css             ← svi stilovi
├── index.css           ← CSS varijable, reset, tipografija
└── main.tsx            ← entry point, montira React u DOM
```

### 6.2 Routing (App.tsx)

```tsx
// main.tsx — cela aplikacija je omotana u BrowserRouter
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// App.tsx — definisanje ruta
export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/"             element={<Home />} />
            <Route path="/book"         element={<Book />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/my"           element={<MyReservation />} />
            <Route path="*"             element={<Home />} /> {/* fallback */}
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

**SPA (Single Page Application)** znači: browser učitava HTML jednom, a sve navigacije su JavaScript-om — nema reload stranice. React Router interceptuje klik na link i renderuje odgovarajuću komponentu.

### 6.3 API sloj

**client.ts** — axios instanca:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5225';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});
```

`import.meta.env.VITE_API_URL` — Vite čita environment varijable. Ako nije setovana, koristi default localhost.

**endpoints.ts** — sve API funkcije:
```typescript
export async function getConcert(): Promise<ConcertInfo> {
  const { data } = await api.get<ConcertInfo>('/concert');
  return data;
}

export async function createReservation(body: CreateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.post<ReservationResponse>('/reservation', body);
  return data;
}

export async function getReservation(email: string, token: string): Promise<ReservationResponse> {
  const { data } = await api.get<ReservationResponse>('/reservation', {
    params: { email, token }, // šalje se kao ?email=...&token=...
  });
  return data;
}

export async function updateReservation(body: UpdateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.put<ReservationResponse>('/reservation', body);
  return data;
}

export async function cancelReservation(body: CancelReservationRequest): Promise<void> {
  await api.delete('/reservation', { data: body }); // DELETE može imati body
}
```

### 6.4 State management u React komponentama

React koristi `useState` hook za lokalni state. Primer iz `Book.tsx`:

```tsx
const [form, setForm] = useState<FormState>(EMPTY);  // stanje forme
const [submitting, setSubmitting] = useState(false);  // loading flag
const [submitError, setSubmitError] = useState<string | null>(null); // greška

// Izmena jednog polja forme
const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
  setForm((f) => ({ ...f, [key]: value }));

// Korišćenje:
<input
  value={form.firstName}
  onChange={(e) => update('firstName', e.target.value)}
/>
```

### 6.5 useEffect — učitavanje podataka

```tsx
useEffect(() => {
  let cancelled = false; // cleanup flag

  getConcert()
    .then((c) => { if (!cancelled) setConcert(c); })
    .catch((e) => { if (!cancelled) setError(extractErrorMessage(e)); })
    .finally(() => { if (!cancelled) setLoading(false); });

  // cleanup funkcija — sprečava state update na unmounted komponenti
  return () => { cancelled = true; };
}, []); // [] = pokreni samo jednom pri montiranju komponente
```

`cancelled` flag je tu da spreči grešku "can't update state on unmounted component" — ako korisnik ode sa stranice pre nego što se poziv završi, `cancelled = true` sprečava `setState` poziv.

### 6.6 useMemo — memoizovani izračuni

```tsx
const pricing = useMemo(() => {
  if (!selectedZone || !concert) return null;
  return calculatePricing(
    selectedZone.pricePerTicket,
    form.ticketCount,
    concert.isEarlyBirdActive,
    form.promoCode.trim().length > 0,
  );
}, [selectedZone, concert, form.ticketCount, form.promoCode]);
// Ponovo računa samo kad se promene ove vrednosti
```

`useMemo` sprečava da se `calculatePricing` poziva na svakom render-u — samo kad se promene zavisnosti u nizu.

### 6.7 Prenos podataka između stranica (useNavigate + state)

React Router dozvoljava slanje podataka pri navigaciji:

```tsx
// U Book.tsx — pri uspešnoj rezervaciji
navigate('/confirmation', { state: { reservation: result } });

// U Confirmation.tsx — primanje podataka
const { state } = useLocation();
const reservation = (state as LocState | null)?.reservation;

if (!reservation) return <Navigate to="/" replace />; // guard
```

Ovaj mehanizam je bolji od URL params za privatne podatke jer se ne vidi u URL-u. Mana: osvežavanjem stranice state se gubi, zato postoji redirect na `/`.

### 6.8 Forma za rezervaciju (Book.tsx) — flow

```
1. Učitaj podatke o koncertu (getConcert)
2. Korisnik bira zonu iz dropdown-a
3. useMemo recalculates pricing svaki put kad se promeni zona/broj/promo
4. Korisnik popunjava podatke
5. onSubmit → createReservation() → navigate('/confirmation', { state: { reservation } })
```

### 6.9 MyReservation — izmena i otkazivanje

```
1. Korisnik unosi email + token → handleFind()
   → parallelni poziv: getReservation() + getConcert()
   → prikazuju se detalji rezervacije

2. Izmena broja karata:
   → TicketCounter menja editTickets lokalni state
   → klik "Sačuvaj" → updateReservation() → refresh reservation-a

3. Otkazivanje (two-step confirmation):
   → klik "Otkaži" → confirmCancel = true (prikazuju se dugmad za potvrdu)
   → klik "Da, otkaži" → cancelReservation() → reservation = null
```

---

## 7. Tok podataka end-to-end

### 7.1 Korisnik kreira rezervaciju

```
Browser (Book.tsx)
    │
    │  1. handleSubmit → createReservation({ zoneId: 2, ticketCount: 3, ... })
    │
    ▼
axios.post("http://localhost:5225/api/reservation", body)
    │
    │  HTTP POST s JSON body-jem
    │
    ▼
ReservationController.Create([FromBody] CreateReservationDto dto)
    │
    │  ModelState.IsValid = true (ASP.NET validira [Required] atribute)
    │
    ▼
ReservationService.CreateAsync(dto)
    │
    ├── AppDbContext.Zones.FirstOrDefault(id == dto.ZoneId)  → SELECT * FROM Zones WHERE Id=2
    ├── AppDbContext.Reservations.SumAsync(TicketCount)       → SELECT SUM(TicketCount) WHERE ZoneId=2
    ├── PricingService.CalculateTotal(3000, 3, true, false)   → 8100 din
    ├── BeginTransactionAsync()
    ├── Reservations.Add(new Reservation { Token = "abc...", ... })
    ├── SaveChangesAsync()                                    → INSERT INTO Reservations ...
    ├── PromoCodes.Add(new PromoCode { Code = "AB12CD34", ... })
    ├── SaveChangesAsync()                                    → INSERT INTO PromoCodes ...
    └── CommitAsync()
    │
    ▼
ReservationController → return CreatedAtAction(201, ReservationResponseDto)
    │
    ▼
axios → { data: ReservationResponseDto }
    │
    ▼
Book.tsx → navigate('/confirmation', { state: { reservation: data } })
    │
    ▼
Confirmation.tsx → prikazuje token i promo kod
```

### 7.2 Promo kod lifecycle

```
Rezervacija A kreira se                    → PromoCode { Code: "AB12CD34", Status: Active }
Rezervacija B koristi "AB12CD34"           → PromoCode { Status: Used, UsedByReservationId: B.Id }
Rezervacija A se otkazuje                  → PromoCode { Status ostaje Used! } ← NE menja se
Rezervacija C se kreira s novim promo kodom → PromoCode { Code: "XY98ZW12", Status: Active }
Rezervacija C se otkazuje (promo neiskorišćen) → PromoCode { Status: Cancelled }
```

---

## 8. Pokretanje aplikacije

### Redosled pokretanja

```bash
# 1. Pokreni PostgreSQL (Docker mora biti upaljen)
cd backend
docker compose up -d

# 2. Pokreni .NET backend (automatski pokreće migracije)
cd backend/KoncertApp.API
dotnet run
# → sluša na http://localhost:5225

# 3. Pokreni React frontend
cd frontend/koncert-app
npm run dev
# → sluša na http://localhost:5173
```

### Endpoints (Swagger)

Swagger UI je dostupan na: `http://localhost:5225/swagger`

| Method | URL | Opis |
|---|---|---|
| GET | `/api/concert` | Info o koncertu + zone |
| POST | `/api/reservation` | Nova rezervacija |
| GET | `/api/reservation?email=...&token=...` | Dohvati rezervaciju |
| PUT | `/api/reservation` | Izmeni broj karata |
| DELETE | `/api/reservation` | Otkaži rezervaciju |

---

## 9. Pitanja koja mogu da se pojave na odbrani

### O bazi podataka

**P: Zašto je `OnDelete(Cascade)` za Concert→Zone, a `Restrict` za Zone→Reservation?**
- Cascade: ako obrišemo koncert, logično je da se obrišu i zone
- Restrict: zona koja ima rezervacije se NE SME brisati — to bi narušilo integritet podataka (izgubili bismo informaciju o rezervacijama)

**P: Zašto su enumi čuvani kao string u bazi?**
- Čitljivost: vidimo `"Active"` umjesto `1` u bazi
- Stabilnost: ako dodamo novi enum vrednost negde između, numeričke vrednosti bi se pomjerile i pokvarile stare zapise

**P: Šta je Unique constraint i zašto ga imamo na Token-u?**
- Baza garantuje da ne mogu postojati dva reda s istim Token-om
- EF Core: `.HasIndex(r => r.Token).IsUnique()`
- SQL ekvivalent: `UNIQUE INDEX`

### O poslovnoj logici

**P: Kako se obračunava cena za 7 karata s early bird i promo kodom (baza 2000 din)?**
```
unitPrice = 2000 * 0.90 = 1800
Karte: 1800+1800+1800+1800+(1800*0.5)+1800+1800 = 5*1800 + 900 + 1800 = 9000 + 900 + 1800 = 11700
Promo: 11700 * 0.95 = 11115 din
```

**P: Šta se desi s promo kodom ako se otkaže rezervacija koja ga je koristila?**
- Ništa — promo kod je tipa `Used`, što znači da ga je već neko iskoristio i ta informacija se čuva
- Otkazivanje VLASNIKOVE rezervacije ne menja status promo koda koji je neko DRUGI iskoristio

**P: Može li isti promo kod da se iskoristi dva puta?**
- Ne — pri korišćenju, status se menja na `Used`
- U `CreateAsync` se proverava: `.FirstOrDefaultAsync(p => p.Code == dto.PromoCode && p.Status == PromoCodeStatus.Active)`
- Ako nije Active, baca grešku

### O arhitekturi

**P: Zašto frontend ima isti algoritam cene kao backend?**
- Frontend: live preview u UI (dok korisnik bira)
- Backend: pravi obračun koji se snima u bazu
- Ova redundantnost je intentionalna — UI mora biti brz i responsivan, ne može čekati API za svaki keystroke

**P: Zašto se koristi transakcija pri kreiranju rezervacije?**
- Dve operacije moraju biti atomične: INSERT Reservation + INSERT PromoCode
- Ako PromoCode INSERT pukne (npr. duplikat koda), cela rezervacija se poništava
- Bez transakcije, imali bismo rezervaciju bez promo koda — nekonzistentno stanje

**P: Šta je CORS i zašto je potreban?**
- Cross-Origin Resource Sharing — browser bezbednosni mehanizam
- Frontend (:5173) i API (:5225) su na različitim portovima = različiti "origin"-i
- Bez CORS konfiguracije, browser bi blokirao sve API pozive
- Rešenje: backend eksplicitno dozvoli zahteve sa `:5173`

**P: Šta je dependency injection?**
- Umjesto da klasa sama kreira svoje zavisnosti, framework ih ubacuje spolja
- `ReservationController` ne zna kako se kreira `ReservationService` — to zna DI kontejner
- Prednosti: lakše testiranje (može se podmetnuti mock), loose coupling

**P: Šta znači `async/await` i zašto se koristi?**
- Asinhrone operacije (I/O: baza, mreža) ne blokiraju thread dok čekaju odgovor
- ASP.NET može da obradi stotine konkurentnih zahteva s malo thread-ova
- `await` znači: "pusti thread slobodnim dok čekaš rezultat, vrati se kad je gotovo"

**P: Razlika između `IActionResult` i direktnog tipa kao return?**
- `IActionResult` dozvoljava vraćanje različitih HTTP statusova (200, 201, 400, 404...)
- Direktni tip uvek vraća 200 OK — manje kontrole

**P: Šta je `useMemo` i kada se koristi?**
- Memoizacija: pamti rezultat funkcije i ponovo računa samo kad se promene zavisnosti
- Koristi se za skupe izračune koji ne trebaju da se rade na svakom render-u
- U aplikaciji: `calculatePricing` se poziva samo kad se promene zona/količina/promo

**P: Kako se podaci prenose između stranica?**
- `useNavigate` + `state` parametar u React Router-u
- `navigate('/confirmation', { state: { reservation: result } })`
- Na odredištu: `const { state } = useLocation()`
- State se ne čuva pri osvežavanju (nije u URL-u niti localStorage)

### O TypeScript-u

**P: Zašto TypeScript umjesto JavaScript?**
- Kompajler hvata greške pre izvođenja (tip mismatch, nedostajuća polja)
- Bolji IDE support (autocomplete za API tipove)
- `types.ts` definiše tačno koji oblik podataka dolazi od API-ja — greška u mapi odmah je vidljiva

**P: Šta je `interface` u TypeScript-u?**
- Definicija oblika objekta
- `interface ZoneInfo { id: number; name: string; ... }` — svaki objekat koji se proglasi `ZoneInfo` mora imati ta polja s tim tipovima

---

*Dokument generisan na osnovu stvarnog koda aplikacije. Sve verzije koda su tačne.*

# ARHITEKTURA — kako se aplikacija gradi od nule do kraja

> Ovaj dokument NIJE spisak fajlova (to su `backend.md` i `frontend.md`).
> Ovo je **priča o izgradnji**: redom kako se sistem pravi i kako podaci teku —
> od baze, preko backenda, do frontenda. Na svakom koraku piše **šta** se radi i **zašto**.

---

## Sadržaj

- [0. Šta gradimo (ideja aplikacije)](#0-šta-gradimo-ideja-aplikacije)
- [1. Pogled iz aviona — tri sloja](#1-pogled-iz-aviona--tri-sloja)
- [2. KORAK 1 — Dizajn baze (od čega sve počinje)](#2-korak-1--dizajn-baze-od-čega-sve-počinje)
- [3. KORAK 2 — Pokretanje baze (Docker + PostgreSQL)](#3-korak-2--pokretanje-baze-docker--postgresql)
- [4. KORAK 3 — Skelet backenda (.NET projekat + EF Core)](#4-korak-3--skelet-backenda-net-projekat--ef-core)
- [5. KORAK 4 — Modeli → tabele (EF Core mapiranje)](#5-korak-4--modeli--tabele-ef-core-mapiranje)
- [6. KORAK 5 — Migracije i punjenje baze](#6-korak-5--migracije-i-punjenje-baze)
- [7. KORAK 6 — Poslovna logika (servisi)](#7-korak-6--poslovna-logika-servisi)
- [8. KORAK 7 — DTO-ovi (šta API prima i vraća)](#8-korak-7--dto-ovi-šta-api-prima-i-vraća)
- [9. KORAK 8 — Kontroleri (HTTP ulaz/izlaz)](#9-korak-8--kontroleri-http-ulazizlaz)
- [10. KORAK 9 — Program.cs (sve se spaja)](#10-korak-9--programcs-sve-se-spaja)
- [11. KORAK 10 — Skelet frontenda (Vite + React)](#11-korak-10--skelet-frontenda-vite--react)
- [12. KORAK 11 — API sloj na frontendu](#12-korak-11--api-sloj-na-frontendu)
- [13. KORAK 12 — Stranice i tok korisnika](#13-korak-12--stranice-i-tok-korisnika)
- [14. Sve zajedno — život jednog zahteva (end-to-end)](#14-sve-zajedno--život-jednog-zahteva-end-to-end)
- [15. Rekapitulacija redosleda gradnje](#15-rekapitulacija-redosleda-gradnje)

---

## 0. Šta gradimo (ideja aplikacije)

Aplikacija za **rezervaciju karata za jedan koncert** (Eros Ramazzotti, Štark Arena).

Šta korisnik može:
1. da vidi koncert i **zone** (VIP, Parter, Tribine, Balkon) sa cenama i slobodnim mestima;
2. da **rezerviše** karte uz tri tipa popusta;
3. da kasnije **pronađe** svoju rezervaciju (preko email + token), **izmeni** broj karata ili je **otkaže**.

Tri popusta (poslovno pravilo koje se provlači kroz ceo sistem):
- **Early bird −10%** — ako se rezerviše pre roka;
- **Svaka 5. karta −50%** — 5., 10., 15. karta u istoj rezervaciji;
- **Promo kod −5%** — svaka rezervacija generiše kod za prijatelja, koji daje 5% popusta.

Sve ostalo u arhitekturi postoji da bi se ova tri pravila bezbedno i konzistentno izvršila.

---

## 1. Pogled iz aviona — tri sloja

```
┌──────────────────────────────────────────────┐
│  FRONTEND  — React SPA (localhost:5173)        │  ← ono što korisnik vidi
│  Home → Book → Confirmation → MyReservation    │
└───────────────────┬──────────────────────────┘
                    │  HTTP + JSON (axios)
                    ▼
┌──────────────────────────────────────────────┐
│  BACKEND   — .NET 8 Web API (localhost:5225)   │  ← sva pravila i provere
│  Controller → Service → DbContext              │
└───────────────────┬──────────────────────────┘
                    │  SQL (Npgsql driver)
                    ▼
┌──────────────────────────────────────────────┐
│  BAZA      — PostgreSQL (localhost:5433)       │  ← gde podaci trajno žive
│  Concerts · Zones · Reservations · PromoCodes  │
└──────────────────────────────────────────────┘
```

**Zlatno pravilo:** svaki sloj zna samo za sloj **ispod** sebe.
- Frontend ne zna za bazu — priča samo sa API-jem.
- Kontroler ne priča sa bazom direktno — zove servis.
- Servis ne zna za HTTP — samo radi posao i vraća podatke.

Zašto ovako? Zato što svaki sloj može da se menja nezavisno. Možeš promeniti izgled frontenda
bez diranja baze, ili zameniti PostgreSQL nečim drugim bez diranja kontrolera.

**Gradimo odozdo nagore** — prvo baza (temelj), pa backend, pa frontend. Logično: front
ne može da priča sa API-jem koji ne postoji, a API ne može da čuva podatke u bazi koje nema.

---

## 2. KORAK 1 — Dizajn baze (od čega sve počinje)

Pre ijedne linije koda razmišljamo: **koji podaci postoje i kako su povezani?**

### Četiri entiteta

| Entitet | Šta predstavlja |
|---|---|
| **Concert** | jedan koncert (ime, grad, sala, datum, rok za early bird) |
| **Zone** | zona u sali (ime, kapacitet, cena po karti) — koncert ima više zona |
| **Reservation** | jedna rezervacija (kupac, broj karata, cena, token, status) |
| **PromoCode** | promo kod (kreira se uz svaku rezervaciju, može se iskoristiti jednom) |

### Veze između njih

```
Concert  1 ───< N  Zone           jedan koncert ima više zona
Zone     1 ───< N  Reservation    jedna zona ima više rezervacija
Reservation 1 ─── 1 PromoCode      svaka rezervacija GENERIŠE tačno jedan kod (owned)
Reservation 1 ─── 0..1 PromoCode   rezervacija MOŽE da iskoristi tuđi kod (used, opciono)
```

Najvažnija (i najlukavija) je veza rezervacije i promo koda — postoje **dve**:
- kod koji rezervacija **dobija** (`OwnedPromoCode`) — uvek tačno jedan;
- kod koji rezervacija **koristi** (`UsedPromoCode`) — nula ili jedan, tuđi kod.

### Dva ključna „izračunata" podatka kojih NEMA u bazi

Ovo je bitno za odbranu — neke stvari se **ne čuvaju**, nego se **računaju** svaki put:

- **Slobodna mesta u zoni** = `Capacity − suma karata aktivnih rezervacija`.
  Ne čuvamo „slobodno" kao kolonu jer bi se lako pokvarilo (rasinhronizovalo).
  Računamo ga iz istine — iz rezervacija.
- **Da li je early bird aktivan** = `sada <= EarlyBirdDeadline`.
  Ne čuvamo true/false, jer zavisi od trenutnog vremena. Računamo na zahtev.

> Princip: **ne dupliraj podatak koji možeš da izvedeš.** Jedan izvor istine.

### Soft delete (zašto otkazana rezervacija ostaje u bazi)

Kad korisnik otkaže rezervaciju, **ne brišemo red**. Menjamo samo `Status` iz `Active` u `Cancelled`.
Tako čuvamo istoriju (ko je, kad, šta rezervisao) i možemo da analiziramo otkaze.
Slobodna mesta se ionako računaju samo iz `Active` rezervacija, pa otkazane „same od sebe"
oslobađaju mesta.

---

## 3. KORAK 2 — Pokretanje baze (Docker + PostgreSQL)

Bazu ne instaliramo ručno — pokrećemo je u **Docker kontejneru**. Jedan fajl
(`backend/docker-compose.yml`) opisuje sve, jedna komanda pravi bazu spremnu za rad.

```yaml
services:
  db:
    image: postgres:16              # gotova PostgreSQL 16 slika
    environment:
      POSTGRES_DB: koncertapp        # ime baze
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: admin123
    ports:
      - "5433:5432"                  # spolja 5433, unutra 5432
    volumes:
      - koncertapp_pgdata:/var/lib/postgresql/data   # podaci preživljavaju restart
```

Zašto Docker: svi na timu dobiju **identičnu** bazu (ista verzija, lozinka, port) bez
ručne instalacije. Zašto port `5433` a ne standardni `5432`: da se ne sudara sa nekim
ko već ima PostgreSQL instaliran lokalno.

```bash
cd backend
docker compose up -d     # baza je sad živa na localhost:5433
```

Baza je prazna — još nema tabela. Tabele će napraviti backend (EF Core migracije), ne mi ručno.

---

## 4. KORAK 3 — Skelet backenda (.NET projekat + EF Core)

Sad pravimo .NET 8 Web API projekat. Tri paketa nam trebaju (u `KoncertApp.API.csproj`):

- **Npgsql.EntityFrameworkCore.PostgreSQL** — da EF Core ume da priča sa PostgreSQL;
- **Microsoft.EntityFrameworkCore.Design** — alat za pravljenje migracija;
- **Swashbuckle.AspNetCore** — Swagger UI za testiranje API-ja u browseru.

**EF Core** (Entity Framework Core) je **ORM** — Object-Relational Mapper. Njegov posao:
da prevodi C# klase u SQL tabele, i C# kod (`.Where(...)`, `.FirstOrDefault()`) u SQL upite.
Zahvaljujući njemu **ne pišemo SQL ručno**.

Most ka bazi je klasa `AppDbContext`. Ona drži „tabele" kao property-je:

```csharp
public DbSet<Concert>     Concerts     => Set<Concert>();
public DbSet<Zone>        Zones        => Set<Zone>();
public DbSet<Reservation> Reservations => Set<Reservation>();
public DbSet<PromoCode>   PromoCodes   => Set<PromoCode>();
```

Svaki `DbSet<T>` je jedna tabela. Kroz njega pišemo upite. Connection string (gde je baza)
stoji u `appsettings.json` i poklapa se sa Docker postavkama (`Port=5433` itd.).

---

## 5. KORAK 4 — Modeli → tabele (EF Core mapiranje)

Modeli su obične C# klase. Svaki property postaje kolona. Primer (`Zone`):

```csharp
public class Zone
{
    public int Id { get; set; }                  // PRIMARY KEY (EF prepozna "Id")
    public int ConcertId { get; set; }           // FOREIGN KEY → Concerts
    public string Name { get; set; } = "";
    public int Capacity { get; set; }
    public decimal PricePerTicket { get; set; }  // decimal jer je novac (ne float!)

    public Concert Concert { get; set; } = null!;            // veza nagore (parent)
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
```

Dve vrste property-ja:
- **obični** (`Name`, `Capacity`) → postaju kolone;
- **navigacioni** (`Concert`, `Reservations`) → ne postaju kolone, nego opisuju **veze**.
  Preko njih EF Core ume da poveže tabele (`JOIN`).

U `AppDbContext.OnModelCreating(...)` se fino podešavaju pravila koja C# klasa ne može sama
da iskaže:

```csharp
// brisanje koncerta briše i njegove zone
.HasOne(z => z.Concert).WithMany(c => c.Zones).OnDelete(DeleteBehavior.Cascade);

// ne možeš obrisati zonu koja ima rezervacije (čuva integritet)
.HasOne(r => r.Zone).WithMany(z => z.Reservations).OnDelete(DeleteBehavior.Restrict);

// token i promo kod moraju biti jedinstveni
.HasIndex(r => r.Token).IsUnique();
.HasIndex(p => p.Code).IsUnique();

// enum se u bazi čuva kao tekst ("Active"), ne kao broj (0) — čitljivije
.Property(r => r.Status).HasConversion<string>();

// cena ima tačno 2 decimale, max 10 cifara
.Property(z => z.PricePerTicket).HasPrecision(10, 2);
```

> Za odbranu: `Cascade` vs `Restrict` — koncert→zona je Cascade (logično da nestanu zone sa
> koncertom), a zona→rezervacija je Restrict (ne smemo izgubiti podatke o rezervacijama).

---

## 6. KORAK 5 — Migracije i punjenje baze

Imamo C# modele, baza je prazna. Kako nastaju tabele? Preko **migracija**.

```bash
dotnet ef migrations add InitialCreate
```

Ova komanda pogleda modele i generiše C# fajl koji opisuje sve `CREATE TABLE`, indekse i
strane ključeve (`Migrations/...InitialCreate.cs`). Migracija je **verzionisana šema baze** —
ide uz kod, pa svako ko povuče kod može da napravi identičnu bazu.

Ne pokrećemo migraciju ručno — radi se **automatski pri startu** aplikacije, u
`DbInitializer.InitializeAsync(...)`:

```csharp
await context.Database.MigrateAsync();        // napravi/ažuriraj tabele
if (await context.Concerts.AnyAsync()) return; // ako već ima podataka, ne diraj
// ... ubaci jedan koncert sa 5 zona (seed) ...
```

Dve stvari u jednom:
1. **migrira** — napravi tabele ako ne postoje (idempotentno — može se zvati 100 puta);
2. **seed** — ako je baza prazna, ubaci početne podatke (koncert + 5 zona). Provera
   `AnyAsync()` sprečava dupliranje pri svakom restartu.

Posle ovog koraka baza ima tabele i jedan koncert sa zonama. Backend je spreman da ih servira.

---

## 7. KORAK 6 — Poslovna logika (servisi)

Sad pišemo **mozak** aplikacije. Sva pravila žive u **servisima**, ne u kontrolerima i ne
u bazi. Tri servisa:
 
### PricingService — obračun cene (srce sistema)

Tri popusta se primenjuju **tačno ovim redom**:

```csharp
// 1) Early bird: -10% na cenu jedne karte
decimal unitPrice = isEarlyBird ? basePrice * 0.90m : basePrice;

// 2) Svaka 5. karta -50% (prolazimo kroz svaku kartu)
decimal total = 0;
for (int i = 1; i <= count; i++)
    total += (i % 5 == 0) ? unitPrice * 0.50m : unitPrice;

// 3) Promo kod: -5% na ceo zbir
if (hasPromoCode) total *= 0.95m;

return Math.Round(total, 2);
```

Primer (6 karata, 3000 din/karta, early bird DA, promo DA):
- unitPrice = 3000 × 0.90 = **2700**
- karte 1–4 = 2700×4 = 10800; karta 5 = 2700×0.50 = **1350**; karta 6 = 2700
- subtotal = 10800 + 1350 + 2700 = **14850**
- promo = 14850 × 0.95 = **14107.50 din**

### ConcertService — koncert + slobodna mesta

Dohvata koncert sa zonama i **računa slobodna mesta** jednim upitom (ne po zoni — to bi bio
N+1 problem):

```csharp
var occupiedByZone = await _context.Reservations
    .Where(r => zoneIds.Contains(r.ZoneId) && r.Status == ReservationStatus.Active)
    .GroupBy(r => r.ZoneId)
    .Select(g => new { ZoneId = g.Key, Occupied = g.Sum(r => r.TicketCount) })
    .ToDictionaryAsync(x => x.ZoneId, x => x.Occupied);
// AvailableSeats = Capacity - occupiedByZone[zoneId]
```

### ReservationService — kreiranje/čitanje/izmena/otkazivanje

Najsloženiji deo. Kreiranje rezervacije ide ovako (svaki korak je provera pre nego što se išta upiše):

```
1. Da li zona postoji?            → ako ne, greška
2. Ima li dovoljno mesta?         → Capacity - zauzeto >= traženo?
3. Ako je unet promo kod — važi li? (postoji i Active?)
4. Izračunaj cenu (PricingService)
5. U JEDNOJ TRANSAKCIJI:
     - upiši Reservation (dobije token)
     - kreiraj nov PromoCode za ovog kupca
     - ako je korišćen tuđi kod → označi ga kao Used
   commit  (ili rollback ako bilo šta pukne)
```

**Zašto transakcija** (`BeginTransaction` / `Commit` / `Rollback`): kreiranje rezervacije i
njenog promo koda moraju biti **atomični** — ili oboje uspe, ili ništa. Bez transakcije bi
mogla da nastane rezervacija bez promo koda (nekonzistentno stanje).

Otkazivanje je soft delete + pravilo o promo kodu:

```csharp
reservation.Status = ReservationStatus.Cancelled;
// vlasnikov kod postaje nevažeći SAMO ako ga niko nije iskoristio
if (reservation.OwnedPromoCode?.Status == PromoCodeStatus.Active)
    reservation.OwnedPromoCode.Status = PromoCodeStatus.Cancelled;
```

> Zašto interfejsi (`IPricingService` itd.): kontroler zavisi od **ugovora**, ne od konkretne
> klase. Lakše testiranje i zamena. Ovo je **Dependency Injection** — vidi KORAK 9.

---

## 8. KORAK 7 — DTO-ovi (šta API prima i vraća)

Modeli su za bazu. Za komunikaciju sa frontom koristimo **DTO** (Data Transfer Object).

Zašto ne šaljemo model direktno:
- model ima navigaciona svojstva (kružne reference → beskonačan JSON);
- ne želimo da izložimo sve interne kolone;
- na DTO-u radimo **validaciju** ulaza.

Ulazni DTO ima validacione atribute — ASP.NET ih proverava **pre** nego što kod uđe u servis:

```csharp
public class CreateReservationDto
{
    [Required] public int ZoneId { get; set; }
    [Required, Range(1, 50)] public int TicketCount { get; set; }
    [Required, MaxLength(100)] public string FirstName { get; set; } = "";
    [Required, EmailAddress] public string Email { get; set; } = "";
    public string? PromoCode { get; set; }   // bez [Required] = opciono
}
```

Izlazni DTO (`ReservationResponseDto`) nosi samo ono što front treba: token, status, naziv
zone, cenu, generisani promo kod, podatke kupca. **Računata polja** (`AvailableSeats`,
`IsEarlyBirdActive`) postoje samo u DTO-u — backend ih popunjava, baza ih ne čuva.

---

## 9. KORAK 8 — Kontroleri (HTTP ulaz/izlaz)

Kontroler je **tanak** — prevodi HTTP u poziv servisa i nazad. Ne sadrži logiku.

```csharp
[ApiController]
[Route("api/[controller]")]              // → api/reservation
public class ReservationController : ControllerBase
{
    [HttpPost]    // POST /api/reservation
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto)
    {
        try {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(..., result);     // 201 Created
        } catch (InvalidOperationException ex) {
            return BadRequest(new { message = ex.Message });  // 400
        }
    }
    // [HttpGet] Get, [HttpPut] Update, [HttpDelete] Cancel ...
}
```

Mapiranje operacija na HTTP:

| Operacija | HTTP | Ruta | Uspeh |
|---|---|---|---|
| Info o koncertu | GET | `/api/concert` | 200 |
| Nova rezervacija | POST | `/api/reservation` | 201 |
| Pronađi rezervaciju | GET | `/api/reservation?email=&token=` | 200 |
| Izmeni broj karata | PUT | `/api/reservation` | 200 |
| Otkaži | DELETE | `/api/reservation` | 204 |

Greška iz servisa (nema mesta, loš promo kod) → `400 Bad Request` sa porukom na srpskom,
koju front prikaže korisniku.

---

## 10. KORAK 9 — Program.cs (sve se spaja)

`Program.cs` je ulazna tačka. Tu se **registruju** svi delovi i podešava redosled obrade zahteva.

```csharp
// 1) JSON podešavanja: enum kao string, ignoriši kružne reference
builder.Services.AddControllers().AddJsonOptions(...);

// 2) Baza: poveži AppDbContext sa PostgreSQL
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));

// 3) Dependency Injection: kad neko traži IConcertService, daj mu ConcertService
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IConcertService, ConcertService>();
builder.Services.AddScoped<IReservationService, ReservationService>();

// 4) CORS: dozvoli pozive sa React dev servera
builder.Services.AddCors(o => o.AddPolicy("ReactApp",
    p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// 5) Pri startu: migracije + seed
using (var scope = app.Services.CreateScope())
    await DbInitializer.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());

app.UseSwagger(); app.UseSwaggerUI();   // dokumentacija
app.UseCors("ReactApp");                // mora pre MapControllers
app.MapControllers();                   // uključi sve kontrolere
app.Run();
```

Dva pojma za odbranu:
- **Dependency Injection (DI):** ne pravimo servise ručno (`new ConcertService(...)`).
  Kažemo frameworku „kad ti neko zatraži ovaj interfejs, daj ovu klasu", a on ih sam ubacuje
  u konstruktore. `AddScoped` = nova instanca po svakom HTTP zahtevu (jer i `AppDbContext` je
  scoped — jedan po zahtevu).
- **CORS:** browser blokira pozive sa jednog porta (5173) na drugi (5225) jer su različiti
  „origin". Eksplicitno dozvoljavamo front da zove API. `UseCors` mora pre `MapControllers`.

**Backend je gotov.** Može se testirati na `http://localhost:5225/swagger` bez frontenda.

---

## 11. KORAK 10 — Skelet frontenda (Vite + React)

Tek sad pravimo ono što korisnik vidi. Stack: **React 18 + TypeScript + Vite + React Router + axios**.

Tok pokretanja React aplikacije:

```
index.html  (jedan jedini HTML, ima prazan <div id="root">)
    │
main.tsx    montira React u taj div, omotava sve u <BrowserRouter>
    │
App.tsx     definiše rute (koja stranica na kom URL-u)
```

`App.tsx` je layout + ruter:

```tsx
<div className="app-shell">
  <Header />
  <main><div className="container">
    <Routes>
      <Route path="/"             element={<Home />} />
      <Route path="/book"         element={<Book />} />
      <Route path="/confirmation" element={<Confirmation />} />
      <Route path="/my"           element={<MyReservation />} />
      <Route path="*"             element={<Home />} />   {/* nepoznat URL → Home */}
    </Routes>
  </div></main>
  <Footer />
</div>
```

**SPA (Single Page Application):** browser učita HTML **jednom**. Klik na link ne osvežava
stranicu — React Router samo zameni komponentu u sredini. Header i Footer ostaju.

Struktura `src/` foldera (po odgovornosti):
- `api/` — komunikacija sa backendom (types, client, endpoints);
- `lib/` — pomoćne funkcije bez UI-a (format cene/datuma, obračun cene);
- `components/` — mali ponovljivi delovi (Header, Footer, Alert, ZoneCard, TicketCounter);
- `pages/` — cele stranice (Home, Book, Confirmation, MyReservation).

---

## 12. KORAK 11 — API sloj na frontendu

Pre stranica, pravimo sloj koji priča sa backendom — da stranice ne moraju da znaju detalje HTTP-a.

**`types.ts`** — TypeScript interfejsi koji **ogledaju backend DTO-ove**. Tako TypeScript
zna oblik podataka i hvata greške u kucanju pre pokretanja:

```ts
export interface ConcertInfo { id: number; name: string; zones: ZoneInfo[]; /* ... */ }
export interface ReservationResponse { token: string; totalPrice: number; /* ... */ }
```

**`client.ts`** — jedna axios instanca (gde je API + zajednički header) i pomoćnik koji iz
greške izvuče poruku na srpskom:

```ts
export const api = axios.create({ baseURL: 'http://localhost:5225/api',
                                  headers: { 'Content-Type': 'application/json' } });
```

**`endpoints.ts`** — jedna funkcija po backend ruti. Stranice zovu ove funkcije, ne axios direktno:

```ts
export async function getConcert(): Promise<ConcertInfo> {
  const { data } = await api.get<ConcertInfo>('/concert');
  return data;
}
export async function createReservation(body) { /* api.post('/reservation', body) */ }
export async function getReservation(email, token) { /* api.get('/reservation', { params }) */ }
export async function updateReservation(body) { /* api.put('/reservation', body) */ }
export async function cancelReservation(body) { /* api.delete('/reservation', { data: body }) */ }
```

Pored toga, `lib/pricing.ts` ima **isti algoritam cene kao backend**, ali u TypeScript-u.
Zašto duplikat: da bismo prikazali cenu **uživo** dok korisnik bira (bez čekanja servera na
svaki klik). Pravi obračun pri slanju uvek radi backend — front je samo pregled.

---

## 13. KORAK 12 — Stranice i tok korisnika

Sad spajamo sve u ekrane. Tok kroz aplikaciju:

```
/  Home  ──klik na zonu──►  /book  Book  ──potvrdi──►  /confirmation  ──►  /my  MyReservation
```

### Home — koncert i zone

Pri otvaranju zove `getConcert()` u `useEffect` i prikaže hero + kartice zona (`ZoneCard`).
Klik na „Izaberi zonu" vodi na `/book` i prosleđuje koju zonu:

```tsx
useEffect(() => {
  getConcert()
    .then((c) => setConcert(c))
    .catch((e) => setError(extractErrorMessage(e)))
    .finally(() => setLoading(false));
}, []);
```

Tri stanja koja svaka „učitavajuća" stranica ima: **loading** (skeleton), **error** (Alert),
**podaci** (sadržaj). To je standardni obrazac.

### Book — forma za rezervaciju

Srce frontenda. Drži stanje forme kroz `useState` (jedno po polju: zona, broj karata, ime,
email, adresa, promo kod...). Pri svakoj izmeni:

1. iz izabrane zone i broja karata **direktno u renderu** izračuna cenu
   (`calculatePricing(...)`) i prikaže razradu popusta u desnom panelu;
2. na „Potvrdi" zove `createReservation(...)` i, ako uspe, ide na `/confirmation`
   **noseći i rezervaciju i razradu cene**:

```tsx
const result = await createReservation({ /* ...podaci forme... */ });
navigate('/confirmation', { state: { reservation: result, pricing } });
```

> Prosleđivanje `pricing` je važno: bez njega bi Confirmation znao samo da li je early bird
> primenjen, ali ne i **koliko** je svaki popust uštedeo. Sa njim prikazuje konkretne iznose.

### Confirmation — potvrda

Čita prosleđene podatke iz `location.state`, prikazuje **token** i **promo kod** (sa dugmetom
„Kopiraj") i razradu popusta. Ako neko dođe direktno na URL (bez podataka), vraća na početnu:

```tsx
const reservation = (state as any)?.reservation;
const pricing = (state as any)?.pricing;
if (!reservation) return <Navigate to="/" replace />;
```

### MyReservation — pregled, izmena, otkazivanje

Korisnik unese **email + token** → `handleFind()` dohvati rezervaciju i koncert. Onda može:
- **izmeniti** broj karata (`updateReservation` → cena se ponovo obračuna na backendu);
- **otkazati** uz potvrdu u dva koraka („Otkaži" → „Da, otkaži" → `cancelReservation`).

Pristup je zaštićen time što treba znati **i email i token** — token je tajni 32-znakovni ključ.

---

## 14. Sve zajedno — život jednog zahteva (end-to-end)

Najvažnija slika za odbranu: šta se tačno dešava kad korisnik klikne „Potvrdi rezervaciju".

```
FRONT  Book.tsx
  │  korisnik popunio formu, klik "Potvrdi"
  │  createReservation({ zoneId: 2, ticketCount: 3, ... })
  ▼
axios  POST http://localhost:5225/api/reservation   (telo = JSON)
  ▼
BACK   ReservationController.Create([FromBody] dto)
  │  [ApiController] prvo validira dto (Required, Range, EmailAddress)
  │  ako padne validacija → 400 odmah, ne ulazi u servis
  ▼
BACK   ReservationService.CreateAsync(dto)
  │  1. nađi zonu                → SELECT * FROM Zones WHERE Id = 2
  │  2. proveri mesta            → SELECT SUM(TicketCount) ... WHERE ZoneId=2 AND Status='Active'
  │  3. proveri promo kod (ako ima)
  │  4. PricingService.CalculateTotal(...) → cena
  │  5. BEGIN TRANSACTION
  │       INSERT INTO Reservations (...)      ← dobija token i Id
  │       INSERT INTO PromoCodes  (...)       ← nov kod za kupca
  │       (UPDATE iskorišćenog promo koda)
  │     COMMIT
  ▼
BAZA   PostgreSQL izvrši SQL, vrati redove
  ▲
BACK   MapToResponse → ReservationResponseDto   → 201 Created (+ JSON telo)
  ▲
axios  { data: ReservationResponse }
  ▲
FRONT  Book.tsx → navigate('/confirmation', { state: { reservation, pricing } })
  ▲
FRONT  Confirmation.tsx → prikazuje token, promo kod, razradu popusta
```

Primeti kako svaki sloj radi svoj deo i prosleđuje dalje: front skuplja unos, kontroler
validira oblik, servis primenjuje pravila, baza trajno čuva, i odgovor putuje istim putem nazad.

---

## 15. Rekapitulacija redosleda gradnje

Ako bi neko gradio ovu aplikaciju iz početka, ovim redom:

| # | Korak | Rezultat |
|---|---|---|
| 1 | Dizajn baze (entiteti + veze) | znamo koji podaci postoje |
| 2 | Docker + PostgreSQL | živa, prazna baza |
| 3 | .NET projekat + EF Core + DbContext | backend ume da priča sa bazom |
| 4 | Modeli + mapiranje | C# klase ↔ tabele |
| 5 | Migracije + seed | tabele postoje, ima početni koncert |
| 6 | Servisi (Pricing, Concert, Reservation) | sva poslovna pravila |
| 7 | DTO-ovi + validacija | definisan API ugovor |
| 8 | Kontroleri | HTTP endpointi |
| 9 | Program.cs (DI, CORS, Swagger) | backend radi i testira se kroz Swagger |
| 10 | Vite + React skelet + ruter | prazne stranice se prikazuju |
| 11 | API sloj (types, client, endpoints) | front ume da zove backend |
| 12 | Stranice (Home → Book → Confirmation → MyReservation) | korisnik može sve |

**Pravilo koje se provlači kroz sve:** gradi se odozdo nagore (baza → backend → front), a svaki
sloj zna samo za onaj ispod. Podaci putuju: korisnik → komponenta → endpoints → kontroler →
servis → DbContext → baza, i istim putem nazad.

---

*Dokument prati stvarni kod aplikacije (uključujući uprošćeni frontend sa `useState` po polju
i prosleđivanjem `pricing` na stranicu potvrde).*

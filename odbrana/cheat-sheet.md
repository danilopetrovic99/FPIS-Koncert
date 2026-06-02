# CHEAT SHEET — KoncertApp (za bubanje pred ulazak)

> Jedna rečenica po stavci. Pročitaj 2–3 puta pred odbranu. Detalji su u `pitanja-i-odgovori.md`.

---

## TECH STACK (u jednoj rečenici)
**Backend:** .NET 8 Web API + EF Core 8 (ORM) + PostgreSQL 16 (u Dockeru) + Swagger.
**Frontend:** React 18 + TypeScript + Vite + React Router + axios.

---

## ARHITEKTURA — 3 sloja, svaki zna samo onaj ispod
```
Front (React :5173) → API (.NET :5225) → Baza (PostgreSQL :5433)
Controller → Service → DbContext → SQL
```
- **Controller** = tanak, prima HTTP, validira, vraća odgovor. Bez logike.
- **Service** = sva poslovna pravila (ima li mesta, cena, promo kod).
- **DbContext** = EF Core, prevodi C# u SQL.
- **Zašto:** razdvojene odgovornosti → svaki sloj se menja/testira nezavisno.

## FRONTEND struktura
`api/` (komunikacija s backendom) · `lib/` (pomoćne fje) · `components/` (ponovljivi UI) · `pages/` (stranice).
**SPA** = browser učita HTML jednom; React Router menja samo srednji deo, bez reload-a.

---

## DTO (Data Transfer Object)
Klasa koja definiše **šta API prima i vraća**. Različit od modela (model = tabela).
**3 razloga:** (1) ne izlažem celu bazu, (2) izbegavam kružne reference u JSON-u, (3) validacija je na DTO-u.
Ulazni DTO ima `[Required]`, `[Range]`, `[EmailAddress]` → `[ApiController]` vrati 400 pre logike.

## CORS (Cross-Origin Resource Sharing)
Bezbednosno pravilo **browsera**. Front i back su različit port = različit origin → browser blokira.
Rešenje: na **backendu** dozvolim `http://localhost:5173`. `UseCors` ide **pre** `MapControllers`.
Pamti: proverava **browser** (Postman radi bez CORS-a), politika je na **serveru**.

## HTTP zahtev — 4 dela
**Metoda** (GET/POST/PUT/DELETE) · **URL** · **Header** (meta-podaci, npr. `Content-Type: application/json`) · **Body** (sami podaci, JSON).
- GET/DELETE → bez body-ja (GET šalje kroz URL: `?email=...&token=...`).
- POST/PUT → imaju body.
- **Header = KAKO se šalje, Body = SAMI PODACI.**
- U kodu: header na axios instanci (`client.ts`); body = drugi argument `api.post('/reservation', body)`.
- Odgovor takođe ima: **status kod** + header + body. Na frontu čitam `response.data`.

---

## LINQ / EF Core — Where / GroupBy / Select
```csharp
.Where(r => ... && r.Status == Active)   // SQL: WHERE  → samo aktivne
.GroupBy(r => r.ZoneId)                   // SQL: GROUP BY → grupiši po zoni
.Select(g => new { ZoneId=g.Key, Occupied=g.Sum(r=>r.TicketCount) })  // SQL: SELECT, SUM
.ToDictionaryAsync(...)                    // rečnik { zona → zauzeto }
```
Slobodno = `Capacity − zauzeto`. **`Include(c => c.Zones)` = JOIN** (učita zone uz koncert).
**N+1 problem:** umesto 1 upit po zoni (6 upita za 5 zona), jednim `GroupBy` dobijem sve odjednom.

## OBRAČUN CENE — 3 koraka REDOM (znati napamet)
1. **Early bird −10%** na cenu jedne karte (ako aktivan).
2. **Svaka 5. karta −50%** (5., 10., 15. karta — `i % 5 == 0`).
3. **Promo kod −5%** na ukupan zbir.
`Math.Round(total, 2)` na kraju. Frontend ima isti algoritam za **live preview**; pravi obračun radi backend.

---

## TABELE I VEZE
```
Concert 1—N Zone 1—N Reservation
Reservation 1—1 PromoCode (owned: dobije ga)
Reservation 1—0..1 PromoCode (used: opciono koristi tuđi)
```
- **OnDelete:** Concert→Zone = **Cascade** (briši zone s koncertom); Zone→Reservation = **Restrict** (ne brisati zonu s rezervacijama).
- **Unique index:** na `Token` i na promo `Code` (ne mogu dva ista).

## IZRAČUNATA POLJA (nema ih u bazi, računaju se)
- **AvailableSeats** = `Capacity − suma aktivnih karata`.
- **IsEarlyBirdActive** = `DateTime.UtcNow <= EarlyBirdDeadline`.
- **Zašto:** ne dupliram podatak koji mogu da izvedem (jedan izvor istine).

## SOFT DELETE
Otkazivanje ne briše red — menja `Status` na `Cancelled`. Čuva istoriju; slobodna mesta ionako broje samo `Active`.

## PROMO KOD — životni ciklus
Kreira se uz svaku rezervaciju (`Active`) → kad ga neko iskoristi (`Used`) → ako vlasnik otkaže a kod NIJE iskorišćen (`Cancelled`).
Ako je već `Used`, ostaje `Used` (neko ga je iskoristio, to se ne poništava).

## TOKEN (bezbednost)
32-znakovni `Guid.NewGuid().ToString("N")`. Za pristup rezervaciji treba **i email i token** (dvostruka provera).

---

## TRANSAKCIJA (pri kreiranju rezervacije)
Rezervacija + njen promo kod nastaju zajedno: `BeginTransaction` → INSERT oba → `Commit`; ako bilo šta pukne → `Rollback`.
**Zašto:** atomičnost — ili sve ili ništa; bez toga rezervacija bez promo koda = nekonzistentno stanje.

## DEPENDENCY INJECTION (DI)
Ne pravim servise sa `new`. U `Program.cs`: `AddScoped<IService, Service>()` → framework ih ubaci u konstruktor.
**AddScoped** = nova instanca po HTTP zahtevu. **Interfejsi** → labava povezanost, lako se menja/testira (mock).

## async / await
I/O ka bazi/mreži ne blokira nit. `await` = „pusti nit dok stigne rezultat" → server obrađuje više zahteva.

## MIGRACIJE / SEED
Migracija = verzionisana šema (`CREATE TABLE` iz modela). Primenjuje se automatski pri startu (`MigrateAsync`).
`DbInitializer` puni bazu početnim koncertom ako je prazna (`if (AnyAsync()) return;` — ne duplira).

## HTTP STATUS KODOVI
200 OK · 201 Created (nova rezervacija) · 204 No Content (otkazivanje) · 400 Bad Request (loš ulaz/biznis greška) · 404 Not Found.

---

## SITNICE KOJE PROFESORI VOLE
- **decimal a ne double** za novac → double ima greške zaokruživanja.
- **enum kao string** u bazi → čitljivije + stabilno (dodavanje vrednosti ne pomera brojeve).
- **decimal(10,2)** → `HasPrecision(10,2)`, max 99.999.999,99.
- **Swagger** = automatska dokumentacija + testiranje API-ja na `/swagger`.
- **`[FromBody]`** = čita JSON iz tela; **`[FromQuery]`** = čita iz URL-a (`?email=...`).
- **`[Route("api/[controller]")]`** → `ConcertController` postaje ruta `api/concert`.

## REACT HOOKS (frontend)
- **useState** — stanje koje se pamti između rendera (polja forme).
- **useEffect(() => {...}, [])** — pokrene se posle prvog rendera; tu zovem API. `[]` = samo jednom.
- **useNavigate** — programatska navigacija (`navigate('/book')`).
- **useLocation** — čitam `location.state` (prenos podataka među stranicama, npr. token na Confirmation).

---

## 30-SEKUNDNI PITCH (ako kaže „ukratko opiši projekat")
> „Aplikacija za rezervaciju karata za jedan koncert. Frontend je React SPA koji preko axios-a
> zove .NET Web API. API je u slojevima — kontroler prima zahtev, servis radi pravila, EF Core
> upisuje u PostgreSQL. Tri popusta: early bird −10%, svaka 5. karta −50%, promo kod −5%. Korisnik
> rezerviše, dobije token i promo kod, i kasnije preko email+token može da izmeni ili otkaže."

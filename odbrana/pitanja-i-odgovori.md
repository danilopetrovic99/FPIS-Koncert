# PITANJA I ODGOVORI ZA ODBRANU

> Pripremljeno na osnovu pitanja koja su već postavljena: arhitektura backenda i frontenda,
> DTO, CORS, header i body na frontu, i LINQ pozivi (Where / GroupBy / Select).
> Odgovori su napisani onako kako bi se rekli **naglas** — pročitaj ih par puta da uđu u glavu.

---

## Sadržaj

1. [Objasni arhitekturu backenda](#1-objasni-arhitekturu-backenda)
2. [Objasni arhitekturu frontenda](#2-objasni-arhitekturu-frontenda)
3. [Šta je DTO i zašto ga koristiš](#3-šta-je-dto-i-zašto-ga-koristiš)
4. [Šta je CORS](#4-šta-je-cors)
5. [Header i body na frontu (HTTP zahtev)](#5-header-i-body-na-frontu-http-zahtev)
6. [LINQ pozivi: Where / GroupBy / Select](#6-linq-pozivi-where--groupby--select)
7. [Brza priprema — ostala česta pitanja](#7-brza-priprema--ostala-česta-pitanja)

---

## 1. Objasni arhitekturu backenda

**Kratko:** Backend je .NET 8 Web API organizovan u **slojeve**, gde svaki sloj ima jednu odgovornost
i zna samo za sloj ispod sebe.

```
HTTP zahtev
   ↓
Controller   → prima zahtev, validira ulaz, vraća HTTP odgovor (status + JSON)
   ↓
Service      → poslovna logika (pravila: ima li mesta, obračun cene, promo kod)
   ↓
DbContext    → EF Core, prevodi C# u SQL
   ↓
PostgreSQL   → baza, gde podaci trajno žive
```

**Kako bih to rekao profesoru:**

> „Backend je podeljen u tri sloja. **Kontroler** je tanak — on samo prima HTTP zahtev,
> proverava da li je ulaz validan i vraća odgovor; ne sadrži poslovnu logiku. Sva pravila su u
> **servisima** — na primer `ReservationService` proverava da li ima slobodnih mesta, poziva
> `PricingService` za cenu, i upisuje rezervaciju. Servis priča sa bazom preko **DbContext-a**,
> koji je deo Entity Framework Core-a i prevodi moj C# kod u SQL. Tako je svaki sloj nezavisan —
> mogu da promenim pravila u servisu bez diranja kontrolera, ili bazu bez diranja logike."

**Zašto slojevi (ako te pita „zašto tako"):**
- razdvojene odgovornosti → lakše se čita i menja;
- kontroler ne zna za bazu, servis ne zna za HTTP → svaki sloj može da se testira/zameni zasebno;
- logika je na **jednom mestu** (u servisu), ne razbacana po kontrolerima.

**Konkretni fajlovi (za primer):** `ConcertController`, `ReservationController` (kontroleri);
`ConcertService`, `ReservationService`, `PricingService` (servisi); `AppDbContext` (pristup bazi);
`Models/` (entiteti = tabele); `DTOs/` (oblik podataka za API).

---

## 2. Objasni arhitekturu frontenda

**Kratko:** Frontend je React **SPA** (Single Page Application) u TypeScript-u, podeljen po odgovornosti.

```
src/
├── api/         → komunikacija sa backendom (types, client, endpoints)
├── lib/         → pomoćne funkcije bez UI-a (format cene/datuma, obračun cene)
├── components/  → mali ponovljivi delovi UI-a (Header, Footer, Alert, ZoneCard, TicketCounter)
└── pages/       → cele stranice (Home, Book, Confirmation, MyReservation)
```

**Kako bih to rekao profesoru:**

> „Frontend je React aplikacija. To je **SPA** — browser učita HTML samo jednom, a kad korisnik
> klikne na link, ne osvežava se cela stranica; React Router samo zameni komponentu u sredini, dok
> Header i Footer ostaju. Kod je podeljen na **stranice** (`pages/`) koje korisnik vidi, i male
> **komponente** (`components/`) koje se ponavljaju. Sav saobraćaj ka serveru ide kroz **API sloj**
> (`api/`) — tu je `endpoints.ts` sa funkcijama kao `getConcert()` i `createReservation()`, koje
> interno koriste axios. Stranica drži svoje stanje kroz `useState`, a podatke učitava kroz
> `useEffect` kad se otvori."

**Tok korisnika (ako traži):**
`Home` (vidi koncert i zone) → `Book` (popuni formu, vidi cenu uživo) → `Confirmation`
(dobije token i promo kod) → `MyReservation` (pronađe rezervaciju preko email+token, izmeni/otkaže).

**Ključni React pojmovi:**
- `useState` — stanje koje se pamti između rendera (npr. polja forme);
- `useEffect` — pokreće se posle prvog rendera, tu zovem API;
- `useNavigate` / `useLocation` — navigacija i prenos podataka između stranica.

---

## 3. Šta je DTO i zašto ga koristiš

**DTO = Data Transfer Object** — klasa koja definiše **tačno koji podaci putuju kroz API**
(šta API prima i šta vraća). Nije isto što i model.

> „**Model** (npr. `Reservation`) odgovara tabeli u bazi — ima sve kolone i navigaciona svojstva
> ka drugim tabelama. **DTO** je posebna klasa koja opisuje samo ono što ide ka frontu ili dolazi
> sa fronta. Razdvajam ih iz tri razloga."

**Tri razloga (ovo reci):**
1. **Ne izlažem celu bazu** — front ne treba (ni ne sme) da vidi sve interne kolone i veze.
2. **Izbegavam kružne reference** — model `Reservation` ima `Zone`, `Zone` ima listu `Reservations`...
   ako bih to direktno serijalizovao u JSON, vrteo bi se u krug. DTO nosi samo ravne podatke.
3. **Validacija je na DTO-u** — ulazni DTO ima atribute koje ASP.NET proveri **pre** logike.

**Primer (ulazni DTO sa validacijom):**
```csharp
public class CreateReservationDto
{
    [Required] public int ZoneId { get; set; }
    [Required, Range(1, 50)] public int TicketCount { get; set; }
    [Required, EmailAddress] public string Email { get; set; } = "";
    public string? PromoCode { get; set; }   // bez [Required] = opciono
}
```
> „Ako neko pošalje 0 karata ili neispravan email, `[ApiController]` automatski vrati 400 Bad
> Request i kod **nikad ne uđe** u servis. Tako se logika bavi samo ispravnim podacima."

**Primer (izlazni DTO):** `ReservationResponseDto` nosi token, naziv zone, cenu, generisani promo
kod — plus **izračunata polja** kojih nema u bazi (npr. `AvailableSeats`, `IsEarlyBirdActive`).

**Jednom rečenicom:** *DTO je „ugovor" između fronta i backenda — definiše oblik podataka i odvaja
spoljašnji API od unutrašnjih modela baze.*

---

## 4. Šta je CORS

**CORS = Cross-Origin Resource Sharing** — bezbednosno pravilo **u browseru** koje kontroliše da li
sajt sa jednog „origin"-a sme da zove drugi „origin".

**Šta je „origin":** kombinacija **protokol + domen + port**. Naš front je na
`http://localhost:5173`, a backend na `http://localhost:5225` — **različit port = različit origin**.

> „CORS je bezbednosni mehanizam browsera. Pošto su moj frontend i backend na različitim portovima,
> browser ih tretira kao različite origin-e i **podrazumevano blokira** poziv sa fronta na backend —
> to se zove cross-origin zahtev. Da bih to dozvolio, na **backendu** definišem CORS politiku koja
> eksplicitno kaže ‚dozvoli zahteve sa `http://localhost:5173`'. Tek tada browser pusti odgovor do
> mog koda."

**Kod (na backendu, u `Program.cs`):**
```csharp
builder.Services.AddCors(o => o.AddPolicy("ReactApp",
    p => p.WithOrigins("http://localhost:5173")  // dozvoli samo moj front
          .AllowAnyHeader()
          .AllowAnyMethod()));
// ...
app.UseCors("ReactApp");   // mora PRE app.MapControllers()
```

**Tri stvari koje profesor voli da čuje:**
- CORS proverava **browser**, ne server — zato `curl` ili Postman rade i bez CORS-a (oni nisu browser).
- Politika se definiše na **backendu** (server kaže kome veruje), iako grešku prijavljuje browser.
- `UseCors` mora doći **pre** `MapControllers`, inače se ne primeni.

**Ako pita „šta bi se desilo bez CORS-a":** browser bi blokirao svaki `fetch`/axios poziv ka
`:5225`, u konzoli bi pisalo „blocked by CORS policy", i front ne bi mogao da učita podatke.

---

## 5. Header i body na frontu (HTTP zahtev)

Ovo je ono što je prošli put zafalilo. Ključ: **svaki HTTP zahtev ima 4 dela.**

```
1. METODA   — GET, POST, PUT, DELETE   (šta radim)
2. URL      — http://localhost:5225/api/reservation   (gde)
3. HEADERS  — meta-podaci o zahtevu (npr. koji format šaljem)
4. BODY     — sadržaj zahteva (podaci), u JSON formatu
```

**HEADER** = „zaglavlje", dodatne informacije **o** zahtevu (ne sami podaci).
Najvažniji u našoj aplikaciji je `Content-Type: application/json` — on govori serveru
„telo ovog zahteva je JSON, parsiraj ga kao JSON".

**BODY** = „telo", **sami podaci** koje šaljem (npr. podaci rezervacije kao JSON objekat).
- `GET` i `DELETE` obično **nemaju** body (samo traže/brišu) — kod GET-a podaci idu kroz URL.
- `POST` i `PUT` **imaju** body — tu su podaci koje upisujem/menjam.

**U kodu (`client.ts`):** header postavljam jednom, na axios instanci, pa važi za svaki poziv:
```ts
export const api = axios.create({
  baseURL: 'http://localhost:5225/api',
  headers: { 'Content-Type': 'application/json' },  // ← HEADER za sve zahteve
});
```

**Body (`endpoints.ts`):** drugi argument axios-a je telo zahteva — axios ga sam pretvori u JSON:
```ts
export async function createReservation(body: CreateReservationRequest) {
  const { data } = await api.post('/reservation', body);  // ← BODY je drugi argument
  return data;
}
```

**Kako bih to rekao profesoru:**

> „Kad sa fronta šaljem rezervaciju, pravim HTTP **POST** zahtev. U **header** stavljam
> `Content-Type: application/json`, čime serveru kažem da je telo zahteva JSON. U **body** ide
> sam objekat sa podacima — zona, broj karata, ime, email itd. Axios taj JavaScript objekat
> automatski serijalizuje u JSON string. Kod `GET` zahteva, kao kod dohvatanja rezervacije, nema
> body-ja — tamo email i token šaljem kroz **query** u URL-u: `?email=...&token=...`."

**Konkretan primer kako zahtev izgleda „na žici":**
```
POST /api/reservation HTTP/1.1
Host: localhost:5225
Content-Type: application/json        ← HEADER

{                                     ← BODY (JSON)
  "zoneId": 2,
  "ticketCount": 3,
  "firstName": "Marko",
  "email": "marko@example.com"
}
```

**I odgovor takođe ima header i body:**
```
HTTP/1.1 201 Created                  ← STATUS kod
Content-Type: application/json        ← HEADER odgovora

{ "token": "a3f7...", "totalPrice": 8100, ... }   ← BODY odgovora
```

> Na frontu, iz odgovora čitam `response.data` (axios je već parsirao JSON body u objekat).
> Status kod (200, 201, 400...) axios koristi da odluči da li je poziv uspeo ili je bacio grešku.

**Header vs body jednom rečenicom:** *Header opisuje **kako** se podaci šalju (format, meta-podaci),
body su **sami podaci**.*

---

## 6. LINQ pozivi: Where / GroupBy / Select

Ovo je upit iz `ConcertService` koji računa **slobodna mesta po zoni**. Pitanje glasi:
„koliko je karata zauzeto u svakoj zoni?".

```csharp
var occupiedByZone = await _context.Reservations
    .Where(r => zoneIds.Contains(r.ZoneId) && r.Status == ReservationStatus.Active)
    .GroupBy(r => r.ZoneId)
    .Select(g => new { ZoneId = g.Key, Occupied = g.Sum(r => r.TicketCount) })
    .ToDictionaryAsync(x => x.ZoneId, x => x.Occupied);
```

**Šta radi svaki korak (LINQ se prevodi u SQL):**

| LINQ (C#) | SQL ekvivalent | Šta znači |
|---|---|---|
| `.Where(...)` | `WHERE` | uzmi samo aktivne rezervacije za naše zone |
| `.GroupBy(r => r.ZoneId)` | `GROUP BY ZoneId` | grupiši rezervacije po zoni |
| `.Sum(r => r.TicketCount)` | `SUM(TicketCount)` | saberi karte unutar svake grupe |
| `.Select(...)` | `SELECT ZoneId, SUM(...)` | uzmi id zone i njen zbir |

Generisani SQL je otprilike:
```sql
SELECT "ZoneId", SUM("TicketCount")
FROM "Reservations"
WHERE "ZoneId" IN (1,2,3,4,5) AND "Status" = 'Active'
GROUP BY "ZoneId";
```

**Kako bih to rekao profesoru:**

> „Ovde tražim koliko je mesta zauzeto u svakoj zoni. Prvo `Where` izdvoji samo **aktivne**
> rezervacije za zone ovog koncerta — otkazane ne brojim. Onda `GroupBy` grupiše rezervacije po
> zoni, a `Sum` unutar svake grupe sabere broj karata. Rezultat pretvorim u rečnik `zona → zauzeto`.
> Na kraju, slobodna mesta dobijem kao `Capacity − zauzeto`. Key je u tome što ovo radim **jednim
> upitom** za sve zone."

**Konkretan primer (uvek pomaže):**

Aktivne rezervacije: zona 1 → 3 karte i 2 karte; zona 2 → 4 karte.
```
GroupBy + Sum →  { zona 1: 5,  zona 2: 4 }
Slobodno: VIP(200) = 200−5 = 195;  Parter(800) = 800−4 = 796
Balkon (nema rezervacija) = 1500 − 0 = 1500   (GetValueOrDefault vrati 0)
```

**N+1 problem (zašto baš ovako, ne u petlji):**

> „Mogao bih da prođem kroz svaku zonu i za svaku posebno pitam bazu koliko je zauzeto — ali to bi
> za 5 zona bilo 1 upit za koncert + 5 upita za zone = 6 odlazaka u bazu. To je **N+1 problem**.
> Svaki odlazak u bazu je spor, pa umesto toga jednim `GroupBy` upitom dobijem zauzeća za **sve**
> zone odjednom — 1 upit umesto 6."

> Sporedno: `Include(c => c.Zones)` u prethodnom upitu je `JOIN` — učitava zone zajedno sa koncertom.

---

## 7. Brza priprema — ostala česta pitanja

**Šta je ORM / EF Core?**
> Object-Relational Mapper. Mapira C# klase na SQL tabele i prevodi moj kod (`.Where`, `.FirstOrDefault`)
> u SQL upite, pa ne pišem SQL ručno. EF Core je Microsoft-ov ORM za .NET.

**Šta su migracije?**
> Verzionisana šema baze. `dotnet ef migrations add` generiše opis svih `CREATE TABLE` na osnovu mojih
> modela; pri startu aplikacije se automatski primene (`MigrateAsync`) pa baza dobije tabele.

**Šta je Dependency Injection?**
> Ne pravim servise ručno sa `new`. U `Program.cs` registrujem „kad neko traži `IReservationService`,
> daj `ReservationService`", a framework ih sam ubaci u konstruktor kontrolera. Lakše testiranje i
> labava povezanost. `AddScoped` = nova instanca po svakom HTTP zahtevu.

**Zašto interfejsi (`IPricingService`)?**
> Kontroler zavisi od „ugovora", ne od konkretne klase — implementacija se lako zameni (npr. mock u testu).

**Šta je async/await?**
> Operacije ka bazi/mreži ne blokiraju nit dok čekaju. `await` znači „pusti nit slobodnom dok stigne
> rezultat". Tako server obrađuje više zahteva sa manje niti.

**Zašto transakcija pri kreiranju rezervacije?**
> Rezervacija i njen promo kod moraju nastati **zajedno** — ili oboje uspe (`Commit`) ili ništa
> (`Rollback`). Bez toga bi mogla da nastane rezervacija bez promo koda — nekonzistentno stanje.

**HTTP status kodovi koje koristim?**
> 200 OK (uspeh GET/PUT), 201 Created (nova rezervacija), 204 No Content (otkazivanje),
> 400 Bad Request (loš ulaz ili biznis greška), 404 Not Found (ne postoji).

**Zašto je cena `decimal`, a ne `double`?**
> Zato što je novac. `double`/`float` imaju greške zaokruživanja (0.1 + 0.2 ≠ 0.3), `decimal` je tačan.

**Zašto se status čuva kao tekst (`"Active"`) a ne broj?**
> Čitljivije je direktno u bazi, i stabilnije — ako dodam novu enum vrednost u sredinu, brojevi bi
> se pomerili i pokvarili stare zapise; tekst ostaje isti.

**Kako se obračunava cena? (znati napamet — 3 koraka redom)**
> 1) Early bird −10% na cenu jedne karte. 2) Svaka 5. karta −50%. 3) Promo kod −5% na ukupan zbir.

---

*Savet za usmeno: na svako pitanje prvo daj **jednu rečenicu definicije**, pa **zašto** to postoji,
pa tek onda **primer iz koda**. Profesori najviše cene kad znaš „zašto", ne samo „šta".*

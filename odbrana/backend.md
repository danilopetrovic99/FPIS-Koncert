# BACKEND — Kompletno objašnjenje za odbranu

## Tehnološki stack

| Tehnologija | Uloga |
|---|---|
| ASP.NET Core 8 | Web framework za REST API |
| Entity Framework Core 8 | ORM — komunikacija sa bazom |
| PostgreSQL 16 | Relaciona baza podataka |
| Npgsql | PostgreSQL driver za EF Core |
| Swagger / Swashbuckle | Automatska API dokumentacija |
| Docker | Pokretanje PostgreSQL u kontejneru |

## Arhitektura projekta

```
HTTP zahtev
    ↓
Controller         ← prima zahtev, validira, vraća HTTP response
    ↓
Service            ← poslovna logika
    ↓
AppDbContext       ← EF Core — prevodi C# u SQL
    ↓
PostgreSQL         ← baza podataka
```

Svaki sloj zna samo za sloj ispod — Controller ne pristupa bazi direktno, Service ne zna za HTTP.

---

## Redosled fajlova

1. [docker-compose.yml](#1-docker-composeyml)
2. [KoncertApp.API.csproj](#2-koncertappapiproj)
3. [appsettings.json](#3-appsettingsjson)
4. [appsettings.Development.json](#4-appsettingsdevelopmentjson)
5. [Properties/launchSettings.json](#5-propertieslaunchsettingsjson)
6. [Models/Concert.cs](#6-modelsconcertcs)
7. [Models/Zone.cs](#7-modelszonecs)
8. [Models/Reservation.cs](#8-modelsreservationcs)
9. [Models/ReservationStatus.cs](#9-modelsreservationstatuscs)
10. [Models/PromoCode.cs](#10-modelspromocodecs)
11. [Models/PromoCodeStatus.cs](#11-modelspromocodestatuscs)
12. [DTOs/ConcertInfoDto.cs](#12-dtosconcertinfodtocs)
13. [DTOs/ZoneInfoDto.cs](#13-dtoszoninfodtocs)
14. [DTOs/CreateReservationDto.cs](#14-dtoscreatereservationdtocs)
15. [DTOs/ReservationResponseDto.cs](#15-dtosreservationresponsedtocs)
16. [DTOs/UpdateReservationDto.cs](#16-dtosupdatereservationdtocs)
17. [DTOs/CancelReservationDto.cs](#17-dtoscancelreservationdtocs)
18. [Data/AppDbContext.cs](#18-dataappdbcontextcs)
19. [Data/DbInitializer.cs](#19-datadbinializercs)
20. [Migrations/](#20-migrations)
21. [Services/IConcertService.cs](#21-servicesiconcertservicecs)
22. [Services/ConcertService.cs](#22-servicesconcertservicecs)
23. [Services/IPricingService.cs](#23-servicesipricingservicecs)
24. [Services/PricingService.cs](#24-servicespricingservicecs)
25. [Services/IReservationService.cs](#25-servicesireservationservicecs)
26. [Services/ReservationService.cs](#26-servicesreservationservicecs)
27. [Controllers/ConcertController.cs](#27-controllersconcertcontrollercs)
28. [Controllers/ReservationController.cs](#28-controllersreservationcontrollercs)
29. [Program.cs](#29-programcs)

---

## 1. `docker-compose.yml`

**Šta je:** YAML fajl koji opisuje Docker kontejnere. Jedna komanda `docker-compose up` kreira i pokreće PostgreSQL bazu bez ikakve ručne instalacije.

**Zašto postoji:** Da svi razvojni programeri imaju identično okruženje baze — iste verzije, iste lozinke, isti portovi. Ne treba instalirati PostgreSQL lokalno.

```yaml
services:
  db:
    image: postgres:16              # koristi gotovu PostgreSQL 16 sliku sa Docker Hub-a
    container_name: koncertapp-db  # ime kontejnera (vidljivo u docker ps)
    environment:
      POSTGRES_DB: koncertapp       # automatski kreira bazu sa ovim imenom pri prvom pokretanju
      POSTGRES_USER: postgres       # korisničko ime za bazu
      POSTGRES_PASSWORD: admin123   # lozinka — mora da se poklopi sa appsettings.json
    ports:
      - "5433:5432"
      # levi broj (5433) = port na tvojoj mašini
      # desni broj (5432) = port unutar kontejnera (PostgreSQL default)
      # koristi 5433 umesto 5432 da ne bi konfliktovao sa eventualnom lokalnom instalacijom
    volumes:
      - koncertapp_pgdata:/var/lib/postgresql/data
      # named volume — podaci ostaju i posle docker stop/start
      # bez ovoga svaki restart briše sve podatke
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d koncertapp"]
      # pg_isready je PostgreSQL alat koji proverava da li baza prihvata konekcije
      interval: 5s    # proverava svakih 5 sekundi
      timeout: 5s     # čeka max 5s na odgovor
      retries: 20     # pokušava 20 puta (ukupno 100s) pre nego proglasi grešku

volumes:
  koncertapp_pgdata:   # definiše named volume — Docker ga čuva između restarta
```

**Ključna stvar za odbranu:** Port je `5433`, ne standardnih `5432` — to mora da se poklopi sa connection stringom u `appsettings.json`.

---

## 2. `KoncertApp.API.csproj`

**Šta je:** XML projektni fajl — ekvivalent `package.json` iz Node.js sveta. Govori .NET kompajleru koje pakete da instalira i koje opcije da koristi.

**Zašto postoji:** MSBuild (Microsoft build sistem) čita ovaj fajl da zna kako da izgradi projekat.

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
<!-- Sdk.Web uključuje sve za ASP.NET Core (MVC, routing, middleware...) -->

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <!-- kompajlira za .NET 8 runtime -->

    <Nullable>enable</Nullable>
    <!-- nullable reference types — kompajler upozorava ako može biti null
         bez ovoga: string s = null; // bez greške
         sa ovim:   string s = null; // greška kompajlera -->

    <ImplicitUsings>enable</ImplicitUsings>
    <!-- automatski uključuje najčešće using direktive (System, System.Collections.Generic...)
         ne mora da se piše using System; na vrhu svakog fajla -->
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.3" />
    <!-- OpenAPI/Swagger podrška — generisanje JSON opisa API-ja -->

    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.11">
      <PrivateAssets>all</PrivateAssets>
      <!-- PrivateAssets=all znači: ovaj paket je samo za alate (dotnet ef migrations add)
           ne ide u produkciju, ne kopira se u output folder -->
    </PackageReference>

    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.11" />
    <!-- PostgreSQL driver za Entity Framework Core
         bez ovoga EF Core ne zna kako da komunicira sa PostgreSQL -->

    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.4.0" />
    <!-- Swagger UI — vizuelni interfejs za testiranje API-ja u browseru -->
  </ItemGroup>

</Project>
```

---

## 3. `appsettings.json`

**Šta je:** Glavni konfiguracioni fajl aplikacije u JSON formatu. Čita se pri svakom pokretanju.

**Zašto postoji:** Da konfiguracija bude odvojena od koda — ne mora da se rekompajlira aplikacija kad se promeni lozinka baze.

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      // loguje sve poruke nivoa Information i iznad (Information, Warning, Error, Critical)
      // ne loguje Debug i Trace (previše detalja)

      "Microsoft.AspNetCore": "Warning"
      // za ASP.NET interne poruke loguje samo Warning+ (preskače Information poruke o rutiranju)
    }
  },
  "AllowedHosts": "*",
  // prihvata HTTP zahteve sa bilo kog host headera
  // u produkciji bi bio "mojaapp.com" (zaštita od host header injection)

  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=koncertapp;Username=postgres;Password=admin123"
    // Npgsql format connection stringa
    // Host=localhost → baza radi na istoj mašini (u Docker kontejneru)
    // Port=5433 → port koji smo mapirali u docker-compose.yml
    // Database=koncertapp → ime baze iz POSTGRES_DB varijable
    // Username/Password → mora da se poklopi sa docker-compose.yml
  }
}
```

---

## 4. `appsettings.Development.json`

**Šta je:** Konfiguracioni override koji se primenjuje **samo** kad je `ASPNETCORE_ENVIRONMENT=Development`.

**Zašto postoji:** Odvaja development postavke od produkcijskih. U produkciji se ne učitava ovaj fajl.

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
// Ovde samo redefiniše logging nivo — sve ostalo nasledjuje iz appsettings.json
// U produkcijskom appsettings.json tipično bi bio "Warning" za Default (manje logova)
// U development-u "Information" daje više detalja za debugging
```

**Redosled učitavanja:** `appsettings.json` → `appsettings.{Environment}.json` (prepisuje prethodne vrednosti).

---

## 5. `Properties/launchSettings.json`

**Šta je:** Konfiguracioni fajl koji govori Visual Studio / VS Code kako da pokrene projekat lokalno. **Nikad ne ide na produkciju** — koristi se samo za razvoj.

**Zašto postoji:** Definiše različite profile pokretanja — možeš birati da li pokreneš sa HTTP, HTTPS ili kroz IIS Express.

```json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  // govori editoru gde da nađe pravila za autocomplete ovog JSON-a

  "iisSettings": {
    "windowsAuthentication": false,   // ne koristi Windows/AD autentifikaciju
    "anonymousAuthentication": true,  // svi mogu da pristupe bez logovanja
    "iisExpress": {
      "applicationUrl": "http://localhost:36604",  // random port koji VS bira
      "sslPort": 44387                             // SSL port za HTTPS
    }
  },

  "profiles": {
    "http": {
      // OVAJ PROFIL SE KORISTI u ovom projektu
      "commandName": "Project",       // pokreni direktno kao .NET process (dotnet run)
      "dotnetRunMessages": true,      // prikazuje startup poruke u terminalu
      "launchBrowser": true,          // automatski otvori browser
      "launchUrl": "swagger",         // otvori browser na /swagger URL-u
      "applicationUrl": "http://localhost:5225",  // API sluša na ovom portu
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
        // setuje environment varijablu → učitava appsettings.Development.json
        // → prikazuje Swagger UI
        // → prikazuje detaljne greške (stack trace)
      }
    },

    "https": {
      "commandName": "Project",
      "applicationUrl": "https://localhost:7159;http://localhost:5225",
      // sluša na DVA porta odjednom — HTTPS na 7159 i HTTP na 5225
      // zahteva dev sertifikat: dotnet dev-certs https --trust
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },

    "IIS Express": {
      "commandName": "IISExpress",
      // pokreće kroz IIS Express (mini Windows web server)
      // koristi portove iz iisSettings sekcije gore
      // stariji način — većina projekata danas koristi "http" profil
      "launchBrowser": true,
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

**Zašto `http` profil i port `5225`:** Frontend (React) poziva `http://localhost:5225` — mora da se poklopi sa CORS podešavanjem u `Program.cs`.

---

## 6. `Models/Concert.cs`

**Šta je:** C# klasa koja predstavlja tabelu `Concerts` u bazi podataka. Entity Framework Core mapira ovu klasu na SQL tabelu.

**Zašto postoji:** Definiše strukturu podataka o koncertu — svako polje klase postaje kolona u bazi.

```csharp
namespace KoncertApp.API.Models;

public class Concert
{
    public int Id { get; set; }
    // primarni ključ — EF Core automatski detektuje property "Id" kao PK
    // u bazi: INTEGER PRIMARY KEY AUTOINCREMENT (auto-increment)

    public string Name { get; set; } = string.Empty;
    // ime koncerta: "Eros Ramazzotti – Battito Infinito World Tour"
    // = string.Empty sprečava null warning (Nullable je enable u .csproj)
    // inicijalizuje se na "" da kompajler ne prijavljuje potencijalnu null vrednost

    public string City { get; set; } = string.Empty;
    // grad: "Beograd"

    public string Location { get; set; } = string.Empty;
    // mesto: "Štark Arena"

    public string ConcertDates { get; set; } = string.Empty;
    // datum kao slobodan tekst: "12. jul 2026."
    // string umesto DateTime jer mogu biti višednevni koncerti ("12-13. jul 2026.")

    public string? AdditionalInfo { get; set; }
    // ? = nullable — ovo polje može biti NULL u bazi
    // opcionalne info: radno vreme, parking, napomene

    public DateTime EarlyBirdDeadline { get; set; }
    // rok do kog važi early bird cena (10% popust)
    // uvek se čuva kao UTC vreme

    public ICollection<Zone> Zones { get; set; } = new List<Zone>();
    // navigaciona kolekcija — predstavlja 1:N relaciju
    // jedan Concert ima više Zone
    // EF Core automatski popunjava ovu listu kad koristiš .Include(c => c.Zones)
    // inicijalizovana na praznu listu da ne bude null
}
```

**Relacije:**
- Concert → Zone: jedan koncert ima više zona (1:N)

---

## 7. `Models/Zone.cs`

**Šta je:** Klasa koja predstavlja zonu na koncertu (VIP Parter, Balkon...). Svaka zona ima kapacitet i cenu.

```csharp
namespace KoncertApp.API.Models;

public class Zone
{
    public int Id { get; set; }
    // primarni ključ

    public int ConcertId { get; set; }
    // strani ključ → tabela Concerts
    // EF Core automatski kreira FOREIGN KEY ograničenje u bazi

    public string Name { get; set; } = string.Empty;
    // ime zone: "VIP Parter", "Parter", "Tribina Istok", "Tribina Zapad", "Balkon"

    public int Capacity { get; set; }
    // ukupan kapacitet zone (200, 800, 1200, 1200, 1500)
    // nepromenjiv — ne može se povećati/smanjiti

    public decimal PricePerTicket { get; set; }
    // cena po karti u dinarima (12000.00, 7500.00...)
    // decimal umesto double/float jer je novac — float/double ima zaokruživanje greške

    public Concert Concert { get; set; } = null!;
    // navigaciona referenca ka nadređenom Concert objektu
    // null! = "ja garantujem da ovo neće biti null u runtime" (compiler trick)
    // EF Core uvek popunjava ovo kad učitaš zonu sa Include

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    // sve rezervacije za ovu zonu
    // koristimo za računanje slobodnih mesta: Capacity - sum(TicketCount where Active)
}
```

**Relacije:**
- Zone → Concert: N:1 (strani ključ ConcertId)
- Zone → Reservation: 1:N

---

## 8. `Models/Reservation.cs`

**Šta je:** Najvažnija klasa — predstavlja jednu rezervaciju karata. Čuva sve podatke o kupcu, broju karata, ceni i promo kodovima.

```csharp
namespace KoncertApp.API.Models;

public class Reservation
{
    public int Id { get; set; }

    public int ZoneId { get; set; }
    // u kojoj zoni su rezervisana mesta

    public ReservationStatus Status { get; set; } = ReservationStatus.Active;
    // enum: Active ili Cancelled
    // inicijalno Active — svaka nova rezervacija je aktivna
    // otkazivanjem postaje Cancelled (soft delete — podaci ostaju u bazi)

    public string Token { get; set; } = string.Empty;
    // jedinstveni identifikator rezervacije, npr: "a3f7b2c18e4d5f6a7b8c9d0e1f2a3b4c"
    // 32 hex karaktera bez crtica (Guid.NewGuid().ToString("N"))
    // korisnik ga dobija posle rezervacije i koristi ga za pristup/izmenu/otkazivanje
    // ima UNIQUE INDEX u bazi — dva tokena ne mogu biti ista

    public int TicketCount { get; set; }
    // broj rezervisanih karata (1-50)

    public decimal TotalPrice { get; set; }
    // ukupna cena posle svih popusta
    // HasPrecision(10, 2) u DbContext — čuva se sa 2 decimale

    public bool IsEarlyBird { get; set; }
    // da li je primenjen early bird popust (10%)
    // true ako je rezervacija napravljena pre EarlyBirdDeadline

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // vreme kreiranja rezervacije (UTC)
    // uvek UTC — izbjegavamo probleme sa vremenskim zonama

    // Podaci o kupcu:
    public string FirstName { get; set; } = string.Empty;   // Ime
    public string LastName { get; set; } = string.Empty;    // Prezime
    public string? Company { get; set; }                    // Firma (opciono)
    public string Address1 { get; set; } = string.Empty;   // Adresa
    public string? Address2 { get; set; }                  // Adresa red 2 (opciono)
    public string PostalCode { get; set; } = string.Empty; // Poštanski broj
    public string City { get; set; } = string.Empty;       // Grad
    public string Country { get; set; } = string.Empty;    // Država
    public string Email { get; set; } = string.Empty;      // Email (jedinstven za token)

    public int? UsedPromoCodeId { get; set; }
    // ID promo koda koji je koristio pri rezervaciji (može biti null)
    // nullable int? jer nije obavezno koristiti promo kod

    // Navigacione reference:
    public Zone Zone { get; set; } = null!;
    // zona u kojoj je rezervacija

    public PromoCode? UsedPromoCode { get; set; }
    // promo kod koji je ovaj korisnik iskoristio (ako je koristio)

    public PromoCode? OwnedPromoCode { get; set; }
    // promo kod koji je DOBIO ovaj korisnik (za dalje deljenje)
    // svaka rezervacija generiše jedan promo kod
}
```

**Soft delete princip:** Otkazana rezervacija ne briše se iz baze — menja se samo Status na Cancelled. Podaci ostaju sačuvani.

---

## 9. `Models/ReservationStatus.cs`

**Šta je:** Nabrojani tip (enum) koji definiše moguće statuse rezervacije.

```csharp
namespace KoncertApp.API.Models;

public enum ReservationStatus
{
    Active,    // vrednost 0 — rezervacija je važeća, karte su "zauzete"
    Cancelled  // vrednost 1 — rezervacija je otkazana, mesta su oslobođena
}
// U bazi se čuva kao tekst ("Active"/"Cancelled") — konfigurisano u AppDbContext
// HasConversion<string>() — lakše čitanje direktno u bazi, ne treba dekodirati brojeve
```

---

## 10. `Models/PromoCode.cs`

**Šta je:** Promo kod koji se generiše automatski za svaku rezervaciju. Može se podeliti prijatelju koji ga koristi za 5% popusta.

```csharp
namespace KoncertApp.API.Models;

public class PromoCode
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;
    // 8 karaktera, velika slova, npr: "A3F7B2C1"
    // generiše se: Guid.NewGuid().ToString("N")[..8].ToUpper()
    // UNIQUE INDEX u bazi — ne mogu postojati dva ista koda

    public PromoCodeStatus Status { get; set; } = PromoCodeStatus.Active;
    // Active → može se iskoristiti
    // Used → već iskorišćen, ne može ponovo
    // Cancelled → vlasnik je otkazao rezervaciju, kod postaje nevažeći

    public int OwnerReservationId { get; set; }
    // strani ključ → rezervacija koja JE DOBILA ovaj promo kod
    // svaka rezervacija dobija tačno jedan promo kod (1:1)

    public int? UsedByReservationId { get; set; }
    // strani ključ → rezervacija koja JE ISKORISTILA ovaj promo kod
    // null dok nije iskorišćen, popunjava se pri korišćenju

    public Reservation OwnerReservation { get; set; } = null!;  // vlasnik
    public Reservation? UsedByReservation { get; set; }         // ko ga je koristio
}
```

**Logika promo koda:**
- Marko pravi rezervaciju → dobija kod "A3F7B2C1"
- Ana pravi rezervaciju i upisuje "A3F7B2C1" → dobija 5% popust
- Kod prelazi u status Used, UsedByReservationId = Ana.Id
- Ako Marko otkaže → kod postaje Cancelled (čak i ako Ana već nije iskoristila)

---

## 11. `Models/PromoCodeStatus.cs`

**Šta je:** Enum koji definiše moguće statuse promo koda.

```csharp
namespace KoncertApp.API.Models;

public enum PromoCodeStatus
{
    Active,    // kod postoji i može se iskoristiti za 5% popust
    Used,      // kod je već iskorišćen — ne može se koristiti ponovo (jedan put)
    Cancelled  // vlasnikova rezervacija je otkazana → kod više ne važi
               // čak i ako nije bio iskorišćen
}
```

---

## 12. `DTOs/ConcertInfoDto.cs`

**Šta je DTO:** Data Transfer Object — klasa koja definiše tačno šta API šalje/prima. **Nije isti kao Model** — Model odgovara bazi, DTO odgovara API-ju.

**Zašto:** Razdvajanje — ne šaljemo frontend-u sve kolone iz baze, niti izlažemo interne detalje strukture.

```csharp
namespace KoncertApp.API.DTOs;

public class ConcertInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ConcertDates { get; set; } = string.Empty;
    public string? AdditionalInfo { get; set; }
    public DateTime EarlyBirdDeadline { get; set; }
    // ova polja dolaze direktno iz Concert modela

    public bool IsEarlyBirdActive { get; set; }
    // NOVO POLJE kojih nema u bazi — backend IZRAČUNAVA:
    // DateTime.UtcNow <= concert.EarlyBirdDeadline
    // frontend ne treba da zna deadline i da sam proverava — backend to radi

    public List<ZoneInfoDto> Zones { get; set; } = new();
    // lista zona — svaka zona ima svoje DTO
    // List<> umesto ICollection<> jer JSON serijalizacija voli konkretne tipove
}
```

---

## 13. `DTOs/ZoneInfoDto.cs`

**Šta je:** DTO za zonu — sadrži computed polje `AvailableSeats` koje ne postoji u bazi.

```csharp
namespace KoncertApp.API.DTOs;

public class ZoneInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public decimal PricePerTicket { get; set; }
    // ova polja su direktno iz Zone modela

    public int AvailableSeats { get; set; }
    // COMPUTED — backend računa: Capacity - SUM(TicketCount) gde je Status=Active
    // frontend prikazuje "X slobodnih mesta" bez sopstvenog računanja
}
```

---

## 14. `DTOs/CreateReservationDto.cs`

**Šta je:** DTO koji frontend **šalje** kad korisnik pravi rezervaciju. Ima validacione atribute.

**Data Annotations:** Atributi koji automatski validiraju ulazne podatke. `[ApiController]` u kontroleru automatski vraća 400 Bad Request ako validacija padne.

```csharp
using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class CreateReservationDto
{
    [Required]
    public int ZoneId { get; set; }
    // obavezno — mora biti prosleđen ID zone

    [Required, Range(1, 50)]
    public int TicketCount { get; set; }
    // obavezno, minimalno 1, maksimalno 50 karata po rezervaciji

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    // ime, max 100 karaktera

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Company { get; set; }
    // opciono — bez [Required]

    [Required, MaxLength(200)]
    public string Address1 { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Address2 { get; set; }

    [Required, MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;
    // [EmailAddress] proverava format: mora biti x@y.z

    public string? PromoCode { get; set; }
    // opciono, bez validacije formata (backend provera postoji li u bazi)
}
```

---

## 15. `DTOs/ReservationResponseDto.cs`

**Šta je:** DTO koji API **vraća** frontendu posle kreiranja ili dohvatanja rezervacije.

```csharp
namespace KoncertApp.API.DTOs;

public class ReservationResponseDto
{
    public int Id { get; set; }

    public string Token { get; set; } = string.Empty;
    // 32-char token za pristup rezervaciji — JEDNOM se vidi, korisnik ga mora sačuvati

    public string Status { get; set; } = string.Empty;
    // "Active" ili "Cancelled" (enum se serijalizuje kao string zbog JsonStringEnumConverter)

    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;  // "VIP Parter" itd.
    public int TicketCount { get; set; }
    public decimal TotalPrice { get; set; }
    public bool IsEarlyBird { get; set; }

    public string GeneratedPromoCode { get; set; } = string.Empty;
    // promo kod koji je DOBIO ovaj kupac (8 karaktera, veliki)
    // može ga podeliti prijatelju za 5% popust

    public DateTime CreatedAt { get; set; }
    // vreme kreiranja rezervacije

    // Podaci o kupcu — sve što je prosleđeno pri kreiranju:
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}
```

---

## 16. `DTOs/UpdateReservationDto.cs`

**Šta je:** DTO za izmenu rezervacije — minimalan skup podataka.

```csharp
using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class UpdateReservationDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
    // identifikuje KOJU rezervaciju menjamo

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    // verifikuje VLASNIŠTVO — mora da se poklopi sa email-om u rezervaciji
    // sprečava da neko drugi menja tuđu rezervaciju (security)

    [Required, Range(1, 50)]
    public int TicketCount { get; set; }
    // novi broj karata — jedino što se može promeniti
}
// Može se promeniti SAMO broj karata (ne zona, ne lični podaci, ne email)
// Cena se automatski ponovo računa po istim pravilima
```

---

## 17. `DTOs/CancelReservationDto.cs`

**Šta je:** DTO za otkazivanje — samo token i email za verifikaciju.

```csharp
using System.ComponentModel.DataAnnotations;

namespace KoncertApp.API.DTOs;

public class CancelReservationDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
    // koji token da se otkaže

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    // vlasnik mora znati email — dvostruka verifikacija identiteta
    // korisnik mora znati I token I email da bi otkazao
}
```

---

## 18. `Data/AppDbContext.cs`

**Šta je:** Srce Entity Framework Core-a. Ova klasa predstavlja sesiju sa bazom podataka. Kroz nju se sve čita i piše u PostgreSQL.

**Zašto postoji:** EF Core prevodi LINQ upite (C# kod) u SQL — ne moramo pisati SQL ručno.

```csharp
using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
// Primary Constructor sintaksa (.NET 8) — ekvivalentno sa:
// public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
// prima opcije (connection string, provider) i prosleđuje baznoj DbContext klasi
{
    // DbSet = tabela u bazi. Kroz ovu property pišemo LINQ upite.
    public DbSet<Concert> Concerts => Set<Concert>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<PromoCode> PromoCodes => Set<PromoCode>();
    // Set<T>() je preporučeni moderni način umesto direktnog DbSet<T> polja

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    // ova metoda se poziva jednom pri kreiranju modela — konfigurišemo relacije i pravila
    {
        // === RELACIJE ===

        // Zone → Concert: N:1
        // jedna zona pripada jednom koncertu, jedan koncert ima više zona
        modelBuilder.Entity<Zone>()
            .HasOne(z => z.Concert)         // zona ima jednog concert-a
            .WithMany(c => c.Zones)         // concert ima kolekciju zona
            .HasForeignKey(z => z.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);
            // Cascade: ako obrišemo Concert → automatski se brišu sve njegove Zone

        // Reservation → Zone: N:1
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Zone)
            .WithMany(z => z.Reservations)
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);
            // Restrict: ne možeš obrisati Zonu dok postoje aktivne rezervacije za nju
            // ovo štiti integritet podataka

        // Reservation ↔ PromoCode (koju je koristio): 1:1
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.UsedPromoCode)
            .WithOne(p => p.UsedByReservation)
            .HasForeignKey<PromoCode>(p => p.UsedByReservationId)
            .OnDelete(DeleteBehavior.NoAction);
            // NoAction: ne radi ništa automatski pri brisanju
            // ručno upravljamo statusima

        // PromoCode ↔ Reservation (vlasnik): 1:1
        modelBuilder.Entity<PromoCode>()
            .HasOne(p => p.OwnerReservation)
            .WithOne(r => r.OwnedPromoCode)
            .HasForeignKey<PromoCode>(p => p.OwnerReservationId)
            .OnDelete(DeleteBehavior.Restrict);
            // ne možeš obrisati Reservation dok njen PromoCode postoji

        // === UNIQUE INDEXI ===
        modelBuilder.Entity<Reservation>()
            .HasIndex(r => r.Token)
            .IsUnique();
            // dva tokena ne mogu biti ista — baza garantuje jedinstvenost

        modelBuilder.Entity<PromoCode>()
            .HasIndex(p => p.Code)
            .IsUnique();
            // dva promo koda ne mogu biti isti

        // === ENUM KONVERZIJA ===
        modelBuilder.Entity<Reservation>()
            .Property(r => r.Status)
            .HasConversion<string>();
            // u bazi: "Active" ili "Cancelled" (ne 0/1)
            // lakše čitanje direktno u bazi, migracije su čitljivije

        modelBuilder.Entity<PromoCode>()
            .Property(p => p.Status)
            .HasConversion<string>();
            // "Active", "Used" ili "Cancelled"

        // === DECIMAL PRECIZNOST ===
        modelBuilder.Entity<Zone>()
            .Property(z => z.PricePerTicket)
            .HasPrecision(10, 2);
            // SQL tip: NUMERIC(10,2) → max 99,999,999.99
            // 2 decimale za cene

        modelBuilder.Entity<Reservation>()
            .Property(r => r.TotalPrice)
            .HasPrecision(10, 2);
            // isto za ukupnu cenu
    }
}
```

---

## 19. `Data/DbInitializer.cs`

**Šta je:** Statička klasa koja se poziva jednom pri pokretanju aplikacije. Pokreće migracije i puni bazu inicijalnim podacima ako je prazna.

**Zašto postoji:** Automatizacija setup-a — pokretanje aplikacije je dovoljno, ne mora ručno da se kreira baza i ubacuju podaci.

```csharp
using KoncertApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KoncertApp.API.Data;

public static class DbInitializer  // static = ne može da se instancira
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();
        // pokreće sve neuvedene migracije (kreira tabele, indexe, foreign key-eve)
        // ekvivalentno sa: dotnet ef database update
        // idempotentno — ako su migracije već primenjene, ništa se ne menja

        if (await context.Concerts.AnyAsync())
            return;
        // proverava da li postoji ijedan koncert u bazi
        // ako postoji → ne radi ništa (seed se preskače)
        // ovo je "idempotency check" — možeš restartovati aplikaciju koliko puta hoćeš

        var concert = new Concert
        {
            Name = "Eros Ramazzotti – Battito Infinito World Tour",
            City = "Beograd",
            Location = "Štark Arena",
            ConcertDates = "12. jul 2026.",
            AdditionalInfo = "Jedinstveno muzičko iskustvo...",
            EarlyBirdDeadline = DateTime.UtcNow.AddDays(30),
            // early bird aktivan 30 dana od pokretanja aplikacije

            Zones = new List<Zone>
            {
                new() { Name = "VIP Parter",     Capacity = 200,  PricePerTicket = 12000m },
                new() { Name = "Parter",          Capacity = 800,  PricePerTicket = 7500m  },
                new() { Name = "Tribina Istok",   Capacity = 1200, PricePerTicket = 5500m  },
                new() { Name = "Tribina Zapad",   Capacity = 1200, PricePerTicket = 5500m  },
                new() { Name = "Balkon",          Capacity = 1500, PricePerTicket = 3900m  }
            }
            // Zone se automatski snimaju zajedno sa Concert-om (cascade insert)
            // EF Core zna da postavi ConcertId na svaku zonu
        };

        context.Concerts.Add(concert);
        await context.SaveChangesAsync();
        // šalje INSERT u bazu — sve u jednoj transakciji
    }
}
```

---

## 20. `Migrations/`

**Šta je:** Automatski generisani fajlovi koje EF Core kreira komandom `dotnet ef migrations add`. Opisuju promene šeme baze (CREATE TABLE, ALTER TABLE...).

**Zašto postoji:** Verzionisanje šeme baze uz kod — kada tim dobije novi kod, pokretanjem `MigrateAsync()` baza se automatski ažurira na ispravnu verziju.

- `20260401190707_InitialCreate.cs` — opisuje šta da se napravi u bazi (Up metoda) i šta da se poništi (Down metoda)
- `20260401190707_InitialCreate.Designer.cs` — EF Core metapodaci, ne menja se ručno
- `AppDbContextModelSnapshot.cs` — "fotografija" trenutnog stanja modela, EF Core je koristi da zna koje promene su nove

**Nikad ne menjati ručno** — generisani su automatski i EF Core ih koristi za praćenje stanja.

---

## 21. `Services/IConcertService.cs`

**Šta je:** Interfejs koji definiše "ugovor" za ConcertService. Kontroler zna samo za interfejs, ne za implementaciju.

**Zašto interfejsi:** Dependency Injection princip — kontroler traži `IConcertService`, a ASP.NET ubacuje `ConcertService`. Lako se zamenjuje implementacija (npr. za testove).

```csharp
using KoncertApp.API.DTOs;

namespace KoncertApp.API.Services;

public interface IConcertService
{
    Task<ConcertInfoDto?> GetConcertInfoAsync();
    // Task<> = asinhronost — ne blokira thread dok čeka bazu
    // ConcertInfoDto? = može da vrati null (ako nema koncerta u bazi)
}
```

---

## 22. `Services/ConcertService.cs`

**Šta je:** Implementacija IConcertService. Dohvata podatke o koncertu i računa dostupnost mesta.

```csharp
public class ConcertService : IConcertService
{
    private readonly AppDbContext _context;
    // readonly = ne može se promeniti posle konstruktora

    public ConcertService(AppDbContext context)
    {
        _context = context;
        // Dependency Injection — AppDbContext se automatski ubacuje
    }

    public async Task<ConcertInfoDto?> GetConcertInfoAsync()
    {
        var concert = await _context.Concerts
            .Include(c => c.Zones)
            // Include = JOIN u SQL — učitava Zone zajedno sa Concert-om
            // bez Include: concert.Zones bi bio prazna lista (lazy loading nije uključen)
            .FirstOrDefaultAsync();
            // uzima prvi (i jedini) koncert, ili null ako baza prazna

        if (concert is null) return null;

        var zoneIds = concert.Zones.Select(z => z.Id).ToList();
        // lista ID-jeva svih zona ovog koncerta

        var occupiedByZone = await _context.Reservations
            .Where(r => zoneIds.Contains(r.ZoneId) && r.Status == ReservationStatus.Active)
            // filtrira: samo aktivne rezervacije za zone ovog koncerta
            .GroupBy(r => r.ZoneId)
            // grupiše po ZoneId — SQL: GROUP BY ZoneId
            .Select(g => new { ZoneId = g.Key, Occupied = g.Sum(r => r.TicketCount) })
            // za svaku grupu: ZoneId i suma karata — SQL: SUM(TicketCount)
            .ToDictionaryAsync(x => x.ZoneId, x => x.Occupied);
            // pretvara u Dictionary<int, int>: { zoneId → zauzetih }
            // GetValueOrDefault(zoneId, 0) → 0 ako zona nema ni jednu rezervaciju

        return new ConcertInfoDto
        {
            // ... kopira polja iz Concert modela ...
            IsEarlyBirdActive = DateTime.UtcNow <= concert.EarlyBirdDeadline,
            // izračunava da li je early bird period aktivan
            Zones = concert.Zones.Select(z => new ZoneInfoDto
            {
                // ... kopira polja iz Zone modela ...
                AvailableSeats = z.Capacity - occupiedByZone.GetValueOrDefault(z.Id, 0)
                // slobodna mesta = kapacitet - zauzeto
                // GetValueOrDefault vraća 0 ako zona nema rezervacija (nije u dictionary-u)
            }).ToList()
        };
    }
}
```

**SQL koji se generiše (otprilike):**
```sql
SELECT c.*, z.* FROM Concerts c
LEFT JOIN Zones z ON z.ConcertId = c.Id
LIMIT 1;

SELECT ZoneId, SUM(TicketCount) FROM Reservations
WHERE ZoneId IN (1,2,3,4,5) AND Status = 'Active'
GROUP BY ZoneId;
```

---

## 23. `Services/IPricingService.cs`

**Šta je:** Interfejs za servis koji računa cenu karata.

```csharp
namespace KoncertApp.API.Services;

public interface IPricingService
{
    decimal CalculateTotal(
        decimal basePrice,    // osnovna cena karte u zoni
        int ticketCount,      // broj karata
        bool isEarlyBird,     // da li važi early bird
        bool hasPromoCode     // da li je unet promo kod
    );
}
```

---

## 24. `Services/PricingService.cs`

**Šta je:** Implementacija logike cena sa tri tipa popusta.

```csharp
public class PricingService : IPricingService
{
    private const decimal EarlyBirdDiscount = 0.10m;   // 10% — sufiks m = decimal literal
    private const decimal FifthTicketDiscount = 0.50m; // 50% na svaku 5. kartu
    private const decimal PromoDiscount = 0.05m;        // 5% promo kod popust

    public decimal CalculateTotal(decimal basePrice, int ticketCount, bool isEarlyBird, bool hasPromoCode)
    {
        decimal unitPrice = isEarlyBird
            ? basePrice * (1 - EarlyBirdDiscount)  // 10% off svake karte
            : basePrice;                            // puna cena

        decimal total = ApplyFifthTicketDiscount(unitPrice, ticketCount);
        // svaka 5. karta je 50% jeftinija

        if (hasPromoCode)
            total *= (1 - PromoDiscount);
        // promo popust se primenjuje NA UKUPAN iznos (posle ostalih popusta)

        return Math.Round(total, 2);
        // zaokružuje na 2 decimale (novac)
    }

    private static decimal ApplyFifthTicketDiscount(decimal unitPrice, int count)
    {
        decimal total = 0;
        for (int i = 1; i <= count; i++)
            total += (i % 5 == 0)           // i % 5 == 0: i=5,10,15,20...
                ? unitPrice * (1 - FifthTicketDiscount)  // 50% cene
                : unitPrice;                              // puna cena
        return total;
    }
}
```

**Primer izračuna — 7 karata po 10000, early bird, sa promo:**
- unitPrice = 10000 * 0.90 = 9000
- karte 1,2,3,4 = 9000 * 4 = 36000
- karta 5 = 9000 * 0.50 = 4500 (5. popust)
- karte 6,7 = 9000 * 2 = 18000
- subtotal = 36000 + 4500 + 18000 = 58500
- promo = 58500 * 0.95 = 55575
- **Ukupno: 55575 RSD**

---

## 25. `Services/IReservationService.cs`

**Šta je:** Interfejs za sve operacije nad rezervacijama — CRUD.

```csharp
public interface IReservationService
{
    Task<ReservationResponseDto> CreateAsync(CreateReservationDto dto);
    // pravi novu rezervaciju, vraća dto sa tokenom i promo kodom

    Task<ReservationResponseDto> GetByTokenAsync(string email, string token);
    // dohvata rezervaciju — verifikuje email i token

    Task<ReservationResponseDto> UpdateAsync(UpdateReservationDto dto);
    // menja broj karata — ponovo računa cenu

    Task CancelAsync(CancelReservationDto dto);
    // otkazuje rezervaciju — ne vraća ništa (Task bez generičkog tipa)
}
```

---

## 26. `Services/ReservationService.cs`

**Šta je:** Najkompleksnija klasa u projektu — implementira sve operacije nad rezervacijama.

### `CreateAsync`

```csharp
public async Task<ReservationResponseDto> CreateAsync(CreateReservationDto dto)
{
    // 1. Proveri da zona postoji
    var zone = await _context.Zones
        .Include(z => z.Concert)
        // Include Concert jer trebamo EarlyBirdDeadline
        .FirstOrDefaultAsync(z => z.Id == dto.ZoneId)
        ?? throw new InvalidOperationException("Zona nije pronađena.");
        // ?? throw: ako je null, odmah baci grešku umesto NullReferenceException

    // 2. Proveri dostupnost mesta
    int occupied = await _context.Reservations
        .Where(r => r.ZoneId == dto.ZoneId && r.Status == ReservationStatus.Active)
        .SumAsync(r => (int?)r.TicketCount) ?? 0;
        // (int?) jer SumAsync na praznoj listi vraća null, ne 0
    int available = zone.Capacity - occupied;
    if (available < dto.TicketCount)
        throw new InvalidOperationException($"Nema dovoljno slobodnih mesta. Dostupno: {available}.");

    // 3. Proveri promo kod (ako je unet)
    PromoCode? usedPromo = null;
    if (!string.IsNullOrWhiteSpace(dto.PromoCode))
    {
        usedPromo = await _context.PromoCodes
            .FirstOrDefaultAsync(p => p.Code == dto.PromoCode && p.Status == PromoCodeStatus.Active)
            ?? throw new InvalidOperationException("Promo kod nije validan ili je već iskorišćen.");
    }

    // 4. Izračunaj cenu
    bool isEarlyBird = DateTime.UtcNow <= zone.Concert.EarlyBirdDeadline;
    decimal total = _pricing.CalculateTotal(zone.PricePerTicket, dto.TicketCount, isEarlyBird, usedPromo is not null);

    // 5. Sve u transakciji
    await using var tx = await _context.Database.BeginTransactionAsync();
    // BeginTransactionAsync otvara SQL transakciju
    // await using → automatski poziva DisposeAsync pri izlasku iz bloka
    try
    {
        var reservation = new Reservation
        {
            Token = Guid.NewGuid().ToString("N"),
            // "N" format: 32 hex karaktera bez crtica
            // npr: "a3f7b2c18e4d5f6a7b8c9d0e1f2a3b4c"
            // ... ostala polja ...
        };
        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync();
        // COMMIT1: snima rezervaciju da dobijemo reservation.Id

        var ownedPromo = new PromoCode
        {
            Code = GeneratePromoCode(),   // 8 random karaktera
            Status = PromoCodeStatus.Active,
            OwnerReservationId = reservation.Id  // sada imamo Id
        };
        _context.PromoCodes.Add(ownedPromo);

        if (usedPromo is not null)
        {
            usedPromo.Status = PromoCodeStatus.Used;
            usedPromo.UsedByReservationId = reservation.Id;
            reservation.UsedPromoCodeId = usedPromo.Id;
        }

        await _context.SaveChangesAsync();
        await tx.CommitAsync();
        // COMMIT2: snima promo kod i ažurira iskorišćeni promo
        // oba SaveChangesAsync su unutar iste transakcije

        return MapToResponse(reservation, zone.Name, ownedPromo.Code);
    }
    catch
    {
        await tx.RollbackAsync();
        // ako bilo šta ne uspe → poništava SVE (rezervacija i promo se ne snimaju)
        throw;
        // re-throw: prosleđuje originalnu grešku pozivaocu
    }
}
```

**Zašto transakcija:** Ako se rezervacija snimi ali promo kod ne može (duplikat koda) → bez transakcije baza bi imala rezervaciju bez promo koda. Sa transakcijom sve se poništava — konzistentnost.

### `GetByTokenAsync`

```csharp
public async Task<ReservationResponseDto> GetByTokenAsync(string email, string token)
{
    var reservation = await _context.Reservations
        .Include(r => r.Zone)
        .Include(r => r.OwnedPromoCode)
        .FirstOrDefaultAsync(r =>
            r.Token == token &&
            r.Email == email &&         // dvostruka verifikacija: token + email
            r.Status == ReservationStatus.Active)
            // neaktivne (Cancelled) rezervacije nisu dostupne
        ?? throw new InvalidOperationException("Rezervacija nije pronađena ili je otkazana.");

    return MapToResponse(reservation, reservation.Zone.Name, reservation.OwnedPromoCode?.Code ?? string.Empty);
    // ?. (null-conditional): ako nema OwnedPromoCode, uzima string.Empty
}
```

### `UpdateAsync`

```csharp
public async Task<ReservationResponseDto> UpdateAsync(UpdateReservationDto dto)
{
    // dohvata rezervaciju sa svim Include-ovima koji su potrebni
    var reservation = await _context.Reservations
        .Include(r => r.Zone).ThenInclude(z => z.Concert)
        // ThenInclude: Include unutar Include-a (Zone → Concert)
        .Include(r => r.OwnedPromoCode)
        .FirstOrDefaultAsync(r => r.Token == dto.Token && r.Email == dto.Email && r.Status == ReservationStatus.Active)
        ?? throw new InvalidOperationException(...);

    // računa dostupnost ISKLJUČUJUĆI ovu rezervaciju
    int occupied = await _context.Reservations
        .Where(r => r.ZoneId == reservation.ZoneId &&
                    r.Status == ReservationStatus.Active &&
                    r.Id != reservation.Id)           // isključuje samu sebe!
        .SumAsync(r => (int?)r.TicketCount) ?? 0;

    // ponovo računa cenu (early bird se ponovo proverava!)
    bool isEarlyBird = DateTime.UtcNow <= reservation.Zone.Concert.EarlyBirdDeadline;
    bool hasPromo = reservation.UsedPromoCodeId.HasValue;
    decimal total = _pricing.CalculateTotal(reservation.Zone.PricePerTicket, dto.TicketCount, isEarlyBird, hasPromo);

    reservation.TicketCount = dto.TicketCount;
    reservation.TotalPrice = total;
    reservation.IsEarlyBird = isEarlyBird;
    await _context.SaveChangesAsync();
    // EF Core prati promene na tracked objektima — automatski generiše UPDATE SQL
}
```

### `CancelAsync`

```csharp
public async Task CancelAsync(CancelReservationDto dto)
{
    var reservation = await _context.Reservations
        .Include(r => r.OwnedPromoCode)
        .FirstOrDefaultAsync(r => r.Token == dto.Token && r.Email == dto.Email && r.Status == ReservationStatus.Active)
        ?? throw new InvalidOperationException("Rezervacija nije pronađena ili je već otkazana.");

    reservation.Status = ReservationStatus.Cancelled;
    // soft delete — ne briše iz baze, samo menja status

    if (reservation.OwnedPromoCode?.Status == PromoCodeStatus.Active)
        reservation.OwnedPromoCode.Status = PromoCodeStatus.Cancelled;
    // ako vlasnikov promo kod nije iskorišćen → postaje Cancelled
    // ako je već iskorišćen (Used) → ne menja se (ne možemo "neiskoristiti")

    await _context.SaveChangesAsync();
}
```

### Pomoćne metode

```csharp
private static string GeneratePromoCode()
    => Guid.NewGuid().ToString("N")[..8].ToUpper();
// Guid.NewGuid() → "a3f7b2c1-8e4d-5f6a-7b8c-9d0e1f2a3b4c"
// ToString("N") → "a3f7b2c18e4d5f6a7b8c9d0e1f2a3b4c" (bez crtica)
// [..8] → "a3f7b2c1" (prvih 8 karaktera, range operator)
// ToUpper() → "A3F7B2C1"

private static ReservationResponseDto MapToResponse(Reservation r, string zoneName, string promoCode)
    => new() { /* kopira sva polja iz modela u DTO */ };
// helper metoda na jednom mestu — ne ponavlja se u svakoj metodi
// static jer ne treba pristup instance promenljivama
```

---

## 27. `Controllers/ConcertController.cs`

**Šta je:** HTTP kontroler za endpoint-e vezane za koncert. Prima HTTP zahteve i prosleđuje ih servisu.

```csharp
using KoncertApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace KoncertApp.API.Controllers;

[ApiController]
// automatska validacija modela (Data Annotations) — vraća 400 ako validacija padne
// automatsko parsiranje JSON body-ja
// automatski odgovori na loše zahteve

[Route("api/[controller]")]
// [controller] = ime kontrolera bez sufiksa "Controller" → "concert"
// ruta = api/concert

public class ConcertController : ControllerBase
// ControllerBase = osnovna klasa bez View podrške (MVC bez Razor)
// ima helper metode: Ok(), NotFound(), BadRequest(), CreatedAtAction()...
{
    private readonly IConcertService _service;
    // interfejs, ne konkretna klasa — Dependency Injection

    public ConcertController(IConcertService service)
    {
        _service = service;
        // ASP.NET automatski ubacuje implementaciju registrovanu u Program.cs
    }

    [HttpGet]
    // GET api/concert
    public async Task<IActionResult> GetConcertInfo()
    // IActionResult = može da vrati različite HTTP response tipove
    {
        var info = await _service.GetConcertInfoAsync();
        if (info is null)
            return NotFound(new { message = "Nema unetih podataka o koncertu." });
            // 404 Not Found sa JSON body-jem: { "message": "..." }

        return Ok(info);
        // 200 OK sa ConcertInfoDto serijalizovanim kao JSON
    }
}
```

---

## 28. `Controllers/ReservationController.cs`

**Šta je:** Kontroler za sve CRUD operacije nad rezervacijama. Implementira 4 HTTP metode.

```csharp
[ApiController]
[Route("api/[controller]")]  // api/reservation

public class ReservationController : ControllerBase
{
    private readonly IReservationService _service;

    [HttpPost]
    // POST api/reservation
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto)
    // [FromBody] = čita JSON iz tela zahteva i deserijalizuje u dto
    {
        try
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(
                nameof(Get),                              // ime GET akcije
                new { email = result.Email, token = result.Token }, // parametri za GET URL
                result                                    // body odgovora
            );
            // 201 Created + Location header: api/reservation?email=...&token=...
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
            // 400 Bad Request — greška iz servisa (nema mesta, loš promo kod...)
        }
    }

    [HttpGet]
    // GET api/reservation?email=marko@example.com&token=a3f7b2c1...
    public async Task<IActionResult> Get([FromQuery] string email, [FromQuery] string token)
    // [FromQuery] = čita iz URL query stringa (?email=...&token=...)
    {
        try
        {
            var result = await _service.GetByTokenAsync(email, token);
            return Ok(result);  // 200
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
            // 404 — rezervacija nije nađena
        }
    }

    [HttpPut]
    // PUT api/reservation
    public async Task<IActionResult> Update([FromBody] UpdateReservationDto dto)
    {
        try
        {
            var result = await _service.UpdateAsync(dto);
            return Ok(result);  // 200
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete]
    // DELETE api/reservation
    public async Task<IActionResult> Cancel([FromBody] CancelReservationDto dto)
    // HTTP DELETE sa body-jem — nestandardno ali funkcionalno
    {
        try
        {
            await _service.CancelAsync(dto);
            return NoContent();
            // 204 No Content — uspešno, nema sadržaja za vratiti
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
```

**HTTP kodovi koje koristimo:**
| Kod | Naziv | Kada |
|---|---|---|
| 200 | OK | Uspešan GET/PUT |
| 201 | Created | Uspešan POST (nova rezervacija) |
| 204 | No Content | Uspešan DELETE |
| 400 | Bad Request | Greška u poslovnoj logici |
| 404 | Not Found | Resurs ne postoji |

---

## 29. `Program.cs`

**Šta je:** Entry point aplikacije. Konfiguriše sve servise i middleware pipeline.

```csharp
using KoncertApp.API.Data;
using KoncertApp.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
// kreira builder — skuplja konfiguraciju pre pokretanja

// === REGISTRACIJA SERVISA (Dependency Injection kontejner) ===

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // sprečava beskonačnu petlju pri serijalizaciji kružnih referenci
        // Concert → Zone → Reservations → Zone → Reservations → ...
        // IgnoreCycles: kad naiđe na već viđen objekat, preskače ga

        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // enum-ovi se serijalizuju kao string: "Active" umesto 0
        // frontend prima čitljive vrednosti
    });

builder.Services.AddEndpointsApiExplorer();
// registruje endpoint discovery za Swagger

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "KoncertApp API", Version = "v1" });
});
// generiše OpenAPI JSON i Swagger UI na /swagger

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
// registruje AppDbContext kao Scoped servis (jedan po HTTP zahtevu)
// GetConnectionString čita iz appsettings.json → "DefaultConnection"
// UseNpgsql govori EF Core-u da koristi PostgreSQL (ne SQL Server, ne SQLite)

// Registracija servisa — AddScoped: novi objekat po svakom HTTP zahtevu
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IConcertService, ConcertService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
// kada kontroler zatraži IConcertService, dobija ConcertService instancu
// Scoped (ne Singleton) jer AppDbContext je Scoped — ne može u Singleton

builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactApp", policy =>
        policy
            .WithOrigins("http://localhost:5173")
            // dozvoljava zahteve samo sa React dev servera
            // browser blokira cross-origin zahteve — ovo ih dozvoljava
            .AllowAnyHeader()   // prihvata bilo koji HTTP header
            .AllowAnyMethod())); // prihvata GET, POST, PUT, DELETE...

// === BUILD ===
var app = builder.Build();
// "zamrzava" konfiguraciju i pravi aplikaciju

// === DATABASE INICIJALIZACIJA ===
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.InitializeAsync(db);
    // kreira Scoped scope jer DbContext nije dostupan van HTTP zahteva
    // pokreće migracije i seed podatke
}
// using → scope se automatski dispose-uje posle bloka

// === MIDDLEWARE PIPELINE ===
// Redosled je bitan — zahtev prolazi kroz middleware redom

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();     // /swagger/v1/swagger.json
    app.UseSwaggerUI();   // /swagger → vizuelni UI
    // dostupno samo u Development modu
}

app.UseCors("ReactApp");
// primenjuje CORS politiku — mora biti pre MapControllers
// dodaje Access-Control-Allow-Origin header na svaki odgovor

app.MapControllers();
// registruje sve [ApiController] klase kao HTTP endpoint-e
// pronalazi sve kontrolere i mapira njihove rute

app.Run();
// startuje HTTP server i blokira dok se aplikacija ne ugasi
```

---

## Tok jednog HTTP zahteva — end-to-end

```
Browser/Frontend (React :5173)
    ↓ POST http://localhost:5225/api/reservation
    ↓ JSON body: { zoneId: 2, ticketCount: 3, firstName: "Marko", ... }

Program.cs middleware pipeline:
    ↓ UseCors → dodaje CORS header (dozvoljava :5173)
    ↓ MapControllers → pronalazi ReservationController

ReservationController.Create()
    ↓ [ApiController] validira DTO (Required, Range, EmailAddress...)
    ↓ ako validacija padne → 400 automatski (ne ulazi u metodu)
    ↓ poziva _service.CreateAsync(dto)

ReservationService.CreateAsync()
    ↓ proverava zonu (postoji?)
    ↓ proverava kapacitet (ima mesta?)
    ↓ proverava promo kod (validan?)
    ↓ računa cenu (PricingService)
    ↓ BeginTransaction
    ↓ kreira Reservation
    ↓ kreira PromoCode za vlasnika
    ↓ ažurira iskorišćeni promo (ako postoji)
    ↓ CommitTransaction
    ↓ MapToResponse → ReservationResponseDto

AppDbContext (EF Core)
    ↓ generiše SQL INSERT/UPDATE
    ↓ šalje na PostgreSQL

PostgreSQL (Docker kontejner :5433)
    ↓ izvršava SQL
    ↓ vraća rezultat

Odgovor:
    ↑ 201 Created
    ↑ Location: api/reservation?email=marko@...&token=a3f7b2...
    ↑ JSON body: { id, token, generatedPromoCode, totalPrice, ... }
```

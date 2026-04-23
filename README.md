# KoncertApp – Eros Ramazzotti Battito Infinito World Tour

Projektni zadatak – FPIS / MAS  
Stack: **React + TypeScript** · **ASP.NET Core (.NET 8)** · **PostgreSQL 16** (Docker)

---

## Zahtevi

| Alat | Verzija |
|---|---|
| [Node.js](https://nodejs.org/) | 20+ |
| [.NET SDK](https://dotnet.microsoft.com/download) | 8.0 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | bilo koja (mora biti pokrenut) |

---

## Pokretanje projekta

### 1. Klonuj repozitorijum

```bash
git clone <repo-url>
cd KoncertApp
```

---

### 2. Pokreni bazu podataka (Docker)

```bash
cd backend
docker compose up -d
```

Ovo podiže **PostgreSQL 16** kontejner:

| Parametar | Vrednost |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Baza | `koncertapp` |
| Korisnik | `postgres` |
| Lozinka | `admin123` |

Proveri da li je kontejner gore:
```bash
docker compose ps
```
Treba da piše `Up (healthy)`.

---

### 3. Pokreni backend (ASP.NET Core API)

```bash
cd backend/KoncertApp.API
dotnet run
```

Pri prvom pokretanju API automatski:
1. Primenjuje EF Core migracije na bazu
2. Ubacuje seed podatke (koncert + 5 zona)

API sluša na: **`http://localhost:5225`**  
Swagger dokumentacija: **`http://localhost:5225/swagger`**

---

### 4. Pokreni frontend (React + Vite)

U novom terminalu:

```bash
cd frontend/koncert-app
npm install
npm run dev
```

Frontend sluša na: **`http://localhost:5173`**

---

## Stranice aplikacije

| URL | Opis |
|---|---|
| `/` | Pregled koncerta, zona i cena |
| `/book` | Forma za rezervaciju karata (live preračun cene) |
| `/confirmation` | Potvrda rezervacije + token + promo kod |
| `/my` | Pregled, izmena i otkazivanje rezervacije |

---

## Pravila obračuna cene

| Popust | Uslov | Iznos | Redosled |
|---|---|---|---|
| Early Bird | Rezervacija pre roka | −10% na cenu karte | 1. |
| Svaka 5. karta | Pozicija 5, 10, 15… u rezervaciji | −50% na već sniženu cenu | 2. |
| Promo kod | Validan aktivan kod | −5% na ukupan zbir | 3. |

---

## API endpointi

### Koncert
| Metoda | Ruta | Opis |
|---|---|---|
| `GET` | `/api/concert` | Info o koncertu + zone sa slobodnim mestima |

### Rezervacije
| Metoda | Ruta | Opis |
|---|---|---|
| `POST` | `/api/reservation` | Kreira rezervaciju, vraća token + promo kod |
| `GET` | `/api/reservation?email=&token=` | Dohvata aktivnu rezervaciju |
| `PUT` | `/api/reservation` | Menja broj karata (ponovo obračunava cenu) |
| `DELETE` | `/api/reservation` | Otkazuje rezervaciju |

---

## Struktura projekta

```
KoncertApp/
├── backend/
│   ├── docker-compose.yml          # PostgreSQL kontejner
│   └── KoncertApp.API/
│       ├── Controllers/            # ConcertController, ReservationController
│       ├── Data/                   # AppDbContext, DbInitializer (seed)
│       ├── DTOs/                   # Request/Response objekti
│       ├── Migrations/             # EF Core migracije
│       ├── Models/                 # Concert, Zone, Reservation, PromoCode
│       ├── Services/               # ConcertService, ReservationService, PricingService
│       ├── appsettings.json        # Connection string
│       └── Program.cs
├── docs/
│   └── mini-specifikacija.html    # Use case, PMOV, IDEF1X, sekvence, klase, STD
└── frontend/
    └── koncert-app/
        ├── src/
        │   ├── api/                # Axios klijent + endpoint funkcije + tipovi
        │   ├── components/         # Header, Footer, ZoneCard, Field, Alert, TicketCounter
        │   ├── lib/                # format.ts (RSD, datum), pricing.ts (klijentski obračun)
        │   └── pages/              # Home, Book, Confirmation, MyReservation
        └── package.json
```

---

## Zaustavljanje

```bash
# Zaustavi frontend: Ctrl+C u terminalu gde radi npm run dev
# Zaustavi backend: Ctrl+C u terminalu gde radi dotnet run

# Zaustavi i ukloni Docker kontejner (baza ostaje u volumenu):
cd backend
docker compose down

# Ako hoćeš i da obrišeš bazu (sve podatke):
docker compose down -v
```

---

## Ponovni start (sledeći put)

```bash
# Terminal 1 – baza
cd backend && docker compose up -d

# Terminal 2 – API
cd backend/KoncertApp.API && dotnet run

# Terminal 3 – frontend
cd frontend/koncert-app && npm run dev
```

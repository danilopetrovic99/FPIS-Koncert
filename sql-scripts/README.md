# SQL Skripte – KoncertApp

## Kada koristiti ove skripte?

### Preporučen način (EF Core migracije)
Backend automatski upravlja šemom baze. Pokrenuti samo jednom:
```powershell
cd G:\KoncertApp\backend\KoncertApp.API
dotnet ef database update
```
Ovo kreira sve tabele automatski bez potrebe za SQL skriptama.

### Alternativni način (pgAdmin manuelno)
Ako želiš kreirati tabele ručno u pgAdminu:

1. Otvori pgAdmin → desni klik na server → Connect
2. Kreiraj bazu: `CREATE DATABASE koncertapp;`
3. Otvori bazu `koncertapp` → Tools → Query Tool
4. Pokreni skripte ovim redosledom:

| Redosled | Fajl | Opis |
|----------|------|------|
| 1. | `01_create_tables.sql` | Kreira sve tabele, FK ograničenja i indekse |
| 2. | `02_seed_data.sql` | Unosi koncert i zone sa početnim podacima |
| 3. | `03_drop_tables.sql` | Briše sve tabele (koristiti SAMO u razvoju) |

## Napomena
Skripte su usklađene sa EF Core migracijom `20260401190707_InitialCreate`.
Ako koristiš EF Core, **nemoj kombinovati** manuelne skripte i EF migracije
(može doći do konflikta u `__EFMigrationsHistory` tabeli).

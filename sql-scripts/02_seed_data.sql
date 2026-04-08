-- =============================================================
-- KoncertApp – Početni podaci (seed)
-- Pokrenuti POSLE 01_create_tables.sql
-- =============================================================

-- =============================================================
-- Koncert: Eros Ramazzotti – Battito Infinito World Tour
-- =============================================================
INSERT INTO "Concerts" (
    "Name",
    "City",
    "Location",
    "ConcertDates",
    "AdditionalInfo",
    "EarlyBirdDeadline"
)
VALUES (
    'Eros Ramazzotti – Battito Infinito World Tour',
    'Beograd',
    'Štark Arena, Beograd',
    '15. jun 2026.',
    'Koncert u sklopu svetske turneje Battito Infinito. '
    'Ulaznica važi samo za navedeni datum. '
    'Vrata se otvaraju dva sata pre početka.',
    '2026-05-01 00:00:00+00'
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- Zone (vezan za koncert ID = 1)
-- =============================================================
INSERT INTO "Zones" ("ConcertId", "Name", "Capacity", "PricePerTicket")
VALUES
    (1, 'VIP',    200,  9000.00),
    (1, 'Parter', 1000, 5000.00),
    (1, 'Balkon', 800,  2500.00)
ON CONFLICT DO NOTHING;

-- =============================================================
-- Provjera unetih podataka
-- =============================================================
SELECT
    c."Name"        AS "Koncert",
    c."City"        AS "Grad",
    c."EarlyBirdDeadline" AS "Early Bird rok",
    z."Name"        AS "Zona",
    z."Capacity"    AS "Kapacitet",
    z."PricePerTicket" AS "Cena (RSD)"
FROM "Concerts" c
JOIN "Zones" z ON z."ConcertId" = c."Id"
ORDER BY z."PricePerTicket" DESC;

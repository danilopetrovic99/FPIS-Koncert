-- =============================================================
-- KoncertApp – Kreiranje tabela
-- PostgreSQL 14+
-- Pokrenuti u pgAdmin Query Tool na bazi: koncertapp
-- =============================================================

-- Napomena: Ako koristiš EF Core migracije (preporučeno),
-- ove skripte NE treba da pokrećeš manuelno.
-- Dovoljno je pokrenuti: dotnet ef database update
-- Skripte su ovde za reference, pgAdmin inspekciju i akademsku dokumentaciju.

-- 0. Kreiranje baze (pokrenuti kao superuser, van ove skripte ako treba)
-- CREATE DATABASE koncertapp;

-- =============================================================
-- 1. Concerts
-- =============================================================
CREATE TABLE IF NOT EXISTS "Concerts" (
    "Id"                SERIAL          PRIMARY KEY,
    "Name"              TEXT            NOT NULL,
    "City"              TEXT            NOT NULL,
    "Location"          TEXT            NOT NULL,
    "ConcertDates"      TEXT            NOT NULL,
    "AdditionalInfo"    TEXT,
    "EarlyBirdDeadline" TIMESTAMPTZ     NOT NULL
);

-- =============================================================
-- 2. Zones
-- =============================================================
CREATE TABLE IF NOT EXISTS "Zones" (
    "Id"             SERIAL         PRIMARY KEY,
    "ConcertId"      INTEGER        NOT NULL,
    "Name"           TEXT           NOT NULL,
    "Capacity"       INTEGER        NOT NULL,
    "PricePerTicket" NUMERIC(10, 2) NOT NULL,

    CONSTRAINT "FK_Zones_Concerts_ConcertId"
        FOREIGN KEY ("ConcertId")
        REFERENCES "Concerts" ("Id")
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_Zones_ConcertId"
    ON "Zones" ("ConcertId");

-- =============================================================
-- 3. Reservations
-- (UsedPromoCodeId FK se dodaje POSLE kreiranja PromoCodes tabele)
-- =============================================================
CREATE TABLE IF NOT EXISTS "Reservations" (
    "Id"               SERIAL         PRIMARY KEY,
    "ZoneId"           INTEGER        NOT NULL,
    "Status"           TEXT           NOT NULL DEFAULT 'Active',
    "Token"            TEXT           NOT NULL,
    "TicketCount"      INTEGER        NOT NULL,
    "TotalPrice"       NUMERIC(10, 2) NOT NULL,
    "IsEarlyBird"      BOOLEAN        NOT NULL DEFAULT FALSE,
    "CreatedAt"        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    "FirstName"        TEXT           NOT NULL,
    "LastName"         TEXT           NOT NULL,
    "Company"          TEXT,
    "Address1"         TEXT           NOT NULL,
    "Address2"         TEXT,
    "PostalCode"       TEXT           NOT NULL,
    "City"             TEXT           NOT NULL,
    "Country"          TEXT           NOT NULL,
    "Email"            TEXT           NOT NULL,
    "UsedPromoCodeId"  INTEGER,

    CONSTRAINT "FK_Reservations_Zones_ZoneId"
        FOREIGN KEY ("ZoneId")
        REFERENCES "Zones" ("Id")
        ON DELETE RESTRICT,

    CONSTRAINT "CHK_Reservations_Status"
        CHECK ("Status" IN ('Active', 'Cancelled')),

    CONSTRAINT "CHK_Reservations_TicketCount"
        CHECK ("TicketCount" > 0),

    CONSTRAINT "UQ_Reservations_Token"
        UNIQUE ("Token")
);

CREATE INDEX IF NOT EXISTS "IX_Reservations_ZoneId"
    ON "Reservations" ("ZoneId");

-- =============================================================
-- 4. PromoCodes
-- =============================================================
CREATE TABLE IF NOT EXISTS "PromoCodes" (
    "Id"                    SERIAL  PRIMARY KEY,
    "Code"                  TEXT    NOT NULL,
    "Status"                TEXT    NOT NULL DEFAULT 'Active',
    "OwnerReservationId"    INTEGER NOT NULL,
    "UsedByReservationId"   INTEGER,

    CONSTRAINT "FK_PromoCodes_Reservations_OwnerReservationId"
        FOREIGN KEY ("OwnerReservationId")
        REFERENCES "Reservations" ("Id")
        ON DELETE RESTRICT,

    CONSTRAINT "FK_PromoCodes_Reservations_UsedByReservationId"
        FOREIGN KEY ("UsedByReservationId")
        REFERENCES "Reservations" ("Id")
        ON DELETE NO ACTION,

    CONSTRAINT "CHK_PromoCodes_Status"
        CHECK ("Status" IN ('Active', 'Used', 'Cancelled')),

    CONSTRAINT "UQ_PromoCodes_Code"
        UNIQUE ("Code"),

    CONSTRAINT "UQ_PromoCodes_OwnerReservationId"
        UNIQUE ("OwnerReservationId"),

    CONSTRAINT "UQ_PromoCodes_UsedByReservationId"
        UNIQUE ("UsedByReservationId")
);

CREATE INDEX IF NOT EXISTS "IX_PromoCodes_Code"
    ON "PromoCodes" ("Code");

-- =============================================================
-- 5. Dodaj FK sa Reservations -> PromoCodes
--    (mora biti posle kreiranja PromoCodes tabele)
-- =============================================================
ALTER TABLE "Reservations"
    ADD CONSTRAINT "FK_Reservations_PromoCodes_UsedPromoCodeId"
    FOREIGN KEY ("UsedPromoCodeId")
    REFERENCES "PromoCodes" ("Id")
    ON DELETE NO ACTION;

-- =============================================================
-- 6. EF Core migracija tracking tabela (opcionalno)
--    Potrebna ako se kombinuju EF migracije i manuelne skripte
-- =============================================================
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId"    VARCHAR(150) NOT NULL PRIMARY KEY,
    "ProductVersion" VARCHAR(32)  NOT NULL
);

-- Registruj inicijalnu migraciju (ako si prethodno pokrenuo migraciju kroz EF Core)
-- INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
-- VALUES ('20260401190707_InitialCreate', '8.0.0');

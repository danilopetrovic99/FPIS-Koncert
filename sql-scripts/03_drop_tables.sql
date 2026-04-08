-- =============================================================
-- KoncertApp – Brisanje svih tabela
-- UPOZORENJE: Briše SVE podatke! Koristiti samo u razvoju.
-- =============================================================

-- Redosled je bitan zbog FK ograničenja

-- 1. Prvo ukloni FK koji sprečava brisanje (cirkularna veza)
ALTER TABLE "Reservations"
    DROP CONSTRAINT IF EXISTS "FK_Reservations_PromoCodes_UsedPromoCodeId";

-- 2. Briši tabele od zavisnih ka roditeljskim
DROP TABLE IF EXISTS "PromoCodes";
DROP TABLE IF EXISTS "Reservations";
DROP TABLE IF EXISTS "Zones";
DROP TABLE IF EXISTS "Concerts";
DROP TABLE IF EXISTS "__EFMigrationsHistory";

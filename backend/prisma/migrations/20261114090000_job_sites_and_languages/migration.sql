-- =============================================================================
--  Sites d'emploi suivis + langue des offres
-- -----------------------------------------------------------------------------
--  • enum "OfferLanguage" (FR/EN) et "JobSiteKind"
--  • profiles.languages  : langues d'offres acceptées par le candidat
--  • job_offers.language : langue de rédaction de l'offre
--  • job_sites           : catalogue des sites (LinkedIn, Indeed, Apec…)
--  • user_job_sites      : abonnements utilisateur → site
-- =============================================================================

-- Enums
CREATE TYPE "OfferLanguage" AS ENUM ('FR', 'EN');
CREATE TYPE "JobSiteKind" AS ENUM ('JOB_BOARD', 'ATS', 'COMPANY', 'NETWORK', 'OTHER');

-- Langues recherchées par le profil (vide = pas de filtre)
ALTER TABLE "profiles"
  ADD COLUMN "languages" "OfferLanguage"[] NOT NULL DEFAULT ARRAY[]::"OfferLanguage"[];

-- Langue de l'offre : les offres existantes sont considérées francophones
ALTER TABLE "job_offers"
  ADD COLUMN "language" "OfferLanguage" NOT NULL DEFAULT 'FR',
  ADD COLUMN "jobSiteId" UUID;

CREATE INDEX "job_offers_language_idx" ON "job_offers"("language");
CREATE INDEX "job_offers_jobSiteId_idx" ON "job_offers"("jobSiteId");

-- Catalogue des sites d'emploi
CREATE TABLE "job_sites" (
  "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
  "slug"        TEXT           NOT NULL,
  "name"        TEXT           NOT NULL,
  "url"         TEXT           NOT NULL,
  "kind"        "JobSiteKind"  NOT NULL DEFAULT 'JOB_BOARD',
  "country"     TEXT           NOT NULL DEFAULT 'FR',
  "language"    "OfferLanguage" NOT NULL DEFAULT 'FR',
  "description" TEXT,
  "logoUrl"     TEXT,
  "isDefault"   BOOLEAN        NOT NULL DEFAULT false,
  "isActive"    BOOLEAN        NOT NULL DEFAULT true,
  "position"    INTEGER        NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "job_sites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_sites_slug_key" ON "job_sites"("slug");
CREATE INDEX "job_sites_kind_idx" ON "job_sites"("kind");

-- Abonnements utilisateur → site
CREATE TABLE "user_job_sites" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"        UUID         NOT NULL,
  "jobSiteId"     UUID         NOT NULL,
  "customName"    TEXT,
  "accountLabel"  TEXT,
  "notes"         TEXT,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_job_sites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_job_sites_userId_jobSiteId_key" ON "user_job_sites"("userId", "jobSiteId");
CREATE INDEX "user_job_sites_userId_idx" ON "user_job_sites"("userId");

ALTER TABLE "user_job_sites"
  ADD CONSTRAINT "user_job_sites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_job_sites"
  ADD CONSTRAINT "user_job_sites_jobSiteId_fkey"
  FOREIGN KEY ("jobSiteId") REFERENCES "job_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_offers"
  ADD CONSTRAINT "job_offers_jobSiteId_fkey"
  FOREIGN KEY ("jobSiteId") REFERENCES "job_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

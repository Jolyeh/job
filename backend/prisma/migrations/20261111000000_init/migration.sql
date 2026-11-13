-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD', 'STAGE', 'ALTERNANCE', 'FREELANCE', 'INTERIM');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'INTERMEDIATE', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "locationCity" TEXT NOT NULL,
    "locationCountry" TEXT NOT NULL DEFAULT 'FR',
    "radiusKm" INTEGER NOT NULL DEFAULT 30,
    "contractTypes" "ContractType"[] DEFAULT ARRAY['CDI']::"ContractType"[],
    "workModes" "WorkMode"[] DEFAULT ARRAY['HYBRID'::"WorkMode", 'ONSITE'::"WorkMode"],
    "salaryMin" INTEGER DEFAULT 0,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "salaryPeriod" TEXT NOT NULL DEFAULT 'YEAR',
    "bio" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "lastSearchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "profileId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 3,
    "years" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profileId","skillId")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "contractType" "ContractType" NOT NULL,
    "workMode" "WorkMode" NOT NULL DEFAULT 'ONSITE',
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "url" TEXT NOT NULL,
    "applyUrl" TEXT,
    "logoUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offer_skills" (
    "jobOfferId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "weight" SMALLINT NOT NULL DEFAULT 3,

    CONSTRAINT "job_offer_skills_pkey" PRIMARY KEY ("jobOfferId","skillId")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "jobOfferId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "matchScore" SMALLINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "interviewAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" UUID NOT NULL,
    "bookmarkId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_runs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "profileSnapshot" JSONB NOT NULL,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "offersFetched" INTEGER NOT NULL DEFAULT 0,
    "offersPersisted" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_locationCity_idx" ON "profiles"("locationCity");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "profile_skills_skillId_idx" ON "profile_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "job_offers_source_externalId_key" ON "job_offers"("source", "externalId");

-- CreateIndex
CREATE INDEX "job_offers_publishedAt_idx" ON "job_offers"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "job_offers_city_idx" ON "job_offers"("city");

-- CreateIndex
CREATE INDEX "job_offers_contractType_workMode_idx" ON "job_offers"("contractType", "workMode");

-- CreateIndex
CREATE INDEX "job_offers_title_idx" ON "job_offers"("title");

-- CreateIndex
CREATE INDEX "job_offers_company_idx" ON "job_offers"("company");

-- CreateIndex
CREATE INDEX "job_offer_skills_skillId_idx" ON "job_offer_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_jobOfferId_key" ON "bookmarks"("userId", "jobOfferId");

-- CreateIndex
CREATE INDEX "bookmarks_userId_status_idx" ON "bookmarks"("userId", "status");

-- CreateIndex
CREATE INDEX "application_events_bookmarkId_createdAt_idx" ON "application_events"("bookmarkId", "createdAt");

-- CreateIndex
CREATE INDEX "search_runs_userId_createdAt_idx" ON "search_runs"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offer_skills" ADD CONSTRAINT "job_offer_skills_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offer_skills" ADD CONSTRAINT "job_offer_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "bookmarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

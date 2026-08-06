/*
  Warnings:

  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DOCTOR', 'CLINIC');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_userId_fkey";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "ChatSession";

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomSpecialtyMap" (
    "id" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "gpFirst" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomSpecialtyMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL DEFAULT 'DOCTOR',
    "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "bio" TEXT,
    "licenceNumber" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'Greater Accra',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY['English']::TEXT[],
    "insuranceAccepted" TEXT[] DEFAULT ARRAY['NHIS']::TEXT[],
    "workingHours" JSONB,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerEmail" TEXT,
    "providerPasswordHash" TEXT,
    "providerResetToken" TEXT,
    "providerResetExpiry" TIMESTAMP(3),

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReview" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderView" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomTag_name_key" ON "SymptomTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomTag_slug_key" ON "SymptomTag"("slug");

-- CreateIndex
CREATE INDEX "SymptomSpecialtyMap_symptomId_idx" ON "SymptomSpecialtyMap"("symptomId");

-- CreateIndex
CREATE INDEX "SymptomSpecialtyMap_specialtyId_idx" ON "SymptomSpecialtyMap"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomSpecialtyMap_symptomId_specialtyId_key" ON "SymptomSpecialtyMap"("symptomId", "specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_providerEmail_key" ON "Provider"("providerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_providerResetToken_key" ON "Provider"("providerResetToken");

-- CreateIndex
CREATE INDEX "Provider_specialtyId_status_active_idx" ON "Provider"("specialtyId", "status", "active");

-- CreateIndex
CREATE INDEX "Provider_district_status_active_idx" ON "Provider"("district", "status", "active");

-- CreateIndex
CREATE INDEX "Provider_status_active_createdAt_idx" ON "Provider"("status", "active", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderReview_providerId_createdAt_idx" ON "ProviderReview"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderReview_userId_idx" ON "ProviderReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReview_providerId_userId_key" ON "ProviderReview"("providerId", "userId");

-- CreateIndex
CREATE INDEX "ProviderView_providerId_viewedAt_idx" ON "ProviderView"("providerId", "viewedAt");

-- AddForeignKey
ALTER TABLE "SymptomSpecialtyMap" ADD CONSTRAINT "SymptomSpecialtyMap_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "SymptomTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomSpecialtyMap" ADD CONSTRAINT "SymptomSpecialtyMap_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderView" ADD CONSTRAINT "ProviderView_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

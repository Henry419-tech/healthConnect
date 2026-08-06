-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "status" "FacilityStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'admin',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "typeLabel" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "district" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "emergencyServices" BOOLEAN NOT NULL DEFAULT false,
    "hours" TEXT,
    "nhis" TEXT NOT NULL DEFAULT 'none',
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_type_status_idx" ON "Facility"("type", "status");

-- CreateIndex
CREATE INDEX "Facility_status_createdAt_idx" ON "Facility"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Facility_district_status_idx" ON "Facility"("district", "status");

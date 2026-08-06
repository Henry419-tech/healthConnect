-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alertEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "HealthAlert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'public_health',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "region" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Ghana Health Service',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "HealthAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthAlert_active_createdAt_idx" ON "HealthAlert"("active", "createdAt");

-- CreateIndex
CREATE INDEX "HealthAlert_type_active_idx" ON "HealthAlert"("type", "active");

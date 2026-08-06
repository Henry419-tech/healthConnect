-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifMuted" JSONB,
ADD COLUMN     "privacyPrefs" JSONB,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

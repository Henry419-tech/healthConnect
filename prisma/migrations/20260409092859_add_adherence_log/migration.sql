-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "conditions" TEXT;

-- CreateTable
CREATE TABLE "AdherenceLog" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdherenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdherenceLog_reminderId_scheduledFor_idx" ON "AdherenceLog"("reminderId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "AdherenceLog_reminderId_scheduledFor_key" ON "AdherenceLog"("reminderId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyBrief_userId_key" ON "EmergencyBrief"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyBrief_token_key" ON "EmergencyBrief"("token");

-- CreateIndex
CREATE INDEX "EmergencyBrief_token_idx" ON "EmergencyBrief"("token");

-- AddForeignKey
ALTER TABLE "AdherenceLog" ADD CONSTRAINT "AdherenceLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "MedReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyBrief" ADD CONSTRAINT "EmergencyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

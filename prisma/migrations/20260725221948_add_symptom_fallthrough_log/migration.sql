-- CreateTable
CREATE TABLE "SymptomFallthroughLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "facilityType" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SymptomFallthroughLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymptomFallthroughLog_userId_createdAt_idx" ON "SymptomFallthroughLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SymptomFallthroughLog_facilityType_idx" ON "SymptomFallthroughLog"("facilityType");

-- CreateIndex
CREATE INDEX "SymptomFallthroughLog_createdAt_idx" ON "SymptomFallthroughLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SymptomFallthroughLog" ADD CONSTRAINT "SymptomFallthroughLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

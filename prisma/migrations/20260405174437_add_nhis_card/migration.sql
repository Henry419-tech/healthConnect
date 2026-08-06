-- CreateTable
CREATE TABLE "NhisCard" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "nhisId" TEXT,
    "membershipType" TEXT,
    "expiryDate" TIMESTAMP(3),
    "issuedDate" TIMESTAMP(3),
    "issuingBody" TEXT,
    "notes" TEXT,
    "frontImageUrl" TEXT,
    "backImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhisCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NhisCard_profileId_key" ON "NhisCard"("profileId");

-- AddForeignKey
ALTER TABLE "NhisCard" ADD CONSTRAINT "NhisCard_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HealthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

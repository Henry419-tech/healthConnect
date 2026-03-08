-- CreateTable
CREATE TABLE "public"."SavedFacility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "phone" TEXT,
    "hours" TEXT,
    "website" TEXT,
    "emergencyServices" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFacility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFacility_userId_savedAt_idx" ON "public"."SavedFacility"("userId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFacility_userId_facilityId_key" ON "public"."SavedFacility"("userId", "facilityId");

-- AddForeignKey
ALTER TABLE "public"."SavedFacility" ADD CONSTRAINT "SavedFacility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

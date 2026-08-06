-- AlterTable
ALTER TABLE "Allergy" ADD COLUMN     "isNoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "onsetDate" TEXT;

-- AlterTable
ALTER TABLE "MedicalCondition" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isNoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "treatedBy" TEXT;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "indication" TEXT,
ADD COLUMN     "isNoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pharmacy" TEXT,
ADD COLUMN     "prescribedBy" TEXT,
ADD COLUMN     "route" TEXT;

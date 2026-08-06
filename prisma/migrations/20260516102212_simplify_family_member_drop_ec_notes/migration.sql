/*
  Warnings:

  - You are about to drop the column `notes` on the `EmergencyContact` table. All the data in the column will be lost.
  - You are about to drop the column `age` on the `FamilyMember` table. All the data in the column will be lost.
  - You are about to drop the column `bloodType` on the `FamilyMember` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FamilyMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmergencyContact" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "FamilyMember" DROP COLUMN "age",
DROP COLUMN "bloodType",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "public"."ChatSession" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "ChatSession_userId_status_idx" ON "public"."ChatSession"("userId", "status");

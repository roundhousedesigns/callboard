-- AlterTable
ALTER TABLE "Show" ADD COLUMN "activeAt" TIMESTAMP(3);
ALTER TABLE "Show" ADD COLUMN "lockedAt" TIMESTAMP(3);

-- Migrate releasedAt to activeAt for existing data
UPDATE "Show" SET "activeAt" = "releasedAt" WHERE "releasedAt" IS NOT NULL;

-- DropColumn
ALTER TABLE "Show" DROP COLUMN "releasedAt";

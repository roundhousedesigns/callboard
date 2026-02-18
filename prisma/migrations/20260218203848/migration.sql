-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "darkDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "showTitle" TEXT,
ADD COLUMN     "showsPerWeek" INTEGER;

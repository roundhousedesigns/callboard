-- Replace label with time. Migrates label values to HH:mm format.
ALTER TABLE "Show" ADD COLUMN "time" TEXT;

UPDATE "Show" SET "time" = CASE
  WHEN LOWER("label") = 'matinee' THEN '14:00'
  WHEN LOWER("label") = 'evening' THEN '19:00'
  ELSE '12:00'
END;

ALTER TABLE "Show" ALTER COLUMN "time" SET NOT NULL;

DROP INDEX IF EXISTS "Show_organizationId_date_label_key";
DROP INDEX IF EXISTS "Show_organizationId_date_showTime_key";

ALTER TABLE "Show" DROP COLUMN "label";

CREATE UNIQUE INDEX "Show_organizationId_date_time_key" ON "Show"("organizationId", "date", "time");

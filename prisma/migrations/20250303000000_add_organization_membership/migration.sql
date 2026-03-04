-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'actor');

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- Migrate existing users to OrganizationMembership
-- First admin per org becomes owner; other admins stay admin; actors stay actor
WITH admin_rank AS (
  SELECT id, "organizationId",
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY id) AS rn
  FROM "User"
  WHERE role = 'admin' AND "organizationId" IS NOT NULL
)
INSERT INTO "OrganizationMembership" ("id", "userId", "organizationId", "role")
SELECT
  gen_random_uuid()::text,
  u.id,
  u."organizationId",
  CASE
    WHEN u.role = 'actor' THEN 'actor'::"MembershipRole"
    WHEN u.role = 'admin' AND ar.rn = 1 THEN 'owner'::"MembershipRole"
    ELSE 'admin'::"MembershipRole"
  END
FROM "User" u
LEFT JOIN admin_rank ar ON ar.id = u.id AND ar."organizationId" = u."organizationId"
WHERE u."organizationId" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "User_organizationId_idx";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";

-- DropColumn
ALTER TABLE "User" DROP COLUMN "organizationId";
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

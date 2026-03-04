-- Rename tables
ALTER TABLE "Organization" RENAME TO "Company";
ALTER TABLE "OrganizationMembership" RENAME TO "CompanyMembership";

-- Rename columns
ALTER TABLE "CompanyMembership" RENAME COLUMN "organizationId" TO "companyId";
ALTER TABLE "Show" RENAME COLUMN "organizationId" TO "companyId";

-- Rename primary key constraints
ALTER INDEX "Organization_pkey" RENAME TO "Company_pkey";
ALTER INDEX "OrganizationMembership_pkey" RENAME TO "CompanyMembership_pkey";

-- Rename unique/index constraints
ALTER INDEX "Organization_slug_key" RENAME TO "Company_slug_key";
ALTER INDEX "OrganizationMembership_userId_organizationId_key" RENAME TO "CompanyMembership_userId_companyId_key";
ALTER INDEX "OrganizationMembership_userId_idx" RENAME TO "CompanyMembership_userId_idx";
ALTER INDEX "OrganizationMembership_organizationId_idx" RENAME TO "CompanyMembership_companyId_idx";
ALTER INDEX "Show_organizationId_idx" RENAME TO "Show_companyId_idx";
ALTER INDEX "Show_organizationId_date_time_key" RENAME TO "Show_companyId_date_time_key";

-- Rename foreign key constraints
ALTER TABLE "CompanyMembership"
  RENAME CONSTRAINT "OrganizationMembership_userId_fkey" TO "CompanyMembership_userId_fkey";
ALTER TABLE "CompanyMembership"
  RENAME CONSTRAINT "OrganizationMembership_organizationId_fkey" TO "CompanyMembership_companyId_fkey";
ALTER TABLE "Show"
  RENAME CONSTRAINT "Show_organizationId_fkey" TO "Show_companyId_fkey";

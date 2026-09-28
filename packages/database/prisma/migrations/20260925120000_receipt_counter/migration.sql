-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receiptCounter" INTEGER NOT NULL DEFAULT 0;

-- Seed counter from existing receipts so new RCP-* numbers stay ahead of historical ones
UPDATE "organizations" o
SET "receiptCounter" = COALESCE((
  SELECT COUNT(*)::int FROM "receipts" r WHERE r."organizationId" = o.id
), 0)
WHERE o."receiptCounter" = 0;

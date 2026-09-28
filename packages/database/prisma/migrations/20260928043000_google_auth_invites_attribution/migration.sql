-- Google auth, profile completion, attribution, invites, Bhairava Direct support.
-- Safe additive migration: existing password users keep hashes; phoneNormalized backfilled where possible.

CREATE TYPE "AttributionSource" AS ENUM ('DIRECT_APP', 'AGENT_INVITE', 'ADMIN_CREATED', 'REFERRAL', 'OTHER');

-- User: Google identity + optional password + profile/terms timestamps
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleSub" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profileCompletedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_organizationId_googleSub_key"
  ON "users"("organizationId", "googleSub");

-- Agent: system desk flag (Bhairava Direct)
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Customer: normalized phone + attribution fields (separate from sales-owner agentId)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferredProjectId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "attributionSource" "AttributionSource";
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invitedByAgentId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "referralNote" TEXT;

-- Backfill phoneNormalized from existing phone (last 10 digits)
UPDATE "customers"
SET "phoneNormalized" = RIGHT(regexp_replace("phone", '[^0-9]', '', 'g'), 10)
WHERE "phoneNormalized" IS NULL
  AND length(regexp_replace("phone", '[^0-9]', '', 'g')) >= 10;

CREATE INDEX IF NOT EXISTS "customers_organizationId_phoneNormalized_idx"
  ON "customers"("organizationId", "phoneNormalized");
CREATE INDEX IF NOT EXISTS "customers_invitedByAgentId_idx"
  ON "customers"("invitedByAgentId");

-- Rename existing Customer.agent FK relation name is app-level only; add invitedBy FK
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_preferredProjectId_fkey"
  FOREIGN KEY ("preferredProjectId") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_invitedByAgentId_fkey"
  FOREIGN KEY ("invitedByAgentId") REFERENCES "agents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Secure customer invites
CREATE TABLE IF NOT EXISTS "customer_invites" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invitedByAgentId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "nameHint" TEXT,
  "phoneHintNormalized" TEXT,
  "emailHint" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_invites_tokenHash_key" ON "customer_invites"("tokenHash");
CREATE INDEX IF NOT EXISTS "customer_invites_organizationId_idx" ON "customer_invites"("organizationId");
CREATE INDEX IF NOT EXISTS "customer_invites_invitedByAgentId_idx" ON "customer_invites"("invitedByAgentId");

ALTER TABLE "customer_invites"
  ADD CONSTRAINT "customer_invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_invites"
  ADD CONSTRAINT "customer_invites_invitedByAgentId_fkey"
  FOREIGN KEY ("invitedByAgentId") REFERENCES "agents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_invites"
  ADD CONSTRAINT "customer_invites_claimedByUserId_fkey"
  FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

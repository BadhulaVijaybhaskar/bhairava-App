-- 4-digit MPIN quick login (Customer + Agent). Hash only — never plaintext.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mpinHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mpinSetAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mpinFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mpinLockedUntil" TIMESTAMP(3);

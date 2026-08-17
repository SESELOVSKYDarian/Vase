-- Keep legacy Management databases compatible with the current Prisma User model.
-- This is intentionally idempotent because EasyPanel runs it on every container start.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;

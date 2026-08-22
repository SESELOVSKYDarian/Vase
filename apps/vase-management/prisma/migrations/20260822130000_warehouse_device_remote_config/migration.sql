ALTER TABLE "warehouse_devices"
  ADD COLUMN IF NOT EXISTS "serverBaseUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "wifiSsid" TEXT,
  ADD COLUMN IF NOT EXISTS "wifiPassword" TEXT;

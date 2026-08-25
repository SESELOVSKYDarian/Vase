ALTER TABLE "warehouse_devices"
  ADD COLUMN IF NOT EXISTS "wifiFallbackSsid" TEXT,
  ADD COLUMN IF NOT EXISTS "wifiFallbackPassword" TEXT,
  ADD COLUMN IF NOT EXISTS "wifiSecondarySsid" TEXT,
  ADD COLUMN IF NOT EXISTS "wifiSecondaryPassword" TEXT;

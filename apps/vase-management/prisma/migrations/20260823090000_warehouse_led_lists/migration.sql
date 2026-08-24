ALTER TABLE "warehouse_product_locations"
  ADD COLUMN IF NOT EXISTS "ledNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "warehouse_product_locations"
SET "ledNumbers" = ARRAY["ledNumber"]
WHERE "ledNumber" IS NOT NULL AND cardinality("ledNumbers") = 0;

ALTER TABLE "warehouse_led_commands"
  ADD COLUMN IF NOT EXISTS "ledNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "warehouse_devices"
  ALTER COLUMN "ledCount" SET DEFAULT 100;

UPDATE "warehouse_led_commands"
SET "ledNumbers" = ARRAY(SELECT generate_series("ledNumber", "ledNumber" + GREATEST("activeCount", 1) - 1))
WHERE cardinality("ledNumbers") = 0;

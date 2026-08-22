# Warehouse Web Config Implementation Plan

> **For agentic workers:** Inline execution completed in this session.

**Goal:** Administrar la configuración del ESP32 desde Management y mantener productos/ubicaciones fuera del firmware.

**Architecture:** `WarehouseDevice` persiste configuración editable; una ruta autenticada actualiza desde la UI y una ruta por `deviceKey` entrega la configuración al ESP32. El firmware base conserva la identidad del dispositivo, consulta `/config`, persiste cambios con `Preferences` y sigue consumiendo comandos LED.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, React, Arduino ESP32, Adafruit NeoPixel, ArduinoJson.

---

### Task 1: Persist device configuration

**Files:** `apps/vase-management/prisma/schema.prisma`, `apps/vase-management/prisma/migrations/20260822130000_warehouse_device_remote_config/migration.sql`

- [x] Add `serverBaseUrl`, `wifiSsid`, and `wifiPassword` to `WarehouseDevice`.
- [x] Add an idempotent SQL migration with `ADD COLUMN IF NOT EXISTS`.

### Task 2: Expose authenticated and device-scoped APIs

**Files:** `apps/vase-management/lib/warehouse/warehouse-device.service.ts`, `apps/vase-management/app/api/warehouse/devices/[deviceId]/route.ts`, `apps/vase-management/app/api/warehouse/devices/[deviceId]/config/route.ts`

- [x] Validate numeric LED settings and normalize the server URL.
- [x] Hide Wi-Fi password from authenticated UI responses.
- [x] Return configuration only for active devices and update `lastSeenAt`.

### Task 3: Add web configuration form

**File:** `apps/vase-management/app/dashboard/deposito-ia/dispositivos/page.tsx`

- [x] Add “Editar desde web” modal for network and LED settings.
- [x] Explain that products and locations remain web-managed.
- [x] Refresh the local card after saving and report that the next polling applies changes.

### Task 4: Apply remote configuration in firmware

**Files:** `firmware/warehouse-esp32/warehouse-esp32.ino`, `firmware/warehouse-esp32/README.md`

- [x] Load initial values once and persist remote values in `Preferences`.
- [x] Poll `/config` every 10 seconds, reconnect Wi-Fi when needed, and apply brightness/LED count.
- [x] Keep product data and LED commands on the server.

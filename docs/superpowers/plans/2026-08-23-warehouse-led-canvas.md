# Warehouse LED Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an operator visually assign an exact set of LEDs from the active strip to each warehouse product and light those exact LEDs on the ESP32.

**Architecture:** Product locations persist an `Int[]` of exact LED indexes while retaining `ledNumber` as the first selected index for backward compatibility. LED commands carry the exact list to the polling endpoint and firmware. A reusable accessible canvas renders the active device capacity and blocks LEDs assigned to other products.

**Tech Stack:** Next.js App Router, React canvas API, Prisma/PostgreSQL, TypeScript, ArduinoJson, Adafruit NeoPixel.

---

### Task 1: Create the visual reference

**Files:**
- Create: `docs/design/warehouse-led-canvas-philosophy.md`
- Create: `docs/design/warehouse-led-canvas-reference.png`

- [x] Render a 100-node dark strip field with four selected nodes, occupied-node states, numeric anchors, and sparse clinical labels.
- [x] Verify the PNG is 1600×1000 and visually inspect spacing, contrast, and clipping.

### Task 2: Persist exact product LED assignments

**Files:**
- Modify: `apps/vase-management/prisma/schema.prisma`
- Create: `apps/vase-management/prisma/migrations/20260823090000_warehouse_led_lists/migration.sql`
- Modify: `apps/vase-management/lib/warehouse/warehouse.service.ts`
- Modify: `apps/vase-management/components/warehouse/types.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-led-selection.test.ts`

- [x] Write a failing test for normalized unique indexes, capacity limits, and selection count.
- [x] Add `ledNumbers Int[]` to product locations and commands with an idempotent backfill from `ledNumber`.
- [x] Validate and persist exact LED indexes while keeping `ledNumber` synchronized to the first selection.
- [x] Run the selection test and Prisma schema validation.

### Task 3: Deliver exact LED lists to the ESP32

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse-device.service.ts`
- Modify: `apps/vase-management/app/api/warehouse/devices/[deviceId]/next-command/route.ts`
- Modify: `apps/vase-management/app/api/warehouse/products/[productId]/test-led/route.ts`
- Modify: `apps/vase-management/lib/warehouse/warehouse-channel.service.ts`
- Modify: `firmware/warehouse-esp32/warehouse-esp32.ino`
- Test: `apps/vase-management/lib/warehouse/warehouse-led-command.test.ts`

- [x] Extend the failing command test to require exact LED list normalization.
- [x] Store and return `ledNumbers` on commands while preserving contiguous legacy commands.
- [x] Update product and AI lookup flows to send exact product assignments.
- [x] Update firmware to illuminate every index in `ledNumbers` when present.
- [x] Run focused command tests; the unrelated device-setup baseline still expects GPIO 2 while its fixture supplies GPIO 5.

### Task 4: Build the interactive product canvas

**Files:**
- Create: `apps/vase-management/components/warehouse/led-strip-canvas.tsx`
- Create: `apps/vase-management/app/api/warehouse/led-map/route.ts`
- Modify: `apps/vase-management/components/warehouse/product-editor.tsx`
- Modify: `apps/vase-management/app/dashboard/deposito-ia/productos/page.tsx`

- [x] Add an authenticated map endpoint returning active capacity and all product assignments.
- [x] Render 100 nodes when the device is configured for 100, with free, occupied, and selected states.
- [x] Support click and keyboard selection up to the requested count, and provide accessible numeric controls.
- [x] Save exact indexes and show the list in desktop/mobile product summaries.
- [x] Run TypeScript-focused checks and verify `git diff --check`.

### Task 5: Complete the branch

- [x] Run all focused warehouse tests and Prisma validation.
- [x] Review the final diff for secrets and unrelated changes.
- [x] Commit the implementation and invoke `finishing-a-development-branch`.

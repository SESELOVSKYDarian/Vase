# Warehouse ESP32 Device Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Deposito IA devices page provide complete ESP32 configuration, copy actions, and offline-capable test commands.

**Architecture:** Add small server-side DTO helpers to `WarehouseDeviceService`, keep ESP32 polling endpoints unchanged, and consume the enriched DTO in the existing client page. The UI stays company-scoped through the authenticated `/api/warehouse/devices` route, while ESP32 access remains authenticated by `deviceKey`.

**Tech Stack:** Next.js app router route handlers, React client component, Prisma-backed warehouse services, TypeScript, `tsx` one-off tests with `node:assert`.

---

### Task 1: Device Setup DTO Helpers

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse-device.service.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts`:

```ts
import assert from 'node:assert/strict'
import {
  buildWarehouseDeviceSetup,
  normalizeWarehouseBaseUrl,
} from './warehouse-device.service'

const baseUrl = normalizeWarehouseBaseUrl('https://management.vase.ar/')
assert.equal(baseUrl, 'https://management.vase.ar')

const setup = buildWarehouseDeviceSetup({
  baseUrl,
  deviceKey: 'abc123',
  ledCount: 60,
  ledPin: 5,
})

assert.equal(setup.serverBaseUrl, 'https://management.vase.ar')
assert.equal(setup.pollingUrl, 'https://management.vase.ar/api/warehouse/devices/abc123/next-command')
assert.equal(setup.completeUrlTemplate, 'https://management.vase.ar/api/warehouse/devices/abc123/commands/{commandId}/complete')
assert.match(setup.arduinoConfig, /DEVICE_KEY = "abc123"/)
assert.match(setup.arduinoConfig, /LED_COUNT = 60/)
assert.match(setup.arduinoConfig, /LED_PIN = 5/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/vase-management; npx tsx lib/warehouse/warehouse-device.setup.test.ts`

Expected: FAIL because `buildWarehouseDeviceSetup` and `normalizeWarehouseBaseUrl` are not exported yet.

- [ ] **Step 3: Implement the minimal helper code**

Add exported helpers to `warehouse-device.service.ts`:

```ts
export function normalizeWarehouseBaseUrl(value: string | null | undefined) {
  return (value || 'http://localhost:3006').replace(/\/+$/, '')
}

export function buildWarehouseDeviceSetup(input: {
  baseUrl: string
  deviceKey: string
  ledCount: number
  ledPin?: number
}) {
  const serverBaseUrl = normalizeWarehouseBaseUrl(input.baseUrl)
  const ledPin = input.ledPin ?? 5
  const pollingUrl = `${serverBaseUrl}/api/warehouse/devices/${input.deviceKey}/next-command`
  const completeUrlTemplate = `${serverBaseUrl}/api/warehouse/devices/${input.deviceKey}/commands/{commandId}/complete`

  return {
    serverBaseUrl,
    pollingUrl,
    completeUrlTemplate,
    arduinoConfig: [
      `const char* SERVER_BASE_URL = "${serverBaseUrl}";`,
      `const char* DEVICE_KEY = "${input.deviceKey}";`,
      `const int LED_PIN = ${ledPin};`,
      `const int LED_COUNT = ${input.ledCount};`,
    ].join('\n'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/vase-management; npx tsx lib/warehouse/warehouse-device.setup.test.ts`

Expected: PASS with exit code 0.

### Task 2: Authenticated Devices API DTO

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse-device.service.ts`
- Modify: `apps/vase-management/app/api/warehouse/devices/route.ts`
- Modify: `apps/vase-management/components/warehouse/types.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts`

- [ ] **Step 1: Extend the failing test**

Add assertions that a DTO gets setup fields while preserving base fields:

```ts
const dto = buildWarehouseDeviceSetup({
  baseUrl: 'https://management.vase.ar/',
  deviceKey: 'device-secret',
  ledCount: 120,
})

assert.equal(dto.pollingUrl.endsWith('/device-secret/next-command'), true)
assert.equal(dto.completeUrlTemplate.includes('{commandId}'), true)
```

- [ ] **Step 2: Run test to verify it fails if helper behavior is incomplete**

Run: `cd apps/vase-management; npx tsx lib/warehouse/warehouse-device.setup.test.ts`

Expected: FAIL until helper output matches the DTO requirements.

- [ ] **Step 3: Add service method and route usage**

Add `listDeviceSetups(companyId, baseUrl)` to `WarehouseDeviceService` and call it from `GET /api/warehouse/devices`. Resolve the base URL from `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, then request origin.

- [ ] **Step 4: Update client type**

Add these fields to `WarehouseDevice`:

```ts
pollingUrl: string
completeUrlTemplate: string
serverBaseUrl: string
arduinoConfig: string
```

- [ ] **Step 5: Run test**

Run: `cd apps/vase-management; npx tsx lib/warehouse/warehouse-device.setup.test.ts`

Expected: PASS.

### Task 3: Offline-Capable Test Command

**Files:**
- Modify: `apps/vase-management/app/api/warehouse/devices/[deviceId]/test-led/route.ts`

- [ ] **Step 1: Change the route behavior**

Remove the `device.status !== 'ONLINE'` rejection so the route can enqueue a short-lived command for offline devices.

- [ ] **Step 2: Keep ownership checks**

Keep the `findFirst` filter on `id`, `companyId`, and `active`.

- [ ] **Step 3: Verify route compiles**

Run: `cd apps/vase-management; npm run build`

Expected: build reaches completion without TypeScript errors.

### Task 4: Device Page Setup UI

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/dispositivos/page.tsx`

- [ ] **Step 1: Add copy and reveal state**

Add `visibleKeys` state and `copyToClipboard(label, value)` helper using `navigator.clipboard.writeText`.

- [ ] **Step 2: Render setup block per card**

Show `serverBaseUrl`, `pollingUrl`, `completeUrlTemplate`, `deviceKey`, and `arduinoConfig`.

- [ ] **Step 3: Update test LED UX**

Enable "Probar LED" for active offline devices and change success text to explain the command is queued until the ESP polls.

- [ ] **Step 4: Verify build**

Run: `cd apps/vase-management; npm run build`

Expected: production build succeeds.

### Task 5: Final Verification

**Files:**
- Read-only verification

- [ ] **Step 1: Run focused test**

Run: `cd apps/vase-management; npx tsx lib/warehouse/warehouse-device.setup.test.ts`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `cd apps/vase-management; npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect git diff**

Run: `git diff --stat`

Expected: only the ESP32 setup spec, plan, device service, device API/type, test-led route, and devices page changed.

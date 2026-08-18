# Warehouse AI Operational UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional, responsive Depósito IA module across all six screens with first-class light/dark themes and reliable loading, empty, success, error, confirmation, and device states.

**Architecture:** Keep the existing Next.js App Router pages and warehouse APIs, add a small typed client boundary plus reusable warehouse UI primitives, and reuse the general product API for catalog creation/editing. Extend only the warehouse summary contract needed by the operational dashboard; keep central authentication and PostgreSQL ownership unchanged.

**Tech Stack:** Next.js 14 App Router, React 18 client components, TypeScript, Tailwind CSS semantic tokens, next-themes, Lucide React, Prisma 5, Zod, Vitest.

---

## File Map

- Create `apps/vase-management/components/warehouse/types.ts`: browser-safe warehouse response and form types.
- Create `apps/vase-management/components/warehouse/client.ts`: typed JSON requests, API error extraction, and query helpers.
- Create `apps/vase-management/components/warehouse/ui.tsx`: module header, state badge, panel, empty/error/loading states, and confirmation dialog.
- Create `apps/vase-management/components/warehouse/product-editor.tsx`: product and physical-location editor shared by create/edit flows.
- Create `apps/vase-management/components/warehouse/ai-state.ts`: pure chat/proposal reducer with duplicate-confirmation protection.
- Create `apps/vase-management/components/warehouse/led-color.ts`: deterministic accessible LED palette.
- Modify `apps/vase-management/styles/globals.css`: warehouse semantic component classes and dark-mode-safe utility variants.
- Modify `apps/vase-management/lib/warehouse/warehouse.repository.ts`: permit an empty query to list active products.
- Modify `apps/vase-management/app/api/warehouse/summary/route.ts`: return operational metrics and recent commands/logs.
- Modify the six pages under `apps/vase-management/app/dashboard/deposito-ia/`.
- Create `tests/warehouse-ui-client.test.ts`: pure client helper contract tests.
- Create `tests/warehouse-summary-shape.test.ts`: summary serialization contract.
- Create `tests/warehouse-page-contracts.test.ts`: static guard against regressions to hardcoded light-only surfaces and native alerts.
- Create `tests/warehouse-repository-query.test.ts`: product listing/filter query contract.
- Create `tests/warehouse-ai-ui-state.test.ts`: chat and proposal state transitions.
- Create `tests/warehouse-led-color.test.ts`: deterministic LED color contract.

### Task 1: Add typed warehouse client contracts

**Files:**
- Create: `apps/vase-management/components/warehouse/types.ts`
- Create: `apps/vase-management/components/warehouse/client.ts`
- Create: `tests/warehouse-ui-client.test.ts`

- [ ] **Step 1: Write failing tests for URL construction and API errors**

```ts
import { describe, expect, it } from 'vitest'
import { buildWarehouseProductUrl, WarehouseApiError } from '../apps/vase-management/components/warehouse/client'

describe('warehouse client helpers', () => {
  it('encodes product filters without emitting empty values', () => {
    expect(buildWarehouseProductUrl({ query: 'PC 06', sectorId: '', rack: 'A1' }))
      .toBe('/api/warehouse/products?q=PC+06&rack=A1')
  })

  it('preserves the HTTP status and server message', () => {
    const error = new WarehouseApiError('Dispositivo offline', 409)
    expect(error.message).toBe('Dispositivo offline')
    expect(error.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-ui-client.test.ts`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Define browser-safe types**

Define explicit `WarehouseProduct`, `WarehouseLocation`, `WarehouseDevice`, `WarehouseChannel`, `WarehouseSummary`, `WarehouseCommand`, `WarehouseConversation`, and `AiCommandResponse` exports. Use nullable fields matching Prisma JSON responses; do not import Prisma into client components.

```ts
export type WarehouseLocation = {
  id: string
  sectorId: string
  sector: { id: string; name: string }
  rack: string
  row: string
  box: string | null
  observations: string | null
  ledNumber: number | null
}

export type WarehouseProduct = {
  id: string
  code: string | null
  name: string
  description: string | null
  price: number | string
  warehouseLocations: WarehouseLocation[]
}
```

- [ ] **Step 4: Implement the typed request boundary**

```ts
export class WarehouseApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'WarehouseApiError'
  }
}

export async function warehouseRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    throw new WarehouseApiError(data?.error || 'No se pudo completar la operación', response.status)
  }
  return data as T
}

export function buildWarehouseProductUrl(filters: { query?: string; sectorId?: string; rack?: string }) {
  const params = new URLSearchParams()
  if (filters.query?.trim()) params.set('q', filters.query.trim())
  if (filters.sectorId?.trim()) params.set('sectorId', filters.sectorId.trim())
  if (filters.rack?.trim()) params.set('rack', filters.rack.trim())
  const suffix = params.toString()
  return `/api/warehouse/products${suffix ? `?${suffix}` : ''}`
}
```

- [ ] **Step 5: Run GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-ui-client.test.ts`

Expected: PASS.

Commit: `feat(management): add typed warehouse client contracts`

### Task 2: Build shared operational UI primitives

**Files:**
- Create: `apps/vase-management/components/warehouse/ui.tsx`
- Modify: `apps/vase-management/styles/globals.css`
- Create: `tests/warehouse-page-contracts.test.ts`

- [ ] **Step 1: Add a static theme regression test**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('warehouse pages', () => {
  it('do not use native alert or light-only panel classes', () => {
    const root = 'apps/vase-management/app/dashboard/deposito-ia'
    const files = [
      `${root}/page.tsx`,
      `${root}/productos/page.tsx`,
      `${root}/ia/page.tsx`,
      `${root}/racks/page.tsx`,
      `${root}/dispositivos/page.tsx`,
      `${root}/canales/page.tsx`,
    ]
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n')
    expect(source).not.toMatch(/\balert\s*\(/)
    expect(source).not.toMatch(/bg-white\s+rounded/)
    expect(source).not.toMatch(/text-gray-[3-9]00/)
  })
})
```

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-page-contracts.test.ts`

Expected: FAIL against the current six pages.

- [ ] **Step 3: Implement shared components**

Export these focused components from `ui.tsx`:

```tsx
export function WarehousePageHeader(props: {
  eyebrow?: string
  title: string
  description: string
  actions?: React.ReactNode
})

export function WarehousePanel(props: React.PropsWithChildren<{
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}>)

export function WarehouseStatusBadge(props: {
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children: React.ReactNode
})

export function WarehouseLoadingState(props: { rows?: number })
export function WarehouseEmptyState(props: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode })
export function WarehouseErrorState(props: { message: string; onRetry?: () => void })
export function WarehouseConfirmDialog(props: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  dangerous?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
})
```

Use the installed Radix Dialog primitive, labels for icon-only controls, and no emoji icons.

- [ ] **Step 4: Add semantic warehouse classes**

Add `warehouse-shell`, `warehouse-grid`, `warehouse-kpi`, `warehouse-toolbar`, `warehouse-table`, `warehouse-mobile-card`, `warehouse-command`, and `warehouse-rack-slot` classes built only from `background`, `card`, `foreground`, `muted`, `border`, `primary`, and status tokens. Preserve the existing `prefers-reduced-motion` block.

- [ ] **Step 5: Verify compilation and commit**

Run: `npx tsc -p apps/vase-management/tsconfig.json --noEmit`

Expected: PASS.

Commit: `feat(management): add warehouse operational UI primitives`

### Task 3: Expand the dashboard summary contract

**Files:**
- Create: `apps/vase-management/lib/warehouse/warehouse-summary.ts`
- Modify: `apps/vase-management/app/api/warehouse/summary/route.ts`
- Create: `tests/warehouse-summary-shape.test.ts`

- [ ] **Step 1: Write the failing serializer test**

```ts
import { describe, expect, it } from 'vitest'
import { serializeWarehouseSummary } from '../apps/vase-management/lib/warehouse/warehouse-summary'

describe('warehouse summary serializer', () => {
  it('derives offline and missing LED counts', () => {
    expect(serializeWarehouseSummary({
      totalProducts: 10,
      locatedProducts: 7,
      productsWithLed: 4,
      devices: 3,
      onlineDevices: 1,
      recentCommands: [],
      recentConversations: [],
    })).toMatchObject({ productsWithoutLed: 6, offlineDevices: 2 })
  })
})
```

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-summary-shape.test.ts`

Expected: FAIL because the serializer is missing.

- [ ] **Step 3: Implement the serializer and query**

The route must run a single `prisma.$transaction` containing counts plus:

```ts
prisma.warehouseLedCommand.findMany({
  where: { companyId },
  orderBy: { createdAt: 'desc' },
  take: 6,
  include: {
    device: { select: { name: true } },
    productLocation: { include: { product: { select: { code: true, name: true } } } },
  },
})

prisma.warehouseConversationLog.findMany({
  where: { companyId },
  orderBy: { createdAt: 'desc' },
  take: 6,
})
```

Count active products with an active location and non-null LED separately. Return only serializable fields required by `WarehouseSummary`.

- [ ] **Step 4: Run GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-summary-shape.test.ts`

Expected: PASS.

Commit: `feat(management): expose warehouse operational summary`

### Task 4: Redesign the warehouse dashboard

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/page.tsx`

- [ ] **Step 1: Replace ad-hoc fetch state with an explicit state machine**

Use `loading`, `error`, `summary`, and a `loadSummary()` callback. Reject non-OK responses through `warehouseRequest<WarehouseSummary>` and expose a retry action.

- [ ] **Step 2: Implement the Control operativo layout**

Render:

- four KPIs: products, products without LED, devices online, operational alerts;
- recent commands with status badges;
- recent searches/conversations;
- quick links to `/dashboard/deposito-ia/productos`, `/ia`, `/racks`, and `/dispositivos`;
- a clear empty state when activity does not exist.

Use `WarehousePageHeader`, `WarehousePanel`, semantic tokens, and Lucide icons.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc -p apps/vase-management/tsconfig.json --noEmit`

Expected: PASS.

Commit: `feat(management): redesign warehouse operations dashboard`

### Task 5: Make Products a complete warehouse workflow

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse.repository.ts`
- Modify: `apps/vase-management/app/api/warehouse/products/route.ts`
- Create: `apps/vase-management/components/warehouse/product-editor.tsx`
- Modify: `apps/vase-management/app/dashboard/deposito-ia/productos/page.tsx`

- [ ] **Step 1: Add repository coverage for empty query and filters**

Extract a pure `buildWarehouseProductWhere(companyId, query, filters)` helper and test that an empty query still produces `{ companyId, isActive: true }`, while sector/rack filters apply through `warehouseLocations.some`.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-repository-query.test.ts`

Expected: FAIL until the helper exists.

- [ ] **Step 3: Implement listing and filter parameters**

Read `q`, `sectorId`, and `rack` from the route. In the repository, omit `OR` when `q` is empty and order results by code then name. Keep the company and active constraints mandatory.

- [ ] **Step 4: Implement the shared product editor**

The form fields are `code`, `name`, `description`, `sectorName`, `rack`, `row`, `box`, `observations`, and optional `ledNumber`.

Creation sequence:

1. POST `/api/productos` with `name`, `code`, `description`, `price: 0`, `cost: 0`, `stock: 0`, `unit: 'UN'`.
2. POST `/api/warehouse/products/:id/location` with physical-location fields.
3. If step 2 fails, keep the created product visible and report that its warehouse location is pending instead of pretending the entire operation failed.

Editing sequence:

1. PATCH `/api/productos/:id` for catalog fields.
2. POST `/api/warehouse/products/:id/location` for location fields.

- [ ] **Step 5: Implement responsive product browsing**

Load products on mount, debounce search by 300 ms, add sector/rack filters, render desktop table plus mobile cards, and provide actions for edit, LED assignment, test LED, and global/device off when a target can be selected.

Every mutation must disable only its own action, avoid native `alert`, show result feedback, and reload affected data.

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
node node_modules/vitest/vitest.mjs run tests/warehouse-repository-query.test.ts tests/warehouse-ui-client.test.ts
npx tsc -p apps/vase-management/tsconfig.json --noEmit
```

Expected: PASS.

Commit: `feat(management): complete warehouse product workflows`

### Task 6: Turn the IA page into a safe operational copilot

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/ia/page.tsx`
- Create: `apps/vase-management/components/warehouse/ai-state.ts`
- Create: `tests/warehouse-ai-ui-state.test.ts`

- [ ] **Step 1: Test proposal state transitions**

Create and test a reducer in `ai-state.ts` with `SEND`, `RECEIVE`, `FAIL`, `CONFIRM_START`, `CONFIRM_DONE`, and `CANCEL`. The test must prove a confirmed proposal cannot enter `CONFIRM_START` twice.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-ai-ui-state.test.ts`

Expected: FAIL until the reducer exists.

- [ ] **Step 3: Implement chat states and proposal cards**

Add initial command suggestions, `textarea`, Enter-to-send, Shift+Enter for newline, processing indicator, retryable errors, structured proposal summary, confirm/cancel controls, and duplicate-submit protection.

Do not enable image/audio controls unless the existing API accepts those payloads. Disabled controls must explain “Disponible cuando el canal multimedia esté configurado”.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
node node_modules/vitest/vitest.mjs run tests/warehouse-ai-ui-state.test.ts
npx tsc -p apps/vase-management/tsconfig.json --noEmit
```

Expected: PASS.

Commit: `feat(management): make warehouse AI chat operational`

### Task 7: Refactor Racks into an accessible location map

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/racks/page.tsx`
- Create: `apps/vase-management/components/warehouse/led-color.ts`
- Create: `tests/warehouse-led-color.test.ts`

- [ ] **Step 1: Test deterministic LED colors**

```ts
import { describe, expect, it } from 'vitest'
import { getLedColor } from '../apps/vase-management/components/warehouse/led-color'

describe('LED color', () => {
  it('returns stable accessible palette entries', () => {
    expect(getLedColor(14)).toEqual(getLedColor(14))
    expect(getLedColor(14)).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
```

- [ ] **Step 2: Run RED and implement the pure palette helper**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-led-color.test.ts`

Expected before implementation: FAIL. Use a fixed eight-color palette and modulo selection; do not generate arbitrary low-contrast colors.

- [ ] **Step 3: Replace the fixed 3/6/3 desktop layout**

Use a one-column mobile flow, `lg:grid-cols-[16rem_minmax(0,1fr)]`, and an `xl` details panel. Preserve sector creation, rack selection, product search, assignment, removal, and LED testing.

- [ ] **Step 4: Add explicit slot states and confirmation**

Represent free, occupied, selected, active, and conflict states with icon/text plus color. Keep test/remove actions keyboard-visible rather than hover-only. Confirm reassignment/removal before mutating.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node node_modules/vitest/vitest.mjs run tests/warehouse-led-color.test.ts
npx tsc -p apps/vase-management/tsconfig.json --noEmit
```

Expected: PASS.

Commit: `feat(management): improve warehouse rack map`

### Task 8: Redesign device operations with safe commands

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/dispositivos/page.tsx`

- [ ] **Step 1: Add explicit loading, error, empty, and mutation states**

Use `warehouseRequest<WarehouseDevice[]>`, retry on read failure, and action IDs such as `create`, `off:<deviceId>`, and `test:<deviceId>` so unrelated controls remain enabled.

- [ ] **Step 2: Implement responsive device cards/table**

Show name, online/offline badge, relative last-seen time, LED count, brightness, max active LEDs, and a masked key. Do not expose the complete key by default.

- [ ] **Step 3: Protect physical commands**

Require `WarehouseConfirmDialog` for “Apagar todos”, disable LED tests while offline, and show the returned command/result. Preserve device creation with validation and inline errors.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc -p apps/vase-management/tsconfig.json --noEmit`

Expected: PASS.

Commit: `feat(management): improve warehouse device operations`

### Task 9: Redesign channel setup without exposing secrets

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/canales/page.tsx`

- [ ] **Step 1: Separate stored state from secret inputs**

Keep GET responses limited to the current safe contract. Populate provider ID, webhook URL, active state, and dates; leave token fields blank with “Dejar vacío para conservar” only if the POST route supports preservation. If it does not, modify POST to merge omitted secrets with the existing record and test that behavior before using that copy.

- [ ] **Step 2: Implement operational channel cards**

Each card must show configured/not configured, active/inactive, webhook URL, last update, provider-specific setup guidance, save progress, warning, success, and error. Clipboard actions need visible confirmation.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc -p apps/vase-management/tsconfig.json --noEmit`

Expected: PASS.

Commit: `feat(management): improve warehouse channel setup`

### Task 10: Complete theme and integration verification

**Files:**
- Modify: any warehouse files required by failures found in this task.
- Modify: `docs/superpowers/specs/2026-08-17-warehouse-ai-operational-ui-design.md` only if actual behavior intentionally differs from the approved design.

- [ ] **Step 1: Read the installed Next.js guides before final framework-sensitive edits**

Read:

```powershell
Get-Content node_modules\next\dist\docs\01-app\01-getting-started\05-server-and-client-components.md
Get-Content node_modules\next\dist\docs\01-app\01-getting-started\06-fetching-data.md
Get-Content node_modules\next\dist\docs\01-app\01-getting-started\11-css.md
Get-Content node_modules\next\dist\docs\01-app\01-getting-started\15-route-handlers.md
```

- [ ] **Step 2: Run focused automated checks**

Run:

```powershell
node node_modules/vitest/vitest.mjs run tests/warehouse-*.test.ts
npx tsc -p apps/vase-management/tsconfig.json --noEmit
git diff --check
```

Expected: all tests pass, TypeScript exits 0, and diff check is clean.

- [ ] **Step 3: Run the production build**

Run: `npm run build --workspace=@vase/management`

Expected: Next.js build completes successfully. If an external database or environment validation blocks it, record the exact command and error without weakening validation.

- [ ] **Step 4: Verify the six routes visually**

Start Management with its existing safe local environment, then inspect these routes at 375, 768, 1024, and 1440 px in both themes:

```text
/dashboard/deposito-ia
/dashboard/deposito-ia/productos
/dashboard/deposito-ia/ia
/dashboard/deposito-ia/racks
/dashboard/deposito-ia/dispositivos
/dashboard/deposito-ia/canales
```

Check keyboard focus, loading, empty, error, success, dialogs, and no horizontal body overflow. Do not issue destructive production device commands during visual verification.

- [ ] **Step 5: Run the regression guard and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/warehouse-page-contracts.test.ts`

Expected: PASS with no native alerts or light-only warehouse panels.

Commit: `test(management): verify warehouse operational UI`

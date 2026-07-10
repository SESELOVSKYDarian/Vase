# Vase App and Labs Visual Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved Vase App and Vase Labs visual sources without removing current routes, security, billing, channels, tokens, or integration behavior.

**Architecture:** Treat `fd54455` as the Vase App visual baseline, `05c3cb8` as the advanced Labs owner baseline, and `63e38a1` as the Labs split-service and operational baseline. Preserve current application logic, remove obsolete Labs CSS systems that are no longer rendered, and lock the active visual composition with static regression tests.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind CSS 4, Vitest 4.1.2, PowerShell, Git.

---

### Task 0: Load the installed Next.js 16 implementation rules

**Files:**
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md`

- [ ] **Step 1: Read the installed guides before editing code**

Run:

```powershell
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
Get-Content -Raw node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md
```

Expected: the local Next.js 16 App Router layout, global CSS, Vitest, and
TypeScript rules are loaded before any source or test edit.

### Task 1: Lock the approved visual sources with regression tests

**Files:**
- Create: `tests/v3-vase-app-visual-restoration.test.ts`
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] **Step 1: Add the Vase App baseline assertions**

Create `tests/v3-vase-app-visual-restoration.test.ts` with static checks for the
existing `fd54455` composition while allowing current cross-service URLs and
SEO functionality:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

describe("Vase App migration-branch visual source", () => {
  it("keeps the fd54455 application shell composition", () => {
    const shell = source("apps/vase-app/src/components/layout/app-shell.tsx");

    expect(shell).toContain("fixed left-0 top-0 z-40 hidden h-screen w-64");
    expect(shell).toContain("rounded-xl px-4 py-3");
    expect(shell).toContain("vasecolorlogo.png");
    expect(shell).toContain("Vase Business");
    expect(shell).toContain("Vase Labs");
  });

  it("keeps the fd54455 marketing composition while routing to the public service", () => {
    const header = source("apps/vase-app/src/components/marketing/header-client.tsx");
    const footer = source("apps/vase-app/src/components/marketing/site-footer.tsx");
    const menu = source("apps/vase-app/src/components/marketing/staggered-menu.tsx");

    expect(header).toContain("rounded-[28px] bg-white/90 p-3");
    expect(footer).toContain("lg:grid-cols-[0.95fr_0.8fr_0.8fr_0.7fr]");
    expect(menu).toContain("vm-nav-itemLabel");
    expect(header).toContain("productOrigins.publicSite");
  });

  it("renders later Business controls in the established builder language", () => {
    const builder = source("apps/vase-app/src/components/business/builder-editor.tsx");

    expect(builder).toContain("SEO del sitio");
    expect(builder).toContain("rounded-[28px] border border-[var(--border-subtle)]");
    expect(builder).toContain("Google Tag Manager");
  });
});
```

- [ ] **Step 2: Replace stale ZIP-era Labs assertions with the approved historical sources**

In `tests/v3-labs-owner-standalone-ui.test.ts`, make the first test inspect the
page, layout, navigation, and CSS. Assert the active `05c3cb8` structure and the
visible `63e38a1` operational controls:

```ts
const layout = fs.readFileSync(
  path.resolve("apps/vase-labs/app/app/owner/labs/layout.tsx"),
  "utf8",
);
const navigation = fs.readFileSync(
  path.resolve("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx"),
  "utf8",
);

expect(layout).toContain("labs-shell");
expect(layout).toContain("labs-sidebar");
expect(layout).toContain("Centro IA");
expect(navigation).toContain("Gestion avanzada");
expect(page).toContain('eyebrow="Operacion IA"');
expect(page).toContain('title="Panel de control"');
expect(page).toContain('title="Capacidad IA"');
expect(page).toContain("getLabsPlanLimits");
expect(page).toContain("calculateRemainingTokens");
expect(page).toContain("canTenantUseChannel");
expect(styles).toContain(".labs-shell");
expect(styles).toContain(".labs-sidebar");
expect(styles).toContain(".labs-panel");
expect(styles).not.toContain(".labs-rail");
expect(styles).not.toContain(".owner-labs-shell");
expect(styles).not.toContain(".labs-owner-shell");
```

- [ ] **Step 3: Run the targeted tests and verify the Labs contract fails**

Run:

```powershell
npx vitest run tests/v3-vase-app-visual-restoration.test.ts tests/v3-labs-owner-standalone-ui.test.ts
```

Expected: the Vase App assertions pass; the Labs test fails because the active
layout still uses `labs-app-shell` and the stylesheet still contains the stale
`labs-rail`, `owner-labs`, and `labs-owner` visual systems.

- [ ] **Step 4: Commit the failing visual contract**

```powershell
git add -- tests/v3-vase-app-visual-restoration.test.ts tests/v3-labs-owner-standalone-ui.test.ts
git commit -m "test: lock vase app and labs visual sources"
```

### Task 2: Restore the advanced Labs shell names and composition

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/layout.tsx`
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] **Step 1: Restore the `05c3cb8` shell class names**

In `layout.tsx`, keep all current request-context, redirect, tenant, plan, AI
status, and return-link logic. Change only the two shell class names:

```tsx
<div className="labs-shell overflow-x-hidden">
  <aside
    className="labs-sidebar fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col px-4 py-5 lg:flex"
    aria-label="Navegacion principal de Vase Labs"
  >
```

- [ ] **Step 2: Rename the active integrated shell selectors**

In the final active section of `globals.css`, rename the selectors without
changing their declarations:

```css
.labs-shell {
  min-height: 100vh;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--background) 96%, transparent), var(--background-elevated)),
    var(--background);
  color: var(--foreground);
  font-family: Manrope, Satoshi, "General Sans", "Aptos", sans-serif;
}

.labs-shell h1,
.labs-shell h2,
.labs-shell h3 {
  font-family: "Newsreader", Georgia, "Times New Roman", serif;
}

.labs-sidebar {
  border-right: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-strong) 88%, var(--background));
  box-shadow: 10px 0 34px color-mix(in srgb, var(--glass-shadow) 42%, transparent);
}
```

- [ ] **Step 3: Run the Labs test and confirm only obsolete CSS assertions remain failing**

Run:

```powershell
npx vitest run tests/v3-labs-owner-standalone-ui.test.ts
```

Expected: `labs-shell` and `labs-sidebar` assertions pass; the test still fails
on obsolete selector absence.

- [ ] **Step 4: Commit the shell restoration**

```powershell
git add -- apps/vase-labs/app/app/owner/labs/layout.tsx apps/vase-labs/app/globals.css
git commit -m "fix: restore advanced labs owner shell"
```

### Task 3: Remove obsolete Labs design systems without removing active controls

**Files:**
- Modify: `apps/vase-labs/app/globals.css`
- Test: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] **Step 1: Inventory CSS classes used by active Labs routes**

Run:

```powershell
rg -o 'labs-[a-z0-9-]+' apps/vase-labs/app --glob '!globals.css' | Sort-Object -Unique
```

Expected active custom classes include `labs-shell`, `labs-sidebar`,
`labs-theme-card`, `labs-panel`, `labs-subpanel`, `labs-button`,
`labs-button-primary`, `labs-button-secondary`, `labs-scrollbar`, and the
`labs-channel-*` selectors used by the channels route.

- [ ] **Step 2: Delete the unused ZIP and intermediate dashboard blocks**

From `globals.css`, remove the complete selector blocks rooted at:

```css
.labs-rail { /* ZIP-era rail */ }
.hero-panel { /* ZIP-era hero */ }
.metric-grid { /* ZIP-era metrics */ }
.content-grid { /* ZIP-era content */ }
.owner-labs-shell { /* intermediate owner dashboard */ }
.labs-owner-shell { /* intermediate organic dashboard */ }
.labs-dashboard-hero { /* later main dashboard */ }
.labs-operations-strip { /* later main operations cards */ }
```

Also remove their coupled media-query rules, pseudo-elements, animations, and
unused helper selectors. Do not remove the root design tokens, global focus
styles, active advanced shell selectors, common panel/button/scrollbar rules,
or `labs-channel-*` rules referenced by the current channels page.

- [ ] **Step 3: Keep only the operational channel rules required by `63e38a1`**

The retained channel CSS must include these actual active selectors:

```css
.labs-channel-grid { /* active channel layout */ }
.labs-channel-card { /* active channel surface */ }
.labs-channel-card-top { /* status row */ }
.labs-channel-card-title { /* title row */ }
.labs-channel-whatsapp::after { /* WhatsApp identity */ }
.labs-channel-instagram::after { /* Instagram identity */ }
.labs-channel-facebook::after { /* Facebook identity */ }
.labs-channel-facts { /* plan and connection facts */ }
.labs-channel-webhook { /* webhook surface */ }
.labs-channel-endpoints { /* endpoint list */ }
.labs-channel-error { /* connection errors */ }
```

- [ ] **Step 4: Run the visual-source tests**

Run:

```powershell
npx vitest run tests/v3-vase-app-visual-restoration.test.ts tests/v3-labs-owner-standalone-ui.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the CSS cleanup**

```powershell
git add -- apps/vase-labs/app/globals.css tests/v3-labs-owner-standalone-ui.test.ts
git commit -m "fix: remove superseded labs visual systems"
```

### Task 4: Verify the `63e38a1` operational surface remains visible

**Files:**
- Verify: `apps/vase-labs/app/app/owner/labs/page.tsx`
- Verify: `apps/vase-labs/app/app/owner/labs/channels/page.tsx`
- Verify: `apps/vase-labs/app/lib/billing.ts`
- Verify: `packages/contracts/src/index.ts`
- Test: `tests/v3-app-labs-billing.test.ts`
- Test: `tests/v3-labs-api-routes.test.ts`
- Test: `tests/v3-labs-services.test.ts`
- Test: `tests/v3-contracts.test.ts`

- [ ] **Step 1: Verify the approved plan, token, AI, and channel helpers are still wired**

Run:

```powershell
rg -n "getLabsPlanLimits|createRuntimeEntitlement|calculateRemainingTokens|calculateRemainingMessages|getAiAvailability|canTenantUseChannel" apps/vase-labs/app/app/owner/labs/page.tsx apps/vase-labs/app/lib/billing.ts packages/contracts/src/index.ts
```

Expected: every helper is present in its implementation and the dashboard uses
the derived plan, token, message, AI availability, and channel state.

- [ ] **Step 2: Run the operational Labs regression tests**

Run:

```powershell
npx vitest run tests/v3-app-labs-billing.test.ts tests/v3-labs-api-routes.test.ts tests/v3-labs-services.test.ts tests/v3-contracts.test.ts
```

Expected: PASS with no route, contract, billing, token, or channel regression.

- [ ] **Step 3: Commit only if operational wiring required a correction**

If a verified failure requires an in-scope correction, stage only the corrected
files and use:

```powershell
git commit -m "fix: preserve labs operational controls"
```

If all tests pass without changes, do not create an empty commit.

### Task 5: Complete repository and visual verification

**Files:**
- Verify: `apps/vase-app/**`
- Verify: `apps/vase-labs/**`
- Verify: `tests/**`

- [ ] **Step 1: Run targeted typechecks**

Run:

```powershell
npm run typecheck --workspace @vase/app
npm run typecheck --workspace @vase/labs
```

Expected: both commands exit 0.

- [ ] **Step 2: Run all visual and Labs tests**

Run:

```powershell
npx vitest run tests/v3-vase-app-visual-restoration.test.ts tests/v3-labs-owner-standalone-ui.test.ts tests/v3-app-labs-billing.test.ts tests/v3-labs-api-routes.test.ts tests/v3-labs-services.test.ts tests/v3-contracts.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run production builds**

Run:

```powershell
npm run build --workspace @vase/app
npm run build --workspace @vase/labs
```

Expected: both builds exit 0. If an external dependency, database, or SSL issue
blocks a build, record the exact failure separately from code validation.

- [ ] **Step 4: Run final repository checks**

Run:

```powershell
git diff --check
git status --short
git diff --stat 20ce3e7..HEAD
```

Expected: no whitespace errors; only planned source/test files plus the two
pre-existing untracked ZIP files appear; the diff contains no unrelated change.

- [ ] **Step 5: Commit any final in-scope compatibility correction**

```powershell
git add -- apps/vase-labs/app/globals.css apps/vase-labs/app/app/owner/labs/layout.tsx tests/v3-labs-owner-standalone-ui.test.ts tests/v3-vase-app-visual-restoration.test.ts
git commit -m "fix: complete vase visual restoration"
```

Do not stage `apps/vase-app.zip` or `apps/vase-labs.zip`.

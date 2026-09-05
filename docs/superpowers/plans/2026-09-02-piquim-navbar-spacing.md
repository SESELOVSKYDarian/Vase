# Piquim Navbar and Internal Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Piquim storefront navbar stacking, optical alignment and internal-page spacing without changing other tenants or storefront behavior.

**Architecture:** Keep Piquim decisions in its existing conditional branches. The sticky header stays in document flow, receives a storefront-level stacking layer, and desktop navigation participates in flex layout so search expansion consumes real space. Internal-page spacing is conditional on `isPiquimTenantIdentity` rather than globally offsetting `<main>`.

**Tech Stack:** React 18, Vite, Tailwind CSS, Node built-in test runner.

---

### Task 1: Lock the Piquim layout contract with a source regression test

**Files:**
- Create: `apps/vase-editor/web/tests/piquim-navbar-layout.test.mjs`
- Test: `apps/vase-editor/web/tests/piquim-navbar-layout.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('Piquim navbar removes the secondary nav surface and owns the storefront layer', async () => {
  const source = await readFile(headerUrl, 'utf8');
  const piquim = source.slice(source.indexOf('if (isPiquimPreset)'), source.indexOf('return (', source.indexOf('if (isPiquimPreset)') + 1) + 1);

  assert.match(piquim, /sticky top-0 z-\[1000\] isolate/);
  assert.doesNotMatch(piquim, /<nav className=.*rounded-full.*bg-\[var\(--store-surface\)\]/s);
  assert.match(piquim, /bg-\[var\(--store-primary\)\] text-white/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/piquim-navbar-layout.test.mjs` from `apps/vase-editor/web`.

Expected: failure because the header still uses `z-50` and the nav has its own surface.

- [ ] **Step 3: Add coverage for Piquim internal-page spacing**

```js
test('Piquim internal pages use flow spacing instead of vertical viewport centering', async () => {
  const [login, signup, cart, about] = await Promise.all(pageUrls.map((url) => readFile(url, 'utf8')));

  assert.match(login, /isPiquim.*pt-8.*pb-16/s);
  assert.match(signup, /isPiquim.*pt-8.*pb-16/s);
  assert.match(cart, /isPiquim.*pt-8/s);
  assert.match(about, /isPiquim.*pt-8/s);
});
```

- [ ] **Step 4: Run the test again and confirm both assertions are red**

Run: `node --test tests/piquim-navbar-layout.test.mjs`.

Expected: two assertion failures describing the missing header and internal-page layout contracts.

### Task 2: Refine the Piquim header without changing its interaction model

**Files:**
- Modify: `apps/vase-editor/web/src/components/layout/Header.jsx:550-675`
- Modify: `apps/vase-editor/web/src/components/layout/StoreLayout.jsx:143-175`
- Test: `apps/vase-editor/web/tests/piquim-navbar-layout.test.mjs`

- [ ] **Step 1: Implement the Piquim stacking and desktop layout contract**

```jsx
<header className="sticky top-0 z-[1000] isolate w-full font-[var(--font-family)]">
  <div className="w-full px-[60px] py-[18px] max-md:px-4">
    <div className="relative flex min-h-[68px] items-center gap-3 overflow-visible rounded-[30px] ...">
      {/* logo */}
      <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-2 py-1 transition-[transform,margin] duration-300 lg:flex xl:translate-x-3 2xl:translate-x-5">
        {/* existing link map and active pill */}
      </nav>
      {/* existing action group with search widths unchanged */}
    </div>
  </div>
</header>
```

Keep the existing search state, input, dropdown and link handlers unchanged. The nav has no own background or radius; link-level active/hover styles remain unchanged. The `flex-1 min-w-0` nav and `shrink-0` actions resolve search expansion through actual layout.

- [ ] **Step 2: Ensure the storefront shell does not trap header stacking**

```jsx
<div className="storefront-shell relative flex min-h-screen flex-col bg-[var(--store-background)] ...">
  <Header ... />
  <main className="relative z-0 flex-grow">{children}</main>
</div>
```

Do not add top padding to Home or catalog landing; Header remains before main and sticky.

- [ ] **Step 3: Run the regression test to verify it passes**

Run: `node --test tests/piquim-navbar-layout.test.mjs`.

Expected: PASS for the header contract; internal-page assertion remains red until Task 3.

### Task 3: Apply Piquim-only flow spacing to internal pages

**Files:**
- Modify: `apps/vase-editor/web/src/pages/store/LoginPage.jsx:139-176,223-328`
- Modify: `apps/vase-editor/web/src/pages/store/SignupPage.jsx:748-857`
- Modify: `apps/vase-editor/web/src/pages/store/CartPage.jsx:94-120`
- Modify: `apps/vase-editor/web/src/pages/store/AboutPage.jsx:77-86`
- Test: `apps/vase-editor/web/tests/piquim-navbar-layout.test.mjs`

- [ ] **Step 1: Add Piquim identity reads where absent**

```js
import { isPiquimTenantIdentity } from '../../utils/tenantBranding';

const { tenant, settings } = useTenant();
const isPiquim = isPiquimTenantIdentity({ tenant, settings });
```

Use the page's existing `useTenant` result when available; do not duplicate it.

- [ ] **Step 2: Replace vertical centering only for Piquim auth views**

```jsx
<div className={isPiquim
  ? 'flex justify-center px-4 pt-8 pb-16 md:pt-10'
  : 'min-h-[80vh] flex items-center justify-center px-4'}>
```

Apply this exact conditional to both the external-auth and local-auth wrappers in Login and Signup, preserving their current backgrounds for non-Piquim tenants.

- [ ] **Step 3: Apply page-specific Piquim top rhythm**

```jsx
<div className={`bg-zinc-50 dark:bg-zinc-950 min-h-[80vh] pb-32 lg:pb-12 ${isPiquim ? 'pt-8 md:pt-10' : 'pt-8'}`}>
```

For Cart's empty state, use the corresponding Piquim flow wrapper (`justify-start pt-8 pb-16`) while preserving the existing centered non-Piquim state. Wrap About's `PageBuilder` in a Piquim-only `pt-8 md:pt-10` container; leave the home and catalog overlays untouched.

- [ ] **Step 4: Run the focused regression test**

Run: `node --test tests/piquim-navbar-layout.test.mjs`.

Expected: PASS with two tests and zero failures.

### Task 4: Verify the deliverable

**Files:**
- Modify: none
- Test: `apps/vase-editor/web/tests/piquim-navbar-layout.test.mjs`

- [ ] **Step 1: Run focused storefront tests**

Run: `node --test tests/piquim-navbar-layout.test.mjs tests/piquim-dark-catalog.test.mjs` from `apps/vase-editor/web`.

Expected: all tests pass.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint && npm run build` from `apps/vase-editor/web`.

Expected: exit code 0.

- [ ] **Step 3: Run the design detector and inspect the diff**

Run: `node C:/Users/Usuario/.agents/skills/impeccable/scripts/detect.mjs --json apps/vase-editor/web/src/components/layout/Header.jsx apps/vase-editor/web/src/components/layout/StoreLayout.jsx apps/vase-editor/web/src/pages/store/LoginPage.jsx apps/vase-editor/web/src/pages/store/SignupPage.jsx apps/vase-editor/web/src/pages/store/CartPage.jsx apps/vase-editor/web/src/pages/store/AboutPage.jsx && git diff --check && git diff --stat`.

Expected: no blocking detector finding, no whitespace error, and only scoped files changed.

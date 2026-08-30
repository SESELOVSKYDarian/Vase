# Evolution Compact Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the Evolution catalog and ensure its product inspector never overlays the catalog on wide desktop screens.

**Architecture:** Keep the existing catalog and inspector components and change only responsive layout and presentation classes. `EvolutionInspector` owns docked-versus-drawer behavior; `CatalogEditor` owns grid and card density; `CatalogInspectorPanel` owns form density.

**Tech Stack:** React, Zustand, Tailwind CSS, Vite, Node test runner.

---

### Task 1: Add catalog layout regression coverage

**Files:**
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Write a failing source regression test**

Add a test that reads `CatalogEditor.jsx`, `EvolutionInspector.jsx`, and `CatalogInspectorPanel.jsx`, then verifies the catalog uses an auto-fill compact grid, cards use a bounded non-square image region with `object-contain`, and the inspector has a wide-screen relative layout independent of its pin state.

```js
test('el catalogo evolution es compacto y el inspector no se superpone en escritorio', async () => {
    const [catalog, inspector, catalogInspector] = await Promise.all([
        read('../src/components/admin/evolution/CatalogEditor.jsx'),
        read('../src/components/admin/evolution/EvolutionInspector.jsx'),
        read('../src/components/admin/evolution/CatalogInspectorPanel.jsx'),
    ]);

    assert.match(catalog, /repeat\(auto-fill,minmax\(190px,1fr\)\)/);
    assert.match(catalog, /h-\[148px\]/);
    assert.match(catalog, /object-contain/);
    assert.match(inspector, /useState\(true\)/);
    assert.match(inspector, /2xl:relative/);
    assert.match(catalogInspector, /space-y-3/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: the new catalog density test fails against the current fixed breakpoint grid and conditionally docked inspector.

### Task 2: Dock the inspector without overlap

**Files:**
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionInspector.jsx`

- [ ] **Step 1: Make wide-screen layout relative by default**

At `2xl`, render the inspector as a relative flex sibling with a stable width and no scrim. Preserve fixed drawer and scrim behavior below `2xl`. Keep the pin control as an explicit overlay/docked toggle rather than a requirement for basic non-overlapping layout.

```jsx
const [isPinned, setIsPinned] = useState(true);
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: inspector layout assertions pass; catalog assertions may remain failing.

- [ ] **Step 3: Commit**

Run: `git commit -m "fix: dock evolution catalog inspector"`

### Task 3: Compact the product catalog

**Files:**
- Modify: `apps/vase-editor/web/src/components/admin/evolution/CatalogEditor.jsx`

- [ ] **Step 1: Compact the toolbar**

Render title, short description, search, and create button in one responsive toolbar using existing admin theme tokens.

- [ ] **Step 2: Replace breakpoint columns with an auto-fill grid**

Use `grid-cols-[repeat(auto-fill,minmax(190px,1fr))]`, a smaller gap, compact card padding, and a bounded image area. Keep `object-contain`, badges, price, product name, source, SKU, stock, edit selection, and delete menu.

```jsx
<div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2 pb-6">
    <div className="relative mb-2 h-[148px] overflow-hidden rounded-lg">
        <img className="h-full w-full object-contain" />
    </div>
</div>
```

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: compact catalog and inspector assertions pass.

- [ ] **Step 4: Commit**

Run: `git commit -m "feat: compact evolution product catalog"`

### Task 4: Compact the catalog inspector and verify

**Files:**
- Modify: `apps/vase-editor/web/src/components/admin/evolution/CatalogInspectorPanel.jsx`
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Reduce inspector spacing without removing controls**

Reduce outer section gaps, panel padding, tab spacing, and field rhythm using existing semantic tokens. Keep all current tabs, fields, synchronization controls, detected price cards, images, categories, and actions.

```jsx
<div className="space-y-3">
```

- [ ] **Step 2: Run complete frontend verification**

Run: `$tests = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | ForEach-Object FullName; node --test $tests; npm run build`

Expected: all tests pass and Vite exits with code 0.

- [ ] **Step 3: Check the patch and commit**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git commit -m "style: tighten evolution catalog inspector"`

### Task 5: Final verification

- [ ] **Step 1: Run all web tests and production build fresh**

Run: `$tests = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | ForEach-Object FullName; node --test $tests; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run build`

Expected: zero test failures and successful production build.

- [ ] **Step 2: Verify repository state**

Run: `git diff --check; git status --short`

Expected: no uncommitted source changes after the final commit.

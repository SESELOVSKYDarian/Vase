# Piquim Mobile Catalog Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent editable Piquim catalog card titles from clipping on mobile while retaining image clipping and desktop composition.

**Architecture:** Add a small pure renderer beside `PiquimExactCatalogCard` that preserves `card.title` and exposes a responsive break after `/`. Update only text containers in the public landing and Home panel; the article remains image-clipped.

**Tech Stack:** React, Tailwind CSS, Node built-in test runner, Vite.

---

### Task 1: Capture the clipping regression

**Files:**
- Create: `apps/vase-editor/web/tests/piquim-mobile-title.test.mjs`
- Test: `apps/vase-editor/web/tests/piquim-mobile-title.test.mjs`

- [ ] **Step 1: Write a failing source test**

```js
assert.doesNotMatch(exactCard, /inset-x-10.*inline-flex.*overflow-hidden/s);
assert.match(exactCard, /w-full max-w-full min-w-0/);
assert.match(exactCard, /renderResponsiveCardTitle\(card\.title\)/);
assert.match(homePanel, /renderResponsiveCardTitle\(card\.title\)/);
```

- [ ] **Step 2: Verify red**

Run: `node --test tests/piquim-mobile-title.test.mjs` in `apps/vase-editor/web`.

Expected: FAIL because the landing title is still inside the recropping inline-flex container and both components render `card.title` directly.

### Task 2: Make title layout responsive without changing catalog behavior

**Files:**
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx:1079-1135`
- Modify: `apps/vase-editor/web/src/components/blocks/PiquimCatalog3Panel.jsx:1-55`
- Test: `apps/vase-editor/web/tests/piquim-mobile-title.test.mjs`

- [ ] **Step 1: Add a generic slash-aware title renderer in each component module**

```jsx
const renderResponsiveCardTitle = (title) => {
  const value = String(title || '');
  const slashIndex = value.indexOf('/');
  if (slashIndex < 0) return value;
  return <><span>{value.slice(0, slashIndex + 1)}</span><span className="block sm:inline">{value.slice(slashIndex + 1)}</span></>;
};
```

- [ ] **Step 2: Replace the exact landing title container**

```jsx
<div className="absolute inset-x-4 bottom-[30px] flex min-h-[290px] w-auto min-w-0 flex-col items-center justify-center gap-4 px-2 sm:inset-x-6 md:inset-x-10 md:px-0">
  <h2 className="w-full max-w-full min-w-0 text-center text-[clamp(2rem,10vw,3.5rem)] font-black italic leading-[0.95] text-[#FF4D00] [overflow-wrap:anywhere]">
    {renderResponsiveCardTitle(card.title)}
  </h2>
</div>
```

Keep the article's `overflow-hidden`, tags, description, button, image and click handler unchanged.

- [ ] **Step 3: Apply the same renderer and width rules to Home**

Replace `{card.title}` in `PiquimCatalog3Panel` with the renderer and keep its existing card/article/image behavior intact.

- [ ] **Step 4: Verify green**

Run: `node --test tests/piquim-mobile-title.test.mjs`.

Expected: PASS.

### Task 3: Verify the scoped change

**Files:**
- Modify: none

- [ ] **Step 1: Run catalog regression tests**

Run: `node --test tests/piquim-mobile-title.test.mjs tests/piquim-dark-catalog.test.mjs`.

Expected: all tests pass.

- [ ] **Step 2: Build production bundle**

Run: `npm run build` in `apps/vase-editor/web`.

Expected: exit code 0.

- [ ] **Step 3: Inspect scope**

Run: `git diff --check && git diff --name-only`.

Expected: only the two title components and the focused test change.

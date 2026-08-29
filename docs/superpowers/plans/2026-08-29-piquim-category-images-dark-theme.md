# Piquim Category Images and Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two Piquim category covers with the supplied gelato and bakery photos and make the Piquim catalog fully coherent in dark mode.

**Architecture:** Keep category content in `piquimBranding.js`, place optimized storefront assets under `public/piquim/catalogo`, and make the catalog consume semantic storefront theme tokens. The light theme remains unchanged while the dark preset becomes a Piquim-specific charcoal, warm brown, ivory, and orange palette.

**Tech Stack:** React, Vite, Tailwind utilities, CSS custom properties.

---

### Task 1: Replace category artwork

**Files:**
- Create: `apps/vase-editor/web/public/piquim/catalogo/card-heladeria-piquim.webp`
- Create: `apps/vase-editor/web/public/piquim/catalogo/card-panaderia-piquim.webp`
- Modify: `apps/vase-editor/web/src/data/piquimBranding.js`
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx`

- [ ] Import the two supplied vertical photos as optimized WebP assets without altering their photographic content.
- [ ] Point Heladeria to the gelato image and Panaderia/Confiteria to the cake image.
- [ ] Use per-card `objectPosition` values so the horizontal card crop emphasizes the product and excludes the embedded bottom logo.
- [ ] Verify both the landing cards and editor-configured fallback cards resolve the new assets.

### Task 2: Correct the Piquim dark preset

**Files:**
- Modify: `apps/vase-editor/web/src/utils/storefrontTheme.js`
- Modify: `apps/vase-editor/web/src/context/ThemeContext.jsx`

- [ ] Change the dark preset from teal to Piquim charcoal/brown surfaces, ivory text, warm muted text, orange primary, and orange accent.
- [ ] Expose semantic variables for surface, elevated surface, card, header, input, and border colors.
- [ ] Keep the existing light Piquim colors unchanged.

### Task 3: Remove forced light colors from the catalog

**Files:**
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx`
- Modify: `apps/vase-editor/web/src/components/layout/Header.jsx`
- Modify: `apps/vase-editor/web/src/index.css`

- [ ] Replace forced `#FFFAF6`, white card backgrounds, black text, and light borders in the Piquim catalog with semantic variables.
- [ ] Preserve intentional white text over photography and white translucent icon surfaces where contrast requires them.
- [ ] Ensure filters, subcategory sections, cards, loaders, modal surfaces, pagination, and navbar share the same dark palette.
- [ ] Verify desktop and mobile layouts remain responsive.

### Task 4: Production verification

**Files:**
- Verify: `apps/vase-editor/web`

- [ ] Run `npm run build` and require a successful Vite production build.
- [ ] Run `git diff --check` and require no whitespace errors in the edited storefront files.
- [ ] Serve the app locally and confirm `/catalog` returns HTTP 200.
- [ ] Audit remaining hardcoded light colors and confirm each remaining occurrence is intentional photography overlay content or unrelated admin UI.

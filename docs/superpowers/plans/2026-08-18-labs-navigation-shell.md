# Vase Labs Navigation Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Labs desktop shell with an accessible compact sidebar, useful top bar, theme toggle, and account menu.

**Architecture:** Keep navigation data in `labs-owner-nav.tsx`; the client shell owns visual state for sidebar, theme, search and account menu. The server layout supplies tenant data as props and no credentials enter the browser.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS, lucide-react, Vitest.

---

### Task 1: Test canonical shell affordances

**Files:**
- Modify: `tests/v3-labs-sidebar-shell.test.ts`
- Modify: `apps/vase-labs/app/app/owner/labs/labs-sidebar-shell.tsx`

- [ ] Add assertions for `FlaskConical`, a `Buscar en Labs` input, a `Cambiar tema` button, and `localStorage` theme persistence.
- [ ] Run `npm test -- --run tests/v3-labs-sidebar-shell.test.ts` and confirm it fails on the missing top-bar UI.
- [ ] Implement only the shell state and controls needed to make those assertions pass.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Rework desktop navigation and account placement

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/layout.tsx`
- Modify: `apps/vase-labs/app/globals.css`

- [ ] Add a compact-safe navigation item API with icon labels/tooltips, and choose `FlaskConical` for the Labs brand.
- [ ] Pass public tenant display details to the shell top bar; remove tenant/account content from the sidebar.
- [ ] Add compact rail, expansion, top bar, menu, theme and search-result styles, including `prefers-color-scheme` safe dark tokens.
- [ ] Run the focused shell and canonical route tests.

### Task 3: Verify navigation behavior

**Files:**
- Test: `tests/v3-labs-sidebar-shell.test.ts`
- Test: `tests/v3-labs-canonical-routes.test.ts`

- [ ] Test route filtering and keyboard selection helper behavior independently of React.
- [ ] Confirm compact navigation does not hide icon controls.
- [ ] Run `npm test -- --run tests/v3-labs-sidebar-shell.test.ts tests/v3-labs-canonical-routes.test.ts`.
- [ ] Run `npm run typecheck --workspace @vase/labs` and `npm run build --workspace @vase/labs` when installed dependencies are available.

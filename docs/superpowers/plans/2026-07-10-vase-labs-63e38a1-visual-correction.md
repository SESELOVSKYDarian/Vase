# Vase Labs 63e38a1 Visual Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mistakenly restored white `05c3cb8` owner dashboard with the exact dark-rail `63e38a1` Vase Labs design while retaining the current split-service behavior.

**Architecture:** Use `81d2726` for the owner-route TSX port of the `63e38a1` design and use the `63e38a1` stylesheet as the visual baseline. Adapt only post-baseline operational routes to the same class language.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind CSS 4, Vitest 4.1.2.

---

### Task 1: Prove the wrong dashboard is active

**Files:**
- Modify: `tests/v3-labs-owner-standalone-ui.test.ts`

- [ ] Replace the white-dashboard expectations with assertions for
  `labs-rail`, `hero-panel`, `content-grid`, `token-meter`, `plans-grid`, and
  `Tu acceso a Labs, canales y tokens en una sola vista.`
- [ ] Assert that `labs-sidebar`, `Operacion IA`, and the white `Panel de
  control` composition are absent.
- [ ] Run `npx vitest run tests/v3-labs-owner-standalone-ui.test.ts` and confirm
  it fails against the current white dashboard.

### Task 2: Restore the functional 63e38a1 owner port

**Files:**
- Modify: `apps/vase-labs/app/app/owner/labs/layout.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/labs-ui.tsx`
- Modify: `apps/vase-labs/app/app/owner/labs/page.tsx`

- [ ] Restore these four files from `81d2726`.
- [ ] Preserve current request-context authentication, Prisma-backed data,
  billing helpers, channel access, token calculations, and inbox links.
- [ ] Run the targeted UI and billing tests.

### Task 3: Restore the visual system and adapt later routes

**Files:**
- Modify: `apps/vase-labs/app/globals.css`
- Modify when required: `apps/vase-labs/app/app/owner/labs/channels/page.tsx`
- Modify when required: owner subpages using post-baseline custom classes

- [ ] Restore `globals.css` from `63e38a1`.
- [ ] Inventory custom Labs classes still used by all owner routes.
- [ ] Map later routes to the `63e38a1` panel, channel, conversation, CTA, and
  status class language without introducing another visual system.
- [ ] Run the Labs build to validate global CSS compilation.

### Task 4: Verify and publish

**Files:**
- Verify: `apps/vase-labs/**`
- Verify: `tests/**`

- [ ] Run the targeted 31-test suite.
- [ ] Run Vase App and Labs typechecks.
- [ ] Run Vase App and Labs production builds.
- [ ] Run `git diff --check` and inspect `git status --short`.
- [ ] Commit the correction on `main` and push `origin/main`.

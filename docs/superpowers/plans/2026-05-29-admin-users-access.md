# Admin Users Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Admin Users section where Super Admin can assign platform roles, tenant roles, and tenant-level Vase Labs access.

**Architecture:** Keep the existing Prisma model: user membership is per user/tenant, while Business/Labs module activation is per tenant via `TenantModule`. Add a focused server action and a small helper for stable module IDs and display summaries. The UI uses existing `AppShell`, `PanelCard`, `AdminUserGovernanceForm`, and `AdminAccessPolicyForm` patterns.

**Tech Stack:** Next.js App Router 16, React Server/Client Components, Prisma, Zod, Vitest.

---

### Task 1: Access Helpers

**Files:**
- Create: `src/lib/admin/user-access.ts`
- Test: `src/tests/admin-user-access.test.ts`

- [ ] Write a failing Vitest test that expects Labs and Business module IDs to be stable and access summaries to render as `Vase Business`, `Vase Labs`, or `Sin módulos`.
- [ ] Implement pure helpers in `src/lib/admin/user-access.ts`.
- [ ] Run `npm test -- src/tests/admin-user-access.test.ts`.

### Task 2: Server Action And Validation

**Files:**
- Modify: `src/lib/validators/admin.ts`
- Modify: `src/app/(platform)/app/admin/actions.ts`

- [ ] Add `updateUserTenantAccessSchema` validating `userId`, `tenantId`, `tenantRole`, `membershipStatus`, `businessAccess`, and `labsAccess`.
- [ ] Add `updateUserTenantAccessAction` guarded by Super Admin.
- [ ] Upsert `Membership` for the user/tenant.
- [ ] Ensure module catalog exists, then upsert `TenantModule` rows for `vase_business` and `vase_labs`.
- [ ] Audit and revalidate `/app/admin/users`, `/app/admin/modules`, and `/app`.

### Task 3: Admin Users Page

**Files:**
- Create: `src/app/(platform)/app/admin/users/page.tsx`

- [ ] Add a server-rendered admin users page with search filters.
- [ ] List users with platform role forms and admin policy forms.
- [ ] Show memberships, tenant roles, status, and module access summary.
- [ ] Add compact forms to apply access to a selected tenant.

### Task 4: Navigation

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

- [ ] Add `Admin > Usuarios` to the existing admin navigation using the existing `UserCog` icon and styling.

### Task 5: Verification

**Files:**
- No production edits.

- [ ] Run `npm test -- src/tests/admin-user-access.test.ts src/tests/custom-quotes.test.ts`.
- [ ] Run `npm run build`.
- [ ] Report any pre-existing typecheck issues separately if `npm run typecheck` is not clean.

# Super Admin User Access Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Super Admin user creation and editing into one full-access modal that always captures `Usuario`, `Tenant`, `Membership`, `Módulos`, and multi-select `Submódulos`, while preserving existing database records and never resetting data.

**Architecture:** Keep the current multi-tenant model intact. Extend the admin payload so the modal can create or update the user identity, tenant membership, module access, and a list of submodule assignments in one transaction. Existing records with missing tenant/module/submodule data should round-trip as empty/null values in the UI and remain editable without destructive resets.

**Tech Stack:** Next.js App Router, React `useActionState`, Prisma, Zod, existing admin modal/workspace components, existing audit/revalidation helpers.

---

### Task 1: Expand the admin data contract

**Files:**
- Modify: `src/lib/validators/admin.ts`
- Modify: `src/app/(platform)/app/admin/actions.ts:4544-4860`
- Modify: `src/lib/admin/user-access.ts`

- [ ] **Step 1: Tighten the payload shape for full user access**

```ts
export const updateUserTenantAccessSnapshotSchema = z.object({
  userId: z.string().trim().cuid(),
  tenantId: z.string().trim().cuid(),
  tenantRole: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  membershipStatus: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).default("ACTIVE"),
  modules: z.array(
    z.object({
      moduleId: z.string().trim().min(3).max(80),
      isActive: z.boolean(),
      submodules: z.array(
        z.object({
          submoduleId: z.string().trim().cuid(),
          isActive: z.boolean(),
        }),
      ).default([]),
    }),
  ).default([]),
});
```

- [ ] **Step 2: Parse multi-select submodules without breaking old data**

```ts
type ClientAccessConfigInput = {
  tenantPlan: "TRIAL" | "PRO";
  proSubmoduleIds: string[];
  moduleLimits: Record<string, { pages?: number | null; chatbots?: number | null }>;
};
```

- [ ] **Step 3: Keep existing tenant/module writes additive**

```ts
await tx.tenantModule.upsert({
  where: { tenantId_moduleId: { tenantId, moduleId } },
  update: { isActive: true, activatedAt: now },
  create: { tenantId, moduleId, isActive: true, activatedAt: now },
});
```

- [ ] **Step 4: Add a testable helper for serialized submodule lists**

```ts
export function parseSelectedSubmoduleIds(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return [];
  return rawValue.split(",").map((value) => value.trim()).filter(Boolean);
}
```

### Task 2: Rebuild the Super Admin modal UI

**Files:**
- Modify: `src/components/admin/admin-master-users-workspace.tsx`
- Modify: `src/components/admin/admin-manual-user-create-form.tsx`
- Modify: `src/components/admin/admin-user-tenant-access-form.tsx`
- Modify: `src/components/ui/crud-modal.tsx` only if the current modal shell blocks a single full form

- [ ] **Step 1: Render create/edit from the same form state**

```tsx
type UserEditorState = {
  userId: string | null;
  name: string;
  email: string;
  password: string;
  tenantId: string | null;
  tenantRole: "OWNER" | "MANAGER" | "MEMBER" | null;
  membershipStatus: "ACTIVE" | "INVITED" | "SUSPENDED" | null;
  moduleIds: string[];
  submoduleIdsByModule: Record<string, string[]>;
};
```

- [ ] **Step 2: Show nulls as empty selections for legacy users**

```tsx
<select defaultValue={editor.tenantId ?? ""} name="tenantId">...</select>
<select defaultValue={editor.tenantRole ?? "MEMBER"} name="tenantRole">...</select>
```

- [ ] **Step 3: Add multi-select submodules per active module**

```tsx
<select multiple name={`submoduleIds.${module.id}`}>
  {module.submodules.map((submodule) => (
    <option key={submodule.id} value={submodule.id}>{submodule.name}</option>
  ))}
</select>
```

- [ ] **Step 4: Preserve existing records and let the modal patch them in place**

```tsx
<input type="hidden" name="userId" value={editor.userId ?? ""} />
<input type="hidden" name="clientAccessConfig" value={JSON.stringify(nextClientAccessConfig)} />
```

### Task 3: Add focused tests and verify non-destructive behavior

**Files:**
- Modify: `src/tests/admin-user-access.test.ts`
- Modify: `src/tests/security-controls.test.ts` only if helpers move
- Run: `npm run test:unit`
- Run: `npm run typecheck`

- [ ] **Step 1: Add a unit test for multi-submodule serialization**

```ts
expect(parseSelectedSubmoduleIds("sub-1, sub-2")).toEqual(["sub-1", "sub-2"]);
expect(parseSelectedSubmoduleIds("")).toEqual([]);
```

- [ ] **Step 2: Add a unit test for the snapshot shape**

```ts
expect(
  updateUserTenantAccessSnapshotSchema.parse({
    userId,
    tenantId,
    tenantRole: "OWNER",
    membershipStatus: "ACTIVE",
    modules: [{ moduleId: "vase_labs", isActive: true, submodules: [{ submoduleId, isActive: true }] }],
  }),
).toBeTruthy();
```

- [ ] **Step 3: Run validation without any DB reset**

```bash
npm run test:unit
npm run typecheck
```

- [ ] **Step 4: Confirm existing records remain intact**

```ts
// Expect legacy users with null tenant/module/submodule data to still load and edit.
```


# Vase App/Labs Separate Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/vase-app` boot on a runtime-provided port so `app-vase` can stay on `3002` while `vase-labs` runs the same image on `3000`, without regressing the public-home and Labs-routing contracts.

**Architecture:** Keep the existing shared `vase-app` codebase for both `app.vase.ar` and `labs.vase.ar`. Fix the container contract at the Dockerfile level, keep package scripts on `3002` for local development, and preserve the existing app-shell/labs-shell routing behavior with explicit regression coverage.

**Tech Stack:** Next.js 16, Vitest, Docker, EasyPanel, TypeScript

---

### Task 1: Lock the Runtime Contract With Failing Tests

**Files:**
- Modify: `tests/vase-app-migration.test.ts`
- Test: `tests/vase-app-migration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("keeps local scripts on 3002 but lets the Docker runtime honor PORT", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };
  const dockerfile = read("Dockerfile");

  expect(packageJson.scripts.dev).toContain("--port 3002");
  expect(packageJson.scripts.start).toContain("--port 3002");
  expect(dockerfile).toContain("ENV PORT=3002");
  expect(dockerfile).toContain("EXPOSE 3000");
  expect(dockerfile).toContain("EXPOSE 3002");
  expect(dockerfile).toContain('npx next start -H 0.0.0.0 -p "${PORT:-3002}"');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- tests/vase-app-migration.test.ts
```

Expected: FAIL because `apps/vase-app/Dockerfile` still exposes only `3002` and still hardcodes `-p 3002`.

- [ ] **Step 3: Write minimal implementation**

Update `tests/vase-app-migration.test.ts` by replacing the old fixed-port Docker assertions with the new runtime-port expectations.

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run:

```powershell
npm run test -- tests/vase-app-migration.test.ts
```

Expected: FAIL only on the Dockerfile assertions, proving the regression test is aimed at the missing behavior.

- [ ] **Step 5: Commit**

```powershell
git add tests/vase-app-migration.test.ts
git commit -m "test: cover vase app runtime port contract"
```

### Task 2: Make the Shared App Image Work for App and Labs

**Files:**
- Modify: `apps/vase-app/Dockerfile`
- Modify: `apps/vase-app/README.md`
- Test: `tests/vase-app-migration.test.ts`

- [ ] **Step 1: Write the failing behavior target down in code**

Keep the Task 1 failing assertions as the executable contract:

```dockerfile
ENV PORT=3002
EXPOSE 3000
EXPOSE 3002
CMD ["sh", "scripts/prisma-startup.sh", "sh", "-c", "if [ -n \"$MASTER_ADMIN_PASSWORD\" ]; then npm run bootstrap:master-admin; fi && if [ -n \"$TEST_ACCOUNT_PASSWORD\" ]; then npm run bootstrap:test-account; fi && npx next start -H 0.0.0.0 -p \"${PORT:-3002}\""]
```

- [ ] **Step 2: Implement the minimal Dockerfile change**

Apply this exact update in `apps/vase-app/Dockerfile`:

```dockerfile
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/package-lock.json ./package-lock.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-app ./apps/vase-app

WORKDIR /repo/apps/vase-app
EXPOSE 3000
EXPOSE 3002

CMD ["sh", "scripts/prisma-startup.sh", "sh", "-c", "if [ -n \"$MASTER_ADMIN_PASSWORD\" ]; then npm run bootstrap:master-admin; fi && if [ -n \"$TEST_ACCOUNT_PASSWORD\" ]; then npm run bootstrap:test-account; fi && npx next start -H 0.0.0.0 -p \"${PORT:-3002}\""]
```

- [ ] **Step 3: Update the deployment README**

Add the dual-service note in `apps/vase-app/README.md`:

```md
## EasyPanel

- Build context: `/`
- Dockerfile: `apps/vase-app/Dockerfile`
- Internal port for `app-vase`: `3002`
- Internal port for `vase-labs`: `3000`
- Domains: `app.vase.ar`, `labs.vase.ar`
```

- [ ] **Step 4: Run the targeted regression test to verify it passes**

Run:

```powershell
npm run test -- tests/vase-app-migration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/vase-app/Dockerfile apps/vase-app/README.md tests/vase-app-migration.test.ts
git commit -m "feat: allow vase app runtime port overrides"
```

### Task 3: Protect the Existing Public-Home and Labs Isolation Behavior

**Files:**
- Modify: `apps/vase-app/src/tests/document-navigation.test.ts`
- Test: `apps/vase-app/src/tests/document-navigation.test.ts`

- [ ] **Step 1: Write the failing regression cases**

Append these assertions to `apps/vase-app/src/tests/document-navigation.test.ts`:

```ts
it("keeps the app home shortcut on the public site and traps non-labs links on labs hosts", () => {
  expect(resolveAppHomeHref()).toBe("https://vase.ar");
  expect(resolveShortcutHref("goto_home", "/app")).toBe("https://vase.ar");
  expect(resolveNavigationHrefForHost("https://vase.ar", "labs.vase.ar")).toBe(
    "/app/owner/labs",
  );
  expect(resolveNavigationHrefForHost("/app/settings", "labs.vase.ar")).toBe(
    "/app/owner/labs",
  );
});
```

- [ ] **Step 2: Run test to verify the current behavior**

Run:

```powershell
npm run test --workspace @vase/app -- src/tests/document-navigation.test.ts
```

Expected: PASS if the existing routing contract is still intact. If it fails, stop and inspect before changing application code.

- [ ] **Step 3: Keep implementation unchanged unless the test disproves the assumption**

If the test passes, do not modify `app-shell.tsx`, `labs-owner-nav.tsx`, or `document-navigation.ts`. The purpose of this task is to freeze already-correct behavior as explicit regression coverage.

- [ ] **Step 4: Re-run the targeted test after any required adjustment**

Run:

```powershell
npm run test --workspace @vase/app -- src/tests/document-navigation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/vase-app/src/tests/document-navigation.test.ts
git commit -m "test: lock public home and labs host navigation"
```

### Task 4: Verify the End-to-End Contract

**Files:**
- Verify: `apps/vase-app/Dockerfile`
- Verify: `tests/vase-app-migration.test.ts`
- Verify: `apps/vase-app/src/tests/document-navigation.test.ts`

- [ ] **Step 1: Run the two targeted test files together**

Run:

```powershell
npm run test --workspace @vase/app -- src/tests/document-navigation.test.ts
npm run test -- tests/vase-app-migration.test.ts
```

Expected: both PASS.

- [ ] **Step 2: Run the app build**

Run:

```powershell
npm run build --workspace @vase/app
```

Expected: successful Next.js production build.

- [ ] **Step 3: Run the Portal build to confirm no regression from the shared-domain contract**

Run:

```powershell
npm run build --workspace @vase/portal
```

Expected: successful Next.js production build.

- [ ] **Step 4: Check the diff and commit any remaining changes**

Run:

```powershell
git status --short
git diff --stat
```

Expected: only the intended app/labs split files remain modified.

- [ ] **Step 5: Commit**

```powershell
git add apps/vase-app/Dockerfile apps/vase-app/README.md apps/vase-app/src/tests/document-navigation.test.ts tests/vase-app-migration.test.ts docs/superpowers/plans/2026-07-02-vase-app-labs-separate-services.md
git commit -m "feat: support separate vase app and labs services"
```

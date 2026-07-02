# Vase Portal Port 3000 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Vase Portal consistently on port `3000` across local scripts, Docker, EasyPanel documentation, and automated checks.

**Architecture:** Keep Portal as the public `vase.ar` service and change only its internal listening port. Vase App remains on `3002`, so the Portal-to-App connection and `APP_INTERNAL_URL` are unchanged.

**Tech Stack:** Next.js 16.2.1, npm workspaces, Docker, Vitest, EasyPanel.

---

### Task 1: Change the Portal port contract to 3000

**Files:**
- Modify: `tests/vase-portal-migration.test.ts`
- Modify: `apps/vase-portal/package.json`
- Modify: `apps/vase-portal/Dockerfile`
- Modify: `apps/vase-portal/.env.example`
- Modify: `apps/vase-portal/README.md`
- Modify: `docs/runbooks/vase-domain-cutover.md`

- [ ] **Step 1: Write the failing repository contract**

Update the EasyPanel packaging test to require port `3000` in Docker and both
Portal start scripts:

```ts
const packageJson = JSON.parse(
  fs.readFileSync(path.join(portal, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

expect(dockerfile).toContain("ENV PORT=3000");
expect(dockerfile).toContain("EXPOSE 3000");
expect(packageJson.scripts.dev).toContain("--port 3000");
expect(packageJson.scripts.start).toContain("--port 3000");
```

- [ ] **Step 2: Run the contract and confirm the expected failure**

Run:

```powershell
npm test -- --run tests/vase-portal-migration.test.ts
```

Expected: FAIL because Docker and package scripts still use `3001`.

- [ ] **Step 3: Update the executable Portal configuration**

Set both `dev` and `start` in `apps/vase-portal/package.json` to
`--port 3000`. In the Docker runner stage set:

```dockerfile
ENV PORT=3000
EXPOSE 3000
```

- [ ] **Step 4: Update environment and deployment documentation**

Replace Portal-only occurrences of `3001` with `3000` in:

```text
apps/vase-portal/.env.example
apps/vase-portal/README.md
docs/runbooks/vase-domain-cutover.md
```

Keep every Vase App reference on port `3002`.

- [ ] **Step 5: Run focused validation**

Run:

```powershell
npm test -- --run tests/vase-portal-migration.test.ts
npm run test --workspace @vase/portal
npm run typecheck --workspace @vase/portal
npm run build --workspace @vase/portal
git diff --check
```

Expected: all commands exit `0`, and the Portal build still exposes all public
routes.

- [ ] **Step 6: Build the production image**

Run:

```powershell
docker build -f apps/vase-portal/Dockerfile -t vase-portal:port-3000 .
```

Expected: the image builds successfully and `docker image inspect` reports
`3000/tcp` in `Config.ExposedPorts`.

- [ ] **Step 7: Commit the port migration**

```powershell
git add tests/vase-portal-migration.test.ts apps/vase-portal/package.json apps/vase-portal/Dockerfile apps/vase-portal/.env.example apps/vase-portal/README.md docs/runbooks/vase-domain-cutover.md
git commit -m "chore: run Vase Portal on port 3000"
```

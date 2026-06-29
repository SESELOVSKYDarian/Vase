# Vase App V3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the complete authenticated Vase application into `apps/vase-app`, deploy it in parallel at `app.vase.ar`, and preserve the existing MySQL users and Business SSO flow.

**Architecture:** Import the production application from `origin/main` into the V3 workspace without rewriting its business logic. Keep `vase.ar` running on the existing service, connect `vase-app-next` to the existing `vase-db`, and use `app.vase.ar` as the new canonical authenticated origin. PostgreSQL migration and Portal cutover remain separate projects.

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript, Prisma 6 with MySQL, NextAuth 5 beta, Vitest, Docker, EasyPanel, Cloudflare.

---

## File Structure

The migration creates or replaces these units:

- `apps/vase-app/src/`: authenticated routes, components, domain logic, API routes, and tests imported from `origin/main`.
- `apps/vase-app/prisma/`: current MySQL schema, migrations, seed, and fixtures.
- `apps/vase-app/scripts/`: database startup and administrative scripts.
- `apps/vase-app/public/`: application assets.
- `apps/vase-app/e2e/`: application end-to-end tests.
- `apps/vase-app/middleware.ts`: host routing and authentication middleware.
- `apps/vase-app/next.config.ts`: production Next.js configuration.
- `apps/vase-app/tsconfig.json`: application TypeScript paths.
- `apps/vase-app/tsconfig.build.json`: production build type-check configuration.
- `apps/vase-app/vitest.config.ts`: application unit-test configuration.
- `apps/vase-app/package.json`: workspace-owned runtime and development dependencies.
- `apps/vase-app/Dockerfile`: root-context EasyPanel image for port `3002`.
- `tests/vase-app-migration.test.ts`: monorepo-level extraction and deployment contract.
- `tests/v3-workspace-structure.test.ts`: temporary MySQL exception for Vase App stage one.
- `docs/v3/easypanel.md`: parallel deployment procedure.
- `docs/deployment/business-editor-bridge.md`: canonical `app.vase.ar` SSO flow.
- `apps/vase-editor/Dockerfile`: Business defaults pointing back to `app.vase.ar`.
- `apps/vase-editor/.env.example`: Business-to-App URL examples.

### Task 1: Add The Migration Contract

**Files:**
- Create: `tests/vase-app-migration.test.ts`
- Modify: `tests/v3-workspace-structure.test.ts`
- Test: `tests/vase-app-migration.test.ts`
- Test: `tests/v3-workspace-structure.test.ts`

- [ ] **Step 1: Write the failing migration contract**

Create `tests/vase-app-migration.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(".");
const appDir = path.join(rootDir, "apps", "vase-app");

function read(relativePath: string) {
  return fs.readFileSync(path.join(appDir, relativePath), "utf8");
}

describe("Vase App V3 migration", () => {
  it("contains the authenticated application entrypoints", () => {
    expect(fs.existsSync(path.join(appDir, "src", "app", "(auth)", "signin", "page.tsx"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(appDir, "src", "app", "(platform)", "app", "business", "launch", "route.ts"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(appDir, "src", "auth.ts"))).toBe(true);
  });

  it("keeps the stage-one Prisma datasource on MySQL", () => {
    expect(read("prisma/schema.prisma")).toContain('provider = "mysql"');
  });

  it("builds and starts the workspace on port 3002", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    const dockerfile = read("Dockerfile");

    expect(packageJson.scripts.dev).toContain("--port 3002");
    expect(packageJson.scripts.start).toContain("--port 3002");
    expect(dockerfile).toContain("COPY tsconfig.base.json");
    expect(dockerfile).toContain("EXPOSE 3002");
    expect(dockerfile).toContain("prisma-startup.sh");
  });
});
```

- [ ] **Step 2: Change the V3 structure expectations for the imported app**

In `tests/v3-workspace-structure.test.ts`, define the App Router location
immediately after `base`:

```ts
const appRouterBase =
  app.key === "vase-app"
    ? path.join(base, "src", "app")
    : path.join(base, "app");
```

Replace the four assertions that begin with `path.join(base, "app"` so they
use `appRouterBase`:

```ts
expect(fs.existsSync(path.join(appRouterBase, "page.tsx")), `${app.path}/app/page.tsx`).toBe(true);
expect(
  fs.existsSync(path.join(appRouterBase, "api", "health", "live", "route.ts")),
  `${app.path}/app/api/health/live/route.ts`,
).toBe(true);
expect(
  fs.existsSync(path.join(appRouterBase, "api", "health", "ready", "route.ts")),
  `${app.path}/app/api/health/ready/route.ts`,
).toBe(true);
expect(
  fs.existsSync(path.join(appRouterBase, "api", "internal", "admin", "health", "route.ts")),
  `${app.path}/app/api/internal/admin/health/route.ts`,
).toBe(true);
```

Then replace the unconditional PostgreSQL assertions with:

```ts
const expectedDatabaseProvider =
  app.key === "vase-app" ? 'provider = "mysql"' : 'provider = "postgresql"';
const expectedDatabaseProtocol =
  app.key === "vase-app" ? "DATABASE_URL=mysql://" : "DATABASE_URL=postgresql://";

expect(envExample).toContain(expectedDatabaseProtocol);
expect(schema).toContain(expectedDatabaseProvider);
```

- [ ] **Step 3: Run the focused tests and verify the migration contract fails**

Run:

```powershell
npx vitest run tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
```

Expected: FAIL because `apps/vase-app` does not contain the sign-in route, Business launcher, or MySQL schema.

- [ ] **Step 4: Commit the failing contract**

```powershell
git add tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
git commit -m "test: define Vase App migration contract"
```

### Task 2: Import The Complete Application Into The Workspace

**Files:**
- Replace: `apps/vase-app/app/`
- Replace: `apps/vase-app/prisma/`
- Create: `apps/vase-app/src/`
- Create: `apps/vase-app/public/`
- Create: `apps/vase-app/scripts/`
- Create: `apps/vase-app/e2e/`
- Create: `apps/vase-app/middleware.ts`
- Replace: `apps/vase-app/next.config.ts`
- Replace: `apps/vase-app/tsconfig.json`
- Create: `apps/vase-app/tsconfig.build.json`
- Create: `apps/vase-app/vitest.config.ts`
- Create: `apps/vase-app/playwright.config.mjs`
- Create: `apps/vase-app/postcss.config.mjs`

- [ ] **Step 1: Read the repository-bundled Next.js deployment guides**

Run:

```powershell
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md
Get-Content -Raw node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md
```

Expected: review the Next.js 16 Docker, production build, and TypeScript
requirements before changing the application.

- [ ] **Step 2: Verify the import source contains the required production routes**

Run:

```powershell
git fetch origin main
git cat-file -e "origin/main:src/app/(auth)/signin/page.tsx"
git cat-file -e "origin/main:src/app/(platform)/app/business/launch/route.ts"
git cat-file -e "origin/main:prisma/schema.prisma"
```

Expected: all commands exit with code `0`.

- [ ] **Step 3: Export only the production application files from `origin/main`**

Run:

```powershell
$importRoot = Join-Path $env:TEMP "vase-app-main-import"
if (Test-Path -LiteralPath $importRoot) {
  Remove-Item -LiteralPath $importRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $importRoot | Out-Null
git archive --format=tar origin/main src prisma public scripts e2e middleware.ts next.config.ts tsconfig.json tsconfig.build.json vitest.config.ts playwright.config.mjs postcss.config.mjs |
  tar -xf - -C $importRoot
```

Expected: `$importRoot` contains `src`, `prisma`, `public`, `scripts`, and the listed configuration files.

- [ ] **Step 4: Replace the V3 scaffold with the exported application**

Run from the repository root after confirming `$PWD` ends in `\Vase`:

```powershell
$target = (Resolve-Path "apps/vase-app").Path
if (-not $target.StartsWith((Resolve-Path ".").Path)) {
  throw "Refusing to modify a path outside the repository"
}

Remove-Item -LiteralPath (Join-Path $target "app") -Recurse -Force
Remove-Item -LiteralPath (Join-Path $target "prisma") -Recurse -Force

foreach ($directory in @("src", "prisma", "public", "scripts", "e2e")) {
  Copy-Item -LiteralPath (Join-Path $importRoot $directory) -Destination $target -Recurse -Force
}

foreach ($file in @(
  "middleware.ts",
  "next.config.ts",
  "tsconfig.json",
  "tsconfig.build.json",
  "vitest.config.ts",
  "playwright.config.mjs",
  "postcss.config.mjs"
)) {
  Copy-Item -LiteralPath (Join-Path $importRoot $file) -Destination (Join-Path $target $file) -Force
}
```

Expected: `apps/vase-app/src/app/(auth)/signin/page.tsx` and the Business launcher route exist.

- [ ] **Step 5: Run the migration contract**

Run:

```powershell
npx vitest run tests/vase-app-migration.test.ts
```

Expected: the route and MySQL assertions pass; package/Docker port assertions may still fail until later tasks.

- [ ] **Step 6: Commit the source import**

```powershell
git add apps/vase-app
git commit -m "feat: import authenticated app into V3 workspace"
```

### Task 3: Convert The Imported App Into A Real NPM Workspace

**Files:**
- Modify: `apps/vase-app/package.json`
- Modify: `package-lock.json`
- Modify: `apps/vase-app/tsconfig.json`
- Test: `apps/vase-app/src/tests/**/*.test.ts`

- [ ] **Step 1: Generate the workspace package metadata from the production package**

Run this exact transformation:

```powershell
@'
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const source = JSON.parse(
  execFileSync("git", ["show", "origin/main:package.json"], { encoding: "utf8" }),
);

source.name = "@vase/app";
source.scripts.dev = "next dev --hostname 0.0.0.0 --port 3002";
source.scripts.start = "next start --hostname 0.0.0.0 --port 3002";
source.scripts["prisma:generate"] = "prisma generate";

fs.writeFileSync(
  "apps/vase-app/package.json",
  `${JSON.stringify(source, null, 2)}\n`,
);
'@ | node
```

- [ ] **Step 2: Keep TypeScript aliases local to `apps/vase-app`**

Confirm `apps/vase-app/tsconfig.json` contains:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Preserve the imported compiler settings and include patterns around this block.

- [ ] **Step 3: Refresh the monorepo lockfile**

Run:

```powershell
npm install --package-lock-only
npm install
```

Expected: npm recognizes `@vase/app` and completes without a missing workspace error.

- [ ] **Step 4: Generate Prisma Client from the imported MySQL schema**

Run:

```powershell
npm run prisma:generate --workspace @vase/app
```

Expected: Prisma Client generation succeeds using `apps/vase-app/prisma/schema.prisma`.

- [ ] **Step 5: Run the imported unit tests**

Run:

```powershell
npm run test:unit --workspace @vase/app
```

Expected: all imported unit tests pass. Fix path-only failures inside `apps/vase-app`; do not change business behavior.

- [ ] **Step 6: Commit the workspace conversion**

```powershell
git add apps/vase-app/package.json apps/vase-app/tsconfig.json package-lock.json
git commit -m "build: configure migrated Vase App workspace"
```

### Task 4: Make `app.vase.ar` The Canonical Authenticated Origin

**Files:**
- Modify: `apps/vase-app/src/lib/security/platform-hosts.ts`
- Modify: `apps/vase-app/src/lib/security/origin.ts`
- Modify: `apps/vase-app/middleware.ts`
- Modify: `apps/vase-app/src/tests/platform-hosts.test.ts`
- Create: `apps/vase-app/src/tests/origin.test.ts`

- [ ] **Step 1: Add failing tests for the new primary host**

Add to `apps/vase-app/src/tests/platform-hosts.test.ts`:

```ts
it("uses app.vase.ar as the production authenticated host", () => {
  expect(
    resolvePrimaryPlatformHost({
      nodeEnv: "production",
    }),
  ).toBe("app.vase.ar");

  expect(
    buildDefaultPlatformRedirectUrl({
      hostname: "app.vase.ar",
      url: "https://app.vase.ar/",
      input: { nodeEnv: "production" },
    }),
  ).toBe("https://app.vase.ar/app");
});

it("uses business.vase.ar as the default Business editor host", () => {
  expect(resolveEditorHost({ nodeEnv: "production" })).toBe("business.vase.ar");
});
```

Update the imports to include `buildDefaultPlatformRedirectUrl` and
`resolvePrimaryPlatformHost`.

In the existing test named
`redirects non-Labs routes from the Labs host back to the primary platform host`,
change the two expected production destinations from `https://vase.ar/...` to
`https://app.vase.ar/...`. The new authenticated primary host owns `/app` and
`/signin`.

Create `apps/vase-app/src/tests/origin.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getCanonicalOrigin } from "@/lib/security/origin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});

describe("canonical origin", () => {
  it("uses NEXT_PUBLIC_APP_URL instead of trusted-origin ordering", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.vase.ar/";
    expect(getCanonicalOrigin()).toBe("https://app.vase.ar");
  });
});
```

- [ ] **Step 2: Run the host tests and verify they fail**

Run:

```powershell
npm exec --workspace @vase/app -- vitest run src/tests/platform-hosts.test.ts src/tests/origin.test.ts
```

Expected: FAIL because the defaults still point to `vase.ar` and `editor.vase.ar`, and the redirect helper does not exist.

- [ ] **Step 3: Implement the primary-host redirect helper**

In `apps/vase-app/src/lib/security/platform-hosts.ts`:

```ts
export function resolvePrimaryPlatformHost(input: PlatformHostsInput = {}) {
  const { nodeEnv = process.env.NODE_ENV, primaryHost = process.env.VASE_PRIMARY_HOST } = input;
  const configuredHost = normalizeHostCandidate(primaryHost ?? "");

  if (configuredHost) {
    return configuredHost;
  }

  return nodeEnv === "production" ? "app.vase.ar" : "localhost:3002";
}

export function buildDefaultPlatformRedirectUrl({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}) {
  const normalizedHost = normalizeComparableHost(
    hostname,
    input.nodeEnv ?? process.env.NODE_ENV,
  );
  if (normalizedHost !== resolvePrimaryPlatformHost(input)) {
    return null;
  }

  const redirectUrl = new URL(url);
  if (redirectUrl.pathname !== "/") {
    return null;
  }

  redirectUrl.pathname = "/app";
  redirectUrl.search = "";
  return redirectUrl.toString();
}
```

Change the production fallback in `resolveEditorHost` to:

```ts
return nodeEnv === "production" ? "business.vase.ar" : "localhost:5173";
```

- [ ] **Step 4: Make the canonical origin explicit**

Replace `getCanonicalOrigin` in `apps/vase-app/src/lib/security/origin.ts` with:

```ts
export function getCanonicalOrigin() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    return normalizeOrigin(configured);
  }
  return getTrustedOrigins()[0] ?? "http://localhost:3002";
}
```

- [ ] **Step 5: Apply the root redirect in middleware**

Import `buildDefaultPlatformRedirectUrl` in `apps/vase-app/middleware.ts`, then
add this before Labs redirects:

```ts
const defaultPlatformRedirectUrl = buildDefaultPlatformRedirectUrl({
  hostname,
  url: request.url,
});

if (defaultPlatformRedirectUrl) {
  return NextResponse.redirect(new URL(defaultPlatformRedirectUrl));
}
```

- [ ] **Step 6: Run the focused and complete app tests**

Run:

```powershell
npm exec --workspace @vase/app -- vitest run src/tests/platform-hosts.test.ts src/tests/origin.test.ts
npm run test:unit --workspace @vase/app
```

Expected: all tests pass.

- [ ] **Step 7: Commit the canonical-host behavior**

```powershell
git add apps/vase-app/src/lib/security apps/vase-app/src/tests apps/vase-app/middleware.ts
git commit -m "feat: make app.vase.ar the authenticated origin"
```

### Task 5: Package Vase App For EasyPanel

**Files:**
- Modify: `apps/vase-app/Dockerfile`
- Modify: `apps/vase-app/.env.example`
- Modify: `apps/vase-app/README.md`
- Test: `tests/vase-app-migration.test.ts`

- [ ] **Step 1: Replace the Dockerfile with a root-context workspace build**

Use this `apps/vase-app/Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-app/package.json ./apps/vase-app/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /repo

ARG NEXT_DEPLOYMENT_ID
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ARG NEXT_PUBLIC_APP_URL=https://app.vase.ar

ENV NODE_ENV=production
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-app ./apps/vase-app

WORKDIR /repo/apps/vase-app
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/package-lock.json ./package-lock.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-app ./apps/vase-app

WORKDIR /repo/apps/vase-app
EXPOSE 3002

CMD ["sh", "scripts/prisma-startup.sh", "sh", "-c", "if [ -n \"$MASTER_ADMIN_PASSWORD\" ]; then npm run bootstrap:master-admin; fi && if [ -n \"$TEST_ACCOUNT_PASSWORD\" ]; then npm run bootstrap:test-account; fi && npx next start -H 0.0.0.0 -p 3002"]
```

- [ ] **Step 2: Replace the environment example with safe local values**

Use this minimum in `apps/vase-app/.env.example` while preserving documented
optional mail, uploads, and monitoring keys from `origin/main`:

```env
NODE_ENV=development
HOSTNAME=0.0.0.0
PORT=3002
DATABASE_URL=mysql://mysql:local-development-password@localhost:3306/vase
NEXT_PUBLIC_APP_URL=http://localhost:3002
AUTH_COOKIE_DOMAIN=
TRUSTED_ORIGINS=http://localhost:3002,http://127.0.0.1:3002
VASE_PRIMARY_HOST=localhost:3002
VASE_LABS_HOST=localhost:3007
AUTH_SECRET=local-only-auth-secret-with-at-least-32-characters
AUTH_TRUST_HOST=true
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=local-only-encryption-key-32-bytes
VASE_BUSINESS_SSO_SECRET=local-only-business-sso-secret
VASE_BUSINESS_SSO_ISSUER=vase-app
VASE_BUSINESS_SSO_AUDIENCE=vase-business
BUSINESS_EDITOR_URL=http://localhost:3000/admin/evolution
```

- [ ] **Step 3: Document local and EasyPanel startup**

Add to `apps/vase-app/README.md`:

````markdown
## Production role

Vase App is the authenticated product at `app.vase.ar`. Stage one keeps the
existing MySQL `vase-db`; PostgreSQL migration happens after parity validation.

## Local commands

```powershell
npm run prisma:generate --workspace @vase/app
npm run dev --workspace @vase/app
```

## EasyPanel

- Build context: `/`
- Dockerfile: `apps/vase-app/Dockerfile`
- Internal port: `3002`
- Domain: `app.vase.ar`
````

- [ ] **Step 4: Run the migration contract**

Run:

```powershell
npx vitest run tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
```

Expected: PASS.

- [ ] **Step 5: Build the application and Docker image**

Run:

```powershell
npm run build --workspace @vase/app
docker build --progress=plain -f apps/vase-app/Dockerfile -t vase-app:v3 .
```

Expected: both commands exit with code `0`.

- [ ] **Step 6: Commit deployment packaging**

```powershell
git add apps/vase-app/Dockerfile apps/vase-app/.env.example apps/vase-app/README.md
git commit -m "build: package Vase App for EasyPanel"
```

### Task 6: Point Business SSO Back To `app.vase.ar`

**Files:**
- Modify: `apps/vase-editor/Dockerfile`
- Modify: `apps/vase-editor/.env.example`
- Modify: `apps/vase-editor/web/.env.example`
- Modify: `tests/vase-editor-deployment.test.ts`

- [ ] **Step 1: Add failing assertions for the new Vase App origin**

In `tests/vase-editor-deployment.test.ts`, assert:

```ts
expect(dockerfile).toContain(
  "ARG VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch",
);
expect(envExample).toContain("VITE_VASE_APP_URL=https://app.vase.ar");
expect(envExample).toContain(
  "VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch",
);
expect(envExample).toContain("VITE_VASE_APP_LOGIN_URL=https://app.vase.ar/signin");
expect(envExample).toContain("VITE_VASE_APP_SIGNUP_URL=https://app.vase.ar/register");
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npx vitest run tests/vase-editor-deployment.test.ts
```

Expected: FAIL because Business still points to `vase.ar`.

- [ ] **Step 3: Update Business defaults and examples**

Set these values in the three Business deployment files:

```env
VITE_VASE_APP_URL=https://app.vase.ar
VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch
VITE_VASE_APP_LOGIN_URL=https://app.vase.ar/signin
VITE_VASE_APP_SIGNUP_URL=https://app.vase.ar/register
```

- [ ] **Step 4: Run the Business deployment test**

Run:

```powershell
npx vitest run tests/vase-editor-deployment.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the SSO origin change**

```powershell
git add apps/vase-editor/Dockerfile apps/vase-editor/.env.example apps/vase-editor/web/.env.example tests/vase-editor-deployment.test.ts
git commit -m "fix: launch Business from app.vase.ar"
```

### Task 7: Update Deployment Documentation And Run Full Verification

**Files:**
- Modify: `docs/v3/easypanel.md`
- Modify: `docs/deployment/business-editor-bridge.md`
- Modify: `.env.easypanel.example`

- [ ] **Step 1: Document the stage-one database exception**

Add this directly below the services table in `docs/v3/easypanel.md`:

```markdown
### Transicion de Vase App

El destino final de Vase App es `postgres-app`, pero la primera migracion usa
temporalmente el MySQL existente `vase-db` para conservar usuarios, empresas,
membresias y contrasenas. La migracion a PostgreSQL se ejecuta despues de
validar paridad funcional en `app.vase.ar`.

Durante esta etapa:

- el servicio actual de `vase.ar` permanece activo;
- el servicio nuevo se llama `vase-app-next`;
- `vase-app-next` usa `app.vase.ar`, puerto `3002` y `vase-db`;
- no se ejecutan resets ni migraciones destructivas.
```

- [ ] **Step 2: Update the Business bridge URLs**

In `docs/deployment/business-editor-bridge.md`, use:

```text
https://app.vase.ar/signin?redirectTo=/app/business/launch
https://app.vase.ar/app/business/launch
https://business.vase.ar/admin/evolution
```

- [ ] **Step 3: Update the shared EasyPanel example**

Ensure `.env.easypanel.example` documents:

```env
AUTH_COOKIE_DOMAIN=.vase.ar
TRUSTED_ORIGINS=https://app.vase.ar,https://vase.ar,https://business.vase.ar,https://labs.vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
VASE_PRIMARY_HOST=app.vase.ar
BUSINESS_EDITOR_URL=https://business.vase.ar/admin/evolution
```

Do not include production secret values.

- [ ] **Step 4: Run all repository verification**

Run:

```powershell
npm run typecheck
npm run test:v3
npm run build --workspace @vase/app
git diff --check
```

Expected: every command exits with code `0`.

- [ ] **Step 5: Commit the deployment guide**

```powershell
git add docs/v3/easypanel.md docs/deployment/business-editor-bridge.md .env.easypanel.example
git commit -m "docs: add parallel Vase App V3 rollout"
```

- [ ] **Step 6: Push the implementation branch**

```powershell
git push origin Vase-Test-Repos
```

Expected: the remote branch points to the final local commit.

### Task 8: Deploy In Parallel And Validate Production

**Files:**
- No repository files.
- EasyPanel service: `vase-app-next`
- Cloudflare DNS record: `app.vase.ar`

- [ ] **Step 1: Create the parallel EasyPanel service**

Use:

```text
Service: vase-app-next
Source type: Git
Repository: https://github.com/SESELOVSKYDarian/Vase.git
Branch: Vase-Test-Repos
Build path: /
Build method: Dockerfile
Dockerfile: apps/vase-app/Dockerfile
Internal port: 3002
```

- [ ] **Step 2: Copy production environment values safely**

Copy the existing `vase-app` values for database, authentication, email,
uploads, monitoring, master admin, and Business SSO directly inside EasyPanel.
Change only:

```env
PORT=3002
NEXT_PUBLIC_APP_URL=https://app.vase.ar
AUTH_COOKIE_DOMAIN=.vase.ar
TRUSTED_ORIGINS=https://app.vase.ar,https://vase.ar,https://business.vase.ar,https://labs.vase.ar
VASE_PRIMARY_HOST=app.vase.ar
BUSINESS_EDITOR_URL=https://business.vase.ar/admin/evolution
```

Keep `DATABASE_URL` pointing to the existing `vase-db`. Keep the Business SSO
secret identical to the value in the Business service.

- [ ] **Step 3: Add the new domain without moving `vase.ar`**

In EasyPanel add:

```text
Host: https://app.vase.ar
Path: /
Destination protocol: HTTP
Destination port: 3002
Destination path: /
```

In Cloudflare create an `A` record named `app` pointing to the EasyPanel server
IP. Start with DNS-only until EasyPanel finishes certificate provisioning.

- [ ] **Step 4: Deploy and inspect the exact commit**

Click **Implementar** and confirm the deployment log shows the latest
`Vase-Test-Repos` commit. Do not remove or redeploy the existing `vase.ar`
service.

- [ ] **Step 5: Run HTTP smoke tests**

Run:

```powershell
curl.exe -fsS https://app.vase.ar/api/health/live
curl.exe -fsS https://app.vase.ar/api/health/ready
curl.exe -I https://app.vase.ar/
```

Expected:

- live health returns success;
- ready health confirms MySQL connectivity;
- `/` redirects to `/app`, then unauthenticated users reach `/signin`.

- [ ] **Step 6: Validate current user data**

In a private browser:

1. Open `https://app.vase.ar/signin`.
2. Sign in with an existing production user.
3. Confirm its existing tenant and membership are present.
4. Confirm logout removes access to `/app`.
5. Register a controlled test account and confirm it appears in the existing
   administration view.

- [ ] **Step 7: Validate Business SSO end to end**

Open:

```text
https://app.vase.ar/app/business/launch
```

Expected: an eligible `OWNER` or `MANAGER` is redirected to
`https://business.vase.ar/admin/evolution`, the temporary `vase_token` is
consumed, and the editor opens with the correct tenant.

- [ ] **Step 8: Update the deployed Business service**

In the Business EasyPanel environment set:

```env
VITE_VASE_APP_URL=https://app.vase.ar
VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch
VITE_VASE_APP_LOGIN_URL=https://app.vase.ar/signin
VITE_VASE_APP_SIGNUP_URL=https://app.vase.ar/register
```

Redeploy Business because `VITE_*` values are embedded at build time. Repeat
the Business SSO test.

- [ ] **Step 9: Exercise rollback**

If any smoke test fails:

1. Keep `vase.ar` on the old service.
2. Remove or disable only the `app.vase.ar` domain from `vase-app-next`.
3. Leave `vase-db` untouched.
4. Restore Business `VITE_VASE_APP_*` values to `https://vase.ar`.
5. Redeploy Business and verify the original launch path.

The Portal cutover begins only after every Task 8 check passes.

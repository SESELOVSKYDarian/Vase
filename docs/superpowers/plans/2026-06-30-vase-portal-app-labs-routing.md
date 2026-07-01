# Vase Portal, App and Labs Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the production public site into `apps/vase-portal`, keep the authenticated dashboard at `app.vase.ar/app`, and constrain `labs.vase.ar` to the existing Labs workspace.

**Architecture:** `apps/vase-portal` becomes the only public marketing application and delegates the few database-backed public operations to narrow service-to-service endpoints in `apps/vase-app`. `apps/vase-app` remains the authentication and data authority, uses Next.js 16 `proxy.ts` for hostname-level routing, and repeats Labs entitlement checks next to the data queries. The three canonical origins are configured explicitly and the two applications remain independently deployable.

**Tech Stack:** Next.js 16.2 App Router and Proxy, React 19, TypeScript, Auth.js 5, Prisma 6/MySQL, Vitest 4, Tailwind CSS 4, Docker, EasyPanel

---

## Source of Truth and Working Rules

- Approved design:
  `docs/superpowers/specs/2026-06-30-vase-portal-app-labs-routing-design.md`
- Public visual/content source:
  `apps/vase-app/src/app/(marketing)`,
  `apps/vase-app/src/components/marketing`, and the matching files from
  `origin/main`.
- Preserve existing user, tenant, module, billing, and Labs data. Do not run a
  destructive Prisma command.
- Read the local Next.js 16 guides before implementation:
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`,
  `node_modules/next/dist/docs/01-app/02-guides/redirecting.md`,
  `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`,
  and the authorization section of
  `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- Use Next.js 16 `proxy.ts`; do not add new logic to the deprecated
  `middleware.ts` convention.
- Run each commit command only after its preceding tests pass.

## Target File Map

### Shared origin and routing contracts

- `apps/vase-app/src/config/origins.ts`: canonical public, App, and Labs
  origins for browser and server code.
- `apps/vase-portal/src/config/origins.ts`: canonical Portal-to-App links and
  the private App service URL.
- `apps/vase-app/src/lib/security/platform-hosts.ts`: pure hostname/path
  decisions used by Proxy.
- `apps/vase-app/proxy.ts`: request-time redirects, rewrites, optimistic auth,
  and Labs API rejection.

### Portal

- `apps/vase-portal/src/app`: marketing pages, health routes, SEO files, and
  root layout.
- `apps/vase-portal/src/components/marketing`: the production marketing UI.
- `apps/vase-portal/src/components/ui`: only UI primitives imported by public
  pages.
- `apps/vase-portal/src/lib/app-client.ts`: typed, server-only calls to App.
- `apps/vase-portal/src/app/(marketing)/contact-actions.ts`: Portal Server
  Action that delegates delivery to App.
- `apps/vase-portal/src/config/public-site.ts`: public navigation, plans, FAQ,
  and marketing copy.

### App and Labs

- `apps/vase-app/src/app/api/internal/portal/*`: authenticated
  service-to-service contact and public-document endpoints.
- `apps/vase-app/src/components/layout/app-shell.tsx`: public Home and logo
  links.
- `apps/vase-app/src/lib/labs/access.ts`: secure Labs tenant/module guard and
  App fallback URL.
- `apps/vase-app/src/components/labs/labs-required-notice.tsx`: activation
  message on the App dashboard.
- `apps/vase-app/src/app/(platform)/app/owner/labs/(advanced)/layout.tsx`:
  Labs-only chrome and logo.

## Task 1: Add Canonical Origin Contracts and Portal Test Harness

**Files:**
- Create: `apps/vase-app/src/config/origins.ts`
- Create: `apps/vase-app/src/tests/origins.test.ts`
- Create: `apps/vase-portal/src/config/origins.ts`
- Create: `apps/vase-portal/src/tests/origins.test.ts`
- Create: `apps/vase-portal/vitest.config.ts`
- Modify: `apps/vase-portal/package.json`
- Modify: `apps/vase-app/.env.example`
- Modify: `apps/vase-portal/.env.example`

- [ ] **Step 1: Write failing origin tests in both workspaces**

```ts
// apps/vase-app/src/tests/origins.test.ts
import { describe, expect, it } from "vitest";
import { resolveProductOrigins } from "@/config/origins";

describe("product origins", () => {
  it("uses the official production domains by default", () => {
    expect(resolveProductOrigins({})).toEqual({
      publicSite: "https://vase.ar",
      app: "https://app.vase.ar",
      labs: "https://labs.vase.ar",
    });
  });

  it("normalizes configured values", () => {
    expect(
      resolveProductOrigins({
        publicSite: "http://localhost:3001/",
        app: "http://localhost:3002/",
        labs: "http://localhost:3007/",
      }),
    ).toEqual({
      publicSite: "http://localhost:3001",
      app: "http://localhost:3002",
      labs: "http://localhost:3007",
    });
  });
});
```

```ts
// apps/vase-portal/src/tests/origins.test.ts
import { describe, expect, it } from "vitest";
import { resolvePortalOrigins } from "@/config/origins";

describe("portal origins", () => {
  it("separates public, browser App, and private App origins", () => {
    expect(resolvePortalOrigins({})).toEqual({
      publicSite: "https://vase.ar",
      app: "https://app.vase.ar",
      appInternal: "https://app.vase.ar",
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify that the missing modules fail**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/origins.test.ts
npm run test --workspace @vase/portal -- --run src/tests/origins.test.ts
```

Expected: both commands fail because the origin modules and Portal test script
do not exist.

- [ ] **Step 3: Implement the App origin resolver**

```ts
// apps/vase-app/src/config/origins.ts
type ProductOriginInput = {
  publicSite?: string;
  app?: string;
  labs?: string;
};

function normalizeOrigin(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback;
  const url = new URL(candidate);
  return url.origin;
}

export function resolveProductOrigins(input: ProductOriginInput) {
  return {
    publicSite: normalizeOrigin(input.publicSite, "https://vase.ar"),
    app: normalizeOrigin(input.app, "https://app.vase.ar"),
    labs: normalizeOrigin(input.labs, "https://labs.vase.ar"),
  };
}

export const productOrigins = resolveProductOrigins({
  publicSite: process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN,
  app: process.env.NEXT_PUBLIC_APP_URL,
  labs: process.env.NEXT_PUBLIC_LABS_URL,
});
```

- [ ] **Step 4: Implement the Portal resolver and Vitest configuration**

```ts
// apps/vase-portal/src/config/origins.ts
type PortalOriginInput = {
  publicSite?: string;
  app?: string;
  appInternal?: string;
};

function normalizeOrigin(value: string | undefined, fallback: string) {
  return new URL(value?.trim() || fallback).origin;
}

export function resolvePortalOrigins(input: PortalOriginInput) {
  const app = normalizeOrigin(input.app, "https://app.vase.ar");

  return {
    publicSite: normalizeOrigin(input.publicSite, "https://vase.ar"),
    app,
    appInternal: normalizeOrigin(input.appInternal, app),
  };
}

export const portalOrigins = resolvePortalOrigins({
  publicSite: process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN,
  app: process.env.NEXT_PUBLIC_APP_URL,
  appInternal: process.env.APP_INTERNAL_URL,
});

export const APP_SIGN_IN_URL = `${portalOrigins.app}/signin`;
export const APP_REGISTER_URL = `${portalOrigins.app}/register`;
```

```ts
// apps/vase-portal/vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
  },
});
```

Add these scripts and development dependency to
`apps/vase-portal/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 5: Document all origin variables**

Add to `apps/vase-app/.env.example`:

```dotenv
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_LABS_URL=http://localhost:3007
```

Set `apps/vase-portal/.env.example` to:

```dotenv
NODE_ENV=development
HOSTNAME=0.0.0.0
PORT=3001
DATABASE_URL=postgresql://vase_portal_user:CHANGE_ME_PASSWORD@localhost:5432/vase_portal
APP_KEY=portal
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3002
APP_INTERNAL_URL=http://localhost:3002
SERVICE_TO_SERVICE_TOKEN=local-only-service-token
```

- [ ] **Step 6: Install the updated workspace metadata and rerun tests**

Run:

```powershell
npm install
npm run test:unit --workspace @vase/app -- --run src/tests/origins.test.ts
npm run test --workspace @vase/portal -- --run src/tests/origins.test.ts
```

Expected: both test files pass.

- [ ] **Step 7: Commit the origin contract**

```powershell
git add package-lock.json apps/vase-app/src/config/origins.ts apps/vase-app/src/tests/origins.test.ts apps/vase-app/.env.example apps/vase-portal
git commit -m "feat: define canonical Vase product origins"
```

## Task 2: Expose Narrow Portal Services from Vase App

**Files:**
- Create: `apps/vase-app/src/server/services/portal-content.ts`
- Create: `apps/vase-app/src/app/api/internal/portal/contact/route.ts`
- Create: `apps/vase-app/src/app/api/internal/portal/docs/route.ts`
- Create: `apps/vase-app/src/app/api/internal/portal/docs/[slug]/route.ts`
- Create: `apps/vase-app/src/tests/portal-content.test.ts`
- Modify: `apps/vase-app/src/app/(marketing)/contact-actions.ts`
- Modify: `apps/vase-app/.env.example`

- [ ] **Step 1: Write failing tests for safe public-document mapping**

```ts
// apps/vase-app/src/tests/portal-content.test.ts
import { describe, expect, it } from "vitest";
import {
  toPublicDocumentDetail,
  toPublicDocumentSummary,
} from "@/server/services/portal-content";

describe("Portal content serialization", () => {
  it("returns only public document summary fields", () => {
    expect(
      toPublicDocumentSummary({
        id: "doc-1",
        slug: "inicio",
        title: "Inicio",
        summary: null,
        updatedAt: new Date("2026-06-30T12:00:00.000Z"),
        sections: [{ title: "Primera sección" }],
      }),
    ).toEqual({
      id: "doc-1",
      slug: "inicio",
      title: "Inicio",
      summary: "Primera sección",
      updatedAt: "2026-06-30T12:00:00.000Z",
    });
  });

  it("omits discussions and internal revision data from details", () => {
    const result = toPublicDocumentDetail({
      slug: "api",
      title: "API",
      summary: "Referencia",
      sections: [
        {
          id: "section-1",
          title: "Autenticación",
          body: "Usa una API key.",
          steps: [{ id: "step-1", title: "Crear key", content: "Abrir el panel." }],
        },
      ],
    });

    expect(result.sections[0]).toEqual({
      id: "section-1",
      title: "Autenticación",
      body: "Usa una API key.",
      steps: [{ id: "step-1", title: "Crear key", content: "Abrir el panel." }],
    });
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/portal-content.test.ts
```

Expected: FAIL because `portal-content.ts` does not exist.

- [ ] **Step 3: Implement the Portal content service**

Create `apps/vase-app/src/server/services/portal-content.ts` with these public
types and functions:

```ts
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { ContactInquiryInput } from "@/lib/validators/contact";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { sendContactEmail } from "@/server/services/contact-email";

export function toPublicDocumentSummary(doc: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  updatedAt: Date;
  sections: Array<{ title: string }>;
}) {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary ?? doc.sections[0]?.title ?? "Sin resumen.",
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toPublicDocumentDetail(doc: {
  slug: string;
  title: string;
  summary: string | null;
  sections: Array<{
    id: string;
    title: string;
    body: string;
    steps: Array<{ id: string; title: string; content: string }>;
  }>;
}) {
  return {
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary ?? "Guía oficial Vase.",
    sections: doc.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body,
      steps: section.steps.map((step) => ({
        id: step.id,
        title: step.title,
        content: step.content,
      })),
    })),
  };
}

export async function listPortalDocuments() {
  const docs = await prisma.wikiDocument.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { updatedAt: "desc" },
    include: { sections: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 30,
  });
  return docs.map(toPublicDocumentSummary);
}

export async function getPortalDocument(slug: string) {
  const doc = await prisma.wikiDocument.findFirst({
    where: { slug, status: "PUBLISHED", isPublic: true },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return doc ? toPublicDocumentDetail(doc) : null;
}

export async function deliverPortalContactInquiry(
  input: ContactInquiryInput,
  context: { ipAddress: string; userAgent: string | null },
) {
  await enforceRateLimit({
    scope: "marketing:contact",
    key: `${context.ipAddress}:${input.email}`,
    limit: 4,
    windowSeconds: 60 * 30,
  });
  await sendContactEmail(input);
  await createAuditLog({
    action: "marketing.contact_inquiry_submitted",
    targetType: "contact_inquiry",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { fullName: input.fullName, email: input.email },
  });
}
```

- [ ] **Step 4: Add service-token-protected Route Handlers**

Each handler must call:

```ts
import { assertServiceToken } from "@vase/internal-api";

assertServiceToken(
  request.headers.get("authorization"),
  process.env.SERVICE_TO_SERVICE_TOKEN,
);
```

The contact handler must parse with `contactInquirySchema`, call
`deliverPortalContactInquiry`, and return these exact statuses:

```ts
const context = {
  ipAddress: request.headers.get("x-vase-client-ip") ?? "unknown",
  userAgent: request.headers.get("x-vase-client-user-agent"),
};

// success
NextResponse.json({ ok: true }, { status: 200 });

// invalid payload
NextResponse.json(
  { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
  { status: 400 },
);

// invalid token
NextResponse.json({ error: "forbidden" }, { status: 403 });

// configured rate limit
NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
```

The docs list handler returns `{ docs }`. The detail handler uses the Next 16
signature `params: Promise<{ slug: string }>` and returns 404 when
`getPortalDocument(slug)` is null; a successful detail response is
`NextResponse.json({ doc })`.

- [ ] **Step 5: Refactor the existing App contact action onto the service**

Keep the current `ContactActionState` contract, validation messages, and
`getRequestContext()`, but replace direct email/audit/rate-limit calls with:

```ts
await deliverPortalContactInquiry(parsed.data, {
  ipAddress: requestContext.ipAddress,
  userAgent: requestContext.userAgent,
});
```

Add this non-secret example to `apps/vase-app/.env.example`:

```dotenv
SERVICE_TO_SERVICE_TOKEN=local-only-service-token
```

- [ ] **Step 6: Test and typecheck the App service**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/portal-content.test.ts
npm run typecheck --workspace @vase/app
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit the App-side Portal API**

```powershell
git add apps/vase-app/src/server/services/portal-content.ts apps/vase-app/src/app/api/internal/portal apps/vase-app/src/tests/portal-content.test.ts 'apps/vase-app/src/app/(marketing)/contact-actions.ts' apps/vase-app/.env.example
git commit -m "feat: expose protected Portal content services"
```

## Task 3: Add the Portal-to-App Server Client

**Files:**
- Create: `apps/vase-portal/src/lib/app-client.ts`
- Create: `apps/vase-portal/src/lib/validators/contact.ts`
- Create: `apps/vase-portal/src/app/(marketing)/contact-actions.ts`
- Create: `apps/vase-portal/src/tests/app-client.test.ts`
- Modify: `apps/vase-portal/package.json`

- [ ] **Step 1: Write a failing test for authenticated internal requests**

```ts
// apps/vase-portal/src/tests/app-client.test.ts
import { describe, expect, it, vi } from "vitest";
import { createPortalAppClient } from "@/lib/app-client";

describe("Portal App client", () => {
  it("uses the private base URL and service token", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ docs: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createPortalAppClient({
      baseUrl: "http://vase-app-next:3002",
      token: "shared-secret",
      fetcher,
    });

    await client.listDocs();

    expect(fetcher).toHaveBeenCalledWith(
      "http://vase-app-next:3002/api/internal/portal/docs",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer shared-secret",
        }),
      }),
    );
  });

  it("throws a stable error for a failed App response", async () => {
    const client = createPortalAppClient({
      baseUrl: "http://app:3002",
      token: "secret",
      fetcher: vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    });

    await expect(client.listDocs()).rejects.toThrow("PORTAL_APP_REQUEST_FAILED");
  });
});
```

- [ ] **Step 2: Run the test and verify the missing client failure**

Run:

```powershell
npm run test --workspace @vase/portal -- --run src/tests/app-client.test.ts
```

Expected: FAIL because `app-client.ts` does not exist.

- [ ] **Step 3: Implement the server-only App client**

```ts
// apps/vase-portal/src/lib/app-client.ts
import "server-only";
import { portalOrigins } from "@/config/origins";

type Fetcher = typeof fetch;

export function createPortalAppClient(input: {
  baseUrl: string;
  token: string;
  fetcher?: Fetcher;
}) {
  const fetcher = input.fetcher ?? fetch;
  const headers = {
    authorization: `Bearer ${input.token}`,
    "content-type": "application/json",
  };

  async function request<T>(path: string, init?: RequestInit) {
    const response = await fetcher(`${input.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new PortalAppRequestError(response.status);
    }
    return (await response.json()) as T;
  }

  return {
    async listDocs() {
      const result = await request<{ docs: PublicDocumentSummary[] }>(
        "/api/internal/portal/docs",
      );
      return result.docs;
    },
    async getDoc(slug: string) {
      try {
        const result = await request<{ doc: PublicDocumentDetail }>(
          `/api/internal/portal/docs/${encodeURIComponent(slug)}`,
        );
        return result.doc;
      } catch (error) {
        if (error instanceof PortalAppRequestError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    submitContact: (
      payload: ContactPayload,
      context: { ipAddress: string; userAgent: string | null },
    ) =>
      request<{ ok: true }>("/api/internal/portal/contact", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "x-vase-client-ip": context.ipAddress,
          "x-vase-client-user-agent": context.userAgent ?? "",
        },
      }),
  };
}

export const portalAppClient = createPortalAppClient({
  baseUrl: portalOrigins.appInternal,
  token: process.env.SERVICE_TO_SERVICE_TOKEN ?? "",
});
```

Define these types and error class above the factory:

```ts
export type PublicDocumentSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
};

export type PublicDocumentDetail = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{
    id: string;
    title: string;
    body: string;
    steps: Array<{ id: string; title: string; content: string }>;
  }>;
};

export type ContactPayload = {
  fullName: string;
  email: string;
  message: string;
};

export class PortalAppRequestError extends Error {
  constructor(public readonly status: number) {
    super("PORTAL_APP_REQUEST_FAILED");
  }
}
```

- [ ] **Step 4: Add Portal contact validation and Server Action**

Use the same Zod schema and field messages as
`apps/vase-app/src/lib/validators/contact.ts`. The action must read
`x-forwarded-for` and `user-agent` with `headers()`, trim and validate the
fields, and call:

```ts
await portalAppClient.submitContact(parsed.data, {
  ipAddress:
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown",
  userAgent: requestHeaders.get("user-agent"),
});
```

Map `PortalAppRequestError` status `429` to:

```ts
return {
  error: "Recibimos muchas consultas seguidas desde este origen. Intenta nuevamente en unos minutos.",
};
```

Map every other request failure to:

```ts
return {
  error: "No pudimos enviar tu consulta ahora. Intenta nuevamente en unos minutos.",
};
```

Add `"server-only": "^0.0.1"` and `"zod": "^4.3.6"` to Portal dependencies.

- [ ] **Step 5: Run tests and typecheck**

Run:

```powershell
npm install
npm run test --workspace @vase/portal -- --run src/tests/app-client.test.ts
npm run typecheck --workspace @vase/portal
```

Expected: PASS.

- [ ] **Step 6: Commit the private client**

```powershell
git add package-lock.json apps/vase-portal
git commit -m "feat: connect Portal to App services"
```

## Task 4: Migrate the Public Visual Foundation into Vase Portal

**Files:**
- Delete: `apps/vase-portal/app`
- Create: `apps/vase-portal/src/app/layout.tsx`
- Create: `apps/vase-portal/src/app/globals.css`
- Create: `apps/vase-portal/src/components/marketing/*`
- Create: `apps/vase-portal/src/components/ui/button.tsx`
- Create: `apps/vase-portal/src/components/ui/custom-cursor.tsx`
- Create: `apps/vase-portal/src/components/ui/logo-loop.tsx`
- Create: `apps/vase-portal/src/components/ui/logo-loop.css`
- Create: `apps/vase-portal/src/components/ui/panel-card.tsx`
- Create: `apps/vase-portal/src/config/app.ts`
- Create: `apps/vase-portal/src/config/integrations.ts`
- Create: `apps/vase-portal/src/config/public-site.ts`
- Create: `apps/vase-portal/src/lib/i18n/locale.ts`
- Create: `apps/vase-portal/src/lib/i18n/request-locale.ts`
- Create: `apps/vase-portal/postcss.config.mjs`
- Copy: `apps/vase-app/public/*` to `apps/vase-portal/public/*`
- Modify: `apps/vase-portal/tsconfig.json`
- Modify: `apps/vase-portal/package.json`
- Test: `tests/vase-portal-migration.test.ts`

- [ ] **Step 1: Write a failing repository-level migration test**

```ts
// tests/vase-portal-migration.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = path.resolve("apps/vase-portal");

describe("Vase Portal migration", () => {
  it("contains the production marketing foundation", () => {
    for (const relativePath of [
      "src/app/layout.tsx",
      "src/app/globals.css",
      "src/components/marketing/site-header.tsx",
      "src/components/marketing/site-footer.tsx",
      "src/components/marketing/staggered-menu.tsx",
      "src/config/public-site.ts",
      "public/vasecolorlogo.png",
    ]) {
      expect(fs.existsSync(path.join(portal, relativePath)), relativePath).toBe(true);
    }
  });

  it("uses a src-based App Router without the placeholder root app", () => {
    expect(fs.existsSync(path.join(portal, "app"))).toBe(false);
    expect(fs.existsSync(path.join(portal, "src", "app"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the repository test and confirm it fails**

Run:

```powershell
npm test -- --run tests/vase-portal-migration.test.ts
```

Expected: FAIL on the missing production files.

- [ ] **Step 3: Copy the exact marketing component set**

Copy these files from `apps/vase-app/src/components/marketing` into the same
relative directory under `apps/vase-portal/src`:

```text
about-section-nav.tsx
cta-band.tsx
feature-tabs.tsx
footer-contact-modal.tsx
header-client.tsx
hero-emphasis-font-cycle.tsx
hero-graphic.tsx
legal-page.tsx
scroll-reveal.tsx
section-heading.tsx
site-footer.tsx
site-header-client.tsx
site-header.tsx
staggered-menu.css
staggered-menu.tsx
testimonial-carousel.tsx
unified-features.tsx
```

In `footer-contact-modal.tsx`, import
`@/app/(marketing)/contact-actions`. In header, footer, StaggeredMenu, CTA, and
page-level registration/login links, use `APP_SIGN_IN_URL` and
`APP_REGISTER_URL` from `@/config/origins`.

Render absolute App destinations with native `<a href={...}>` elements and
keep `next/link` for Portal-internal routes. In `staggered-menu.tsx`, add one
small link renderer that selects `<a>` when
`/^https?:\/\//i.test(href)` and `<Link>` otherwise; this keeps typed routes
valid while allowing the menu to cross hostnames.

- [ ] **Step 4: Copy only the UI and configuration dependencies used by marketing**

Copy the four UI units, `config/public-site.ts`, `config/integrations.ts`,
`lib/i18n/locale.ts`, and `lib/i18n/request-locale.ts` from Vase App. Create a
minimal Portal `config/app.ts`:

```ts
export const appConfig = {
  name: "Vase",
  description: "Plataforma digital para negocios reales.",
  locales: ["es", "en"] as const,
  defaultLocale: "es" as const,
};

export type AppLocale = (typeof appConfig.locales)[number];
```

- [ ] **Step 5: Move the production root layout and global styling**

Copy `apps/vase-app/src/app/globals.css` and
`apps/vase-app/postcss.config.mjs`. Adapt the Portal root layout to use
`metadataBase: new URL(portalOrigins.publicSite)`, preserve Manrope,
IBM Plex Mono, Newsreader, the skip link, custom cursor support, and set:

```ts
robots: { index: true, follow: true }
```

Do not copy App theme/session initialization or authenticated analytics logic
into Portal.

- [ ] **Step 6: Add the exact runtime dependencies**

Add these Portal dependencies:

```json
{
  "@formatjs/intl-localematcher": "^0.8.2",
  "embla-carousel-react": "^8.6.0",
  "framer-motion": "^12.38.0",
  "gsap": "^3.14.2",
  "lucide-react": "^1.7.0",
  "negotiator": "^1.0.0",
  "react-icons": "^5.6.0"
}
```

Add `@tailwindcss/postcss` and `tailwindcss` to dev dependencies. Update
`tsconfig.json` with `baseUrl: "."`, `"@/*": ["./src/*"]`, and include
`src/**/*.ts`, `src/**/*.tsx`, and `.next/types/**/*.ts`.

- [ ] **Step 7: Copy public assets and run validation**

Copy the tracked files from `apps/vase-app/public` to
`apps/vase-portal/public`, then run:

```powershell
npm install
npm test -- --run tests/vase-portal-migration.test.ts
npm run typecheck --workspace @vase/portal
```

Expected: the migration test and Portal typecheck pass.

- [ ] **Step 8: Commit the visual foundation**

```powershell
git add package-lock.json apps/vase-portal tests/vase-portal-migration.test.ts
git commit -m "feat: migrate the Vase public visual foundation"
```

## Task 5: Migrate Public Routes, SEO, and Compatibility Redirects

**Files:**
- Create: `apps/vase-portal/src/app/(marketing)/layout.tsx`
- Create: `apps/vase-portal/src/app/(marketing)/page.tsx`
- Create: `apps/vase-portal/src/app/(marketing)/**/page.tsx`
- Create: `apps/vase-portal/src/app/robots.ts`
- Create: `apps/vase-portal/src/app/sitemap.ts`
- Create: `apps/vase-portal/src/config/redirects.ts`
- Create: `apps/vase-portal/src/lib/readiness.ts`
- Create: `apps/vase-portal/src/tests/redirects.test.ts`
- Create: `apps/vase-portal/src/tests/public-routes.test.ts`
- Create: `apps/vase-portal/src/tests/readiness.test.ts`
- Move: `apps/vase-portal/app/api/health/*` to `apps/vase-portal/src/app/api/health/*`
- Move: `apps/vase-portal/app/api/internal/admin/health/route.ts` to `apps/vase-portal/src/app/api/internal/admin/health/route.ts`
- Modify: `apps/vase-portal/next.config.ts`
- Modify: `tests/v3-workspace-structure.test.ts`

- [ ] **Step 1: Write failing redirect and public-route tests**

```ts
// apps/vase-portal/src/tests/redirects.test.ts
import { describe, expect, it } from "vitest";
import { getPortalRedirects } from "@/config/redirects";

describe("Portal compatibility redirects", () => {
  it("sends authenticated entrypoints to app.vase.ar", () => {
    expect(getPortalRedirects("https://app.vase.ar")).toEqual(
      expect.arrayContaining([
        {
          source: "/app",
          destination: "https://app.vase.ar/app",
          permanent: true,
        },
        {
          source: "/signin",
          destination: "https://app.vase.ar/signin",
          permanent: true,
        },
        {
          source: "/register",
          destination: "https://app.vase.ar/register",
          permanent: true,
        },
      ]),
    );
  });
});
```

```ts
// apps/vase-portal/src/tests/public-routes.test.ts
import { describe, expect, it } from "vitest";
import { PUBLIC_ROUTES } from "@/config/redirects";

describe("Portal public routes", () => {
  it("publishes the current production route set", () => {
    expect(PUBLIC_ROUTES).toEqual([
      "/",
      "/demo",
      "/developers/api",
      "/developers/docs",
      "/integraciones",
      "/politica-de-privacidad",
      "/precios",
      "/preguntas-frecuentes",
      "/que-es-vase",
      "/seguridad",
      "/terminos-y-condiciones",
      "/vase-business",
      "/vaselabs",
    ]);
  });
});
```

```ts
// apps/vase-portal/src/tests/readiness.test.ts
import { describe, expect, it, vi } from "vitest";
import { checkPortalAppReadiness } from "@/lib/readiness";

describe("Portal readiness", () => {
  it("reports App as ready only after a successful health response", async () => {
    const ready = await checkPortalAppReadiness({
      baseUrl: "http://app:3002",
      fetcher: vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })),
    });
    expect(ready).toEqual({ ok: true, checks: { app: "ok" } });
  });

  it("reports App as unavailable on network failure", async () => {
    const ready = await checkPortalAppReadiness({
      baseUrl: "http://app:3002",
      fetcher: vi.fn().mockRejectedValue(new Error("connection refused")),
    });
    expect(ready).toEqual({ ok: false, checks: { app: "unavailable" } });
  });
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run:

```powershell
npm run test --workspace @vase/portal -- --run src/tests/redirects.test.ts src/tests/public-routes.test.ts src/tests/readiness.test.ts
```

Expected: FAIL because `config/redirects.ts` does not exist.

- [ ] **Step 3: Implement the redirect contract**

```ts
// apps/vase-portal/src/config/redirects.ts
export const PUBLIC_ROUTES = [
  "/",
  "/demo",
  "/developers/api",
  "/developers/docs",
  "/integraciones",
  "/politica-de-privacidad",
  "/precios",
  "/preguntas-frecuentes",
  "/que-es-vase",
  "/seguridad",
  "/terminos-y-condiciones",
  "/vase-business",
  "/vaselabs",
] as const;

export function getPortalRedirects(appOrigin: string) {
  return [
    { source: "/app", destination: `${appOrigin}/app`, permanent: true },
    { source: "/app/:path*", destination: `${appOrigin}/app/:path*`, permanent: true },
    { source: "/signin", destination: `${appOrigin}/signin`, permanent: true },
    { source: "/register", destination: `${appOrigin}/register`, permanent: true },
    {
      source: "/forgot-password",
      destination: `${appOrigin}/forgot-password`,
      permanent: true,
    },
    {
      source: "/reset-password",
      destination: `${appOrigin}/reset-password`,
      permanent: true,
    },
    {
      source: "/verify-email",
      destination: `${appOrigin}/verify-email`,
      permanent: true,
    },
    {
      source: "/api/openapi.json",
      destination: `${appOrigin}/api/openapi.json`,
      permanent: false,
    },
  ];
}
```

Use it from `next.config.ts`:

```ts
import type { NextConfig } from "next";
import { portalOrigins } from "./src/config/origins";
import { getPortalRedirects } from "./src/config/redirects";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async redirects() {
    return getPortalRedirects(portalOrigins.app);
  },
};

export default nextConfig;
```

- [ ] **Step 4: Copy the complete public route tree**

Copy these source files from `apps/vase-app/src/app/(marketing)` to the same
relative paths in Portal:

```text
layout.tsx
page.tsx
demo/page.tsx
developers/api/page.tsx
developers/docs/page.tsx
developers/docs/[slug]/page.tsx
integraciones/page.tsx
politica-de-privacidad/page.tsx
precios/page.tsx
preguntas-frecuentes/page.tsx
que-es-vase/page.tsx
seguridad/page.tsx
terminos-y-condiciones/page.tsx
vase-business/page.tsx
vaselabs/page.tsx
```

Replace the two Prisma imports in public docs pages with
`portalAppClient.listDocs()` and `portalAppClient.getDoc(slug)`. Catch
`PORTAL_APP_REQUEST_FAILED` on the list page and render the existing empty
state; call `notFound()` for a missing detail.

- [ ] **Step 5: Make every auth CTA canonical**

Replace public `/signin` and `/register` hrefs with
`APP_SIGN_IN_URL` and `APP_REGISTER_URL`. This includes the homepage, demo,
pricing, Business, Labs, About, API, CTA band, SiteHeader, SiteFooter, and
StaggeredMenu defaults. Keep Portal-internal links relative.

- [ ] **Step 6: Move health routes and create Portal SEO files**

Move the existing health handlers into `src/app`. Create `sitemap.ts` from
`PUBLIC_ROUTES`, always using `portalOrigins.publicSite`. Create `robots.ts`
with:

```ts
return {
  rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
  sitemap: `${portalOrigins.publicSite}/sitemap.xml`,
};
```

Change Portal readiness to call
`${portalOrigins.appInternal}/api/health/ready` with `cache: "no-store"`.
Return `503` with `{ status: "error", checks: { app: "unavailable" } }` when
the request fails or App is not ready; return the existing health payload with
`checks: { app: "ok" }` on success. Do not claim PostgreSQL or Redis readiness
until Portal actually queries those services.

Implement the injectable helper used by the test:

```ts
// apps/vase-portal/src/lib/readiness.ts
export async function checkPortalAppReadiness(input: {
  baseUrl: string;
  fetcher?: typeof fetch;
}) {
  try {
    const response = await (input.fetcher ?? fetch)(
      `${input.baseUrl}/api/health/ready`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return { ok: false as const, checks: { app: "unavailable" } };
    }
    return { ok: true as const, checks: { app: "ok" } };
  } catch {
    return { ok: false as const, checks: { app: "unavailable" } };
  }
}
```

Update `tests/v3-workspace-structure.test.ts` so all workspaces detect
`src/app` when present instead of assuming only Vase App uses it.

- [ ] **Step 7: Run Portal tests, typecheck, and production build**

Run:

```powershell
npm run test --workspace @vase/portal
npm test -- --run tests/vase-portal-migration.test.ts tests/v3-workspace-structure.test.ts
npm run typecheck --workspace @vase/portal
npm run build --workspace @vase/portal
```

Expected: all commands pass and Next lists the complete public route set.

- [ ] **Step 8: Commit the public route migration**

```powershell
git add apps/vase-portal tests/vase-portal-migration.test.ts tests/v3-workspace-structure.test.ts
git commit -m "feat: serve the production site from Vase Portal"
```

## Task 6: Make App Home and Logo Point to Vase Portal

**Files:**
- Modify: `apps/vase-app/src/lib/navigation/document-navigation.ts`
- Modify: `apps/vase-app/src/tests/document-navigation.test.ts`
- Modify: `apps/vase-app/src/components/layout/app-shell.tsx`
- Modify: `apps/vase-app/src/components/marketing/site-header-client.tsx`
- Modify: `apps/vase-app/src/components/marketing/site-footer.tsx`
- Modify: `apps/vase-app/src/components/marketing/staggered-menu.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/shortcuts/shortcuts-manager.tsx`

- [ ] **Step 1: Extend navigation tests with public Home behavior**

```ts
it("resolves the public Home and Home shortcut", () => {
  expect(resolveAppHomeHref()).toBe("https://vase.ar");
  expect(resolveShortcutHref("goto_home", "/app")).toBe("https://vase.ar");
  expect(resolveShortcutHref("goto_settings", "/app/settings")).toBe("/app/settings");
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/document-navigation.test.ts
```

Expected: FAIL because the two resolver functions do not exist.

- [ ] **Step 3: Add pure Home and shortcut resolvers**

```ts
import { productOrigins } from "@/config/origins";

export function resolveAppHomeHref() {
  return productOrigins.publicSite;
}

export function resolveShortcutHref(id: string, target: string) {
  return id === "goto_home" ? resolveAppHomeHref() : target;
}
```

- [ ] **Step 4: Wire AppShell navigation**

In `app-shell.tsx`:

- set the client nav item `{ id: "home" }` href to `resolveAppHomeHref()`;
- wrap the desktop logo/name block in
  `<a href={resolveAppHomeHref()} aria-label="Ir a vase.ar">`;
- pass `matched.id` and `matched.target` through `resolveShortcutHref()` before
  Business/Labs resolution;
- retain `<a>` for external URLs so the hostname changes with a full document
  navigation.

In the marketing chrome retained by the App authentication layout:

- set the centered header logo href to `resolveAppHomeHref()`;
- set the StaggeredMenu `Inicio` item to `resolveAppHomeHref()`;
- set the footer Vase logo and `Inicio` link to `resolveAppHomeHref()`;
- keep login, registration, password recovery, and verification links on
  `app.vase.ar`.

In `shortcuts-manager.tsx`, set the displayed default `goto_home` target to
`resolveAppHomeHref()` so saved settings show the real destination.

- [ ] **Step 5: Run tests, typecheck, and build**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/document-navigation.test.ts
npm run typecheck --workspace @vase/app
npm run build --workspace @vase/app
```

Expected: PASS. The build must contain `/app`, `/signin`, and Labs routes.

- [ ] **Step 6: Commit App navigation**

```powershell
git add apps/vase-app/src/lib/navigation/document-navigation.ts apps/vase-app/src/tests/document-navigation.test.ts apps/vase-app/src/components/layout/app-shell.tsx apps/vase-app/src/components/marketing/site-header-client.tsx apps/vase-app/src/components/marketing/site-footer.tsx apps/vase-app/src/components/marketing/staggered-menu.tsx 'apps/vase-app/src/app/(platform)/app/shortcuts/shortcuts-manager.tsx'
git commit -m "feat: link App home navigation to vase.ar"
```

## Task 7: Replace Middleware with a Next 16 Proxy and Isolate Labs by Host

**Files:**
- Delete: `apps/vase-app/middleware.ts`
- Create: `apps/vase-app/proxy.ts`
- Modify: `apps/vase-app/src/lib/security/platform-hosts.ts`
- Modify: `apps/vase-app/src/tests/platform-hosts.test.ts`
- Modify: `apps/vase-app/src/lib/navigation/document-navigation.ts`
- Modify: `apps/vase-app/src/tests/document-navigation.test.ts`
- Modify: `apps/vase-app/tsconfig.json`
- Modify: `apps/vase-app/tsconfig.build.json`

- [ ] **Step 1: Replace the old host expectations with the approved matrix**

Add these cases to `platform-hosts.test.ts`:

```ts
it("normalizes Labs entry routes to the Labs owner panel", () => {
  const input = { nodeEnv: "production" };
  expect(
    resolveLabsHostRequest({
      hostname: "labs.vase.ar",
      url: "https://labs.vase.ar/",
      input,
    }),
  ).toEqual({
    type: "redirect",
    url: "https://labs.vase.ar/app/owner/labs",
  });
  expect(
    resolveLabsHostRequest({
      hostname: "labs.vase.ar",
      url: "https://labs.vase.ar/app/help",
      input,
    }),
  ).toEqual({
    type: "redirect",
    url: "https://labs.vase.ar/app/owner/labs",
  });
});

it("centralizes Labs authentication on App", () => {
  expect(
    resolveLabsHostRequest({
      hostname: "labs.vase.ar",
      url: "https://labs.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs",
      input: { nodeEnv: "production" },
    }),
  ).toEqual({
    type: "redirect",
    url: "https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs",
  });
});

it("rejects unrelated APIs on the Labs host", () => {
  expect(
    resolveLabsHostRequest({
      hostname: "labs.vase.ar",
      url: "https://labs.vase.ar/api/modules",
      input: { nodeEnv: "production" },
    }),
  ).toEqual({ type: "reject", status: 404 });
});

it("allows only Labs infrastructure APIs", () => {
  for (const path of ["/api/auth/session", "/api/labs/inbox", "/api/health/live"]) {
    expect(
      resolveLabsHostRequest({
        hostname: "labs.vase.ar",
        url: `https://labs.vase.ar${path}`,
        input: { nodeEnv: "production" },
      }),
    ).toEqual({ type: "allow" });
  }
});
```

Also assert that App public routes redirect to Portal:

```ts
expect(
  buildPublicSiteRedirectUrl({
    hostname: "app.vase.ar",
    url: "https://app.vase.ar/precios?from=app",
    input: { nodeEnv: "production" },
  }),
).toBe("https://vase.ar/precios?from=app");
```

- [ ] **Step 2: Run host tests and verify the old behavior fails**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/platform-hosts.test.ts src/tests/document-navigation.test.ts
```

Expected: FAIL because current code sends `/app/help` and `/precios` to
`app.vase.ar` and permits every `/api` path.

- [ ] **Step 3: Implement a pure Labs host decision**

Add:

```ts
export const LABS_HOME_PATH = "/app/owner/labs";

const AUTH_PATHS = [
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

function isAllowedLabsApiPath(pathname: string) {
  return (
    pathname === "/api/health/live" ||
    pathname === "/api/health/ready" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/labs/inbox" ||
    pathname.startsWith("/api/labs/")
  );
}

export function resolveLabsHostRequest({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}):
  | { type: "allow" }
  | { type: "redirect"; url: string }
  | { type: "reject"; status: 404 } {
  if (!isLabsHost(hostname, input)) return { type: "allow" };

  const target = new URL(url);
  if (isLabsWorkspacePath(target.pathname)) {
    if (target.pathname === "/app/labs" || target.pathname.startsWith("/app/labs/")) {
      target.pathname = LABS_HOME_PATH;
      target.search = "";
      return { type: "redirect", url: target.toString() };
    }
    return { type: "allow" };
  }

  if (AUTH_PATHS.includes(target.pathname as (typeof AUTH_PATHS)[number])) {
    target.host = resolvePrimaryPlatformHost(input);
    target.protocol = (input.nodeEnv ?? process.env.NODE_ENV) === "production" ? "https:" : target.protocol;
    target.port = (input.nodeEnv ?? process.env.NODE_ENV) === "production" ? "" : target.port;
    return { type: "redirect", url: target.toString() };
  }

  if (target.pathname.startsWith("/api/")) {
    return isAllowedLabsApiPath(target.pathname)
      ? { type: "allow" }
      : { type: "reject", status: 404 };
  }

  if (target.pathname.includes(".") || target.pathname.startsWith("/_next/")) {
    return { type: "allow" };
  }

  target.pathname = LABS_HOME_PATH;
  target.search = "";
  return { type: "redirect", url: target.toString() };
}
```

Set the Labs default path to `LABS_HOME_PATH`. Update
`buildLabsHostRedirectUrl()` so App `/app/labs` and all owner Labs routes land
on `labs.vase.ar`, with `/app/labs` normalized to `LABS_HOME_PATH`.

- [ ] **Step 4: Add App-to-Portal route decisions**

Create a fixed list for the current public routes and implement
`buildPublicSiteRedirectUrl()` so only the primary App host is redirected.
Preserve pathname, query, and hash and use `productOrigins.publicSite` as the
destination origin.

- [ ] **Step 5: Rename and update the request interceptor**

Move the full current `middleware.ts` implementation to `proxy.ts`, retain the
Auth.js wrapper, and insert decisions in this order:

```ts
const labsDecision = resolveLabsHostRequest({
  hostname,
  url: request.url,
});

if (labsDecision.type === "redirect") {
  return NextResponse.redirect(labsDecision.url);
}
if (labsDecision.type === "reject") {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
```

Before Labs isolation, keep App root and App-to-Labs redirects. After those,
apply `buildPublicSiteRedirectUrl()`. Keep storefront rewrites, optimistic
Auth.js checks, locale headers, and cache headers unchanged.

Rename `middleware.ts` to `proxy.ts`; do not keep both files. Change the two
tsconfig includes from `middleware.ts` to `proxy.ts`.

- [ ] **Step 6: Keep client navigation inside Labs**

Change `resolveNavigationHrefForHost()` so a non-Labs internal path requested
on the Labs hostname resolves to `LABS_HOME_PATH`, not an App URL. Update
`document-navigation.test.ts` with:

```ts
expect(resolveNavigationHrefForHost("/app/help", "labs.vase.ar"))
  .toBe("/app/owner/labs");
expect(resolveNavigationHrefForHost("/precios", "labs.vase.ar"))
  .toBe("/app/owner/labs");
```

- [ ] **Step 7: Run focused tests and a production build**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/platform-hosts.test.ts src/tests/document-navigation.test.ts
npm run typecheck --workspace @vase/app
npm run build --workspace @vase/app
```

Expected: PASS and no Next.js warning requesting migration from Middleware to
Proxy.

- [ ] **Step 8: Commit hostname isolation**

```powershell
git add apps/vase-app/proxy.ts apps/vase-app/middleware.ts apps/vase-app/tsconfig.json apps/vase-app/tsconfig.build.json apps/vase-app/src/lib/security/platform-hosts.ts apps/vase-app/src/tests/platform-hosts.test.ts apps/vase-app/src/lib/navigation/document-navigation.ts apps/vase-app/src/tests/document-navigation.test.ts
git commit -m "feat: isolate App and Labs with Next proxy"
```

## Task 8: Enforce Labs Entitlements and Remove Every Exit

**Files:**
- Create: `apps/vase-app/src/lib/labs/access.ts`
- Create: `apps/vase-app/src/components/labs/labs-required-notice.tsx`
- Create: `apps/vase-app/src/tests/labs-access.test.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/labs/page.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/owner/labs/(advanced)/_lib/labs-owner.ts`
- Modify: `apps/vase-app/src/app/(platform)/app/owner/labs/(advanced)/layout.tsx`
- Modify: `apps/vase-app/src/app/(platform)/app/page.tsx`

- [ ] **Step 1: Write failing tests for the no-plan fallback and notice**

```ts
// apps/vase-app/src/tests/labs-access.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildLabsRequiredUrl } from "@/lib/labs/access";
import { LabsRequiredNotice } from "@/components/labs/labs-required-notice";

describe("Labs access fallback", () => {
  it("returns clients without Labs to the App dashboard", () => {
    expect(buildLabsRequiredUrl("https://app.vase.ar")).toBe(
      "https://app.vase.ar/app?labs=required",
    );
  });

  it("renders the activation notice", () => {
    const html = renderToStaticMarkup(<LabsRequiredNotice />);
    expect(html).toContain("Vase Labs no está activo");
    expect(html).toContain("/app/billing");
  });
});
```

Use `.test.tsx` instead of `.test.ts` if JSX is retained.

- [ ] **Step 2: Run the test and confirm failure**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/labs-access.test.tsx
```

Expected: FAIL because the helper and component do not exist.

- [ ] **Step 3: Implement the URL helper and secure server guard**

```ts
// apps/vase-app/src/lib/labs/access.ts
import { forbidden, redirect } from "next/navigation";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { productOrigins } from "@/config/origins";
import { getTenantModulesAccess } from "@/server/queries/modules";

export function buildLabsRequiredUrl(appOrigin = productOrigins.app) {
  return `${appOrigin}/app?labs=required`;
}

export async function requireLabsOwnerAccess() {
  let context: Awaited<ReturnType<typeof requireTenantRole>>;

  try {
    context = await requireTenantRole(tenantRoles.OWNER);
  } catch {
    forbidden();
  }

  const access = await getTenantModulesAccess(
    context.membership.tenantId,
    context.session.user.id,
  );
  const enabled =
    access?.modules.some((module) => module.key === "labs" && module.isActive) ??
    false;

  if (!enabled) {
    redirect(buildLabsRequiredUrl());
  }

  return context;
}
```

This is the secure database-backed guard. Proxy remains an optimistic host
filter only.

- [ ] **Step 4: Apply the guard to both Labs entry layers**

Replace the general AppShell page at `/app/labs` with:

```ts
import { redirect } from "next/navigation";
import { requireLabsOwnerAccess } from "@/lib/labs/access";

export default async function LabsPage() {
  await requireLabsOwnerAccess();
  redirect("/app/owner/labs");
}
```

In `_lib/labs-owner.ts`, replace duplicated `requireTenantRole` and module
checks with `requireLabsOwnerAccess()`. Continue fetching
`getLabsOwnerDashboard`; redirect to `buildLabsRequiredUrl()` if the dashboard
does not exist.

- [ ] **Step 5: Make Labs chrome closed and its logo functional**

In the advanced layout:

- remove both `Volver al Panel de Vase` links;
- remove the unused `ArrowLeft` import;
- wrap the desktop Vase Labs brand block in:

```tsx
<Link href="/app/owner/labs" aria-label="Volver al Panel de Vase Labs">
  {/* existing Bot icon, Vase Labs title, and Centro IA subtitle */}
</Link>
```

- make the mobile Vase Labs identity in `LabsOwnerMobileNav` link to the same
  path;
- retain theme, tenant name, and plan information.

- [ ] **Step 6: Display the App activation notice**

Create `LabsRequiredNotice` as a server-safe component with title
`Vase Labs no está activo`, explanatory text, and a button to `/app/billing`.
Change the App page signature to:

```ts
type AppIndexPageProps = {
  searchParams: Promise<{ labs?: string | string[] }>;
};

export default async function AppIndexPage({ searchParams }: AppIndexPageProps) {
  const query = await searchParams;
  const showLabsRequired = query.labs === "required";
  // existing session and dashboard logic
}
```

Render `<LabsRequiredNotice />` as the first AppShell child only when
`showLabsRequired` is true.

- [ ] **Step 7: Run Labs and App validation**

Run:

```powershell
npm run test:unit --workspace @vase/app -- --run src/tests/labs-access.test.tsx src/tests/platform-hosts.test.ts
npm run typecheck --workspace @vase/app
npm run build --workspace @vase/app
```

Expected: PASS. The Labs build still contains all existing advanced routes.

- [ ] **Step 8: Commit Labs access enforcement**

```powershell
git add apps/vase-app/src/lib/labs/access.ts apps/vase-app/src/components/labs/labs-required-notice.tsx apps/vase-app/src/tests/labs-access.test.tsx 'apps/vase-app/src/app/(platform)/app/labs/page.tsx' 'apps/vase-app/src/app/(platform)/app/owner/labs/(advanced)' 'apps/vase-app/src/app/(platform)/app/page.tsx'
git commit -m "feat: lock Labs navigation to entitled clients"
```

## Task 9: Retire Duplicate Public Pages from Vase App

**Files:**
- Delete: `apps/vase-app/src/app/(marketing)/**`
- Create: `apps/vase-app/src/app/(auth)/contact-actions.ts`
- Modify: `apps/vase-app/src/components/marketing/footer-contact-modal.tsx`
- Modify: `apps/vase-app/src/app/layout.tsx`
- Modify: `apps/vase-app/src/app/robots.ts`
- Modify: `apps/vase-app/src/app/sitemap.ts`
- Modify: `tests/vase-app-migration.test.ts`
- Modify: `tests/v3-workspace-structure.test.ts`

- [ ] **Step 1: Write the new repository boundary assertions**

Update `tests/vase-app-migration.test.ts` to assert:

```ts
expect(
  fs.existsSync(path.join(appDir, "src", "app", "(marketing)", "page.tsx")),
).toBe(false);
expect(
  fs.existsSync(path.resolve("apps/vase-portal/src/app/(marketing)/page.tsx")),
).toBe(true);
expect(read("src/app/robots.ts")).toContain('disallow: "/"');
```

Update `v3-workspace-structure.test.ts` so the expected Vase App root is
`src/app/(platform)/app/page.tsx`, while the Portal root is
`src/app/(marketing)/page.tsx`.

- [ ] **Step 2: Run boundary tests and confirm failure**

Run:

```powershell
npm test -- --run tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
```

Expected: FAIL because App still contains public pages.

- [ ] **Step 3: Preserve contact behavior used by the Auth footer**

Move `apps/vase-app/src/app/(marketing)/contact-actions.ts` to
`apps/vase-app/src/app/(auth)/contact-actions.ts`. Update
`footer-contact-modal.tsx` to import the Auth action. Its implementation stays
on `deliverPortalContactInquiry()` from Task 2.

- [ ] **Step 4: Remove the duplicate public route group**

Delete the remaining files under
`apps/vase-app/src/app/(marketing)`. Keep marketing chrome components that are
still imported by `src/app/(auth)/layout.tsx`; they style the login/register
experience shown in the approved screenshots.

- [ ] **Step 5: Make App non-indexable**

Set App root metadata to:

```ts
robots: { index: false, follow: false }
```

Set `robots.ts` to:

```ts
return {
  rules: [{ userAgent: "*", disallow: "/" }],
};
```

Set `sitemap.ts` to return an empty `MetadataRoute.Sitemap` array.

- [ ] **Step 6: Run boundary tests and build both applications**

Run:

```powershell
npm test -- --run tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
npm run typecheck --workspace @vase/app
npm run typecheck --workspace @vase/portal
npm run build --workspace @vase/app
npm run build --workspace @vase/portal
```

Expected: PASS. Public pages appear only in Portal; App retains auth, platform,
API, storefront, and health routes.

- [ ] **Step 7: Commit the product boundary**

```powershell
git add apps/vase-app tests/vase-app-migration.test.ts tests/v3-workspace-structure.test.ts
git commit -m "refactor: remove public marketing routes from Vase App"
```

## Task 10: Package, Verify, and Document the EasyPanel Cutover

**Files:**
- Modify: `apps/vase-portal/Dockerfile`
- Modify: `apps/vase-app/Dockerfile`
- Modify: `apps/vase-portal/README.md`
- Modify: `apps/vase-app/.env.example`
- Modify: `apps/vase-portal/.env.example`
- Create: `docs/runbooks/vase-domain-cutover.md`
- Modify: `tests/vase-portal-migration.test.ts`
- Modify: `tests/vase-app-migration.test.ts`

- [ ] **Step 1: Extend deployment-structure tests**

Assert the Portal Dockerfile contains:

```ts
expect(dockerfile).toContain("COPY tsconfig.base.json");
expect(dockerfile).toContain("npm run build --workspace @vase/portal");
expect(dockerfile).toContain("EXPOSE 3001");
```

Assert the App Dockerfile declares build arguments for:

```text
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_LABS_URL
```

- [ ] **Step 2: Run the deployment tests and confirm failure**

Run:

```powershell
npm test -- --run tests/vase-portal-migration.test.ts tests/vase-app-migration.test.ts
```

Expected: FAIL until Dockerfiles include the complete monorepo build context
and origin arguments.

- [ ] **Step 3: Convert Portal Docker packaging to the App multi-stage pattern**

Use `node:22-alpine` stages named `deps`, `builder`, and `runner`. Copy root
`package.json`, `package-lock.json`, `tsconfig.base.json`, `packages`, and
`apps/vase-portal`. Build with:

```dockerfile
RUN npm install
RUN npm run build --workspace @vase/portal
```

The runner must set:

```dockerfile
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@vase/portal"]
```

Declare and export build args for the public and App origins. Add the matching
three origin build args to the App Dockerfile.

- [ ] **Step 4: Write the exact EasyPanel runbook**

Document:

```text
portal-vase
  Branch: Vase-Test-Repos
  Build path: /
  Dockerfile: apps/vase-portal/Dockerfile
  Port: 3001
  Domain: vase.ar

vase-app-next
  Branch: Vase-Test-Repos
  Build path: /
  Dockerfile: apps/vase-app/Dockerfile
  Port: 3002
  Domains: app.vase.ar, labs.vase.ar
```

List the required origin variables and one identical
`SERVICE_TO_SERVICE_TOKEN` value in both services. Do not place a real token in
the runbook. Set Portal
`APP_INTERNAL_URL=http://vase-app-next:3002`. Include a rollback section that
reassigns `vase.ar` to the previous service without changing
`app.vase.ar` or `labs.vase.ar`.

- [ ] **Step 5: Run the complete automated verification**

Run:

```powershell
npm run test:v3
npm run test:unit --workspace @vase/app
npm run test:integration --workspace @vase/app
npm run test --workspace @vase/portal
npm run typecheck
npm run build --workspace @vase/portal
npm run build --workspace @vase/app
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 6: Build both Docker images**

Run:

```powershell
docker build -f apps/vase-portal/Dockerfile -t vase-portal:domain-cutover .
docker build -f apps/vase-app/Dockerfile -t vase-app:domain-cutover .
```

Expected: both images build. If the Docker engine fails before a Dockerfile
step, record the engine error and do not report the image as verified.

- [ ] **Step 7: Deploy to temporary domains and execute smoke tests**

Before moving `vase.ar`, verify:

```powershell
curl.exe -sS -I https://portal-test.vase.ar/
curl.exe -sS -I https://app.vase.ar/app
curl.exe -sS -I https://labs.vase.ar/app/owner/labs
curl.exe -sS https://portal-test.vase.ar/api/health/live
curl.exe -sS https://app.vase.ar/api/health/ready
```

Expected:

- Portal root returns `200`.
- App `/app` returns `200` with a valid session or redirects to
  `app.vase.ar/signin?redirectTo=%2Fapp`.
- Labs returns `200` with an entitled session or redirects through the
  centralized App login.
- Both health endpoints return successful JSON.

- [ ] **Step 8: Move `vase.ar` and verify the canonical matrix**

Run:

```powershell
curl.exe -sS -I https://vase.ar/
curl.exe -sS -I https://vase.ar/app
curl.exe -sS -I https://app.vase.ar/
curl.exe -sS -I https://app.vase.ar/precios
curl.exe -sS -I https://labs.vase.ar/app/help
curl.exe -sS -I https://labs.vase.ar/api/modules
```

Expected:

- `vase.ar/` returns `200`.
- `vase.ar/app` redirects to `https://app.vase.ar/app`.
- `app.vase.ar/` redirects to `https://app.vase.ar/app`.
- `app.vase.ar/precios` redirects to `https://vase.ar/precios`.
- `labs.vase.ar/app/help` redirects to
  `https://labs.vase.ar/app/owner/labs`.
- `labs.vase.ar/api/modules` returns `404`.

Manually verify the App logo and `Inicio` open `vase.ar`, the Labs logo opens
the Labs panel, and no `Volver al Panel de Vase` action exists. Submit one
controlled Portal contact inquiry, open the public docs list and one detail,
sign in once on App and open Labs without a second login, then sign out and
confirm both App and Labs require authentication again. Use a controlled
account without Labs to confirm the redirect to
`app.vase.ar/app?labs=required` and the activation notice.

- [ ] **Step 9: Commit deployment packaging and runbook**

```powershell
git add apps/vase-portal/Dockerfile apps/vase-app/Dockerfile apps/vase-portal/README.md apps/vase-portal/.env.example apps/vase-app/.env.example docs/runbooks/vase-domain-cutover.md tests/vase-portal-migration.test.ts tests/vase-app-migration.test.ts
git commit -m "docs: add Vase domain cutover runbook"
```

## Final Acceptance Checklist

- [ ] `vase.ar` is served by `apps/vase-portal`.
- [ ] Public login and registration links use `app.vase.ar`.
- [ ] `app.vase.ar/app` remains the authenticated dashboard.
- [ ] App logo, `Inicio`, and the Home shortcut open `vase.ar`.
- [ ] `labs.vase.ar` keeps the existing `/app/owner/labs/...` URLs.
- [ ] Labs logo returns to `/app/owner/labs`.
- [ ] Labs contains no exit to the general App panel.
- [ ] A client without Labs returns to
  `app.vase.ar/app?labs=required`.
- [ ] Direct unrelated Labs page requests remain inside Labs.
- [ ] Unrelated APIs on the Labs hostname return `404`.
- [ ] Portal and App test, typecheck, production build, and Docker checks are
  recorded with their actual result.

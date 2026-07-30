# Vase Portal Contact Page and Persistent Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the marketing navbar visible throughout scrolling and publish a functional `/contact` page with email and WhatsApp contact paths.

**Architecture:** Remove the feature-section event coupling that controls header visibility, while retaining the header's own compact-on-scroll state. Extend the existing Portal-to-App contact contract with company and phone, then reuse that Server Action in a dedicated client form rendered by a new marketing route. Public discovery remains centralized through `PUBLIC_ROUTES`, the staggered menu and the footer.

**Tech Stack:** Next.js 16 App Router, React 19 Server Actions and `useActionState`, TypeScript, Tailwind CSS 4, Zod 4, Vitest, Resend, Lucide React.

---

### Task 1: Lock navbar and route behavior with failing tests

**Files:**
- Modify: `apps/vase-portal/src/tests/public-routes.test.ts`
- Create: `apps/vase-portal/src/tests/marketing-navigation.test.ts`

- [ ] **Step 1: Add the route expectation**

Add `"/contact"` after the home route in the exact `PUBLIC_ROUTES` expectation.

- [ ] **Step 2: Add navbar regression assertions**

Create a source-level regression test that reads `site-header-client.tsx`,
`unified-features.tsx`, `site-footer.tsx`, and `staggered-menu.tsx` and asserts:

```ts
expect(header).not.toContain("vase:features-visibility");
expect(features).not.toContain("vase:features-visibility");
expect(header).toContain('"fixed inset-x-0 top-0 z-50');
expect(footer).toContain('href="/contact"');
expect(menu).toContain('href="/contact"');
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```powershell
npm test --workspace @vase/portal -- --run src/tests/public-routes.test.ts src/tests/marketing-navigation.test.ts
```

Expected: failure because `/contact` and the navigation links do not exist and the feature visibility event is still present.

- [ ] **Step 4: Implement the navbar fix and public route**

Remove `featuresSectionActive`, its event listener and its hide/show classes from
`site-header-client.tsx`. Remove both `vase:features-visibility` dispatch blocks
from `unified-features.tsx`. Add `"/contact"` to `PUBLIC_ROUTES`.

- [ ] **Step 5: Run the focused tests**

Expected: navbar and route assertions pass; navigation link assertions remain
red until Task 4.

### Task 2: Extend the contact contract test-first

**Files:**
- Modify: `apps/vase-portal/src/lib/validators/contact.ts`
- Modify: `apps/vase-app/src/lib/validators/contact.ts`
- Modify: `apps/vase-portal/src/app/(marketing)/contact-actions.ts`
- Test: `apps/vase-portal/src/tests/contact-validation.test.ts`
- Test: `apps/vase-app/src/tests/contact-validation.test.ts`

- [ ] **Step 1: Write matching validator tests**

In both workspaces, assert that this payload succeeds:

```ts
{
  fullName: "Alexis Vallejos",
  company: "Sanitarios El Teflon",
  email: "alexis@example.com",
  phone: "+54 9 223 449-6403",
  message: "Quiero conocer qué solución de Vase corresponde a mi empresa."
}
```

Also assert that an empty company and a phone shorter than seven digits fail.

- [ ] **Step 2: Run both validator tests and verify RED**

Run:

```powershell
npm test --workspace @vase/portal -- --run src/tests/contact-validation.test.ts
npm test --workspace @vase/app -- --run src/tests/contact-validation.test.ts
```

Expected: failure because `company` and `phone` are absent from both schemas.

- [ ] **Step 3: Add the matching fields to both schemas**

Use the same Zod rules in Portal and App:

```ts
company: z.string().trim().min(2, "Ingresa el nombre de tu empresa.").max(120, "Usa hasta 120 caracteres."),
phone: z.string().trim().min(7, "Ingresa un telefono valido.").max(30, "Usa hasta 30 caracteres.").refine(
  (value) => value.replace(/\D/g, "").length >= 7,
  "Ingresa un telefono valido.",
),
```

- [ ] **Step 4: Forward both fields from the Server Action**

Read `company` and `phone` from `FormData` in `submitContactInquiry`.

- [ ] **Step 5: Re-run both validator tests**

Expected: both files pass.

### Task 3: Deliver company and phone through Vase App

**Files:**
- Modify: `apps/vase-app/src/server/services/contact-email.ts`
- Modify: `apps/vase-app/src/server/services/portal-content.ts`
- Create: `apps/vase-app/src/tests/contact-email.test.ts`

- [ ] **Step 1: Write the failing delivery test**

Stub `global.fetch`, call `sendContactEmail` with the complete payload, parse
the request body and assert its `text` contains:

```text
Empresa: Sanitarios El Teflon
Telefono: +54 9 223 449-6403
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm test --workspace @vase/app -- --run src/tests/contact-email.test.ts
```

Expected: failure because the email currently only includes name and email.

- [ ] **Step 3: Extend delivery and audit metadata**

Add company and phone lines to the Resend plain-text body. Add `company` and
`phone` to the `marketing.contact_inquiry_submitted` audit metadata.

- [ ] **Step 4: Re-run the delivery test**

Expected: pass.

### Task 4: Build the contact page and navigation

**Files:**
- Create: `apps/vase-portal/src/components/marketing/contact-form.tsx`
- Create: `apps/vase-portal/src/app/(marketing)/contact/page.tsx`
- Modify: `apps/vase-portal/src/components/marketing/staggered-menu.tsx`
- Modify: `apps/vase-portal/src/components/marketing/site-footer.tsx`
- Modify: `apps/vase-portal/src/config/public-site.ts`
- Create: `apps/vase-portal/src/tests/contact-page.test.ts`

- [ ] **Step 1: Write the failing page source test**

Assert the new page exports metadata, renders `ContactForm`, and contains the
WhatsApp URL:

```ts
expect(page).toContain('title: "Contacto"');
expect(page).toContain("<ContactForm");
expect(page).toContain("https://wa.me/5492234496403");
expect(form).toContain("useActionState");
expect(form).toContain('name="company"');
expect(form).toContain('name="phone"');
expect(form).toContain('aria-live="polite"');
```

- [ ] **Step 2: Run the contact page test and verify RED**

Run:

```powershell
npm test --workspace @vase/portal -- --run src/tests/contact-page.test.ts
```

Expected: failure because the page and form do not exist.

- [ ] **Step 3: Create the client form**

Build `ContactForm` around `useActionState(submitContactInquiry, {})`. Render
persistent labels, HTML validation, field-level server errors, pending state
and an `aria-live="polite"` result message.

- [ ] **Step 4: Create the server page**

Export static `Metadata` and render:

- Editorial hero with Newsreader emphasis.
- Elevated white form card.
- Green contact panel.
- WhatsApp external link to:

```text
https://wa.me/5492234496403?text=Hola%2C%20quiero%20consultar%20sobre%20Vase.
```

- Visible formatted number `+54 9 223 449-6403`.

- [ ] **Step 5: Add Contacto to navigation**

Extend marketing navigation copy with a `contact` label. Pass `/contact` into
`StaggeredMenu` items from `SiteHeaderClient`, and add a footer company link.
Update the navigation source test to inspect `site-header-client.tsx` rather
than expecting a hard-coded link inside the generic menu component.

- [ ] **Step 6: Run page, route and navigation tests**

Expected: all focused Portal tests pass.

### Task 5: Keep the footer modal contract consistent

**Files:**
- Modify: `apps/vase-portal/src/components/marketing/footer-contact-modal.tsx`
- Modify: `apps/vase-portal/src/components/marketing/site-footer.tsx`
- Modify: `apps/vase-app/src/components/marketing/footer-contact-modal.tsx`
- Modify: `apps/vase-app/src/app/(auth)/contact-actions.ts`

- [ ] **Step 1: Add company and phone inputs**

Update both modal copies to submit the same five-field contract. Add labels to
their props and render the two new fields with validation and autocomplete.

- [ ] **Step 2: Update the App-local action**

Read and validate company and phone in Vase App's auth contact action so the
copied App marketing footer remains compatible with the shared validator.

- [ ] **Step 3: Run contact tests**

Run both workspace contact validation and email delivery tests.

Expected: all pass.

### Task 6: Full verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run Portal tests**

```powershell
npm test --workspace @vase/portal
```

- [ ] **Step 2: Run App focused tests**

```powershell
npm test --workspace @vase/app -- --run src/tests/contact-validation.test.ts src/tests/contact-email.test.ts
```

- [ ] **Step 3: Run typechecks**

```powershell
npm run typecheck --workspace @vase/portal
npm run typecheck --workspace @vase/app
```

- [ ] **Step 4: Run Portal production build**

```powershell
npm run build --workspace @vase/portal
```

- [ ] **Step 5: Review repository state**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional files modified.

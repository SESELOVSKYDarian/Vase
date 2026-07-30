# Vase Portal Contact Page and Persistent Navbar Design

## Objective

Keep the public Vase navigation visible throughout the full page scroll and
publish a first-class contact page at `https://vase.ar/contact`.

The result must reuse the visual language and application boundaries already
present in Vase Portal instead of introducing a separate landing-page style.

## Navbar behavior

The marketing header remains fixed and visible at every scroll position.

`UnifiedFeatures` currently emits a `vase:features-visibility` event that tells
the header to become transparent and move upward while that section is active.
That coupling will be removed. The feature section keeps its existing scroll
animation, while the header independently transitions from its initial state
to its compact translucent state after the first 24 pixels of scroll.

The mobile menu continues to lock body scrolling while open. The navbar must
remain keyboard accessible and must not flicker when crossing section
boundaries.

## Contact page

The new `/contact` route uses the existing marketing layout, site header,
footer, typography, color variables, spacing scale, rounded surfaces and
responsive breakpoints.

The page has two principal regions:

1. An editorial introduction with the message “Hablemos de lo que tu negocio
   necesita”, a short explanation and concise response expectations.
2. A contact workspace composed of:
   - A white elevated form card.
   - A green supporting panel with a direct WhatsApp action.

The form collects:

- Nombre y apellido.
- Empresa.
- Email.
- Teléfono.
- Mensaje.

It reuses the current Portal server action, App internal API, rate limiting,
email delivery and audit trail. Company and phone are added to the validated
contract and included in the delivered email and audit metadata.

The WhatsApp action opens:

```text
https://wa.me/5492234496403
```

with the initial message:

```text
Hola, quiero consultar sobre Vase.
```

The visible number is formatted as `+54 9 223 449-6403`. The action opens in a
new tab and includes safe external-link attributes.

## Navigation and discovery

- Add `Contacto` to the staggered marketing menu.
- Add a direct `Contacto` link to the company area of the footer.
- Add `/contact` to the canonical public route list.
- The existing sitemap automatically includes the route through that route
  list.

The footer contact modal remains available as a compact conversion path. Both
the modal and the page use the same contact contract so their validation and
delivery behavior cannot drift.

## Validation and error handling

- Required fields receive server-side validation.
- Email keeps the existing normalized validation.
- Phone accepts an international or local human-readable number and is
  normalized only for validation; the submitted value remains readable in the
  email.
- Validation errors appear next to the corresponding field.
- Rate limiting and delivery failures retain the existing user-safe messages.
- A successful submission confirms receipt without navigating away.

## Accessibility and responsive behavior

- Every field has a persistent label and useful autocomplete metadata.
- Status messages use an `aria-live` region.
- Focus styles remain visible.
- The two-column workspace becomes one column on small screens.
- The WhatsApp action has a descriptive accessible name.
- Motion respects the existing portal behavior and does not control navbar
  visibility.

## Verification

- A regression test proves the feature section no longer hides the navbar.
- Public-route tests include `/contact`.
- Contact validation tests cover company and phone.
- Contact delivery tests prove both fields reach the App email service.
- Portal typecheck, tests and production build pass.
- Vase App tests and typecheck pass for the extended internal contact
  contract.

# Vase Labs navigation shell

## Goal

Make the desktop shell feel intentional at both sidebar widths, move account controls to a top navigation bar, and give operators a working shortcut search without changing mobile navigation.

## Confirmed design

- Desktop starts with a 72px icon rail. Every navigation icon remains visible, has an accessible label and a tooltip; hover/focus temporarily expands it and the menu button pins it at 272px.
- Labs uses a flask mark rather than the current bot mark. The collapsed state presents that mark with no clipped text.
- A desktop top bar holds a module search, the light/dark toggle, and a right-aligned account menu. Tenant name, plan, link back to Vase, and sign-out move out of the sidebar.
- Search is client-side navigation search: it filters the Labs navigation destinations, supports keyboard navigation, and routes to the selected destination.
- Theme selection is persisted per browser with `localStorage`, honours the initial system preference, and is available by icon in the top bar. Existing mobile navigation remains intact.

## Boundaries

- No new backend endpoints or database changes.
- No change to authorization or to the existing mobile navigation route list.
- The account menu may expose the existing link to Vase; actual sign-out continues to use the authenticated platform endpoint already used by the app shell.

## Validation

- Canonical owner route tests remain green.
- A focused shell test asserts the flask mark, persisted theme control, top search and compact rail semantics.
- Typecheck and a production build run after dependency availability is restored.

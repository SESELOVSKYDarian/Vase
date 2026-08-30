# Evolution Compact Catalog Design

## Objective

Make the Evolution product catalog denser and prevent the product editor from covering the catalog while preserving every existing catalog operation.

## Approved direction

Use a compact product grid with a docked inspector on wide desktop screens. The central workspace and inspector must participate in the same flex layout so the inspector reserves its width instead of overlaying product cards. On narrower screens the inspector remains a modal drawer with a scrim and explicit close action.

## Catalog workspace

- Collapse the title, description, search, and create action into a compact toolbar.
- Use an auto-filling grid with cards between roughly 180 and 220 pixels wide.
- Reduce card padding, radius, image height, typography, and metadata spacing.
- Preserve the full product image with `object-contain` rather than cropping it.
- Keep visibility, synchronization status, price, SKU, stock, selection, editing, and deletion controls.
- Keep pagination behavior and the existing ten-products-per-page contract.

## Inspector

- Dock the inspector by default at wide desktop breakpoints and reserve approximately 360 pixels.
- Retain the pin control for users who want to switch between docked and overlay behavior.
- On smaller screens use the existing drawer behavior with a scrim, preventing accidental interaction with content behind it.
- Reduce vertical spacing and padding in the catalog inspector while preserving all tabs and fields: General, Categories, Images, Sync, detected prices, source assignment, and save actions.

## Responsive behavior

- Wide desktop: compact grid plus docked inspector, with no overlap.
- Laptop/tablet landscape: inspector drawer above a non-interactive scrim.
- Mobile: full-width inspector drawer; catalog cards collapse to one or two columns according to available width.

## Accessibility and interaction

- Preserve semantic buttons, labels, keyboard focus, and close behavior.
- Keep touch targets large enough even though visual controls become denser.
- Use existing semantic admin theme tokens in light and dark modes.
- Avoid introducing new data flow, API, persistence, or product-selection behavior.

## Verification

- Add source-level regression coverage for the compact auto-fill grid and docked wide inspector.
- Run all editor web tests and the production build.
- Confirm `git diff --check` and a clean worktree after commits.

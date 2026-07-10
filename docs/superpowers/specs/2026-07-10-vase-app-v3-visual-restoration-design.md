# Vase App V3 Visual Restoration Design

## Objective

Restore the user-facing design of `apps/vase-app` to the design already present
at commit `fd54455` on `origin/feature/vase-app-v3-migration`. Later commits on
`main` are not a visual reference for this work.

The result must look like the migration branch design without introducing a new
design direction. Post-baseline backend behavior remains available.

## Source of Truth

- Visual baseline: `fd54455` (`origin/feature/vase-app-v3-migration`).
- Current implementation: `HEAD` on `feature/vase-app-v3-migration`.
- `main` must not be used to select markup, layout, styles, copy, spacing, or
  responsive behavior.
- The untracked `apps/vase-app.zip` and `apps/vase-labs.zip` files are outside
  this restoration and must not be modified or committed.

## Chosen Approach

Restore the complete visual layer from the baseline while preserving later
functional changes.

This is preferred over restoring the complete `apps/vase-app` tree because a
whole-tree restore would remove later routes, security work, integrations, and
runtime fixes. It is also preferred over isolated styling tweaks because those
would leave a mixture of incompatible visual systems.

## Visual Scope

The baseline controls the rendered structure and presentation of all modified
user-facing components under:

- `apps/vase-app/src/components/marketing`
- `apps/vase-app/src/components/layout`
- `apps/vase-app/src/components/business`
- user-facing route components under `apps/vase-app/src/app`

For these surfaces, restore the baseline's:

- DOM and component composition;
- navigation placement and interaction pattern;
- labels and visible copy unless a current functional state requires a new
  value;
- classes, spacing, typography, colors, borders, and responsive behavior;
- empty, loading, error, and disabled-state presentation.

No new cards, sections, decorative treatments, navigation variants, or layout
systems may be introduced.

## Functional Preservation

Do not revert post-baseline server routes, APIs, authentication, security,
origin handling, deployment configuration, database behavior, or integrations.

When a file mixes newer behavior with newer presentation, keep the behavior and
adapt it to the baseline markup. This especially applies to the Business
builder, storefront, domain and integration controls, and the authenticated app
shell. New controls required by supported functionality must use the existing
baseline component language and occupy the least disruptive valid location.

`apps/vase-labs` is outside the implementation scope.

## Implementation Boundaries

1. Compare every changed user-facing component with its `fd54455` version.
2. Restore baseline files directly when they contain no required post-baseline
   behavior.
3. Perform a focused merge in mixed files, retaining current handlers, props,
   data flow, accessibility attributes, and security checks.
4. Do not alter unrelated backend or deployment files to obtain visual parity.
5. Do not merge or cherry-pick visual commits from `main`.

## Verification

- Audit the final user-facing diff against `fd54455`; every remaining visual
  difference must be tied to a preserved functional requirement.
- Run the relevant Vase App tests, typecheck, and production build supported by
  the workspace.
- Run `git diff --check`.
- Start Vase App and inspect representative public, authenticated, owner,
  Business, and responsive views when the local environment permits it.
- Confirm that later routes and integrations retained during the merge still
  have working entry points.

## Acceptance Criteria

- The visible Vase App design matches the `fd54455` migration-branch design.
- No later `main` redesign remains merely because it is newer.
- Current non-visual functionality is preserved.
- No unrelated application, ZIP, or user-owned file is changed.
- Any unavoidable visible addition is rendered using the baseline visual
  language and documented in the implementation handoff.

# Vase App V3 and Labs Visual Restoration Design

## Objective

Restore the user-facing design of `apps/vase-app` to the design already present
at commit `fd54455` on `origin/feature/vase-app-v3-migration`. Later commits on
`main` are not a visual reference for this work.

Restore Vase Labs using commit
`63e38a1070052f67e71cde52a9263a2ebf726cbb` as the final visual source. Commit
`05c3cb885a0256051e86e079ca8d55e603d7b9ca` is historical implementation
context, not the active visual target. Post-baseline backend behavior remains
available.

## Source of Truth

- Visual baseline: `fd54455` (`origin/feature/vase-app-v3-migration`).
- Final Labs shell, split service, billing, tokens, channels, WhatsApp, and
  contracts:
  `63e38a1070052f67e71cde52a9263a2ebf726cbb` (`Labsmejoras`).
- Historical Labs implementation context only:
  `05c3cb885a0256051e86e079ca8d55e603d7b9ca` (`Nuevo-Vase-Labs`).
- Existing functional port of the `63e38a1` design into the owner dashboard:
  `81d2726` (`migrate labs zip design to owner dashboard`).
- Current implementation: `HEAD` on `main`.
- `main` must not be used to select markup, layout, styles, copy, spacing, or
  responsive behavior.
- The untracked `apps/vase-app.zip` and `apps/vase-labs.zip` files are outside
  this restoration and must not be modified or committed.

## Chosen Approach

Restore the complete Vase App and Labs visual layers from their corresponding
baselines while preserving later functional changes.

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
- `apps/vase-labs/app/app/owner/labs`
- shared Labs presentation in `apps/vase-labs/app/globals.css`

For Labs, use `63e38a1` for the complete visual system and information
architecture: dark `.labs-rail`, `.hero-panel`, `.metric-grid`,
`.content-grid`, channels, tokens, plans, and inbox. Use `81d2726` as the
already-adapted owner-dashboard implementation. Do not render the white
`05c3cb8` advanced dashboard.

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

For Labs, preserve the current split-service architecture and current data
wiring. Restore the complete `63e38a1` owner experience while retaining its
plan, billing, token, channel, AI availability, WhatsApp, and contract
capabilities in the active UI.

## Implementation Boundaries

1. Compare every changed Vase App user-facing component with its `fd54455`
   version.
2. Compare the active Labs owner surface against `63e38a1` and its functional
   port at `81d2726`.
3. Restore baseline files directly when they contain no required post-baseline
   behavior.
4. Perform a focused merge in mixed files, retaining current handlers, props,
   data flow, accessibility attributes, and security checks.
5. Do not alter unrelated backend or deployment files to obtain visual parity.
6. Do not merge or cherry-pick visual commits from `main`.

## Verification

- Audit the final Vase App user-facing diff against `fd54455`; every remaining
  visual difference must be tied to a preserved functional requirement.
- Audit the final Labs owner surface against `63e38a1`; every visual anchor and
  operational feature must be present or explicitly mapped to its current
  equivalent.
- Run the relevant Vase App tests, typecheck, and production build supported by
  the workspace.
- Run the Labs owner UI, plan, token, channel, inbox, billing, and service tests
  associated with the two Labs source commits.
- Run `git diff --check`.
- Start Vase App and inspect representative public, authenticated, owner,
  Business, and responsive views when the local environment permits it.
- Confirm that later routes and integrations retained during the merge still
  have working entry points.

## Acceptance Criteria

- The visible Vase App design matches the `fd54455` migration-branch design.
- The visible Labs experience matches the dark-rail `63e38a1` design and does
  not render the white `05c3cb8` dashboard.
- No later `main` redesign remains merely because it is newer.
- Current non-visual functionality is preserved.
- No unrelated application, ZIP, or user-owned file is changed.
- Any unavoidable visible addition is rendered using the baseline visual
  language and documented in the implementation handoff.

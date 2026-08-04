# Task 4 Quality Hardening Design

Date: 2026-08-04

## Goal

Close the Task 4 quality-review blockers without widening the client-access feature: preserve Labs compatibility, establish an unambiguous primary tenant owner, make Rest trial entitlement consistent, preserve activation history, and emit useful but safe audit diffs.

## Ownership invariant

`Tenant.primaryOwnerUserId String? @unique` is the stable owner-to-tenant pointer. It has a named optional relation to `User`; the inverse relation is singular because one user may be primary owner of at most one tenant.

A forward-only migration adds the nullable column, backfills it only where both sides are unambiguous (the tenant has exactly one OWNER membership and that user owns exactly one tenant), then adds the unique index and foreign key. Ambiguous legacy rows stay null and require explicit repair.

Provisioning resolves a tenant in this order:

1. tenant whose `primaryOwnerUserId` matches the requested owner;
2. exactly one legacy `Membership` for that user with role `OWNER`;
3. a new tenant created/upserted with the primary-owner pointer.

Multiple legacy OWNER memberships are rejected. MEMBER and MANAGER memberships are never considered and never promoted. Claiming a legacy tenant uses a conditional update so a concurrent writer cannot replace another primary owner. Tenant creation and OWNER membership creation remain in one transaction. Unique conflicts are resolved only by re-reading the tenant for the same primary owner; a conflicting owner or unresolved race is rejected.

## Labs channel state

`TenantAiWorkspace.channelLimits` remains the compatibility field, but every producer writes the canonical contract shape:

```ts
{ WHATSAPP: number, INSTAGRAM: number, FACEBOOK: number }
```

The product entitlement's legacy `messenger` key maps to `FACEBOOK`. Product provisioning writes the plan-derived canonical limits and clears `channelOverrideReason`, `channelOverrideBy`, and `channelOverrideAt`. Labs Admin writes canonical limits together with all override metadata. Consumers treat channel limits as a manual override only when the override metadata is complete; otherwise they are plan-derived persisted limits. Session context and Labs Admin use the same resolver so producer output round-trips identically.

## Rest entitlement

A pure shared predicate, `isRestContractEntitled`, recognizes exactly `ACTIVE` and `TRIAL`. It gates Rest session context, module visibility, Rest Admin tenant/member presentation, and `SET_USER_ACCESS`. The Rest contract writer already accepts both commercial states and continues synchronizing its `TenantModule` in the same transaction.

## Activation history

For modules, submodules, and Rest contracts, `activatedAt` changes only when a row is created, reactivated, changes commercial status, or changes material Rest pricing/version. Exact resubmission preserves the existing timestamp. Deactivation continues clearing module/submodule timestamps and records Rest suspension separately.

## Legacy Labs ranking

Conflicting legacy selections resolve deterministically as `GROWTH > PRO > STARTER` in both the compatibility adapter and shared admin helper.

## Audit metadata

Master-user create/update audit metadata includes a safe client-product-access change object:

- before and after product/submodule commercial statuses;
- before and after Labs plan;
- before and after Rest pricing-version id;
- feature identity and enabled state;
- feature change kind (`ADDED`, `REMOVED`, `ENABLED`, `DISABLED`, `VALUE_CHANGED`, or combined state/value change).

Arbitrary feature values, especially TEXT values, are never stored in audit metadata. The summary records only whether a feature has a configured value, while the diff records whether that value changed.

## Error handling and concurrency

Ambiguous ownership raises a domain error before any access mutation. A primary-owner conflict and an unresolved unique race raise explicit domain errors and roll back the enclosing transaction. Existing product-validation errors remain unchanged.

## Tests

Tests cover:

- schema relation and additive forward migration;
- MEMBER/MANAGER non-promotion, ambiguous OWNER rejection, legacy owner claim, new-owner consistency, and unique-race handling;
- canonical Labs producer output and real producer-to-session-context/Labs-Admin resolution;
- override metadata clearing versus genuine override preservation;
- Trial Rest visibility and access mutation across all gates;
- legacy Labs ranking;
- no-op and material-transition activation timestamps;
- safe, reconstructable before/after audit feature diffs.

Verification includes focused tests, schema contract tests, Prisma generate/validate, application typecheck, targeted lint, and `git diff --check`.

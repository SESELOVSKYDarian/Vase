import type { ScopedPolicy } from "./scope-types";

export function resolveEffectiveScope(input: {
  tenant: ScopedPolicy;
  branchGroups: ScopedPolicy[];
  branch: ScopedPolicy | null;
}) {
  const source = input.branch ??
    [...input.branchGroups].sort((a, b) =>
      b.revision - a.revision || a.scopeId.localeCompare(b.scopeId))[0] ??
    input.tenant;
  return {
    value: source.value,
    sourceScope: source.scopeType,
    sourceScopeId: source.scopeId,
    sourceRevision: source.revision,
    overridden: source.scopeType !== "TENANT",
  };
}

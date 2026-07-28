export type ScopedRecipeItem<T = unknown> = {
  scopeType: string;
  scopeId: string;
  scopeRevision: number;
  value: T;
};

export function effectiveRecipeItems<T>(input: {
  globalTenantId: string;
  branchId: string;
  branchGroupIds: string[];
  items: ScopedRecipeItem<T>[];
}) {
  const branch = input.items.filter((item) =>
    item.scopeType === "BRANCH" && item.scopeId === input.branchId);
  if (branch.length) return branch.map((item) => item.value);
  const groups = input.items.filter((item) =>
    item.scopeType === "BRANCH_GROUP" &&
    input.branchGroupIds.includes(item.scopeId));
  if (groups.length) {
    const selectedScope = [...groups].sort((left, right) =>
      right.scopeRevision - left.scopeRevision ||
      left.scopeId.localeCompare(right.scopeId))[0]!.scopeId;
    return groups.filter((item) => item.scopeId === selectedScope)
      .map((item) => item.value);
  }
  return input.items.filter((item) =>
    item.scopeType === "TENANT" && item.scopeId === input.globalTenantId)
    .map((item) => item.value);
}

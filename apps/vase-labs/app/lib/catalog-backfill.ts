type CatalogBackfillDependencies = {
  listProducts(globalTenantId: string): Promise<unknown[]>;
  latestSync(globalTenantId: string): Promise<string | null>;
  hasExternalSource(assistantId: string): Promise<boolean>;
  importSnapshot(globalTenantId: string): Promise<{ count: number }>;
};

type CatalogBackfillOptions = {
  retryDelayMs?: number;
  now?: () => number;
};

type CatalogBackfillResult = { attempted: boolean; imported: number };

export function createExternalCatalogBackfillCoordinator(
  dependencies: CatalogBackfillDependencies,
  options: CatalogBackfillOptions = {},
) {
  const inFlight = new Map<string, Promise<CatalogBackfillResult>>();
  const retryAfter = new Map<string, number>();
  const retryDelayMs = options.retryDelayMs ?? 60_000;
  const now = options.now ?? Date.now;

  return async function ensureExternalCatalogBackfill(
    identity: { globalTenantId: string; assistantId: string },
  ): Promise<CatalogBackfillResult> {
    const products = await dependencies.listProducts(identity.globalTenantId);
    if (products.length > 0) return { attempted: false, imported: 0 };

    if (await dependencies.latestSync(identity.globalTenantId)) {
      return { attempted: false, imported: 0 };
    }
    if (!await dependencies.hasExternalSource(identity.assistantId)) {
      return { attempted: false, imported: 0 };
    }
    if ((retryAfter.get(identity.globalTenantId) ?? 0) > now()) {
      return { attempted: false, imported: 0 };
    }

    const pending = inFlight.get(identity.globalTenantId);
    if (pending) return pending;

    const attempt = dependencies.importSnapshot(identity.globalTenantId)
      .then((result) => {
        retryAfter.delete(identity.globalTenantId);
        return { attempted: true, imported: result.count };
      })
      .catch((error) => {
        retryAfter.set(identity.globalTenantId, now() + retryDelayMs);
        throw error;
      })
      .finally(() => {
        inFlight.delete(identity.globalTenantId);
      });
    inFlight.set(identity.globalTenantId, attempt);
    return attempt;
  };
}

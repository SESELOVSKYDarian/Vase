type TenantInput = {
  globalTenantId: string;
  name: string;
  slug: string;
  entitlement: {
    plan: string;
    status: string;
    contractVersion: number;
  } | null;
  branchCount: number;
  staffCount: number;
  deviceCount: number;
  edgeCount: number;
  degradedIntegrations: number;
};

type EdgeInput = {
  id: string;
  globalTenantId: string;
  branchId: string;
  branchName: string;
  name: string;
  status: string;
  agentVersion: string | null;
  lastSeenAt: Date | null;
  lastCloudSyncAt: Date | null;
  pendingEventCount: number;
  failedPrintJobCount: number;
  lastErrorCode: string | null;
};

export function buildRestAdminOperations(input: {
  now?: Date;
  tenants: TenantInput[];
  edges: EdgeInput[];
}) {
  const now = input.now ?? new Date();
  return {
    generatedAt: now.toISOString(),
    tenants: input.tenants.map((tenant) => ({
      ...tenant,
      entitlement: tenant.entitlement ?? {
        plan: "UNASSIGNED",
        status: "MISSING",
        contractVersion: 0,
      },
    })),
    edges: input.edges.map((edge) => {
      const heartbeatLagSeconds = edge.lastSeenAt
        ? Math.max(0, Math.floor((now.getTime() - edge.lastSeenAt.getTime()) / 1_000))
        : null;
      const syncLagSeconds = edge.lastCloudSyncAt
        ? Math.max(0, Math.floor(
          (now.getTime() - edge.lastCloudSyncAt.getTime()) / 1_000,
        )) : null;
      return {
        ...edge,
        operationalState: edge.status !== "ACTIVE" ? "REVOKED"
          : heartbeatLagSeconds === null || heartbeatLagSeconds > 300 ? "OFFLINE"
            : edge.pendingEventCount > 0 || edge.failedPrintJobCount > 0 ||
                (syncLagSeconds !== null && syncLagSeconds > 900)
              ? "DEGRADED" : "ONLINE",
        heartbeatLagSeconds,
        syncLagSeconds,
        lastSeenAt: edge.lastSeenAt?.toISOString() ?? null,
        lastCloudSyncAt: edge.lastCloudSyncAt?.toISOString() ?? null,
      };
    }),
  };
}

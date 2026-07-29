export type EdgeProbe = {
  reachable: boolean;
  pairedInstallationId: string;
  reportedInstallationId?: string | null;
  expectedFingerprint: string;
  reportedFingerprint?: string | null;
  lastCloudSyncAt?: string | null;
  pendingEvents: number;
};

export type EdgeConnectionKind =
  | "CONNECTED"
  | "STALE"
  | "UNAVAILABLE"
  | "CERTIFICATE_MISMATCH"
  | "IDENTITY_MISMATCH";

export function edgeConnectionState(
  probe: EdgeProbe,
  now = Date.now(),
): { kind: EdgeConnectionKind; canOperate: boolean; pendingEvents: number } {
  if (!probe.reachable) {
    return { kind: "UNAVAILABLE", canOperate: false, pendingEvents: probe.pendingEvents };
  }
  if (probe.reportedInstallationId !== probe.pairedInstallationId) {
    return { kind: "IDENTITY_MISMATCH", canOperate: false, pendingEvents: probe.pendingEvents };
  }
  if (probe.reportedFingerprint !== probe.expectedFingerprint) {
    return { kind: "CERTIFICATE_MISMATCH", canOperate: false, pendingEvents: probe.pendingEvents };
  }
  const stale = !probe.lastCloudSyncAt ||
    now - new Date(probe.lastCloudSyncAt).getTime() > 15 * 60_000;
  return {
    kind: stale ? "STALE" : "CONNECTED",
    canOperate: true,
    pendingEvents: probe.pendingEvents,
  };
}

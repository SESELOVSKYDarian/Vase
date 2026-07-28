import { z } from "zod";
import { edgeConnectionState } from "./connection-state";

export const edgePairingSchema = z.object({
  edgeUrl: z.url().refine((value) => value.startsWith("https://")),
  installationId: z.string().min(1),
  certificateFingerprint: z.string().min(8),
  globalTenantId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
}).strict();
export type EdgePairing = z.infer<typeof edgePairingSchema>;

async function verifyEdgeIdentity(input: {
  pairing: EdgePairing;
  fetcher: typeof fetch;
  sessionToken?: string;
}) {
  let response: Response;
  try {
    response = await input.fetcher(new URL("/identity", input.pairing.edgeUrl), {
      headers: input.sessionToken
        ? { authorization: `Bearer ${input.sessionToken}` }
        : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
  } catch {
    throw new Error("REST_EDGE_UNAVAILABLE");
  }
  const payload = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    payload.installationId !== input.pairing.installationId ||
    payload.certificateFingerprint !== input.pairing.certificateFingerprint
  ) throw new Error("REST_EDGE_IDENTITY_MISMATCH");
  return payload as {
    installationId: string;
    certificateFingerprint: string;
    lastCloudSyncAt?: string | null;
    pendingEvents?: number;
  };
}

export async function authenticateLocalStaff(input: {
  pairing: EdgePairing;
  employeeCode: string;
  pin: string;
  fetcher?: typeof fetch;
}) {
  const pairing = edgePairingSchema.parse(input.pairing);
  const fetcher = input.fetcher ?? fetch;
  await verifyEdgeIdentity({ pairing, fetcher });
  const response = await fetcher(new URL("/access/pin", pairing.edgeUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      employeeCode: input.employeeCode,
      pin: input.pin,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_STAFF_LOGIN_FAILED");
  const session = z.object({
    sessionToken: z.string().min(1),
    cloudSessionToken: z.string().min(1).optional(),
    branchId: z.string().min(1),
    staffId: z.string().min(1),
  }).passthrough().parse(payload);
  if (pairing.branchId && pairing.branchId !== session.branchId) {
    throw new Error("REST_EDGE_SESSION_SCOPE_MISMATCH");
  }
  return session;
}

export function readCloudStaffToken() {
  try {
    const session = z.object({
      cloudSessionToken: z.string().min(1),
    }).passthrough().parse(JSON.parse(
      sessionStorage.getItem("vase-rest-staff-session") ?? "{}",
    ));
    return session.cloudSessionToken;
  } catch {
    return "";
  }
}

export function createLocalEdgeClient(input: {
  pairing: EdgePairing;
  sessionToken: string;
  fetcher?: typeof fetch;
}) {
  const pairing = edgePairingSchema.parse(input.pairing);
  const fetcher = input.fetcher ?? fetch;
  async function identity() {
    return verifyEdgeIdentity({
      pairing,
      fetcher,
      sessionToken: input.sessionToken,
    });
  }
  return {
    async probe() {
      try {
        const reported = await identity();
        return edgeConnectionState({
          reachable: true,
          pairedInstallationId: pairing.installationId,
          reportedInstallationId: reported.installationId,
          expectedFingerprint: pairing.certificateFingerprint,
          reportedFingerprint: reported.certificateFingerprint,
          lastCloudSyncAt: reported.lastCloudSyncAt,
          pendingEvents: reported.pendingEvents ?? 0,
        });
      } catch {
        return edgeConnectionState({
          reachable: false,
          pairedInstallationId: pairing.installationId,
          expectedFingerprint: pairing.certificateFingerprint,
          pendingEvents: 0,
        });
      }
    },
    async state(aggregateType: string) {
      await identity();
      const response = await fetcher(
        new URL(`/state?aggregateType=${encodeURIComponent(aggregateType)}`, pairing.edgeUrl),
        {
          headers: { authorization: `Bearer ${input.sessionToken}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_STATE_FAILED");
      return payload;
    },
    async command(command: {
      eventId: string; aggregateType: string; aggregateId: string;
      expectedVersion: number; eventType: string; idempotencyKey: string;
      payload: Record<string, unknown>;
    }) {
      await identity();
      const response = await fetcher(new URL("/commands", pairing.edgeUrl), {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(command),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_COMMAND_FAILED");
      return payload;
    },
    async printers() {
      await identity();
      const response = await fetcher(new URL("/printers", pairing.edgeUrl), {
        headers: { authorization: `Bearer ${input.sessionToken}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_PRINTERS_FAILED");
      return payload;
    },
    async savePrinter(printer: Record<string, unknown>) {
      await identity();
      const response = await fetcher(new URL("/printers", pairing.edgeUrl), {
        method: "PUT",
        headers: {
          authorization: `Bearer ${input.sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(printer),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_PRINTER_SAVE_FAILED");
      return payload;
    },
    async testPrinter(printerId: string, idempotencyKey: string) {
      await identity();
      const response = await fetcher(new URL("/print/test", pairing.edgeUrl), {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ printerId, idempotencyKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_PRINT_TEST_FAILED");
      return payload;
    },
    async printJobs() {
      await identity();
      const response = await fetcher(new URL("/print/jobs", pairing.edgeUrl), {
        headers: { authorization: `Bearer ${input.sessionToken}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_EDGE_PRINT_JOBS_FAILED");
      return payload;
    },
    async retryPrintJob(jobId: string) {
      await identity();
      const response = await fetcher(
        new URL(`/print/jobs/${encodeURIComponent(jobId)}/retry`, pairing.edgeUrl),
        {
          method: "POST",
          headers: { authorization: `Bearer ${input.sessionToken}` },
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "REST_EDGE_PRINT_RETRY_FAILED");
      }
    },
  };
}

export function readLocalEdgeClient() {
  const pairingRaw = localStorage.getItem("vase-rest-device");
  const sessionRaw = sessionStorage.getItem("vase-rest-staff-session");
  if (!pairingRaw || !sessionRaw) throw new Error("REST_EDGE_PAIRING_REQUIRED");
  const pairing = edgePairingSchema.parse(JSON.parse(pairingRaw));
  const session = z.object({ sessionToken: z.string().min(1) }).passthrough()
    .parse(JSON.parse(sessionRaw));
  return createLocalEdgeClient({ pairing, sessionToken: session.sessionToken });
}

import { describe, expect, it } from "vitest";
import {
  edgeConnectionState,
  type EdgeProbe,
} from "../apps/vase-rest/app/lib/edge/connection-state";
import {
  authenticateLocalStaff,
  createLocalEdgeClient,
} from "../apps/vase-rest/app/lib/edge/local-edge-client";

describe("Rest workstation Edge connection", () => {
  it("distinguishes authenticated, offline, stale and certificate mismatch states", () => {
    const base: EdgeProbe = {
      reachable: true,
      pairedInstallationId: "edge_1",
      reportedInstallationId: "edge_1",
      expectedFingerprint: "SHA256:ABC",
      reportedFingerprint: "SHA256:ABC",
      lastCloudSyncAt: new Date().toISOString(),
      pendingEvents: 0,
    };
    expect(edgeConnectionState(base).kind).toBe("CONNECTED");
    expect(edgeConnectionState({ ...base, reachable: false }).kind).toBe("UNAVAILABLE");
    expect(edgeConnectionState({
      ...base,
      reportedFingerprint: "SHA256:OTHER",
    }).kind).toBe("CERTIFICATE_MISMATCH");
    expect(edgeConnectionState({
      ...base,
      lastCloudSyncAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      pendingEvents: 4,
    }).kind).toBe("STALE");
  });

  it("routes local commands only after the paired identity is verified", async () => {
    const requests: string[] = [];
    const client = createLocalEdgeClient({
      pairing: {
        edgeUrl: "https://192.168.1.20:3443",
        installationId: "edge_1",
        certificateFingerprint: "SHA256:ABC",
      },
      sessionToken: "staff-token",
      fetcher: async (url, init) => {
        requests.push(`${init?.method ?? "GET"} ${url}`);
        if (String(url).endsWith("/identity")) {
          return Response.json({
            installationId: "edge_1",
            certificateFingerprint: "SHA256:ABC",
          });
        }
        return Response.json({ eventId: "event_1", aggregateVersion: 2 }, { status: 202 });
      },
    });
    await expect(client.command({
      eventId: "event_1", aggregateType: "TABLE", aggregateId: "table_1",
      expectedVersion: 1, eventType: "TABLE_OCCUPIED",
      idempotencyKey: "command_1", payload: { status: "OCCUPIED" },
    })).resolves.toMatchObject({ aggregateVersion: 2 });
    expect(requests).toEqual([
      "GET https://192.168.1.20:3443/identity",
      "POST https://192.168.1.20:3443/commands",
    ]);
  });

  it("fails closed when the paired Edge cannot be authenticated", async () => {
    const client = createLocalEdgeClient({
      pairing: {
        edgeUrl: "https://edge.local:3443",
        installationId: "edge_1",
        certificateFingerprint: "SHA256:ABC",
      },
      sessionToken: "staff-token",
      fetcher: async () => Response.json({
        installationId: "edge_other",
        certificateFingerprint: "SHA256:ATTACK",
      }),
    });
    await expect(client.command({
      eventId: "e", aggregateType: "ORDER", aggregateId: "o",
      expectedVersion: 0, eventType: "OPENED", idempotencyKey: "c", payload: {},
    })).rejects.toThrow("REST_EDGE_IDENTITY_MISMATCH");
  });

  it("authenticates branch staff directly against the paired Edge", async () => {
    const requests: string[] = [];
    await expect(authenticateLocalStaff({
      pairing: {
        edgeUrl: "https://edge.local:3443",
        installationId: "edge_1",
        certificateFingerprint: "SHA256:ABC",
        branchId: "branch_1",
      },
      employeeCode: "MESERO-7",
      pin: "4821",
      fetcher: async (url, init) => {
        requests.push(`${init?.method ?? "GET"} ${url}`);
        if (String(url).endsWith("/identity")) {
          return Response.json({
            installationId: "edge_1",
            certificateFingerprint: "SHA256:ABC",
          });
        }
        expect(JSON.parse(String(init?.body))).toEqual({
          employeeCode: "MESERO-7",
          pin: "4821",
        });
        return Response.json({
          sessionToken: "local-session",
          branchId: "branch_1",
          staffId: "staff_7",
        });
      },
    })).resolves.toMatchObject({ sessionToken: "local-session" });
    expect(requests).toEqual([
      "GET https://edge.local:3443/identity",
      "POST https://edge.local:3443/access/pin",
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { v3WorkspaceApps } from "../packages/config/src/index";

vi.mock("@/lib/observability/logger", () => ({
  logEvent: vi.fn(),
}));

vi.mock("@/server/services/health", () => ({
  getLivenessPayload: () => ({
    status: "ok",
    service: "vase-app",
    environment: "test",
    uptimeSeconds: 1,
    timestamp: "2026-06-29T00:00:00.000Z",
  }),
  getReadinessPayload: async () => ({
    status: "ok",
    service: "vase-app",
    environment: "test",
    uptimeSeconds: 1,
    timestamp: "2026-06-29T00:00:00.000Z",
    checks: { database: "vase-db" },
    latencyMs: 1,
  }),
}));

import * as adminInternalHealth from "../apps/vase-admin/app/api/internal/admin/health/route";
import * as adminLive from "../apps/vase-admin/app/api/health/live/route";
import * as adminReady from "../apps/vase-admin/app/api/health/ready/route";
import * as appInternalHealth from "../apps/vase-app/src/app/api/internal/admin/health/route";
import * as appLive from "../apps/vase-app/src/app/api/health/live/route";
import * as appReady from "../apps/vase-app/src/app/api/health/ready/route";
import * as businessInternalHealth from "../apps/vase-business/app/api/internal/admin/health/route";
import * as businessLive from "../apps/vase-business/app/api/health/live/route";
import * as businessReady from "../apps/vase-business/app/api/health/ready/route";
import * as helpInternalHealth from "../apps/vase-help/app/api/internal/admin/health/route";
import * as helpLive from "../apps/vase-help/app/api/health/live/route";
import * as helpReady from "../apps/vase-help/app/api/health/ready/route";
import * as labsInternalHealth from "../apps/vase-labs/app/api/internal/admin/health/route";
import * as labsLive from "../apps/vase-labs/app/api/health/live/route";
import * as labsReady from "../apps/vase-labs/app/api/health/ready/route";
import * as managementInternalHealth from "../apps/vase-management/app/api/internal/admin/health/route";
import * as managementLive from "../apps/vase-management/app/api/health/live/route";
import * as managementReady from "../apps/vase-management/app/api/health/ready/route";
import * as portalInternalHealth from "../apps/vase-portal/app/api/internal/admin/health/route";
import * as portalLive from "../apps/vase-portal/app/api/health/live/route";
import * as portalReady from "../apps/vase-portal/app/api/health/ready/route";
import * as workplaceInternalHealth from "../apps/vase-workplace/app/api/internal/admin/health/route";
import * as workplaceLive from "../apps/vase-workplace/app/api/health/live/route";
import * as workplaceReady from "../apps/vase-workplace/app/api/health/ready/route";

const routes = {
  "vase-admin": { live: adminLive, ready: adminReady, internal: adminInternalHealth },
  "vase-app": { live: appLive, ready: appReady, internal: appInternalHealth },
  "vase-business": { live: businessLive, ready: businessReady, internal: businessInternalHealth },
  "vase-help": { live: helpLive, ready: helpReady, internal: helpInternalHealth },
  "vase-labs": { live: labsLive, ready: labsReady, internal: labsInternalHealth },
  "vase-management": { live: managementLive, ready: managementReady, internal: managementInternalHealth },
  "vase-portal": { live: portalLive, ready: portalReady, internal: portalInternalHealth },
  "vase-workplace": { live: workplaceLive, ready: workplaceReady, internal: workplaceInternalHealth },
};

describe("V3 health routes", () => {
  it("serves live and ready probes for every app", async () => {
    for (const app of v3WorkspaceApps) {
      const route = routes[app.key];
      const liveResponse = await route.live.GET();
      const readyResponse = await route.ready.GET();
      const livePayload = await liveResponse.json();
      const readyPayload = await readyResponse.json();

      expect(liveResponse.status, `${app.key} live status`).toBe(200);
      expect(readyResponse.status, `${app.key} ready status`).toBe(200);
      expect(livePayload.service).toBe(app.key);
      expect(readyPayload.service).toBe(app.key);
      expect(readyPayload.checks.database).toBe(app.databaseService);
    }
  });

  it("protects internal admin health with SERVICE_TO_SERVICE_TOKEN", async () => {
    const previousToken = process.env.SERVICE_TO_SERVICE_TOKEN;
    process.env.SERVICE_TO_SERVICE_TOKEN = "test-service-token";

    try {
      for (const app of v3WorkspaceApps) {
        const route = routes[app.key];
        const forbidden = await route.internal.GET(new Request(`https://${app.domain}/internal/admin/health`));
        const allowed = await route.internal.GET(
          new Request(`https://${app.domain}/internal/admin/health`, {
            headers: { authorization: "Bearer test-service-token" },
          }),
        );

        expect(forbidden.status, `${app.key} forbidden internal health`).toBe(403);
        expect(allowed.status, `${app.key} allowed internal health`).toBe(200);
        expect((await allowed.json()).service).toBe(app.key);
      }
    } finally {
      if (previousToken === undefined) {
        delete process.env.SERVICE_TO_SERVICE_TOKEN;
      } else {
        process.env.SERVICE_TO_SERVICE_TOKEN = previousToken;
      }
    }
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs standalone owner experience", () => {
  it("serves the owner Labs dashboard from the standalone Labs app", () => {
    const page = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/page.tsx"),
      "utf8",
    );
    const styles = fs.readFileSync(
      path.resolve("apps/vase-labs/app/globals.css"),
      "utf8",
    );

    expect(page).toContain("resolveLabsRequestContext");
    expect(page).toContain("labsPrisma");
    expect(page).toContain("owner-labs-shell");
    expect(styles).toContain(".owner-labs-shell");
    expect(styles).toContain(".owner-labs-sidebar");
  });

  it("keeps old channel entrypoints pointed at the owner Labs dashboard", () => {
    const labsChannelsPage = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/channels/page.tsx"),
      "utf8",
    );
    const appChannelsPage = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/(platform)/app/channels/page.tsx"),
      "utf8",
    );
    const oauthCallback = fs.readFileSync(
      path.resolve("apps/vase-labs/app/api/v1/meta/oauth/callback/route.ts"),
      "utf8",
    );

    expect(labsChannelsPage).toContain('redirect("/app/owner/labs")');
    expect(appChannelsPage).toContain('new URL("/app/owner/labs", productOrigins.labs)');
    expect(oauthCallback).toContain('new URL("/app/owner/labs", url.origin)');
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Labs channels standalone cutover", () => {
  it("redirects both App channel entrypoints to the standalone Labs service", () => {
    const legacy = readFileSync(
      "apps/vase-app/src/app/(platform)/app/owner/labs/(advanced)/integrations/page.tsx",
      "utf8",
    );
    const launch = readFileSync(
      "apps/vase-app/src/app/(platform)/app/channels/page.tsx",
      "utf8",
    );

    expect(legacy).toContain('"/app/channels"');
    expect(legacy).toContain("productOrigins.labs");
    expect(launch).toContain('"/app/channels"');
    expect(launch).toContain("productOrigins.labs");
    expect(legacy).not.toContain("ChannelsWorkbench");
  });
});

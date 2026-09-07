import { afterEach, describe, expect, it } from "vitest";
import {
  buildManagementSsoUrl,
  resolveManagementOrigin,
} from "@/lib/management/links";

const originalManagementPublicUrl = process.env.MANAGEMENT_PUBLIC_URL;
const originalManagementInternalUrl = process.env.MANAGEMENT_INTERNAL_URL;

afterEach(() => {
  if (originalManagementPublicUrl === undefined) {
    delete process.env.MANAGEMENT_PUBLIC_URL;
  } else {
    process.env.MANAGEMENT_PUBLIC_URL = originalManagementPublicUrl;
  }

  if (originalManagementInternalUrl === undefined) {
    delete process.env.MANAGEMENT_INTERNAL_URL;
  } else {
    process.env.MANAGEMENT_INTERNAL_URL = originalManagementInternalUrl;
  }
});

describe("management links", () => {
  it("uses the public Management origin for browser SSO", () => {
    process.env.MANAGEMENT_PUBLIC_URL = "https://management.vase.ar";
    process.env.MANAGEMENT_INTERNAL_URL = "http://vase-management:3006";

    expect(buildManagementSsoUrl("ticket-123").toString()).toBe(
      "https://management.vase.ar/auth/sso?ticket=ticket-123",
    );
  });

  it("keeps the Docker origin for server-to-server calls", () => {
    process.env.MANAGEMENT_PUBLIC_URL = "https://management.vase.ar";
    process.env.MANAGEMENT_INTERNAL_URL = "http://vase-management:3006";

    expect(resolveManagementOrigin()).toBe("http://vase-management:3006");
  });

  it("uses the public URL fallback when no public URL is configured", () => {
    delete process.env.MANAGEMENT_PUBLIC_URL;
    process.env.MANAGEMENT_INTERNAL_URL = "http://vase-management:3006";

    expect(buildManagementSsoUrl("ticket-123").origin).toBe(
      "https://management.vase.ar",
    );
  });
});

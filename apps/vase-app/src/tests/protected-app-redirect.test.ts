import { describe, expect, it } from "vitest";
import {
  getAppIndexRedirectPath,
  getAuthPageRedirectPath,
  getProtectedAppRedirectPath,
} from "@/lib/auth/protected-app-redirect";

describe("protected app redirects", () => {
  it("redirects unauthenticated app requests to signin with the current path", () => {
    expect(
      getProtectedAppRedirectPath({
        pathname: "/app",
        search: "?from=dashboard",
        isSignedIn: false,
        isEmailVerified: false,
      }),
    ).toBe("/signin?redirectTo=%2Fapp%3Ffrom%3Ddashboard");
  });

  it("redirects unverified signed-in users to email verification", () => {
    expect(
      getProtectedAppRedirectPath({
        pathname: "/app/owner",
        search: "",
        isSignedIn: true,
        isEmailVerified: false,
      }),
    ).toBe("/verify-email");
  });

  it("does not redirect users who can access the app", () => {
    expect(
      getProtectedAppRedirectPath({
        pathname: "/app",
        search: "",
        isSignedIn: true,
        isEmailVerified: true,
      }),
    ).toBeNull();
  });

  it("does not bounce signed-in unverified users between signin and app", () => {
    expect(
      getAuthPageRedirectPath({
        pathname: "/signin",
        redirectTo: "/app",
        isSignedIn: true,
        isEmailVerified: false,
      }),
    ).toBe("/verify-email");
  });

  it("redirects verified signed-in users away from signin to the requested app page", () => {
    expect(
      getAuthPageRedirectPath({
        pathname: "/signin",
        redirectTo: "/app/owner",
        isSignedIn: true,
        isEmailVerified: true,
      }),
    ).toBe("/app/owner");
  });

  it("does not send authenticated users without tenant membership back to signin", () => {
    expect(
      getAppIndexRedirectPath({
        platformRole: "USER",
        tenantRole: null,
      }),
    ).toBeNull();
  });

  it("routes authenticated platform and tenant roles from the app index", () => {
    expect(getAppIndexRedirectPath({ platformRole: "SUPER_ADMIN", tenantRole: null })).toBe(
      "/api/admin/launch",
    );
    expect(getAppIndexRedirectPath({ platformRole: "SUPPORT", tenantRole: null })).toBe(
      "/app/support",
    );
    expect(getAppIndexRedirectPath({ platformRole: "DEVELOPER", tenantRole: null })).toBe(
      "/app/developer",
    );
    expect(getAppIndexRedirectPath({ platformRole: "USER", tenantRole: "MANAGER" })).toBe(
      "/app/manager",
    );
    expect(getAppIndexRedirectPath({ platformRole: "USER", tenantRole: "MEMBER" })).toBe(
      "/app/member",
    );
  });
});

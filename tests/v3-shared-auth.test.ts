import { describe, expect, it } from "vitest";
import {
  getCookieValue,
  sharedAuthCookieName,
  sharedAuthCookieDomain,
} from "../packages/auth/src/index";

describe("shared Vase authentication contract", () => {
  it("uses the secure cross-subdomain session cookie", () => {
    expect(sharedAuthCookieName).toBe("__Secure-authjs.session-token");
    expect(sharedAuthCookieDomain).toBe(".vase.ar");
  });

  it("reads an encoded session token without confusing similarly named cookies", () => {
    expect(
      getCookieValue(
        "theme=dark; __Secure-authjs.session-token=header.payload.signature; authjs.session-token=wrong",
        sharedAuthCookieName,
      ),
    ).toBe("header.payload.signature");
  });
});

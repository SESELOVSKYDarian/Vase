import { NextResponse } from "next/server";
import { localAuthCookieName, sharedAuthCookieDomain, sharedAuthCookieName } from "@vase/auth";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("https://app.vase.ar/signin", request.url));
  const expires = new Date(0);
  const sharedCookie = { expires, httpOnly: true, path: "/", sameSite: "lax" as const, secure: true };
  response.cookies.set({ ...sharedCookie, name: sharedAuthCookieName, value: "", domain: sharedAuthCookieDomain });
  response.cookies.set({ ...sharedCookie, name: localAuthCookieName, value: "" });
  return response;
}

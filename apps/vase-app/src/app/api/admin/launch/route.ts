import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";

export async function GET(request: Request) {
  try {
    await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    const signIn = new URL("/signin", process.env.NEXT_PUBLIC_APP_URL ?? request.url);
    signIn.searchParams.set("redirectTo", process.env.VASE_ADMIN_PUBLIC_URL ?? "https://admin.vase.ar");
    return NextResponse.redirect(signIn);
  }

  return NextResponse.redirect(
    new URL(process.env.VASE_ADMIN_PUBLIC_URL ?? "https://admin.vase.ar"),
  );
}

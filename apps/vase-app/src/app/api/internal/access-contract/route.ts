import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCanonicalAccessContract } from "@/server/queries/access-contract";

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedUser();
    const { searchParams } = new URL(request.url);
    const tenantId = String(searchParams.get("tenantId") ?? "").trim();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const contract = await getCanonicalAccessContract({
      userId: session.user.id,
      tenantId,
    });
    if (!contract) {
      return NextResponse.json({ error: "membership_not_found" }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}


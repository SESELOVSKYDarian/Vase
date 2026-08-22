import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";
import { normalizeTrainerPhone } from "../../../../../lib/knowledge-trainer";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

export async function POST(request: Request) {
  try {
    const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const phone = normalizeTrainerPhone(String(body.phone ?? ""));
    if (!label) return NextResponse.json({ error: "TRAINER_LABEL_REQUIRED" }, { status: 400 });
    const trainerPhone = await labsPrisma.trainerPhone.create({ data: { globalTenantId: resolved.context.globalTenantId, label, phone } });
    return NextResponse.json({ trainerPhone }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "TRAINER_PHONE_CREATE_FAILED" }, { status: 400 }); }
}

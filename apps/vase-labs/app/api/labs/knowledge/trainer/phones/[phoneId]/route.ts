import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../lib/request-context";

export async function PATCH(request: Request, { params }: { params: Promise<{ phoneId: string }> }) {
  const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
  const { phoneId } = await params;
  const body = await request.json();
  const updated = await labsPrisma.trainerPhone.updateMany({ where: { id: phoneId, globalTenantId: resolved.context.globalTenantId }, data: { active: body.active === true } });
  if (!updated.count) return NextResponse.json({ error: "TRAINER_PHONE_NOT_FOUND" }, { status: 404 });
  if (body.active !== true) await labsPrisma.knowledgeChangeProposal.updateMany({ where: { trainerPhoneId: phoneId, globalTenantId: resolved.context.globalTenantId, status: "PENDING" }, data: { status: "REVOKED" } });
  return NextResponse.json({ ok: true });
}

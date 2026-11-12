import { NextResponse } from "next/server";
import { changeBusinessProfile, type BusinessProfileChange } from "../../../lib/business-profile";
import { resolveLabsRequestContext } from "../../../lib/request-context";

const CONTACT_FIELDS = ["tagline", "phone", "whatsapp", "email", "website", "hours"] as const;

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Solo desde la misma página de Labs: un formulario de otro sitio no puede cambiar Mi negocio. */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

function parseChange(body: Record<string, unknown>): BusinessProfileChange | null {
  const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
  if (body.action === "contact") {
    return { action: "contact", data: Object.fromEntries(CONTACT_FIELDS.map((field) => [field, str(data[field], 300)])) };
  }
  if (body.action === "saveBranch") {
    return {
      action: "saveBranch",
      data: {
        id: typeof data.id === "string" && data.id ? data.id.slice(0, 40) : undefined,
        name: str(data.name, 200),
        address: str(data.address, 300),
        phone: str(data.phone, 80),
        hours: str(data.hours, 200),
        isMain: data.isMain === true,
      },
    };
  }
  if (body.action === "deleteBranch" && typeof data.id === "string" && data.id) {
    return { action: "deleteBranch", data: { id: data.id.slice(0, 40) } };
  }
  return null;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  try {
    const { session, context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const change = body ? parseChange(body) : null;
    if (!change) return NextResponse.json({ ok: false, message: "Revisá los datos." }, { status: 400 });
    const result = await changeBusinessProfile(context.globalTenantId, session.globalUserId, change);
    return NextResponse.json({ ok: result.ok, message: result.message }, { status: result.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("LABS_SESSION")) return NextResponse.json({ ok: false, message: "Volvé a iniciar sesión." }, { status: 401 });
    return NextResponse.json({ ok: false, message: "No pudimos guardar. Probá de nuevo." }, { status: 500 });
  }
}

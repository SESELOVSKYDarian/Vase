import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { contactInquirySchema } from "@/lib/validators/contact";
import { deliverPortalContactInquiry } from "@/server/services/portal-content";

function authorize(request: Request) {
  assertServiceToken(
    request.headers.get("authorization"),
    process.env.SERVICE_TO_SERVICE_TOKEN,
  );
}

function authorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : "FORBIDDEN";
  return NextResponse.json(
    { error: message.toLowerCase() },
    { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
  );
}

export async function POST(request: Request) {
  try {
    authorize(request);
  } catch (error) {
    return authorizationError(error);
  }

  const body = await request.json().catch(() => null);
  const parsed = contactInquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await deliverPortalContactInquiry(parsed.data, {
      ipAddress: request.headers.get("x-vase-client-ip") ?? "unknown",
      userAgent: request.headers.get("x-vase-client-user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CONTACT_FAILED";

    if (message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: "rate_limit_exceeded" },
        { status: 429 },
      );
    }

    if (message === "CONTACT_EMAIL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "contact_email_not_configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "contact_failed" }, { status: 500 });
  }
}

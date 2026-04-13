import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    const requestContext = await getRequestContext();

    await enforceRateLimit({
      scope: "auth:register:transcribe",
      key: requestContext.ipAddress,
      limit: 8,
      windowSeconds: 60 * 10,
    });

    const formData = await request.formData();
    const file = formData.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "AUDIO_REQUIRED" }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: "BROWSER_TRANSCRIPTION_ONLY",
        message:
          "La transcripcion del registro ahora se hace gratis desde el navegador y no desde el servidor.",
      },
      { status: 410 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "RATE_LIMIT_EXCEEDED" ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

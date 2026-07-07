import { NextResponse } from "next/server";
import { listRedactedOfficialChannels } from "../../../lib/channel-queries";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { assistant } = await resolveLabsRequestContext(
      request.headers.get("cookie"),
    );
    return NextResponse.json({
      channels: await listRedactedOfficialChannels(labsPrisma, assistant.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_LIST_FAILED";
    return NextResponse.json(
      { error: message },
      { status: message.includes("SESSION") ? 401 : 500 },
    );
  }
}

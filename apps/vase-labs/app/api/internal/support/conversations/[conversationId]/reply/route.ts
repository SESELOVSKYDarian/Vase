import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import {
  createInboxReplyHandler,
  inboxReplyDeliveryDependencies,
} from "../../../../../v1/inbox/[tenantSlug]/conversations/[conversationId]/reply/route";
import { vaseSupportTenantId } from "../../../../../../lib/vase-support-bridge";

const SUPPORT_SLUG = "vase-support";

/** app.vase.ar (Workspace) le responde a un cliente en su conversación de WhatsApp con Vase. */
export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const globalTenantId = vaseSupportTenantId();
  if (!globalTenantId) return NextResponse.json({ error: "VASE_SUPPORT_LABS_TENANT_ID_MISSING" }, { status: 503 });

  const { conversationId } = await params;
  const handler = createInboxReplyHandler({
    ...inboxReplyDeliveryDependencies,
    async resolveContext() {
      return { context: { tenantSlug: SUPPORT_SLUG, globalTenantId } };
    },
  });
  return handler(request, { params: Promise.resolve({ tenantSlug: SUPPORT_SLUG, conversationId }) });
}

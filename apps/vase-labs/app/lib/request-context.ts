import { labsPrisma } from "./db";
import { createLabsContextClient } from "./app-session-context";
import { getDefaultOpenAiModel } from "./openai-reply-generator";
import { readSharedLabsSession } from "./shared-session";

export async function resolveLabsRequestContext(cookieHeader: string | null) {
  const session = await readSharedLabsSession({
    cookieHeader,
    secret: process.env.AUTH_SECRET,
  });
  const appInternalUrl =
    process.env.APP_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://app-vase:3002";
  const context = await createLabsContextClient({
    appInternalUrl,
    serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
  }).resolve({
    globalUserId: session.globalUserId,
  });

  const assistant = await labsPrisma.assistant.upsert({
    where: { tenantSlug: context.tenantSlug },
    create: {
      globalTenantId: context.globalTenantId,
      tenantSlug: context.tenantSlug,
      name: `${context.tenantName} Assistant`,
      model: getDefaultOpenAiModel(),
    },
    update: {
      globalTenantId: context.globalTenantId,
      name: `${context.tenantName} Assistant`,
    },
  });

  return {
    session,
    context,
    assistant,
  };
}

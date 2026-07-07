import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function readProvider(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const provider = (config as Record<string, unknown>).provider;
  return typeof provider === "string" ? provider : null;
}

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );

    const channels = await prisma.aiChannelConnection.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        globalTenantId: channel.tenant.id,
        tenantSlug: channel.tenant.slug,
        type: channel.channelType,
        provider: readProvider(channel.config),
        accountLabel: channel.accountLabel,
        externalHandle: channel.externalHandle,
        providerAccountId: channel.providerAccountId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_EXPORT_FAILED";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

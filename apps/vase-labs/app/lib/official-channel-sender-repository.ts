import type { PrismaClient } from "./db";
import type { LabsChannel } from "@vase/contracts";
import type {
  OfficialChannelDeliveryContext,
  OfficialChannelSenderRepository,
} from "./official-channel-sender";

export class PrismaOfficialChannelSenderRepository
  implements OfficialChannelSenderRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findDeliveryContext(input: {
    globalTenantId: string;
    channelId?: string;
    channelType: LabsChannel;
  }): Promise<OfficialChannelDeliveryContext | null> {
    const channel = await (this.prisma as any).channel.findFirst({
      where: {
        ...(input.channelId ? { id: input.channelId } : {}),
        type: input.channelType,
        provider: "META_OFFICIAL",
        status: "CONNECTED",
        providerAccountId: { not: null },
        assistant: {
          globalTenantId: input.globalTenantId,
        },
        secrets: {
          some: { kind: "META_ACCESS_TOKEN" },
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        secrets: {
          where: { kind: "META_ACCESS_TOKEN" },
          take: 1,
        },
      },
    });

    if (!channel?.providerAccountId || !channel.secrets[0]?.encryptedValue) {
      return null;
    }

    return {
      channelType: channel.type,
      providerAccountId: channel.providerAccountId,
      encryptedAccessToken: channel.secrets[0].encryptedValue,
    };
  }
}

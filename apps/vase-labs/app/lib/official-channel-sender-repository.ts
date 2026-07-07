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
    channelType: LabsChannel;
  }): Promise<OfficialChannelDeliveryContext | null> {
    const rows = await this.prisma.$queryRaw<OfficialChannelDeliveryContext[]>`
      SELECT
        c.type AS "channelType",
        c."providerAccountId",
        s."encryptedValue" AS "encryptedAccessToken"
      FROM "Channel" c
      JOIN "Assistant" a ON a.id = c."assistantId"
      JOIN "ChannelSecret" s ON s."channelId" = c.id
      WHERE a."globalTenantId" = ${input.globalTenantId}
        AND c.type = CAST(${input.channelType} AS "LabsChannel")
        AND c.provider = 'META_OFFICIAL'
        AND c.status = 'CONNECTED'
        AND c."providerAccountId" IS NOT NULL
        AND s.kind = 'META_ACCESS_TOKEN'
      ORDER BY c."updatedAt" DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }
}

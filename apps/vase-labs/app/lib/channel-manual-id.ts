import { createHash } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";

export function getManualChannelId(assistantId: string, channelType: LabsChannel) {
  const digest = createHash("sha256").update(`${assistantId}\0${channelType}`).digest("hex").slice(0, 32);
  return `manual_${digest}`;
}

export async function disconnectMetaChannel(input: {
  assistantId: string;
  channelId: string;
  repository: {
    exists(assistantId: string, channelId: string): Promise<boolean>;
    clear(assistantId: string, channelId: string): Promise<void>;
  };
}) {
  if (!await input.repository.exists(input.assistantId, input.channelId)) throw new Error("CHANNEL_NOT_FOUND");
  await input.repository.clear(input.assistantId, input.channelId);
  return { ok: true as const };
}

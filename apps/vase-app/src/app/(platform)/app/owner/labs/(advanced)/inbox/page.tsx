import { ConversationsInbox } from "@/components/labs/conversations-inbox";
import { LabsPageHeader } from "@/components/labs/labs-ui";
import { serializeLabsInboxConversations } from "@/server/services/labs-inbox";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsInboxPage({
  searchParams,
}: {
  searchParams?: { conversationId?: string };
}) {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Atencion en vivo"
        title="Inbox"
        description="Supervisa conversaciones de IA, toma control humano y vuelve al asistente cuando el caso este resuelto."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <ConversationsInbox
          conversations={serializeLabsInboxConversations(dashboard.conversations)}
          initialConversationId={searchParams?.conversationId ?? null}
        />
      )}
    </div>
  );
}

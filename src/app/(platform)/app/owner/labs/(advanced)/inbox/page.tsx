import { ConversationsInbox } from "@/components/labs/conversations-inbox";
import { PanelCard } from "@/components/ui/panel-card";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsInboxPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Inbox</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Vista estilo Chatwoot para ver conversaciones de IA e intervenir como humano en tiempo real.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <PanelCard
          eyebrow="Conversaciones"
          title="Intervencion humana en ambos providers"
          description="Disponible tanto para Meta oficial como para OpenWA no oficial."
        >
          <ConversationsInbox
            conversations={dashboard.conversations.map((conversation) => {
              const metadata = readConversationMetadata(conversation.metadata);
              return {
                id: conversation.id,
                customerName: conversation.customerName,
                customerContact: conversation.customerContact,
                channelType: conversation.channelType,
                status: conversation.status,
                transcript: metadata.transcript,
                aiPaused: Boolean(metadata.context?.aiPaused),
              };
            })}
          />
        </PanelCard>
      )}
    </div>
  );
}

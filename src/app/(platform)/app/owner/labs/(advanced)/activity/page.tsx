import { ConversationActivityBoard } from "@/components/labs/conversation-activity-board";
import { LabsPageHeader } from "@/components/labs/labs-ui";
import { buildLabsConversationAnalytics } from "@/server/services/labs-analytics";
import { serializeLabsConversationActivity } from "@/server/services/labs-activity";
import { getLabsOwnerActivityData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsActivityPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerActivityData();
  const conversations = serializeLabsConversationActivity(dashboard.conversations);
  const analytics = buildLabsConversationAnalytics(dashboard.conversations);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Inteligencia conversacional"
        title="Actividad"
        description="Filtra conversaciones por intencion, canal, derivacion humana y señales comerciales."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <ConversationActivityBoard conversations={conversations} analytics={analytics} />
      )}
    </div>
  );
}

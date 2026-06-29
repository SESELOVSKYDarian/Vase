export type ShellNotificationTone = "info" | "warning" | "danger";
export type ShellNotificationCategory = "platform" | "business" | "labs" | "billing";
export type ShellNotificationType =
  | "platform_update"
  | "admin_notification"
  | "system_hint"
  | "labs_system";

export type ShellNotification = {
  id: string;
  title: string;
  description: string;
  href: string | null;
  tone: ShellNotificationTone;
  category: ShellNotificationCategory;
  sourceLabel: "Vase" | "Vase Business" | "Vase Labs" | "Billing";
  createdAt: Date;
  isPlatformUpdate?: boolean;
  isRead?: boolean;
  notificationType: ShellNotificationType;
};

type LabsConversationNotificationInput = {
  id: string;
  customerName: string | null;
  customerContact: string | null;
  channelType: string;
  summary: string | null;
  intentLabel: string | null;
  escalatedToHuman: boolean;
  lastMessageAt: Date;
};

type LabsChannelNotificationInput = {
  id: string;
  channelType: string;
  accountLabel: string;
  status: string;
  updatedAt: Date;
};

type LabsTrainingNotificationInput = {
  id: string;
  status: string;
  summary: string | null;
  updatedAt: Date;
};

export function buildNotificationReadKey(notificationType: ShellNotificationType, notificationId: string) {
  return `${notificationType}:${notificationId}`;
}

function customerLabel(conversation: LabsConversationNotificationInput) {
  return conversation.customerName?.trim() || conversation.customerContact?.trim() || "Un cliente";
}

function truncateDescription(input: string | null | undefined, fallback: string) {
  const value = input?.trim() || fallback;
  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

function withReadState(notification: ShellNotification, readKeys: Set<string>): ShellNotification {
  return {
    ...notification,
    isRead: readKeys.has(notification.id) || readKeys.has(buildNotificationReadKey(notification.notificationType, notification.id)),
  };
}

export function buildLabsSystemNotifications(input: {
  tenantId: string;
  conversations: LabsConversationNotificationInput[];
  channels: LabsChannelNotificationInput[];
  trainingJobs: LabsTrainingNotificationInput[];
  readKeys: Set<string>;
}): ShellNotification[] {
  const notifications: ShellNotification[] = [];

  for (const conversation of input.conversations) {
    const href = `/app/owner/labs/inbox?conversationId=${encodeURIComponent(conversation.id)}`;

    if (conversation.intentLabel === "HOT_LEAD") {
      notifications.push({
        id: `labs:hot-lead:${conversation.id}`,
        title: `${customerLabel(conversation)} es hot lead`,
        description: truncateDescription(conversation.summary, `Detectamos una intencion alta desde ${conversation.channelType}.`),
        href,
        tone: "info",
        category: "labs",
        sourceLabel: "Vase Labs",
        createdAt: conversation.lastMessageAt,
        notificationType: "labs_system",
      });
    }

    if (conversation.escalatedToHuman) {
      notifications.push({
        id: `labs:human-attention:${conversation.id}`,
        title: `${customerLabel(conversation)} pidio atencion humana`,
        description: truncateDescription(conversation.summary, `Hay una conversacion de ${conversation.channelType} esperando respuesta humana.`),
        href,
        tone: "warning",
        category: "labs",
        sourceLabel: "Vase Labs",
        createdAt: conversation.lastMessageAt,
        notificationType: "labs_system",
      });
    }
  }

  for (const channel of input.channels) {
    if (channel.status === "ERROR") {
      notifications.push({
        id: `labs:channel-error:${channel.id}`,
        title: `${channel.accountLabel} necesita revision`,
        description: `El canal ${channel.channelType} esta en error. Revisalo para no perder conversaciones.`,
        href: "/app/owner/labs/integrations",
        tone: "danger",
        category: "labs",
        sourceLabel: "Vase Labs",
        createdAt: channel.updatedAt,
        notificationType: "labs_system",
      });
    }

    if (channel.status === "PENDING") {
      notifications.push({
        id: `labs:channel-pending:${channel.id}`,
        title: `${channel.accountLabel} sigue pendiente`,
        description: `Termina la conexion de ${channel.channelType} para empezar a recibir mensajes.`,
        href: "/app/owner/labs/integrations",
        tone: "warning",
        category: "labs",
        sourceLabel: "Vase Labs",
        createdAt: channel.updatedAt,
        notificationType: "labs_system",
      });
    }
  }

  for (const job of input.trainingJobs) {
    if (job.status !== "FAILED") continue;

    notifications.push({
      id: `labs:training-failed:${job.id}`,
      title: "Un entrenamiento de IA fallo",
      description: truncateDescription(job.summary, "Revisa la base de conocimiento y vuelve a lanzar el entrenamiento."),
      href: "/app/owner/labs/chatbots",
      tone: "danger",
      category: "labs",
      sourceLabel: "Vase Labs",
      createdAt: job.updatedAt,
      notificationType: "labs_system",
    });
  }

  return notifications
    .map((notification) => withReadState(notification, input.readKeys))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

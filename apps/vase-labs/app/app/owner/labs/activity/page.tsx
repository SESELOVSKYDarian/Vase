import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader } from "../labs-ui";
import ActivityWorkspace, {
  ACTIVITY_INTENT_LABELS,
  type ActivityIntentFilter,
  type ActivitySort,
} from "./activity-workspace";

export const dynamic = "force-dynamic";

export type ActivitySearchParams = {
  intent?: string | string[];
  sort?: string | string[];
  channel?: string | string[];
};

type ActivityControls = {
  intent: ActivityIntentFilter;
  sort: ActivitySort;
  channel?: ActivityChannelFilter;
};

export type ActivityChannelFilter = "all" | "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
const ACTIVITY_CHANNELS = new Set<ActivityChannelFilter>(["all", "WHATSAPP", "INSTAGRAM", "FACEBOOK"]);

const ACTIVE_HANDOFF_FILTER = { status: { in: ["PENDING", "ASSIGNED"] } };

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeActivitySearchParams(
  searchParams: ActivitySearchParams,
): ActivityControls {
  const requestedIntent = firstSearchParam(searchParams.intent);
  const intent = requestedIntent && requestedIntent in ACTIVITY_INTENT_LABELS
    ? requestedIntent as ActivityIntentFilter
    : "all";
  const sort = firstSearchParam(searchParams.sort) === "score" ? "score" : "latest";
  const requestedChannel = firstSearchParam(searchParams.channel) as ActivityChannelFilter | undefined;
  const channel = requestedChannel && ACTIVITY_CHANNELS.has(requestedChannel) ? requestedChannel : "all";
  return { intent, sort, channel };
}

export function buildActivityConversationQuery(
  assistantId: string,
  controls: ActivityControls,
) {
  const baseWhere = controls.channel && controls.channel !== "all"
    ? { assistantId, channel: controls.channel }
    : { assistantId };
  const baseQuery = {
    where: baseWhere,
    take: 40,
    include: {
      insight: true,
      analysisJob: {
        select: {
          status: true,
          updatedAt: true,
        },
      },
      handoffs: {
        where: ACTIVE_HANDOFF_FILTER,
        select: { id: true },
        take: 1,
      },
      messages: {
        orderBy: { createdAt: "desc" as const },
        take: 2,
        select: {
          id: true,
          role: true,
          direction: true,
          content: true,
          createdAt: true,
        },
      },
    },
  };
  const orderBy = controls.sort === "score"
    ? [
      { insight: { leadScore: "desc" as const } },
      { intentScore: "desc" as const },
      { lastMessageAt: "desc" as const },
    ]
    : [{ lastMessageAt: "desc" as const }];

  if (controls.intent === "all") return { ...baseQuery, orderBy };

  const classificationFilter = {
    OR: [
      { insight: { is: { intentLabel: controls.intent } } },
      {
        insight: { is: null },
        intentLabel: controls.intent,
      },
    ],
  };
  if (controls.intent === "HUMAN_REQUESTED") {
    return {
      ...baseQuery,
      where: {
        ...baseWhere,
        OR: [
          { escalatedToHuman: true },
          { status: "ESCALATED" as const },
          { handoffs: { some: ACTIVE_HANDOFF_FILTER } },
          ...classificationFilter.OR,
        ],
      },
      orderBy,
    };
  }

  return {
    ...baseQuery,
    where: {
      ...baseWhere,
      AND: [
        { escalatedToHuman: false },
        { status: { not: "ESCALATED" as const } },
        { handoffs: { none: ACTIVE_HANDOFF_FILTER } },
        classificationFilter,
      ],
    },
    orderBy,
  };
}

async function getActivityData(controls: ActivityControls) {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const conversations = await labsPrisma.conversation.findMany(
      buildActivityConversationQuery(resolved.assistant.id, controls),
    );
    return { conversations };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Factivity");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  const controls = sanitizeActivitySearchParams(await searchParams);
  const data = await getActivityData(controls);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Actividad"
        title="Inteligencia comercial"
        description="Priorizá oportunidades por intención y score, entendé qué necesita cada persona y avanzá con una próxima acción concreta."
      />
      <ActivityWorkspace
        conversations={data.conversations}
        activeIntent={controls.intent}
        activeSort={controls.sort}
        activeChannel={controls.channel ?? "all"}
      />
    </div>
  );
}

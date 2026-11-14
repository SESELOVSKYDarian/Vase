"use server";

// Parte de actions.ts: addMeetingDecisionV2WithStateAction.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminMeetingsActionState, addMeetingDecisionSchema } from "./create-meeting-schema";

export async function addMeetingDecisionV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = addMeetingDecisionSchema.safeParse({
      meetingId: formData.get("meetingId"),
      description: sanitizeText(String(formData.get("description") ?? "")),
    });
    if (!parsed.success) return { error: "No pudimos guardar la decisión." };

    const decision = await (prisma as unknown as {
      meetingDecisionV2: {
        create: (args: { data: { meetingId: string; description: string } }) => Promise<{ id: string }>;
      };
    }).meetingDecisionV2.create({
      data: {
        meetingId: parsed.data.meetingId,
        description: parsed.data.description,
      },
    });

    await createAuditLog({
      action: "platform.meeting_decision_created",
      targetType: "meeting_decision_v2",
      targetId: decision.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    revalidatePath("/app/admin/meetings");
    return { success: "Decisión agregada." };
  } catch {
    return { error: "No pudimos guardar la decisión." };
  }
}

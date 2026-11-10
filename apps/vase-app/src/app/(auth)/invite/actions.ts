"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { resetPasswordSchema } from "@/lib/validators/auth";
import {
  acceptInvitationAsExistingUser,
  acceptInvitationAsNewUser,
  findValidInvitation,
} from "@/server/services/team-invitations";

export type InviteActionState = { error?: string };

const nameSchema = z.string().trim().min(2).max(120);
const INVALID_INVITE = "La invitación no es válida o ya venció.";

async function limit(key: string) {
  const { ipAddress } = await getRequestContext();
  await enforceRateLimit({ scope: "team:accept", key: `${ipAddress}:${key}`, limit: 10, windowSeconds: 60 * 15 });
}

export async function acceptInviteNewUserAction(_: InviteActionState, formData: FormData): Promise<InviteActionState> {
  const token = String(formData.get("token") ?? "");
  const name = nameSchema.safeParse(sanitizeText(String(formData.get("name") ?? "")));
  const password = resetPasswordSchema.safeParse({
    token,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!name.success) return { error: "Escribí tu nombre." };
  if (!password.success) return { error: password.error.issues[0]?.message ?? "Revisá la contraseña." };

  try {
    await limit("new");
    const invitation = await findValidInvitation(token);
    if (!invitation) return { error: INVALID_INVITE };
    await acceptInvitationAsNewUser(invitation, name.data, password.data.password);
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_FULL") {
      return { error: "Este equipo ya no tiene lugares libres. Avisale a quien te invitó." };
    }
    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      return { error: "Ese correo ya tiene cuenta. Iniciá sesión para aceptar." };
    }
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return { error: "Hiciste muchos intentos. Probá en unos minutos." };
    }
    return { error: INVALID_INVITE };
  }

  redirect("/signin");
}

export async function acceptInviteExistingUserAction(_: InviteActionState, formData: FormData): Promise<InviteActionState> {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Iniciá sesión para aceptar." };

  try {
    await limit(session.user.id);
    const invitation = await findValidInvitation(token);
    if (!invitation) return { error: INVALID_INVITE };
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return { error: "Esta invitación es para otro correo." };
    }
    await acceptInvitationAsExistingUser(invitation, session.user.id);
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_FULL") {
      return { error: "Este equipo ya no tiene lugares libres. Avisale a quien te invitó." };
    }
    if (error instanceof Error && error.message === "USER_ALREADY_IN_TENANT") {
      return { error: "Tu usuario ya pertenece a una cuenta de Vase." };
    }
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return { error: "Hiciste muchos intentos. Probá en unos minutos." };
    }
    return { error: INVALID_INVITE };
  }

  redirect("/app");
}

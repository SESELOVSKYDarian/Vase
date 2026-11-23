"use server";

import { z } from "zod";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { createEmailChangeToken, readEmailChangeToken } from "@/lib/auth/email-change-token";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { resolveAdminHomeUrl } from "@/lib/security/admin-host-routing";
import { getRequestContext } from "@/lib/security/request";
import { createAuditLog } from "@/server/services/audit-log";
import { sendAuthEmail } from "@/server/services/auth-email";

export type AccountEmailState = { ok?: boolean; message?: string };

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribí un correo válido.").max(190),
  password: z.string().min(1, "Escribí tu contraseña actual."),
});

/** Paso 1: el admin pide usar otro correo. Se manda un enlace a la casilla nueva; hasta abrirlo no cambia nada. */
export async function requestAdminEmailChangeAction(_prev: AccountEmailState, formData: FormData): Promise<AccountEmailState> {
  let session;
  try {
    session = await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    return { message: "No tenés permiso para hacer esto." };
  }

  const parsed = requestSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { message: "La contraseña no es correcta." };
  }
  if (parsed.data.email === user.email.toLowerCase()) return { message: "Ese ya es tu correo." };

  const taken = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (taken) return { message: "Ese correo ya lo usa otra cuenta de Vase." };

  const token = createEmailChangeToken(user.id, parsed.data.email);
  const link = new URL("settings/account", resolveAdminHomeUrl());
  link.searchParams.set("confirm", token);

  await sendAuthEmail({
    email: parsed.data.email,
    subject: "Confirmá el correo nuevo de tu cuenta de Vase",
    actionUrl: link.toString(),
    title: "Confirmá tu correo nuevo",
    greeting: `Hola, ${user.name.split(" ")[0] || "equipo"}`,
    paragraphs: [
      `Pediste entrar al Admin de Vase con ${parsed.data.email} en vez de ${user.email}.`,
      "Para terminar el cambio, tocá el botón. Hasta que lo hagas seguís entrando con el correo de siempre.",
    ],
    buttonLabel: "Confirmar el correo nuevo",
    note: "El enlace vence en 1 hora. Si no pediste este cambio, ignorá este correo.",
    reason: "Te llegó porque alguien pidió usar esta dirección en una cuenta de Vase.",
  });

  return { ok: true, message: `Te mandamos un enlace a ${parsed.data.email}. Abrilo desde esa casilla para terminar.` };
}

/** Paso 2: con el enlace abierto y la sesión del mismo admin, se cambia el correo. */
export async function confirmAdminEmailChangeAction(_prev: AccountEmailState, formData: FormData): Promise<AccountEmailState> {
  let session;
  try {
    session = await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    return { message: "Iniciá sesión con tu cuenta de admin y volvé a abrir el enlace." };
  }

  const claims = readEmailChangeToken(String(formData.get("token") ?? ""));
  if (!claims) return { message: "El enlace venció o no es válido. Pedí el cambio de nuevo." };
  if (claims.userId !== session.user.id) return { message: "Este enlace es de otra cuenta." };

  const taken = await prisma.user.findUnique({ where: { email: claims.email }, select: { id: true } });
  if (taken && taken.id !== session.user.id) return { message: "Ese correo ya lo usa otra cuenta de Vase." };

  const before = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: claims.email, emailVerified: new Date() },
  });

  const context = await getRequestContext();
  await createAuditLog({
    action: "admin.account_email_changed",
    targetType: "user",
    targetId: session.user.id,
    actorUserId: session.user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: { from: before?.email ?? null, to: claims.email },
  });

  return { ok: true, message: `Listo. Desde ahora entrás con ${claims.email}.` };
}

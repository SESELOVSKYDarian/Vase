// Parte de auth-onboarding.ts: resendVerificationEmail, verifyEmailToken, requestPasswordReset, createForcedPasswordResetToken, resetPasswordWithToken.
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { consumeAuthToken, issueAuthToken, revokeAuthTokens } from "@/lib/auth/tokens";
import { buildAbsoluteUrl } from "@/lib/security/request";
import { createAuditLog } from "@/server/services/audit-log";
import { sendAuthEmail } from "@/server/services/auth-email";
import { RequestContext, findUserByEmail } from "./validate-sign-in-credentials";

export async function resendVerificationEmail(userId: string, requestContext: RequestContext) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.emailVerified) {
    return { alreadyVerified: true as const };
  }

  await revokeAuthTokens(userId, "EMAIL_VERIFICATION");
  const token = await issueAuthToken(userId, "EMAIL_VERIFICATION");

  await sendAuthEmail({
    email: user.email,
    subject: "Tu nuevo enlace para confirmar el correo",
    actionUrl: buildAbsoluteUrl(`/verify-email?token=${token.token}`, requestContext),
    title: "Confirmá tu correo",
    paragraphs: ["Pediste un enlace nuevo para confirmar tu correo. Tocá el botón y listo."],
    buttonLabel: "Confirmar mi correo",
    note: "Los enlaces anteriores ya no sirven. Este se puede usar una sola vez.",
    reason: "Recibiste este correo porque se pidió confirmar esta dirección en Vase.",
  });

  return { alreadyVerified: false as const };
}

export async function verifyEmailToken(rawToken: string, requestContext: RequestContext) {
  const token = await consumeAuthToken(rawToken, "EMAIL_VERIFICATION");

  if (!token) {
    return { ok: false as const };
  }

  await prisma.user.update({
    where: { id: token.userId },
    data: { emailVerified: new Date() },
  });

  await createAuditLog({
    action: "auth.email_verified",
    targetType: "user",
    targetId: token.userId,
    actorUserId: token.userId,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { ok: true as const, user: token.user };
}

export async function requestPasswordReset(email: string, requestContext: RequestContext) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    return;
  }

  await revokeAuthTokens(user.id, "PASSWORD_RESET");
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");

  await sendAuthEmail({
    email,
    subject: "Cambiá tu contraseña de Vase",
    actionUrl: buildAbsoluteUrl(`/reset-password?token=${token.token}`, requestContext),
    title: "Creá una contraseña nueva",
    paragraphs: ["Recibimos un pedido para cambiar la contraseña de tu cuenta. Tocá el botón para elegir una nueva."],
    buttonLabel: "Cambiar contraseña",
    note: "El enlace vence pronto y se puede usar una sola vez. Si no lo pediste vos, ignorá este correo: tu contraseña sigue igual.",
    reason: "Recibiste este correo porque se pidió cambiar la contraseña de esta cuenta de Vase.",
  });

  await createAuditLog({
    action: "auth.password_reset_requested",
    targetType: "user",
    targetId: user.id,
    actorUserId: user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });
}

export async function createForcedPasswordResetToken(
  userId: string,
  requestContext: RequestContext,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  await revokeAuthTokens(user.id, "PASSWORD_RESET");
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");

  await createAuditLog({
    action: "auth.password_reset_forced_login",
    targetType: "user",
    targetId: user.id,
    actorUserId: user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return token.token;
}

export async function resetPasswordWithToken(
  rawToken: string,
  password: string,
  requestContext: RequestContext,
) {
  const token = await consumeAuthToken(rawToken, "PASSWORD_RESET");

  if (!token) {
    return { ok: false as const };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: token.userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      forcePasswordChange: false,
      tempPasswordIssuedAt: null,
    },
  });

  await prisma.session.deleteMany({
    where: { userId: token.userId },
  });

  await revokeAuthTokens(token.userId, "PASSWORD_RESET");

  await createAuditLog({
    action: "auth.password_reset_completed",
    targetType: "user",
    targetId: token.userId,
    actorUserId: token.userId,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { ok: true as const, user: token.user };
}

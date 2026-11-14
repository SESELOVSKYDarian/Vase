// Parte de auth-onboarding.ts: RequestContext, AUTO_LOCK_REASON, AUTO_LOCK_WINDOW_MS, RegisterPayload, findUserByEmail, validateSignInCredentials y más.
import { prisma } from "@/lib/db/prisma";
import { appConfig } from "@/config/app";
import { verifyPassword } from "@/lib/auth/password";
import { sendNoticeEmail } from "@/server/services/auth-email";

export type RequestContext = {
  ipAddress: string;
  userAgent: string | null;
  host: string;
  protocol: string;
};

export const AUTO_LOCK_REASON = "AUTO_LOCK_TOO_MANY_FAILED_LOGINS";
export const AUTO_LOCK_WINDOW_MS = appConfig.security.loginAutoLockHours * 60 * 60 * 1000;

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  businessName: string;
  accountName: string;
  industry: string;
  businessGoal: string;
  productSelection: "BUSINESS" | "LABS" | "BOTH";
  selectedModules: string[];
  selectedChannels: string[];
  recommendationSummary: string;
  monthlyEstimate: number;
  setupEstimate: number;
  createPremiumTrialUser: boolean;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function validateSignInCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  if (user.isDisabled) {
    if (
      user.disabledReason === AUTO_LOCK_REASON &&
      user.disabledAt &&
      Date.now() - user.disabledAt.getTime() >= AUTO_LOCK_WINDOW_MS
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
        },
      });
    } else {
      return { ok: false as const, reason: "USER_DISABLED" };
    }
  }

  const refreshedUser = await findUserByEmail(email);
  if (!refreshedUser?.passwordHash) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  const passwordMatches = await verifyPassword(password, refreshedUser.passwordHash);

  if (!passwordMatches) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  return {
    ok: true as const,
    user: refreshedUser,
    forcePasswordChange: Boolean(refreshedUser.forcePasswordChange),
  };
}

export async function sendLoginSecurityEmail(params: {
  email: string;
  name?: string | null;
  requestContext: RequestContext;
}) {
  const locationHint =
    params.requestContext.ipAddress && params.requestContext.ipAddress !== "unknown"
      ? `IP ${params.requestContext.ipAddress}`
      : "IP no disponible";
  const deviceHint = params.requestContext.userAgent ?? "Dispositivo no disponible";

  try {
    await sendNoticeEmail({
      email: params.email,
      subject: "Nuevo inicio de sesion en tu cuenta Vase",
      message: [
        params.name ? `Hola ${params.name},` : "Hola,",
        "Detectamos un inicio de sesion correcto en tu cuenta Vase.",
        `Fecha y hora: ${new Date().toLocaleString("es-AR")}`,
        `Origen: ${locationHint}`,
        `Dispositivo/navegador: ${deviceHint}`,
        "Si no fuiste vos, cambia tu contrasena y contacta soporte.",
      ].join("\n"),
    });
  } catch (error) {
    console.warn("[auth] login security email failed", {
      email: params.email,
      code: error instanceof Error && "code" in error ? error.code : undefined,
      responseCode:
        error instanceof Error && "responseCode" in error ? error.responseCode : undefined,
    });
  }
}

export async function sendTooManyAttemptsEmail(params: {
  email: string;
  name?: string | null;
  requestContext: RequestContext;
}) {
  await sendNoticeEmail({
    email: params.email,
    subject: "Bloqueo temporal por intentos de login",
    message: [
      params.name ? `Hola ${params.name},` : "Hola,",
      "Registramos demasiados intentos fallidos de inicio de sesion hoy.",
      "Tu cuenta fue bloqueada temporalmente por 24 horas para protegerla.",
      `IP detectada: ${params.requestContext.ipAddress}`,
      `Dispositivo/navegador: ${params.requestContext.userAgent ?? "No disponible"}`,
      "Si fuiste vos, vuelve a intentarlo mas tarde. Si no, cambia tu contrasena cuanto antes.",
    ].join("\n"),
  });
}

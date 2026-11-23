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
      subject: "Nuevo inicio de sesión en tu cuenta de Vase",
      title: "Entraste a tu cuenta",
      greeting: params.name ? `Hola, ${params.name.split(" ")[0]}` : "Hola",
      message: "Alguien entró a tu cuenta de Vase. Si fuiste vos, no tenés que hacer nada.",
      details: [
        ["Cuándo", new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "long", timeStyle: "short" })],
        ["Desde", locationHint],
        ["Dispositivo", describeDevice(deviceHint)],
      ],
      button: { label: "No fui yo: cambiar contraseña", url: securityUrl("/forgot-password") },
      note: "Si no reconocés este ingreso, cambiá tu contraseña ahora y escribinos.",
      reason: "Te avisamos cada vez que alguien entra a tu cuenta, para cuidarla.",
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
    subject: "Frenamos los intentos de entrar a tu cuenta de Vase",
    title: "Pausamos el ingreso a tu cuenta",
    greeting: params.name ? `Hola, ${params.name.split(" ")[0]}` : "Hola",
    message: "Hubo demasiados intentos fallidos de entrar a tu cuenta hoy. Para protegerla, el ingreso queda pausado por 24 horas.",
    details: [
      ["Desde", `IP ${params.requestContext.ipAddress}`],
      ["Dispositivo", describeDevice(params.requestContext.userAgent ?? "No disponible")],
    ],
    button: { label: "Cambiar contraseña", url: securityUrl("/forgot-password") },
    note: "Si fuiste vos, probá de nuevo más tarde. Si no, cambiá tu contraseña cuanto antes.",
    reason: "Te avisamos porque detectamos intentos de entrar a tu cuenta.",
  });
}


const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");
const securityUrl = (path: string) => `${appOrigin()}${path}`;

/** "Mozilla/5.0 (Windows NT 10.0...) Chrome/131..." -> "Chrome en Windows". */
function describeDevice(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /OPR\//.test(userAgent) ? "Opera" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : null;
  const system = /iPhone|iPad/.test(userAgent) ? "iPhone" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "Mac" : /Linux/.test(userAgent) ? "Linux" : null;
  if (browser && system) return `${browser} en ${system}`;
  return browser ?? system ?? userAgent.slice(0, 80);
}

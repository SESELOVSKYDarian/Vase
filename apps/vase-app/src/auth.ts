import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getFallbackRolesFromPlatformRole } from "@/lib/auth/roles";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  sessionPreference: z.enum(["day", "remember"]).default("day"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers.filter((p) => p.id !== "credentials"),
    Credentials({
      name: "Email y password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        sessionPreference: { label: "SessionPreference", type: "text" },
      },
      // Revisa email y contraseña. Esta puerta también se puede tocar directo
      // (/api/auth/callback/credentials) sin pasar por el formulario, así que repite acá
      // los mismos controles: límite de intentos y cuenta habilitada, verificada y sin
      // cambio de contraseña pendiente.
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        try {
          const forwardedFor = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
          await enforceRateLimit({
            scope: "auth:credentials-callback",
            key: `${forwardedFor ?? "unknown"}:${parsed.data.email}`,
            limit: 15,
            windowSeconds: 60 * 10,
          });
        } catch {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: parsed.data.email,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        if (user.isDisabled || !user.emailVerified || user.forcePasswordChange) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          platformRole: user.platformRole,
          roles: getFallbackRolesFromPlatformRole(user.platformRole),
          locale: user.locale,
          emailVerified: user.emailVerified,
          sessionPreference: parsed.data.sessionPreference,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Cada vez que se lee la sesión, se refrescan los datos del usuario desde la base.
    // Si lo borraron o lo desactivaron, la sesión se corta en ese momento (devolver null la borra).
    async jwt({ token, user, trigger }) {
      // Run the original base logic first
      const baseToken = await authConfig.callbacks.jwt({ token, user, trigger, account: null, profile: undefined });
      
      // If we are in the server (non-edge), we can refresh from DB
      if (baseToken?.sub) {
        try {
          const databaseUser = await prisma.user.findUnique({
            where: { id: baseToken.sub as string },
            select: {
              emailVerified: true,
              isDisabled: true,
              platformRole: true,
              // user_roles table might not exist yet in older environments.
              locale: true,
            },
          });

          if (!databaseUser || databaseUser.isDisabled) {
            return null;
          }

          if (databaseUser) {
            baseToken.emailVerified = Boolean(databaseUser.emailVerified);
            baseToken.platformRole = databaseUser.platformRole;
            baseToken.roles = getFallbackRolesFromPlatformRole(databaseUser.platformRole);
            baseToken.locale = typeof databaseUser.locale === "string" ? databaseUser.locale : "es";
          }
        } catch (error) {
          console.error("[auth] Error refreshing user from DB in JWT callback", error);
        }
      }

      return baseToken;
    },
  },
  events: {
    async signIn({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
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
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          platformRole: user.platformRole,
          locale: user.locale,
          emailVerified: user.emailVerified,
          sessionPreference: parsed.data.sessionPreference,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // Run the original base logic first
      const baseToken = await authConfig.callbacks.jwt({ token, user, trigger, account: null, profile: null });
      
      // If we are in the server (non-edge), we can refresh from DB
      if (baseToken?.sub) {
        try {
          const databaseUser = await prisma.user.findUnique({
            where: { id: baseToken.sub as string },
            select: {
              emailVerified: true,
              platformRole: true,
              locale: true,
            },
          });

          if (databaseUser) {
            baseToken.emailVerified = Boolean(databaseUser.emailVerified);
            baseToken.platformRole = databaseUser.platformRole;
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

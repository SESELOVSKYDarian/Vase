import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { appConfig } from "@/config/app";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import type { PlatformRole } from "@/lib/auth/roles";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
});

function coercePlatformRole(value: unknown): PlatformRole {
  return value === "SUPER_ADMIN" || value === "SUPPORT" || value === "USER"
    ? value
    : "USER";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: appConfig.security.authSessionMaxAgeSeconds,
    updateAge: 60 * 30,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Credentials({
      name: "Email y password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.platformRole = coercePlatformRole(user.platformRole);
        token.locale = typeof user.locale === "string" ? user.locale : "es";
        token.emailVerified =
          "emailVerified" in user ? Boolean(user.emailVerified) : Boolean(token.emailVerified);
      }

      if (token.sub) {
        const databaseUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            emailVerified: true,
            platformRole: true,
            locale: true,
          },
        });

        token.emailVerified = Boolean(databaseUser?.emailVerified);
        token.platformRole = coercePlatformRole(databaseUser?.platformRole);
        token.locale = typeof databaseUser?.locale === "string" ? databaseUser.locale : "es";
      }

      return token;
    },
    session({ session, token }) {
      const platformRole = coercePlatformRole(token.platformRole);
      const locale = typeof token.locale === "string" ? token.locale : "es";

      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.platformRole = platformRole;
        session.user.locale = locale;
        session.user.isEmailVerified = Boolean(token.emailVerified);
      }

      return session;
    },
    authorized({ auth: currentAuth, request }) {
      const isSignedIn = !!currentAuth?.user;

      if (request.nextUrl.pathname.startsWith("/app")) {
        return isSignedIn;
      }

      return true;
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
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
});

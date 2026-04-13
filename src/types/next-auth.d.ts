import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    sessionExpiresAt?: number;
    sessionPreference?: "day" | "remember";
    user: DefaultSession["user"] & {
      id: string;
      platformRole: "SUPER_ADMIN" | "SUPPORT" | "USER";
      locale: string;
      isEmailVerified: boolean;
      sessionPreference?: "day" | "remember";
    };
  }

  interface User {
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "USER";
    locale?: string;
    emailVerified?: Date | null;
    sessionPreference?: "day" | "remember";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "USER";
    locale?: string;
    emailVerified?: boolean;
    sessionExpiresAt?: number;
    sessionPreference?: "day" | "remember";
  }
}

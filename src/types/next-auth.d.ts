import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    sessionExpiresAt?: number;
    sessionPreference?: "day" | "remember";
    user: DefaultSession["user"] & {
      id: string;
      platformRole: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
      locale: string;
      roles: AppRole[];
      isEmailVerified: boolean;
      sessionPreference?: "day" | "remember";
    };
  }

  interface User {
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
    locale?: string;
    roles?: AppRole[];
    emailVerified?: Date | null;
    sessionPreference?: "day" | "remember";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
    locale?: string;
    roles?: AppRole[];
    emailVerified?: boolean;
    sessionExpiresAt?: number;
    sessionPreference?: "day" | "remember";
  }
}

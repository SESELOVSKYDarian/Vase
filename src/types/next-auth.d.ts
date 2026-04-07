import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      platformRole: "SUPER_ADMIN" | "SUPPORT" | "USER";
      locale: string;
      isEmailVerified: boolean;
    };
  }

  interface User {
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "USER";
    locale?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    platformRole?: "SUPER_ADMIN" | "SUPPORT" | "USER";
    locale?: string;
    emailVerified?: boolean;
  }
}

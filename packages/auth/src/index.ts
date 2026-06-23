export type SharedSessionClaim = {
  globalUserId: string;
  email: string;
  globalTenantId?: string;
  sessionVersion: number;
};

export const sharedAuthCookieDomain = ".vase.ar";

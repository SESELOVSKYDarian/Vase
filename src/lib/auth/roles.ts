export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
export type TenantRole = "OWNER" | "MANAGER" | "MEMBER";

const tenantRoleWeight: Record<TenantRole, number> = {
  OWNER: 300,
  MANAGER: 200,
  MEMBER: 100,
};

const platformRoleWeight: Record<PlatformRole, number> = {
  SUPER_ADMIN: 300,
  SUPPORT: 200,
  DEVELOPER: 150,
  USER: 100,
};

export function hasTenantRole(currentRole: TenantRole, requiredRole: TenantRole) {
  return tenantRoleWeight[currentRole] >= tenantRoleWeight[requiredRole];
}

export function hasPlatformRole(currentRole: PlatformRole, requiredRole: PlatformRole) {
  return platformRoleWeight[currentRole] >= platformRoleWeight[requiredRole];
}

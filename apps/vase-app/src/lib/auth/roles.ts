export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
export type TenantRole = "OWNER" | "MANAGER" | "MEMBER";
export type AppRole =
  | "ADMIN"
  | "CLIENTE"
  | "DEVELOPER"
  | "DESIGNER"
  | "TESTER"
  | "SOPORTE";

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

const platformRoleFallbackMap: Record<PlatformRole, AppRole[]> = {
  SUPER_ADMIN: ["ADMIN"],
  SUPPORT: ["SOPORTE"],
  DEVELOPER: ["DEVELOPER"],
  USER: ["CLIENTE"],
};

export function getFallbackRolesFromPlatformRole(platformRole: PlatformRole): AppRole[] {
  return platformRoleFallbackMap[platformRole] ?? ["CLIENTE"];
}

export function hasRole(userRoles: AppRole[] | undefined, role: AppRole, platformRoleFallback?: PlatformRole) {
  if (Array.isArray(userRoles) && userRoles.includes(role)) return true;
  if (!platformRoleFallback) return false;
  return getFallbackRolesFromPlatformRole(platformRoleFallback).includes(role);
}

export function hasAnyRole(
  userRoles: AppRole[] | undefined,
  requiredRoles: AppRole[],
  platformRoleFallback?: PlatformRole,
) {
  return requiredRoles.some((role) => hasRole(userRoles, role, platformRoleFallback));
}

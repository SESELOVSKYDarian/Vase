export type TeamRole = "MANAGER" | "MEMBER";

export const MAX_TEAM_MEMBER_LIMIT = 200;

/** Lugares ocupados: personas del equipo (sin contar al Dueño) e invitaciones pendientes. */
export function teamSeatsUsed(input: { teamMembers: number; pendingInvitations: number }) {
  return input.teamMembers + input.pendingInvitations;
}

export function canAddTeamMember(used: number, limit: number) {
  return used < Math.max(0, limit);
}

export function teamLimitText(used: number, limit: number) {
  return limit === 1 ? `Usás ${used} de 1 lugar de tu cuenta.` : `Usás ${used} de ${limit} lugares de tu cuenta.`;
}

export const TEAM_ROLE_LABEL = {
  OWNER: "Dueño",
  MANAGER: "Encargado",
  MEMBER: "Miembro",
} as const;

// El editor de Business hoy solo acepta Dueño y Encargado (ver lib/business/launch.ts).
const BUSINESS_MODULE_ID = "vase_business";

export function isTeamRole(value: unknown): value is TeamRole {
  return value === "MANAGER" || value === "MEMBER";
}

export function assignableModuleIds(role: TeamRole, contractedIds: readonly string[]) {
  return role === "MEMBER" ? contractedIds.filter((id) => id !== BUSINESS_MODULE_ID) : [...contractedIds];
}

/** Deja solo módulos contratados y permitidos para ese rol, sin repetidos. */
export function sanitizeModuleSelection(role: TeamRole, requested: unknown, contractedIds: readonly string[]) {
  if (!Array.isArray(requested)) return [];
  const allowed = new Set(assignableModuleIds(role, contractedIds));
  return Array.from(new Set(requested.filter((id): id is string => typeof id === "string" && allowed.has(id))));
}

/** Sin filas explícitas, la persona ve todo lo contratado (igual que getTenantModulesAccess). */
export function effectiveModuleIds(
  rows: ReadonlyArray<{ moduleId: string; isActive: boolean }>,
  contractedIds: readonly string[],
) {
  if (rows.length === 0) return [...contractedIds];
  const active = new Set(rows.filter((row) => row.isActive).map((row) => row.moduleId));
  return contractedIds.filter((id) => active.has(id));
}

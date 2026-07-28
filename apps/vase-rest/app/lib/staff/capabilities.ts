import type { RestStaffRole } from "@vase/contracts";

export const REST_ROLE_CAPABILITIES = {
  OWNER: [
    "settings:write", "staff:write", "orders:write", "kds:operate",
    "cash:operate", "cash:close", "inventory:write", "delivery:operate",
    "analytics:read",
  ],
  MANAGER: [
    "staff:write", "orders:write", "kds:operate", "cash:operate",
    "cash:close", "inventory:write", "delivery:operate", "analytics:read",
  ],
  CASHIER: ["orders:write", "cash:operate", "cash:close"],
  WAITER: ["orders:write", "tables:write"],
  KITCHEN: ["kds:operate", "orders:read"],
  STOCK: ["inventory:write", "orders:read"],
  DELIVERY: ["delivery:operate", "orders:read"],
} as const satisfies Record<RestStaffRole, readonly string[]>;

export function capabilitiesForRole(role: RestStaffRole): readonly string[] {
  return REST_ROLE_CAPABILITIES[role];
}

export function hasCapability(role: RestStaffRole, capability: string) {
  return capabilitiesForRole(role).includes(capability as never);
}

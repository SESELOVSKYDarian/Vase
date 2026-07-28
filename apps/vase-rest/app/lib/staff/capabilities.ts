import type { RestStaffRole } from "@vase/contracts";

export const REST_ROLE_CAPABILITIES = {
  OWNER: [
    "settings:write", "staff:write", "orders:write", "kds:operate",
    "cash:operate", "cash:close", "inventory:write", "delivery:operate",
    "analytics:read", "support:create",
  ],
  MANAGER: [
    "staff:write", "orders:write", "kds:operate", "cash:operate",
    "cash:close", "inventory:write", "delivery:operate", "analytics:read",
    "support:create",
  ],
  CASHIER: ["orders:write", "cash:operate", "cash:close", "support:create"],
  WAITER: ["orders:write", "tables:write", "support:create"],
  KITCHEN: ["kds:operate", "orders:read", "support:create"],
  STOCK: ["inventory:write", "orders:read", "support:create"],
  DELIVERY: ["delivery:operate", "orders:read", "support:create"],
} as const satisfies Record<RestStaffRole, readonly string[]>;

export function capabilitiesForRole(role: RestStaffRole): readonly string[] {
  return REST_ROLE_CAPABILITIES[role];
}

export function hasCapability(role: RestStaffRole, capability: string) {
  return capabilitiesForRole(role).includes(capability as never);
}

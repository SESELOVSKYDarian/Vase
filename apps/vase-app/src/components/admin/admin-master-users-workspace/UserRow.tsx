"use client";

// Parte de admin-master-users-workspace.tsx: UiRole, UserRow, ModuleOption, PaymentDraft, Props, UserAccessFilter y más.
import { type AdminGovernanceActionState } from "@/app/(platform)/app/admin/actions";
import { type ClientProductAccess } from "@/lib/admin/client-product-access";

export type UiRole = "cliente" | "admin" | "developer" | "designer" | "tester" | "soporte";
export type UserRow = {
  id: string;
  name: string;
  email: string;
  isDisabled: boolean;
  disabledAt: Date | null;
  disabledReason: string | null;
  uiRole: UiRole;
  clientAccountKind: "OWNER" | "TEAM" | "UNASSIGNED";
  moduleIds: string[];
  tenantId: string | null;
  businessProjectLimit: number;
  teamMemberLimit: number;
  tenantName: string | null;
  tenantSlug: string | null;
  accountName: string | null;
  industry: string | null;
  tenantStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | null;
  tenantRole: "OWNER" | "MANAGER" | "MEMBER" | null;
  membershipStatus: "ACTIVE" | "INVITED" | "SUSPENDED" | null;
  paymentSummary: string;
  primaryClientAccountId: string | null;
  paymentHistory: Array<{
    id: string;
    accountLabel: string;
    moduleId: string | null;
    submoduleId: string | null;
    moduleLabel: string | null;
    submoduleLabel: string | null;
    concept: string;
    category: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    dueAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
  }>;
  productAccess: ClientProductAccess;
  teamSummary: { members: number; active: number; suspended: number; pendingInvitations: number };
};

export type ModuleOption = {
  id: string;
  name: string;
  product: "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";
  pricing: Array<{
    price: number;
    currency: string;
    type: "ONE_TIME" | "MONTHLY" | "YEARLY";
    isActive: boolean;
  }>;
  features: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    valueType: "BOOLEAN" | "INTEGER" | "TEXT";
    trialDefault: boolean | number | string | null;
    activeDefault: boolean | number | string | null;
    minValue: number | null;
    maxValue: number | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  submodules: Array<{
    id: string;
    key: string;
    name: string;
    features: ModuleOption["features"];
    pricing: Array<{
      price: number;
      currency: string;
      type: "ONE_TIME" | "MONTHLY" | "YEARLY";
      isActive: boolean;
    }>;
  }>;
};

export type PaymentDraft = {
  paymentId: string;
  concept: string;
  category: "DEVELOPMENT" | "HOSTING" | "MAINTENANCE" | "LABS_MONTHLY" | "TOKENS" | "OTHER";
  moduleId: string;
  submoduleId: string;
  totalAmount: string;
  paidAmount: string;
  paidAt: string;
  method: string;
  notes: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  hostingCycle: "MONTHLY" | "YEARLY";
};

export type Props = {
  users: UserRow[];
  modules: ModuleOption[];
  restPricingVersions: Array<{
    id: string;
    plan: string;
    version: number;
    currency: string;
    monthlyPrice: number;
    branchLimit: number;
    localEmployeeLimit: number;
    deviceLimit: number;
    edgeLimit: number;
    status: "PUBLISHED" | "ARCHIVED";
  }>;
};

export type UserAccessFilter = "all" | "active" | "disabled" | "tenant-suspended" | "membership-suspended" | "with-debt";
export type UserRoleFilter = "all" | UiRole;

export const initialState: AdminGovernanceActionState = {};

export const roleLabels: Record<UiRole, string> = {
  cliente: "Cliente",
  admin: "Admin",
  developer: "Developer",
  designer: "Designer",
  tester: "Tester",
  soporte: "Soporte",
};

export const accessFilterLabels: Record<UserAccessFilter, string> = {
  all: "Todos",
  active: "Activos",
  disabled: "Deshabilitados",
  "tenant-suspended": "Tenant suspendido",
  "membership-suspended": "Membresia suspendida",
  "with-debt": "Con deuda",
};

export const paymentCategoryLabels: Record<PaymentDraft["category"], string> = {
  DEVELOPMENT: "Desarrollo",
  HOSTING: "Hosting",
  MAINTENANCE: "Mantenimiento",
  LABS_MONTHLY: "Labs mensual",
  TOKENS: "Tokens",
  OTHER: "Otro",
};

export const paymentStatusLabels: Record<PaymentDraft["status"], string> = {
  ACTIVE: "Activo",
  PAST_DUE: "Pendiente",
  TRIAL: "Trial",
  CANCELED: "Cancelado",
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function userHasDebt(user: UserRow) {
  return /falta|pendiente/i.test(user.paymentSummary);
}

export function getUserAccessTone(user: UserRow): "success" | "warning" | "danger" | "info" {
  if (user.isDisabled) return "danger";
  if (user.tenantStatus === "SUSPENDED" || user.membershipStatus === "SUSPENDED") return "warning";
  if (user.membershipStatus === "INVITED") return "info";
  return "success";
}

export function getUserAccessLabel(user: UserRow) {
  if (user.isDisabled) return "Usuario deshabilitado";
  if (user.tenantStatus === "SUSPENDED") return "Tenant suspendido";
  if (user.membershipStatus === "SUSPENDED") return "Membresia suspendida";
  if (user.membershipStatus === "INVITED") return "Invitado";
  return "Activo";
}

export function pickActivePrice(
  pricing: Array<{ price: number; currency: string; type: "ONE_TIME" | "MONTHLY" | "YEARLY"; isActive: boolean }>,
  type: "ONE_TIME" | "MONTHLY" | "YEARLY",
) {
  return pricing.find((entry) => entry.isActive && entry.type === type) ?? pricing.find((entry) => entry.type === type) ?? null;
}

export const emptyProductAccess: ClientProductAccess = { business: null, labs: null, rest: null, management: null };

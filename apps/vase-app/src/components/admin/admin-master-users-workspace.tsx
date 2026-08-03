"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeInfo,
  Banknote,
  Bot,
  Building2,
  CalendarCheck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  HandCoins,
  Layers3,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRoundX,
} from "lucide-react";
import {
  createUserClientPaymentWithStateAction,
  deleteMasterUserWithStateAction,
  deleteClientPaymentWithStateAction,
  updateClientPaymentWithStateAction,
  updateUserStatusAction,
  type AdminGovernanceActionState,
  upsertMasterUserWithStateAction,
} from "@/app/(platform)/app/admin/actions";
import { AdminUserPasswordResetForm } from "@/components/admin/admin-user-password-reset-form";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminStatusPill,
  AdminToolbar,
  adminStatusIcons,
} from "@/components/admin/admin-ui";
import { ActionToast } from "@/components/ui/action-toast";
import { CrudModal } from "@/components/ui/crud-modal";

type UiRole = "cliente" | "admin" | "developer" | "designer" | "tester" | "soporte";
type TenantPlan = "TRIAL" | "PRO";
type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED";
type TenantRole = "OWNER" | "MANAGER" | "MEMBER";
type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

type ModuleLimitState = {
  pages: string;
  chatbots: string;
};

type ClientAccessConfigData = {
  tenantPlan: TenantPlan;
  proSubmoduleIds: string[];
  tenantName: string;
  tenantSlug: string;
  accountName: string;
  industry: string;
  tenantStatus: TenantStatus;
  tenantRole: TenantRole;
  membershipStatus: MembershipStatus;
  moduleLimits: Record<string, { pages: number | null; chatbots: number | null }>;
};

type ClientAccessConfig = ClientAccessConfigData | null;

type UserRow = {
  id: string;
  name: string;
  email: string;
  isDisabled: boolean;
  disabledAt: Date | null;
  disabledReason: string | null;
  uiRole: UiRole;
  moduleIds: string[];
  tenantId: string | null;
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
  clientAccessConfig: ClientAccessConfig;
};

type ModuleOption = {
  id: string;
  name: string;
  product: "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";
  pricing: Array<{
    price: number;
    currency: string;
    type: "ONE_TIME" | "MONTHLY" | "YEARLY";
    isActive: boolean;
  }>;
  submodules: Array<{
    id: string;
    key: string;
    name: string;
    pricing: Array<{
      price: number;
      currency: string;
      type: "ONE_TIME" | "MONTHLY" | "YEARLY";
      isActive: boolean;
    }>;
  }>;
};

type PaymentDraft = {
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

type Props = {
  users: UserRow[];
  modules: ModuleOption[];
};

type UserAccessFilter = "all" | "active" | "disabled" | "tenant-suspended" | "membership-suspended" | "with-debt";
type UserRoleFilter = "all" | UiRole;

const initialState: AdminGovernanceActionState = {};

const roleLabels: Record<UiRole, string> = {
  cliente: "Cliente",
  admin: "Admin",
  developer: "Developer",
  designer: "Designer",
  tester: "Tester",
  soporte: "Soporte",
};

const accessFilterLabels: Record<UserAccessFilter, string> = {
  all: "Todos",
  active: "Activos",
  disabled: "Deshabilitados",
  "tenant-suspended": "Tenant suspendido",
  "membership-suspended": "Membresia suspendida",
  "with-debt": "Con deuda",
};

const paymentCategoryLabels: Record<PaymentDraft["category"], string> = {
  DEVELOPMENT: "Desarrollo",
  HOSTING: "Hosting",
  MAINTENANCE: "Mantenimiento",
  LABS_MONTHLY: "Labs mensual",
  TOKENS: "Tokens",
  OTHER: "Otro",
};

const paymentStatusLabels: Record<PaymentDraft["status"], string> = {
  ACTIVE: "Activo",
  PAST_DUE: "Pendiente",
  TRIAL: "Trial",
  CANCELED: "Cancelado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function userHasDebt(user: UserRow) {
  return /falta|pendiente/i.test(user.paymentSummary);
}

function getUserAccessTone(user: UserRow): "success" | "warning" | "danger" | "info" {
  if (user.isDisabled) return "danger";
  if (user.tenantStatus === "SUSPENDED" || user.membershipStatus === "SUSPENDED") return "warning";
  if (user.membershipStatus === "INVITED") return "info";
  return "success";
}

function getUserAccessLabel(user: UserRow) {
  if (user.isDisabled) return "Usuario deshabilitado";
  if (user.tenantStatus === "SUSPENDED") return "Tenant suspendido";
  if (user.membershipStatus === "SUSPENDED") return "Membresia suspendida";
  if (user.membershipStatus === "INVITED") return "Invitado";
  return "Activo";
}

function createEmptyClientAccessConfig(): ClientAccessConfigData {
  return {
    tenantPlan: "TRIAL",
    proSubmoduleIds: [],
    tenantName: "",
    tenantSlug: "",
    accountName: "",
    industry: "",
    tenantStatus: "TRIAL",
    tenantRole: "OWNER",
    membershipStatus: "ACTIVE",
    moduleLimits: {},
  };
}

function serializeClientAccessConfig(config: ClientAccessConfig): string {
  if (!config) return "";
  return JSON.stringify(config);
}

function toLimitState(value?: { pages?: number | string | null; chatbots?: number | string | null } | null): ModuleLimitState {
  return {
    pages: value?.pages == null ? "" : String(value.pages),
    chatbots: value?.chatbots == null ? "" : String(value.chatbots),
  };
}

function pickActivePrice(
  pricing: Array<{ price: number; currency: string; type: "ONE_TIME" | "MONTHLY" | "YEARLY"; isActive: boolean }>,
  type: "ONE_TIME" | "MONTHLY" | "YEARLY",
) {
  return pricing.find((entry) => entry.isActive && entry.type === type) ?? pricing.find((entry) => entry.type === type) ?? null;
}

function normalizeClientAccessConfig(user?: UserRow | null): ClientAccessConfigData {
  const currentConfig = user?.clientAccessConfig ?? createEmptyClientAccessConfig();
  return {
    tenantPlan: currentConfig.tenantPlan,
    proSubmoduleIds: currentConfig.proSubmoduleIds,
    tenantName: currentConfig.tenantName || user?.tenantName || "",
    tenantSlug: currentConfig.tenantSlug || user?.tenantSlug || "",
    accountName: currentConfig.accountName || user?.accountName || user?.tenantName || "",
    industry: currentConfig.industry || user?.industry || "",
    tenantStatus: currentConfig.tenantStatus || user?.tenantStatus || "TRIAL",
    tenantRole: currentConfig.tenantRole || user?.tenantRole || "OWNER",
    membershipStatus: currentConfig.membershipStatus || user?.membershipStatus || "ACTIVE",
    moduleLimits: currentConfig.moduleLimits,
  };
}

export function AdminMasterUsersWorkspace({ users, modules }: Props) {
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [paymentUser, setPaymentUser] = useState<UserRow | null>(null);
  const [statusUser, setStatusUser] = useState<UserRow | null>(null);
  const [statusMode, setStatusMode] = useState<"disable" | "enable">("disable");
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<UserAccessFilter>("all");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [paymentTab, setPaymentTab] = useState<"history" | "new">("history");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UiRole>("cliente");
  const [userWizardStep, setUserWizardStep] = useState(1);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [clientAccessConfig, setClientAccessConfig] = useState<ClientAccessConfig>(createEmptyClientAccessConfig());
  const [moduleLimitState, setModuleLimitState] = useState<Record<string, ModuleLimitState>>({});
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    paymentId: "",
    concept: "",
    category: "DEVELOPMENT",
    moduleId: "",
    submoduleId: "",
    totalAmount: "",
    paidAmount: "",
    paidAt: "",
    method: "",
    notes: "",
    status: "ACTIVE",
    hostingCycle: "MONTHLY",
  });
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [upsertState, upsertAction] = useActionState(upsertMasterUserWithStateAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteMasterUserWithStateAction, initialState);
  const [paymentState, paymentAction] = useActionState(createUserClientPaymentWithStateAction, initialState);
  const [updatePaymentState, updatePaymentAction] = useActionState(updateClientPaymentWithStateAction, initialState);
  const [deletePaymentState, deletePaymentAction] = useActionState(deleteClientPaymentWithStateAction, initialState);
  const [statusState, statusAction, statusPending] = useActionState(updateUserStatusAction, initialState);

  const userStats = useMemo(() => {
    const disabled = users.filter((user) => user.isDisabled).length;
    const tenantSuspended = users.filter((user) => user.tenantStatus === "SUSPENDED").length;
    const membershipSuspended = users.filter((user) => user.membershipStatus === "SUSPENDED").length;
    const withDebt = users.filter(userHasDebt).length;
    return {
      total: users.length,
      active: users.length - disabled,
      disabled,
      tenantSuspended,
      membershipSuspended,
      withDebt,
    };
  }, [users]);

  const roleFilterOptions = useMemo(
    () =>
      (["all", "cliente", "admin", "developer", "designer", "tester", "soporte"] as UserRoleFilter[]).map((role) => ({
        role,
        label: role === "all" ? "Todos los roles" : roleLabels[role],
        count: role === "all" ? users.length : users.filter((user) => user.uiRole === role).length,
      })),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = query
        ? [user.name, user.email, user.tenantName, user.accountName, user.paymentSummary]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;
      const matchesFilter =
        accessFilter === "all" ||
        (accessFilter === "active" && !user.isDisabled && user.tenantStatus !== "SUSPENDED" && user.membershipStatus !== "SUSPENDED") ||
        (accessFilter === "disabled" && user.isDisabled) ||
        (accessFilter === "tenant-suspended" && user.tenantStatus === "SUSPENDED") ||
        (accessFilter === "membership-suspended" && user.membershipStatus === "SUSPENDED") ||
        (accessFilter === "with-debt" && userHasDebt(user));
      const matchesRole = roleFilter === "all" || user.uiRole === roleFilter;
      return matchesSearch && matchesFilter && matchesRole;
    });
  }, [accessFilter, roleFilter, searchQuery, users]);

  const clientModules = useMemo(
    () => modules.filter((module) => selectedModuleIds.includes(module.id)),
    [modules, selectedModuleIds],
  );

  const availableSubmodules = useMemo(
    () => clientModules.flatMap((module) => module.submodules.map((submodule) => ({ ...submodule, moduleName: module.name }))),
    [clientModules],
  );

  const effectiveLabsPlanLabel = useMemo(() => {
    if (!selectedModuleIds.includes("vase_labs")) return null;
    const selectedSubmoduleIds = new Set(clientAccessConfig?.proSubmoduleIds ?? []);
    const labsSubmodules = modules.find((module) => module.id === "vase_labs")?.submodules ?? [];
    const selectedLabsSubmodules = labsSubmodules.filter((submodule) => selectedSubmoduleIds.has(submodule.id));
    const priority = ["pro", "growth", "starter"];
    return priority
      .map((key) => selectedLabsSubmodules.find((submodule) => submodule.key === key)?.name)
      .find(Boolean) ?? (clientAccessConfig?.tenantPlan === "PRO" ? "Pro" : "Starter");
  }, [clientAccessConfig?.proSubmoduleIds, clientAccessConfig?.tenantPlan, modules, selectedModuleIds]);

  const generatePassword = () => {
    const random = Math.random().toString(36).slice(2, 8);
    setGeneratedPassword(`Vase-${random}#${Math.floor(100 + Math.random() * 900)}`);
    setAutoGeneratePassword(true);
  };

  const updateClientAccessConfig = useCallback(
    (updater: (current: ClientAccessConfigData) => ClientAccessConfigData) => {
      setClientAccessConfig((current) => updater(current ?? createEmptyClientAccessConfig()));
    },
    [],
  );

  const resetClientAccessState = (nextUser?: UserRow | null) => {
    const currentSelectedModules = nextUser?.moduleIds ?? [];
    const currentConfig = normalizeClientAccessConfig(nextUser);

    setSelectedModuleIds(currentSelectedModules);
    setClientAccessConfig(currentConfig);

    const limits: Record<string, ModuleLimitState> = {};
    for (const accessModule of modules) {
      if (currentSelectedModules.includes(accessModule.id)) {
        limits[accessModule.id] = toLimitState(currentConfig?.moduleLimits?.[accessModule.id]);
      }
    }
    setModuleLimitState(limits);
  };

  const resetPaymentDraft = (nextUser?: UserRow | null) => {
    const firstModule = nextUser?.moduleIds?.[0] ?? "";
    setEditingPaymentId(null);
    setPaymentDraft({
      paymentId: "",
      concept: "",
      category: "DEVELOPMENT",
      moduleId: firstModule,
      submoduleId: "",
      totalAmount: "",
      paidAmount: "",
      paidAt: "",
      method: "",
      notes: "",
      status: "ACTIVE",
      hostingCycle: "MONTHLY",
    });
  };

  const openCreateModal = () => {
    setEditingUser({
      id: "",
      name: "",
      email: "",
      isDisabled: false,
      disabledAt: null,
      disabledReason: null,
      uiRole: "cliente",
      moduleIds: [],
      tenantId: null,
      tenantName: null,
      tenantSlug: null,
      accountName: null,
      industry: null,
      tenantStatus: null,
      tenantRole: null,
      membershipStatus: null,
      paymentSummary: "Sin pagos",
      primaryClientAccountId: null,
      paymentHistory: [],
      clientAccessConfig: createEmptyClientAccessConfig(),
    });
    setSelectedRole("cliente");
    setUserWizardStep(1);
    setAutoGeneratePassword(false);
    setTemporaryPassword(false);
    setGeneratedPassword("");
    resetClientAccessState(null);
  };

  const openEditModal = (user: UserRow) => {
    setEditingUser(user);
    setSelectedRole(user.uiRole);
    setUserWizardStep(1);
    setAutoGeneratePassword(false);
    setTemporaryPassword(false);
    setGeneratedPassword("");
    resetClientAccessState(user);
  };

  const openPaymentModal = (user: UserRow) => {
    setPaymentUser(user);
    setPaymentTab("history");
    resetPaymentDraft(user);
  };

  const openStatusModal = (user: UserRow, mode: "disable" | "enable") => {
    setStatusUser(user);
    setStatusMode(mode);
  };

  const beginEditPayment = (payment: UserRow["paymentHistory"][number]) => {
    setEditingPaymentId(payment.id);
    setPaymentTab("new");
    setPaymentDraft({
      paymentId: payment.id,
      concept: payment.concept,
      category: payment.category as PaymentDraft["category"],
      moduleId: payment.moduleId ?? "",
      submoduleId: payment.submoduleId ?? "",
      totalAmount: String(payment.totalAmount),
      paidAmount: String(payment.paidAmount),
      paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : "",
      method: "",
      notes: "",
      status: payment.status as PaymentDraft["status"],
      hostingCycle: "MONTHLY",
    });
  };

  const paymentModules = useMemo(
    () => (paymentUser ? modules.filter((module) => paymentUser.moduleIds.includes(module.id)) : []),
    [modules, paymentUser],
  );

  const selectedPaymentModule = useMemo(
    () => paymentModules.find((module) => module.id === paymentDraft.moduleId) ?? paymentModules[0] ?? null,
    [paymentDraft.moduleId, paymentModules],
  );

  const showDevelopmentFields = paymentDraft.category === "DEVELOPMENT";

  const resolvePaymentPrice = useCallback((draft: PaymentDraft) => {
    const selectedModule = paymentModules.find((entry) => entry.id === draft.moduleId) ?? paymentModules[0] ?? null;
    const submodule =
      selectedModule?.submodules.find((entry) => entry.id === draft.submoduleId) ??
      selectedModule?.submodules[0] ??
      null;

    if (!selectedModule) return null;

    if (draft.category === "DEVELOPMENT") {
      return pickActivePrice(submodule?.pricing ?? [], "ONE_TIME") ?? pickActivePrice(selectedModule.pricing, "ONE_TIME");
    }

    if (draft.category === "HOSTING" || draft.category === "LABS_MONTHLY") {
      if (draft.hostingCycle === "YEARLY") {
        return pickActivePrice(submodule?.pricing ?? [], "YEARLY") ?? pickActivePrice(selectedModule.pricing, "YEARLY");
      }
      return pickActivePrice(submodule?.pricing ?? [], "MONTHLY") ?? pickActivePrice(selectedModule.pricing, "MONTHLY");
    }

    return null;
  }, [paymentModules]);

  const paymentPriceSuggestion = useMemo(() => {
    return resolvePaymentPrice(paymentDraft);
  }, [paymentDraft, resolvePaymentPrice]);

  const displayedPaymentTotal = paymentDraft.totalAmount.trim().length > 0
    ? paymentDraft.totalAmount
    : paymentTab === "new" && !editingPaymentId && paymentPriceSuggestion
      ? String(paymentPriceSuggestion.price)
      : "";

  const paymentProgress = useMemo(() => {
    const total = Number(displayedPaymentTotal || 0);
    const paid = Number(paymentDraft.paidAmount || 0);
    const pending = Math.max(0, total - paid);
    const percentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    return { total, paid, pending, percentage };
  }, [displayedPaymentTotal, paymentDraft.paidAmount]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (upsertState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: upsertState.success as string });
        setEditingUser(null);
        setGeneratedPassword("");
        setAutoGeneratePassword(false);
        setTemporaryPassword(false);
        setClientAccessConfig(createEmptyClientAccessConfig());
        setModuleLimitState({});
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (upsertState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: upsertState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [upsertState.success, upsertState.error]);

  useEffect(() => {
    if (deleteState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: deleteState.success as string });
        setDeletingUser(null);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (deleteState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: deleteState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [deleteState.success, deleteState.error]);

  useEffect(() => {
    if (paymentState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: paymentState.success as string });
        setPaymentTab("history");
        setEditingPaymentId(null);
        setPaymentUser(null);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (paymentState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: paymentState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [paymentState.success, paymentState.error]);

  useEffect(() => {
    if (updatePaymentState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: updatePaymentState.success as string });
        setEditingPaymentId(null);
        setPaymentTab("history");
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (updatePaymentState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: updatePaymentState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [updatePaymentState.success, updatePaymentState.error]);

  useEffect(() => {
    if (deletePaymentState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: deletePaymentState.success as string });
        setEditingPaymentId(null);
        setPaymentTab("history");
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (deletePaymentState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: deletePaymentState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [deletePaymentState.success, deletePaymentState.error]);

  useEffect(() => {
    if (statusState.success) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "success", message: statusState.success as string });
        setStatusUser(null);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (statusState.error) {
      const timerId = window.setTimeout(() => {
        setToast({ tone: "error", message: statusState.error as string });
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [statusState.success, statusState.error]);

  const buildClientAccessPayload = () => {
    if (selectedRole !== "cliente") return "";
    const currentConfig = clientAccessConfig ?? createEmptyClientAccessConfig();
    const validProSubmoduleIds = currentConfig.proSubmoduleIds.filter((submoduleId) =>
      availableSubmodules.some((submodule) => submodule.id === submoduleId),
    );

    const moduleLimits = Object.fromEntries(
      selectedModuleIds.map((moduleId) => {
        const values = moduleLimitState[moduleId] ?? { pages: "", chatbots: "" };
        return [
          moduleId,
          {
            pages: values.pages.trim().length > 0 ? Number(values.pages) : null,
            chatbots: values.chatbots.trim().length > 0 ? Number(values.chatbots) : null,
          },
        ];
      }),
    );

    return serializeClientAccessConfig({
      tenantPlan: currentConfig.tenantPlan,
      proSubmoduleIds: currentConfig.tenantPlan === "PRO" ? validProSubmoduleIds : [],
      tenantName: currentConfig.tenantName.trim(),
      tenantSlug: currentConfig.tenantSlug.trim(),
      accountName: currentConfig.accountName.trim(),
      industry: currentConfig.industry.trim(),
      tenantStatus: currentConfig.tenantStatus,
      tenantRole: currentConfig.tenantRole,
      membershipStatus: currentConfig.membershipStatus,
      moduleLimits,
    });
  };

  const selectedUserPaymentHistory = useMemo(() => paymentUser?.paymentHistory ?? [], [paymentUser]);
  const modulesDisabled = selectedRole === "admin";
  const isClientRole = selectedRole === "cliente";
  const isClientWizard = isClientRole;
  const clientWizardCanAdvance = isClientWizard ? (userWizardStep === 1 ? true : userWizardStep === 2 ? selectedModuleIds.length > 0 : true) : true;
  const showClientSection = isClientRole;
  const showSubmoduleCards = modules.length > 0 && isClientRole;
  const canSelectSubmodule = false;

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        eyebrow="Gobierno de acceso"
        title="Usuarios y permisos"
        description="Gestiona cuentas, roles, pagos y bloqueos desde una sola vista. Los usuarios deshabilitados quedan visibles y se pueden reactivar sin buscar en formularios secundarios."
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Total" value={userStats.total} helper="Usuarios cargados en el panel." icon={<UserCog className="h-5 w-5" />} tone="accent" />
        <AdminMetricCard label="Activos" value={userStats.active} helper="Cuentas disponibles." icon={<ShieldCheck className="h-5 w-5" />} tone="success" />
        <AdminMetricCard label="Deshabilitados" value={userStats.disabled} helper="Bloqueo de cuenta." icon={<UserRoundX className="h-5 w-5" />} tone={userStats.disabled ? "danger" : "success"} />
        <AdminMetricCard label="Suspendidos" value={userStats.tenantSuspended + userStats.membershipSuspended} helper="Tenant o membresia." icon={<ShieldAlert className="h-5 w-5" />} tone={userStats.tenantSuspended + userStats.membershipSuspended ? "warning" : "success"} />
        <AdminMetricCard label="Con deuda" value={userStats.withDebt} helper="Pagos pendientes detectados." icon={<CreditCard className="h-5 w-5" />} tone={userStats.withDebt ? "warning" : "neutral"} />
      </div>

      <AdminToolbar className="items-stretch">
        <div className="grid min-w-0 flex-1 gap-3">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar usuario</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por usuario, email, tenant o pago..."
              className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_20%,transparent)]"
            />
          </label>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 shrink-0 text-[var(--muted-soft)]" />
            {(Object.keys(accessFilterLabels) as UserAccessFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setAccessFilter(filter)}
                className={`min-h-10 shrink-0 cursor-pointer rounded-xl border px-3 text-xs font-semibold transition ${
                  accessFilter === filter
                    ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--foreground)]"
                    : "border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                }`}
              >
                {accessFilterLabels[filter]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-2 sm:min-w-[280px]">
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Tipo de usuario</p>
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap">
            {roleFilterOptions.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => setRoleFilter(option.role)}
                className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                  roleFilter === option.role
                    ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {option.label}
                <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      </AdminToolbar>

      <AdminDataTable>
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-[var(--surface-strong)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted-soft)]">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Acceso</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Cliente / tenant</th>
              <th className="px-4 py-3">Estado de pago</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const tone = getUserAccessTone(user);
              return (
                <tr key={user.id} className="border-t border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="text-xs text-[var(--muted)]">{user.email}</p>
                    {user.isDisabled ? (
                      <p className="mt-1 line-clamp-1 text-xs text-[var(--danger)]">
                        {user.disabledReason ?? "Sin motivo cargado"} · {formatDateTime(user.disabledAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <AdminStatusPill tone={tone} icon={adminStatusIcons[tone]}>
                      {getUserAccessLabel(user)}
                    </AdminStatusPill>
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">{roleLabels[user.uiRole]}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">{user.accountName ?? user.tenantName ?? "Sin tenant"}</p>
                    <p className="text-xs">{user.tenantSlug ?? user.industry ?? "Sin detalle"}</p>
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">{user.paymentSummary}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.isDisabled ? (
                        <button
                          type="button"
                          onClick={() => openStatusModal(user, "enable")}
                          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--success)_35%,transparent)] px-3 text-xs font-semibold text-[var(--success)] transition hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Reactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openStatusModal(user, "disable")}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
                          title="Deshabilitar usuario"
                          aria-label="Deshabilitar usuario"
                        >
                          <UserRoundX className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
                        title="Editar usuario"
                        aria-label="Editar usuario"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <AdminUserPasswordResetForm userId={user.id} iconOnly />
                      {user.uiRole === "cliente" ? (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(user)}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
                          title="Ver pagos"
                          aria-label="Ver pagos"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--danger)] text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                        title="Eliminar usuario"
                        aria-label="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredUsers.length === 0 ? (
          <div className="p-4">
            <AdminEmptyState title="No encontramos usuarios con esos filtros" description="Prueba limpiar la busqueda o cambiar el estado seleccionado." />
          </div>
        ) : null}
      </AdminDataTable>

      <CrudModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={editingUser?.id ? "Editar usuario" : "Crear usuario"}
        description="Define identidad, acceso, plan de cliente y limites operativos desde un solo formulario."
        widthClassName="max-w-4xl"
      >
        {editingUser ? (
          <form action={upsertAction} className="grid gap-4">
            <input type="hidden" name="userId" value={editingUser.id} />
            <input type="hidden" name="autoGeneratePassword" value={autoGeneratePassword ? "true" : "false"} />
            <input type="hidden" name="temporaryPassword" value={temporaryPassword ? "true" : "false"} />
            <input type="hidden" name="clientAccessConfig" value={buildClientAccessPayload()} />

            {isClientWizard ? (
              <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3 sm:grid-cols-3">
                {[
                  { step: 1, title: "Identidad", description: "Nombre, email y clave" },
                  { step: 2, title: "Módulos", description: "Accesos y límites" },
                  { step: 3, title: "Cliente", description: "Tenant y plan" },
                ].map((step) => (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => setUserWizardStep(step.step)}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      userWizardStep === step.step
                        ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-strong)_8%,transparent)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-strong)]"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] text-xs font-semibold text-[var(--foreground)]">
                      {step.step}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{step.title}</span>
                      <span className="text-xs text-[var(--muted)]">{step.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4"
              hidden={isClientWizard ? userWizardStep !== 1 : false}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Identidad del usuario</p>
                  <p className="text-sm text-[var(--muted)]">Nombre, email, password y rol base del sistema.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Nombre de usuario</span>
                  <input
                    name="name"
                    defaultValue={editingUser.name}
                    placeholder="Nombre de usuario"
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingUser.email}
                    placeholder="email@cliente.com"
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  />
                </label>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Contraseña</span>
                  <input
                    name="password"
                    type="password"
                    value={generatedPassword}
                    onChange={(event) => setGeneratedPassword(event.target.value)}
                    placeholder={editingUser.id ? "Nueva contrasena (opcional)" : "Contrasena elegida por admin"}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  />
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Generar
                </button>
              </div>

              <label className="inline-flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.checked)}
                />
                Contrasena temporal, exigir cambio en el primer inicio de sesion
              </label>

              <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Rol de usuario</span>
                <select
                  name="uiRole"
                  value={selectedRole}
                  onChange={(event) => {
                    const nextRole = event.target.value as UiRole;
                    setSelectedRole(nextRole);
                    setUserWizardStep(1);
                    if (nextRole === "admin") {
                      setSelectedModuleIds([]);
                      setClientAccessConfig(createEmptyClientAccessConfig());
                      setModuleLimitState({});
                    }
                  }}
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="tester">Tester</option>
                  <option value="soporte">Soporte</option>
                </select>
              </div>
            </div>

            {showClientSection ? (
              <div
                className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4"
                hidden={isClientWizard ? userWizardStep !== 3 : false}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Tenant y acceso de cliente</p>
                    <p className="text-sm text-[var(--muted)]">Trial para prueba, Pro para cliente confirmado. Pro habilita submodulo y limites ampliados.</p>
                  </div>
                </div>

                {showSubmoduleCards ? (
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                      <Layers3 className="h-4 w-4" />
                      Modulos y submodulos
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {modules.map((module) => {
                        const moduleSelected = selectedModuleIds.includes(module.id);
                        const selectedSubmoduleIds = clientAccessConfig?.proSubmoduleIds ?? [];
                        const moduleSubmoduleIds = module.submodules.map((submodule) => submodule.id);
                        const selectedSubmoduleCount = moduleSubmoduleIds.filter((submoduleId) =>
                          selectedSubmoduleIds.includes(submoduleId),
                        ).length;

                        return (
                          <article
                            key={module.id}
                            className={[
                              "rounded-3xl border p-4 shadow-sm transition",
                              moduleSelected
                                ? "border-[var(--accent-strong)]/30 bg-[color-mix(in_srgb,var(--accent-strong)_4%,var(--surface))]"
                                : "border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent-strong)]/20",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={moduleSelected}
                                  onChange={(event) => {
                                    const nextChecked = event.target.checked;

                                    setSelectedModuleIds((current) => {
                                      const next = nextChecked
                                        ? Array.from(new Set([...current, module.id]))
                                        : current.filter((moduleId) => moduleId !== module.id);

                                      setModuleLimitState((limitsCurrent) => {
                                        const nextLimits = { ...limitsCurrent };
                                        if (!nextChecked) delete nextLimits[module.id];
                                        else if (!nextLimits[module.id]) {
                                          nextLimits[module.id] = { pages: "", chatbots: "" };
                                        }
                                        return nextLimits;
                                      });

                                      return next;
                                    });

                                    if (!nextChecked) {
                                      updateClientAccessConfig((current) => ({
                                        ...current,
                                        proSubmoduleIds: current.proSubmoduleIds.filter((submoduleId) => !moduleSubmoduleIds.includes(submoduleId)),
                                      }));
                                    }
                                  }}
                                  className="mt-1 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent-strong)]"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-[var(--foreground)]">{module.name}</p>
                                    <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                      {module.product === "BUSINESS" ? "Business" : "Labs"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-[var(--muted)]">
                                    {module.submodules.length > 0
                                      ? `${module.submodules.length} submodulos disponibles`
                                      : "Este modulo no tiene submodulos cargados."}
                                  </p>
                                </div>
                              </label>
                              <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                                {moduleSelected ? `${selectedSubmoduleCount} elegidos` : "Inactivo"}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-2">
                              {module.submodules.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                                  No hay submodulos para seleccionar.
                                </div>
                              ) : (
                                module.submodules.map((submodule) => {
                                  const checked = (clientAccessConfig?.proSubmoduleIds ?? []).includes(submodule.id);

                                  return (
                                    <label
                                      key={submodule.id}
                                      className={[
                                        "flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
                                        moduleSelected
                                          ? checked
                                            ? "border-[var(--accent-strong)]/35 bg-[color-mix(in_srgb,var(--accent-strong)_8%,var(--surface))]"
                                            : "border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent-strong)]/20"
                                          : "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-strong)] opacity-60",
                                      ].join(" ")}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!moduleSelected}
                                        onChange={(event) =>
                                          updateClientAccessConfig((current) => {
                                            const nextIds = event.target.checked
                                              ? Array.from(new Set([...current.proSubmoduleIds, submodule.id]))
                                              : current.proSubmoduleIds.filter((submoduleId) => submoduleId !== submodule.id);

                                            return {
                                              ...current,
                                              proSubmoduleIds: nextIds,
                                            };
                                          })
                                        }
                                        className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent-strong)] disabled:cursor-not-allowed"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--foreground)]">{submodule.name}</p>
                                        <p className="text-xs text-[var(--muted)]">Submodulo de {module.name}</p>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Plan base del cliente</span>
                    <select
                      value={clientAccessConfig?.tenantPlan ?? "TRIAL"}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          tenantPlan: event.target.value as TenantPlan,
                          proSubmoduleIds: current?.proSubmoduleIds ?? [],
                          moduleLimits: current?.moduleLimits ?? {},
                        }))
                      }
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    >
                      <option value="TRIAL">Trial</option>
                      <option value="PRO">Pro</option>
                    </select>
                    {effectiveLabsPlanLabel ? (
                      <span className="text-xs text-[var(--muted)]">
                        Labs efectivo: <strong className="text-[var(--foreground)]">{effectiveLabsPlanLabel}</strong>
                      </span>
                    ) : null}
                  </label>
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Estado base</span>
                    <div className="flex min-h-11 items-center rounded-xl border border-[var(--border-subtle)] px-3 text-sm text-[var(--muted)]">
                      {clientAccessConfig?.tenantPlan === "PRO"
                        ? "Cliente confirmado o pago verificado"
                        : "Cliente de prueba con limites reducidos"}
                    </div>
                  </div>
                </div>

                {canSelectSubmodule ? (
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Submodulos permitidos</span>
                    <select
                      multiple
                      value={(clientAccessConfig?.proSubmoduleIds ?? []).filter((submoduleId) =>
                        availableSubmodules.some((submodule) => submodule.id === submoduleId),
                      )}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          proSubmoduleIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                          moduleLimits: current?.moduleLimits ?? {},
                        }))
                      }
                      className="min-h-24 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                    >
                      {availableSubmodules.map((submodule) => (
                        <option key={submodule.id} value={submodule.id}>
                          {submodule.moduleName} · {submodule.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Nombre del tenant</span>
                    <input
                      value={clientAccessConfig?.tenantName ?? ""}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          tenantName: event.target.value,
                        }))
                      }
                      placeholder="Vase Cliente"
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Slug del tenant</span>
                    <input
                      value={clientAccessConfig?.tenantSlug ?? ""}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          tenantSlug: event.target.value,
                        }))
                      }
                      placeholder="cliente-prueba"
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Nombre comercial</span>
                    <input
                      value={clientAccessConfig?.accountName ?? ""}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          accountName: event.target.value,
                        }))
                      }
                      placeholder="Cuenta Vase"
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Industria</span>
                    <input
                      value={clientAccessConfig?.industry ?? ""}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          industry: event.target.value,
                        }))
                      }
                      placeholder="General"
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Estado del tenant</span>
                    <select
                      value={clientAccessConfig?.tenantStatus ?? "TRIAL"}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          tenantStatus: event.target.value as TenantStatus,
                        }))
                      }
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    >
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Activo</option>
                      <option value="SUSPENDED">Suspendido</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Rol en tenant</span>
                    <select
                      value={clientAccessConfig?.tenantRole ?? "OWNER"}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          tenantRole: event.target.value as TenantRole,
                        }))
                      }
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="MANAGER">Manager</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Estado de membership</span>
                    <select
                      value={clientAccessConfig?.membershipStatus ?? "ACTIVE"}
                      onChange={(event) =>
                        updateClientAccessConfig((current) => ({
                          ...(current ?? createEmptyClientAccessConfig()),
                          membershipStatus: event.target.value as MembershipStatus,
                        }))
                      }
                      className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INVITED">Invitado</option>
                      <option value="SUSPENDED">Suspendido</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                    <Layers3 className="h-4 w-4" />
                    Limites por modulo
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {clientModules.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">Selecciona al menos un modulo para definir limites.</p>
                    ) : (
                      clientModules.map((module) => {
                        const currentLimit = moduleLimitState[module.id] ?? { pages: "", chatbots: "" };
                        const isBusiness = module.product === "BUSINESS";
                        const label = isBusiness ? "Paginas habilitadas" : "Chatbots habilitados";
                        const helper = isBusiness
                          ? "Cuantas paginas podra publicar dentro de este modulo."
                          : "Cuantos chatbots podra agregar a su perfil.";

                        return (
                          <label key={module.id} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                            <div className="flex items-center gap-2">
                              {isBusiness ? <Building2 className="h-4 w-4 text-[var(--muted)]" /> : <Bot className="h-4 w-4 text-[var(--muted)]" />}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--foreground)]">{module.name}</p>
                                <p className="text-xs text-[var(--muted)]">{helper}</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">{label}</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={isBusiness ? currentLimit.pages : currentLimit.chatbots}
                              onChange={(event) =>
                                setModuleLimitState((current) => ({
                                  ...current,
                                  [module.id]: {
                                    ...toLimitState(current[module.id]),
                                    ...(isBusiness ? { pages: event.target.value } : { chatbots: event.target.value }),
                                  },
                                }))
                              }
                              className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4"
              hidden={isClientWizard ? userWizardStep !== 2 : false}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                  <BadgeInfo className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Accesos por modulo</p>
                  <p className="text-sm text-[var(--muted)]">Elige los modulos activos. Admin no necesita modulos; los demas roles quedan limitados por esta seleccion.</p>
                </div>
              </div>

              {modulesDisabled ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
                  No se requiere selector de modulos para Admin.
                </div>
              ) : (
                <>
                  <input type="hidden" name="moduleIds" value={selectedModuleIds.join(",")} />
                  <div className="grid gap-2 md:grid-cols-2">
                    {modules.map((module) => {
                      const checked = selectedModuleIds.includes(module.id);
                      const productLabel = module.product === "REST"
                        ? "Rest"
                        : module.product.charAt(0) + module.product.slice(1).toLowerCase();
                      return (
                        <label
                          key={module.id}
                          className={`inline-flex min-h-11 items-center gap-3 rounded-xl border px-3 transition ${
                            checked
                              ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-strong)_8%,transparent)]"
                              : "border-[var(--border-subtle)] bg-[var(--surface)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedModuleIds((current) => {
                                const next = event.target.checked
                                  ? [...current, module.id]
                                  : current.filter((moduleId) => moduleId !== module.id);

                                setModuleLimitState((limitsCurrent) => {
                                  const nextLimits = { ...limitsCurrent };
                                  if (!event.target.checked) delete nextLimits[module.id];
                                  else if (!nextLimits[module.id]) {
                                    nextLimits[module.id] = { pages: "", chatbots: "" };
                                  }
                                  return nextLimits;
                                });
                                return next;
                              });
                            }}
                          />
                          <span className="flex-1 text-sm text-[var(--foreground)]">{module.name}</span>
                          <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {productLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
              <button
                type="button"
                onClick={() => setUserWizardStep((current) => Math.max(1, current - 1))}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold transition ${
                  isClientWizard && userWizardStep > 1 ? "hover:bg-[var(--surface)]" : "opacity-40"
                }`}
                disabled={isClientWizard ? userWizardStep === 1 : true}
              >
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </button>

              {isClientWizard ? (
                userWizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setUserWizardStep((current) => Math.min(3, current + 1))}
                    disabled={userWizardStep === 2 && !clientWizardCanAdvance}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90 disabled:opacity-40"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={() => setAutoGeneratePassword(false)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
                  >
                    {editingUser.id ? "Guardar cambios" : "Crear usuario"}
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  onClick={() => setAutoGeneratePassword(false)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
                >
                  {editingUser.id ? "Guardar cambios" : "Crear usuario"}
                </button>
              )}
            </div>
          </form>
        ) : null}
      </CrudModal>

      <AdminModal
        open={Boolean(statusUser)}
        onClose={() => setStatusUser(null)}
        title={statusMode === "enable" ? "Reactivar usuario" : "Deshabilitar usuario"}
        description={
          statusMode === "enable"
            ? "La cuenta volvera a poder iniciar sesion y operar segun sus permisos actuales."
            : "La cuenta quedara bloqueada y se cerraran sus sesiones activas."
        }
        widthClassName="max-w-xl"
      >
        {statusUser ? (
          <form action={statusAction} className="grid gap-4">
            <input type="hidden" name="userId" value={statusUser.id} />
            <input type="hidden" name="isDisabled" value={statusMode === "disable" ? "true" : "false"} />
            <div className={`rounded-2xl border p-4 ${statusMode === "enable" ? "border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]" : "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${statusMode === "enable" ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]" : "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"}`}>
                  {statusMode === "enable" ? <ShieldCheck className="h-5 w-5" /> : <UserRoundX className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{statusUser.name}</p>
                  <p className="text-sm text-[var(--muted)]">{statusUser.email}</p>
                  {statusUser.isDisabled ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Deshabilitado: {formatDateTime(statusUser.disabledAt)} · {statusUser.disabledReason ?? "Sin motivo cargado"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            {statusMode === "disable" ? (
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Motivo visible para auditoria</span>
                <textarea
                  name="disabledReason"
                  rows={3}
                  placeholder="Ej: pedido del cliente, deuda critica, acceso comprometido..."
                  className="min-h-24 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_20%,transparent)]"
                />
              </label>
            ) : (
              <input type="hidden" name="disabledReason" value="" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStatusUser(null)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={statusPending}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${statusMode === "enable" ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`}
              >
                {statusMode === "enable" ? <ShieldCheck className="h-4 w-4" /> : <UserRoundX className="h-4 w-4" />}
                {statusPending ? "Guardando..." : statusMode === "enable" ? "Reactivar usuario" : "Deshabilitar usuario"}
              </button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <CrudModal
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title="Eliminar usuario definitivamente"
        description="El borrado es irreversible. Se limpian relaciones dependientes antes de eliminar el registro."
        widthClassName="max-w-2xl"
      >
        {deletingUser ? (
          <form action={deleteAction} className="grid gap-4">
            <input type="hidden" name="userId" value={deletingUser.id} />
            <div className="rounded-2xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-[var(--danger)]">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Vas a eliminar a {deletingUser.name}</p>
                  <p className="text-sm text-[var(--muted)]">Esta accion no se puede deshacer y borra accesos, roles y relaciones asociadas.</p>
                </div>
              </div>
            </div>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-4 text-sm font-semibold text-white transition hover:opacity-90">
              <Trash2 className="h-4 w-4" />
              Confirmar eliminacion
            </button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal
        open={Boolean(paymentUser)}
        onClose={() => setPaymentUser(null)}
        title="Historial y cobro del cliente"
        description="Historial, edicion y nuevo cobro en una sola vista con precio sugerido segun modulo."
        widthClassName="max-w-4xl"
      >
        {paymentUser ? (
          <div className="grid gap-4">
            <input type="hidden" name="userId" value={paymentUser.id} />

            <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{paymentUser.name}</p>
                    <p className="text-sm text-[var(--muted)]">{paymentUser.paymentSummary}</p>
                  </div>
                </div>
                <div className="hidden min-w-[200px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Progreso</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{paymentProgress.percentage}%</p>
                  <p className="text-xs text-[var(--muted)]">
                    Pagado {formatCurrency(paymentProgress.paid)} de {formatCurrency(paymentProgress.total || Number(paymentDraft.totalAmount || 0))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] sm:inline-grid sm:grid-cols-2 sm:self-start">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab("history");
                    setEditingPaymentId(null);
                  }}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm font-semibold transition ${
                    paymentTab === "history"
                      ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  <BadgeInfo className="h-4 w-4" />
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab("new");
                    if (!editingPaymentId) resetPaymentDraft(paymentUser);
                  }}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm font-semibold transition ${
                    paymentTab === "new"
                      ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo cobro
                </button>
              </div>
            </div>

            {paymentTab === "history" ? (
              <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                    <Layers3 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Historial de pagos</p>
                    <p className="text-sm text-[var(--muted)]">Edita o elimina cobros desde la misma fila.</p>
                  </div>
                </div>
                {selectedUserPaymentHistory.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Sin pagos registrados para este usuario.</p>
                ) : (
                  <div className="max-h-80 overflow-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--surface-strong)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--muted-soft)]">
                        <tr>
                          <th className="px-3 py-2">Concepto</th>
                          <th className="px-3 py-2">Modulo</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Pagado</th>
                          <th className="px-3 py-2">Falta</th>
                          <th className="px-3 py-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserPaymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-t border-[var(--border-subtle)]">
                            <td className="px-3 py-2 text-[var(--foreground)]">
                              <p className="font-medium">{payment.concept}</p>
                              <p className="text-[10px] text-[var(--muted)]">{payment.accountLabel}</p>
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">
                              <p>{payment.moduleLabel ?? "Sin modulo"}</p>
                              <p className="text-[10px] text-[var(--muted)]">{payment.submoduleLabel ?? ""}</p>
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">
                              <p>{payment.status}</p>
                              <p className="text-[10px] text-[var(--muted)]">
                                {payment.totalAmount > 0 ? `${Math.min(100, Math.round((payment.paidAmount / payment.totalAmount) * 100))}% pagado` : "Sin base"}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">{formatCurrency(payment.paidAmount)}</td>
                            <td className="px-3 py-2 text-[var(--muted)]">{formatCurrency(payment.pendingAmount)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditPayment(payment)}
                                  className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
                                  aria-label="Editar pago"
                                  title="Editar pago"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <form action={deletePaymentAction} className="inline-flex">
                                  <input type="hidden" name="paymentId" value={payment.id} />
                                  <button
                                    className="grid h-8 w-8 place-items-center rounded-md border border-[var(--danger)] text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                                    aria-label="Eliminar pago"
                                    title="Eliminar pago"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <form
                action={editingPaymentId ? updatePaymentAction : paymentAction}
                className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
              >
                <input type="hidden" name="userId" value={paymentUser.id} />
                <input type="hidden" name="clientAccountId" value={paymentUser.primaryClientAccountId ?? ""} />
                {editingPaymentId ? <input type="hidden" name="paymentId" value={editingPaymentId} /> : null}

                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent-strong)_14%,transparent)] text-[var(--accent-strong)] shadow-[0_16px_40px_color-mix(in_srgb,var(--accent-strong)_16%,transparent)]">
                    <HandCoins className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                      {editingPaymentId ? "Editar cobro" : "Nuevo cobro"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Registro simple con una sola fecha de cobro y vínculo al modulo.</p>
                  </div>
                </div>

                <label className="grid gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                    <ReceiptText className="h-4 w-4" />
                    Concepto
                  </span>
                  <input
                    name="concept"
                    value={paymentDraft.concept}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, concept: event.target.value }))}
                    placeholder="Ej: Desarrollo landing, hosting anual, mantenimiento junio..."
                    className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                    required
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Tipo de cobro</span>
                    <select
                    name="category"
                    value={paymentDraft.category}
                    onChange={(event) => {
                      const nextCategory = event.target.value as PaymentDraft["category"];
                      setPaymentDraft((current) => {
                        const nextDraft = {
                          ...current,
                          category: nextCategory,
                          moduleId:
                            nextCategory === "DEVELOPMENT" || nextCategory === "HOSTING" || nextCategory === "LABS_MONTHLY"
                              ? paymentModules.length === 1 && !current.moduleId
                                ? paymentModules[0].id
                                : current.moduleId
                              : current.moduleId,
                          submoduleId: nextCategory === "OTHER" || nextCategory === "TOKENS" || nextCategory === "MAINTENANCE" ? "" : current.submoduleId,
                        };
                        const suggestedPrice = resolvePaymentPrice(nextDraft);
                        return {
                          ...nextDraft,
                          totalAmount: suggestedPrice ? String(suggestedPrice.price) : current.totalAmount,
                        };
                      });
                    }}
                    className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                  >
                    {(Object.keys(paymentCategoryLabels) as PaymentDraft["category"][]).map((category) => (
                      <option key={category} value={category}>
                        {paymentCategoryLabels[category]}
                      </option>
                    ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Estado comercial</span>
                    <select
                    name="status"
                    value={paymentDraft.status}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, status: event.target.value as PaymentDraft["status"] }))}
                    className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                  >
                    {(Object.keys(paymentStatusLabels) as PaymentDraft["status"][]).map((status) => (
                      <option key={status} value={status}>
                        {paymentStatusLabels[status]}
                      </option>
                    ))}
                    </select>
                  </label>
                </div>

                {paymentDraft.category === "HOSTING" ? (
                  <div className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Ciclo de hosting</span>
                    <div className="grid grid-cols-2 gap-2">
                      {["MONTHLY", "YEARLY"].map((cycle) => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() =>
                            setPaymentDraft((current) => {
                              const nextDraft = { ...current, hostingCycle: cycle as PaymentDraft["hostingCycle"] };
                              const suggestedPrice = resolvePaymentPrice(nextDraft);
                              return {
                                ...nextDraft,
                                totalAmount: suggestedPrice ? String(suggestedPrice.price) : current.totalAmount,
                              };
                            })
                          }
                          className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                            paymentDraft.hostingCycle === cycle
                              ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-strong)_8%,transparent)] text-[var(--foreground)]"
                              : "border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                          }`}
                        >
                          {cycle === "MONTHLY" ? "Mensual" : "Anual"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <input type="hidden" name="moduleId" value={paymentDraft.moduleId} />
                <input type="hidden" name="submoduleId" value={paymentDraft.submoduleId} />

                {showDevelopmentFields ? (
                  <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Vinculo con modulo</p>
                        <p className="text-sm text-[var(--muted)]">Si es desarrollo, primero elegi el modulo y luego su submodulo si aplica.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {paymentModules.length > 1 ? (
                        <label className="grid gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Modulo</span>
                          <select
                            value={paymentDraft.moduleId}
                            onChange={(event) =>
                              setPaymentDraft((current) => {
                                const nextDraft = {
                                  ...current,
                                  moduleId: event.target.value,
                                  submoduleId: "",
                                };
                                const suggestedPrice = resolvePaymentPrice(nextDraft);
                                return {
                                  ...nextDraft,
                                  totalAmount: suggestedPrice ? String(suggestedPrice.price) : current.totalAmount,
                                };
                              })
                            }
                            className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                          >
                            <option value="">Seleccionar modulo</option>
                            {paymentModules.map((module) => (
                              <option key={module.id} value={module.id}>
                                {module.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="grid gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Modulo</span>
                          <div className="flex min-h-11 items-center rounded-xl border border-[var(--border-subtle)] px-3 text-sm text-[var(--muted)]">
                            {paymentModules[0]?.name ?? "Sin modulo asignado"}
                          </div>
                        </div>
                      )}

                      {selectedPaymentModule?.submodules?.length ? (
                        <label className="grid gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Submodulo</span>
                          <select
                            value={paymentDraft.submoduleId}
                            onChange={(event) =>
                              setPaymentDraft((current) => {
                                const nextDraft = {
                                  ...current,
                                  submoduleId: event.target.value,
                                };
                                const suggestedPrice = resolvePaymentPrice(nextDraft);
                                return {
                                  ...nextDraft,
                                  totalAmount: suggestedPrice ? String(suggestedPrice.price) : current.totalAmount,
                                };
                              })
                            }
                            className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                          >
                            <option value="">Seleccionar submodulo</option>
                            {selectedPaymentModule.submodules.map((submodule) => (
                              <option key={submodule.id} value={submodule.id}>
                                {submodule.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="grid gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Submodulo</span>
                          <div className="flex min-h-11 items-center rounded-xl border border-[var(--border-subtle)] px-3 text-sm text-[var(--muted)]">
                            {selectedPaymentModule ? "Este modulo no tiene submodulos" : "Selecciona un modulo"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Monto sugerido</p>
                      <p className="text-sm text-[var(--muted)]">
                        {paymentPriceSuggestion
                          ? `${paymentPriceSuggestion.type === "ONE_TIME" ? "Desarrollo" : paymentPriceSuggestion.type === "YEARLY" ? "Hosting anual" : "Hosting mensual"} · ${paymentPriceSuggestion.currency}`
                          : "Selecciona módulo y submódulo para autocompletar"}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {paymentPriceSuggestion ? formatCurrency(paymentPriceSuggestion.price) : formatCurrency(paymentProgress.total)}
                    </p>
                    {paymentPriceSuggestion ? (
                      <button
                        type="button"
                        onClick={() => setPaymentDraft((current) => ({ ...current, totalAmount: String(paymentPriceSuggestion.price) }))}
                        className="mt-1 cursor-pointer rounded-full border border-[color-mix(in_srgb,var(--accent-strong)_30%,transparent)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-strong)] hover:bg-[color-mix(in_srgb,var(--accent-strong)_10%,transparent)]"
                      >
                        Usar sugerido
                      </button>
                    ) : null}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-strong)]"
                      style={{ width: `${paymentProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                    <span>Pagado: {formatCurrency(paymentProgress.paid)}</span>
                    <span>Restante: {formatCurrency(paymentProgress.pending)}</span>
                    <span>{paymentProgress.percentage}% cubierto</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                      <Banknote className="h-4 w-4" />
                      Total a cobrar
                    </span>
                    <input
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Total"
                      value={displayedPaymentTotal}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, totalAmount: event.target.value }))}
                      className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                      required
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                      <CreditCard className="h-4 w-4" />
                      Pagado ahora
                    </span>
                    <input
                      name="paidAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Pagado"
                      value={paymentDraft.paidAmount}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAmount: event.target.value }))}
                      className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                      <CalendarCheck className="h-4 w-4" />
                      Fecha de pago
                    </span>
                    <input
                      name="paidAt"
                      type="date"
                      value={paymentDraft.paidAt}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAt: event.target.value }))}
                      className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Metodo</span>
                    <input
                      name="method"
                      placeholder="Transferencia, efectivo, Mercado Pago..."
                      value={paymentDraft.method}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}
                      className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Notas internas</span>
                  <input
                    name="notes"
                    placeholder="Referencia, saldo, comprobante, aclaracion para el equipo..."
                    value={paymentDraft.notes}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))}
                    className="min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 text-sm outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
                  >
                    <CreditCard className="h-4 w-4" />
                    {editingPaymentId ? "Guardar cobro" : "Registrar pago"}
                  </button>
                  {editingPaymentId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPaymentId(null);
                        resetPaymentDraft(paymentUser);
                        setPaymentTab("history");
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold"
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        ) : null}
      </CrudModal>

      <ActionToast toast={toast} />
    </section>
  );
}

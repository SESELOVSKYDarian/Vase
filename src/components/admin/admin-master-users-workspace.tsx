"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeInfo,
  Bot,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  createUserClientPaymentWithStateAction,
  deleteMasterUserWithStateAction,
  deleteClientPaymentWithStateAction,
  updateClientPaymentWithStateAction,
  type AdminGovernanceActionState,
  upsertMasterUserWithStateAction,
} from "@/app/(platform)/app/admin/actions";
import { AdminUserPasswordResetForm } from "@/components/admin/admin-user-password-reset-form";
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
  product: "BUSINESS" | "LABS";
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

const initialState: AdminGovernanceActionState = {};

const roleLabels: Record<UiRole, string> = {
  cliente: "Cliente",
  admin: "Admin",
  developer: "Developer",
  designer: "Designer",
  tester: "Tester",
  soporte: "Soporte",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
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

  const clientModules = useMemo(
    () => modules.filter((module) => selectedModuleIds.includes(module.id)),
    [modules, selectedModuleIds],
  );

  const availableSubmodules = useMemo(
    () => clientModules.flatMap((module) => module.submodules.map((submodule) => ({ ...submodule, moduleName: module.name }))),
    [clientModules],
  );

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
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Usuarios Registrados</h2>
          <p className="text-sm text-[var(--muted)]">Alta, edicion, acceso por modulos y cobros del cliente.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
          aria-label="Agregar usuario"
          title="Agregar usuario"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--surface-strong)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted-soft)]">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado de pago</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">{user.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{user.email}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{roleLabels[user.uiRole]}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{user.paymentSummary}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] transition hover:bg-[var(--surface-strong)]"
                        title="Ver pagos"
                        aria-label="Ver pagos"
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDeletingUser(user)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--danger)] text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                      title="Eliminar usuario"
                      aria-label="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Plan de cliente</span>
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
                      const isBusiness = module.product === "BUSINESS";
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
                          {isBusiness ? (
                            <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Business
                            </span>
                          ) : (
                            <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Labs
                            </span>
                          )}
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
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent-strong)_12%,transparent)] text-[var(--accent-strong)]">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {editingPaymentId ? "Editar cobro" : "Nuevo cobro"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Registro simple con una sola fecha de cobro y vínculo al modulo.</p>
                  </div>
                </div>

                <input
                  name="concept"
                  value={paymentDraft.concept}
                  onChange={(event) => setPaymentDraft((current) => ({ ...current, concept: event.target.value }))}
                  placeholder="Concepto de cobro"
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  required
                />

                <div className="grid gap-3 md:grid-cols-2">
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
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  >
                    <option value="DEVELOPMENT">Desarrollo</option>
                    <option value="HOSTING">Hosting</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="LABS_MONTHLY">Labs mensual</option>
                    <option value="TOKENS">Tokens</option>
                    <option value="OTHER">Otro</option>
                  </select>
                  <select
                    name="status"
                    value={paymentDraft.status}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, status: event.target.value as PaymentDraft["status"] }))}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="PAST_DUE">Pendiente</option>
                    <option value="TRIAL">Trial</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
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
                  <input
                    name="totalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Total"
                    value={displayedPaymentTotal}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, totalAmount: event.target.value }))}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    required
                  />
                  <input
                    name="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Pagado"
                    value={paymentDraft.paidAmount}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAmount: event.target.value }))}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    name="paidAt"
                    type="date"
                    value={paymentDraft.paidAt}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAt: event.target.value }))}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  />
                  <input
                    name="method"
                    placeholder="Metodo (ej: transferencia)"
                    value={paymentDraft.method}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                  />
                </div>

                <input
                  name="notes"
                  placeholder="Notas de pago parcial, saldo o referencia"
                  value={paymentDraft.notes}
                  onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3"
                />

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

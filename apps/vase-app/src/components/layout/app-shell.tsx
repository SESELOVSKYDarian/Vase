"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Bell,
  Blocks,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  FolderPlus,
  FlaskConical,
  Home,
  LifeBuoy,
  LogOut,
  MessageSquareWarning,
  Receipt,
  ScrollText,
  Shield,
  Search,
  Settings2,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
  Wallet,
  Wrench,
  X,
  Info,
  CalendarDays,
  LockKeyhole,
  Check,
} from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import {
  markAdminNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  markSystemNotificationAsReadAction,
} from "@/app/(platform)/app/notifications-actions";
import { markPlatformUpdateAsReadAction } from "@/app/(platform)/app/platform-updates-actions";
import type { PlatformModuleAccess } from "@/config/modules";
import type { ShellNotification } from "@/server/services/labs-notifications";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useRouter } from "next/navigation";
import { PricingModal } from "@/components/platform/pricing-modal";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { SupportChatProvider } from "@/components/support/support-chat-context";
import { BUSINESS_LAUNCH_PATH, BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";
import {
  toInternalAdminPath,
  toPublicAdminPath,
} from "@/lib/security/admin-host-routing";
import {
  requiresFullDocumentNavigation,
  resolveAppHomeHref,
  resolveLabsHomeHref,
  resolveNavigationHrefForHost,
  resolveShortcutHref,
} from "@/lib/navigation/document-navigation";

export interface Shortcut {
  id: string;
  label: string;
  combo: string;
  action: "link" | "command";
  target: string;
}

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  tenantLabel?: string;
  supportWidget?: ReactNode;
  modules?: PlatformModuleAccess[];
  shortcuts?: Shortcut[];
  notifications?: ShellNotification[];
  currentUserName?: string;
  projectCreation?: {
    business: { canCreate: boolean; remaining: number };
    labs: { canCreate: boolean; remaining: number };
  };
}>;

function subscribeToRuntimeHost() {
  return () => {};
}

function getRuntimeHostSnapshot() {
  return typeof window === "undefined" ? null : window.location.host;
}

function getServerRuntimeHostSnapshot() {
  return null;
}

function NavLink({
  href,
  className,
  onClick,
  forceDocumentNavigation = false,
  children,
}: {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  forceDocumentNavigation?: boolean;
  children: ReactNode;
}) {
  const runtimeHost = useSyncExternalStore(
    subscribeToRuntimeHost,
    getRuntimeHostSnapshot,
    getServerRuntimeHostSnapshot,
  );
  const resolvedHref = resolveNavigationHrefForHost(href, runtimeHost);
  const isExternalHref = /^https?:\/\//i.test(resolvedHref);

  if (isExternalHref || forceDocumentNavigation || requiresFullDocumentNavigation(resolvedHref)) {
    return (
      <a
        href={resolvedHref}
        className={className}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (forceDocumentNavigation && typeof window !== "undefined") {
            event.preventDefault();
            window.location.assign(resolvedHref);
          }
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={resolvedHref as Route} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: typeof Home;
  description?: string;
  forceDocumentNavigation?: boolean;
  children?: Array<{
    id: string;
    href: string;
    label: string;
    forceDocumentNavigation?: boolean;
  }>;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function inferActiveSection(pathname: string) {
  if (pathname.startsWith("/app/help")) {
    return "tickets";
  }

  if (pathname.startsWith("/app/billing")) {
    return "payments";
  }

  if (pathname.startsWith("/app/owner/customizations")) {
    return "quotes";
  }

  if (pathname.startsWith("/app/settings")) {
    return "profile";
  }

  if (pathname.startsWith("/app/labs")) {
    return "projects";
  }

  if (pathname.startsWith("/app/business") || pathname.startsWith("/app/owner")) {
    return "projects";
  }

  return "home";
}

function NotificationToneIcon({ tone }: { tone: "info" | "warning" | "danger" }) {
  if (tone === "danger") {
    return <TriangleAlert className="size-4 text-[var(--danger)]" />;
  }

  if (tone === "warning") {
    return <TriangleAlert className="size-4 text-[var(--warning)]" />;
  }

  return <Info className="size-4 text-[var(--info)]" />;
}

function notificationSourceClass(sourceLabel?: string) {
  switch (sourceLabel) {
    case "Vase Labs":
      return "border-[color-mix(in_srgb,var(--success)_28%,var(--border-subtle))] bg-[var(--success-soft)] text-[var(--success)]";
    case "Vase Business":
      return "border-[color-mix(in_srgb,var(--info)_28%,var(--border-subtle))] bg-[var(--info-soft)] text-[var(--info)]";
    case "Billing":
      return "border-[color-mix(in_srgb,var(--warning)_28%,var(--border-subtle))] bg-[var(--warning-soft)] text-[var(--warning)]";
    default:
      return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]";
  }
}

export function AppShell({
  title,
  subtitle,
  tenantLabel,
  supportWidget,
  notifications = [],
  modules = [],
  shortcuts = [],
  currentUserName,
  projectCreation,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/app";
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("vase-panel-theme") === "dark" ? "dark" : "light";
  });
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const activeSection = inferActiveSection(pathname);
  const cleanInternalAdminPath = toInternalAdminPath(pathname);
  const isAdminShell = pathname.startsWith("/app/admin") || cleanInternalAdminPath !== null;
  const activeAdminPath = cleanInternalAdminPath ?? pathname;
  const accountDisplayName =
    currentUserName?.trim() ||
    (isAdminShell ? "Admin Vase" : tenantLabel?.trim() || "Cuenta");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("vase-panel-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    if (!shortcuts || shortcuts.length === 0) return;

    let buffer = "";
    let lastKeyTime = 0;
    let mounted = true;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mounted) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 750) {
        buffer = "";
      }
      lastKeyTime = currentTime;
      buffer += (buffer ? " " : "") + e.key.toLowerCase();

      const matched = shortcuts.find((s) => s.combo === buffer);
      if (matched) {
        if (matched.action === "link") {
          const shortcutTarget = resolveShortcutHref(matched.id, matched.target);
          const target =
            shortcutTarget === "/app/business" || shortcutTarget === BUSINESS_LAUNCH_PATH
              ? BUSINESS_WORKSPACE_PATH
              : shortcutTarget;
          const resolvedTarget = resolveNavigationHrefForHost(target, window.location.host);
          if (/^https?:\/\//i.test(resolvedTarget) || requiresFullDocumentNavigation(resolvedTarget)) {
            window.location.assign(resolvedTarget);
            buffer = "";
            return;
          }
          try {
            routerRef.current.push(resolvedTarget as Route);
          } catch {
            // Router may not be ready yet; silently ignore
          }
        } else if (matched.action === "command") {
          if (matched.target === "open-new-project") {
            setIsNewProjectModalOpen(true);
          } else if (matched.target === "toggle-theme") {
            toggleTheme();
          }
        }
        buffer = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      mounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const notificationsLabel = useMemo(() => {
    if (unreadNotifications === 0) {
      return "No hay novedades";
    }

    return `${unreadNotifications} novedad${unreadNotifications === 1 ? "" : "es"}`;
  }, [unreadNotifications]);
  const businessModuleActive = modules.some((module) => module.key === "business" && module.isActive);
  const labsModuleActive = modules.some((module) => module.key === "labs" && module.isActive);
  const restModuleActive = modules.some((module) => module.key === "rest" && module.isActive);
  const labsHomeHref = resolveLabsHomeHref();
  const projectsHref = businessModuleActive ? BUSINESS_WORKSPACE_PATH : labsModuleActive ? labsHomeHref : "/app";

  const clientNavItems: NavItem[] = [
    { id: "home", href: resolveAppHomeHref(), label: "Inicio", icon: Home, description: "Sitio público de Vase" },
    {
      id: "projects",
      href: projectsHref,
      label: "Proyectos",
      icon: Building2,
      description: "Tus proyectos por producto",
      children: [
        businessModuleActive ? { id: "projects-business", href: BUSINESS_WORKSPACE_PATH, label: "Vase Business" } : null,
        labsModuleActive ? { id: "projects-labs", href: labsHomeHref, label: "Vase Labs", forceDocumentNavigation: true } : null,
        restModuleActive ? { id: "projects-rest", href: "https://rest.vase.ar", label: "Vase Rest", forceDocumentNavigation: true } : null,
      ].filter((item): item is { id: string; href: string; label: string; forceDocumentNavigation?: boolean } => Boolean(item)),
    },
    { id: "tickets", href: "/app/help", label: "Tickets", icon: MessageSquareWarning, description: "Soporte y seguimiento" },
    { id: "payments", href: "/app/billing", label: "Pagos", icon: CreditCard, description: "Pagos y comprobantes" },
    { id: "quotes", href: "/app/owner/customizations", label: "Presupuestos", icon: ClipboardCheck, description: "Propuestas y estados" },
    { id: "meetings", href: `${BUSINESS_WORKSPACE_PATH}#reuniones`, label: "Reuniones", icon: CalendarDays, description: "Agenda y decisiones" },
    { id: "profile", href: "/app/settings", label: "Perfil", icon: Settings2, description: "Cuenta y configuración" },
  ];

  const adminHref = (internalPath: string) => toPublicAdminPath(internalPath) ?? internalPath;
  const adminNavGroups: NavGroup[] = [
    {
      id: "overview",
      label: "Super Admin",
      items: [{ id: "admin-home", href: adminHref("/app/admin"), label: "Panel", icon: Shield, description: "Vista ejecutiva de plataforma" }],
    },
    {
      id: "access",
      label: "Acceso",
      items: [
        { id: "admin-users", href: adminHref("/app/admin/users"), label: "Usuarios", icon: UserCog, description: "Roles, modulos y cobros por cliente" },
        { id: "admin-modules", href: adminHref("/app/admin/modules"), label: "Modulos", icon: Blocks, description: "Catalogo, planes y precios" },
        { id: "admin-management", href: adminHref("/app/admin/management"), label: "Management", icon: Building2, description: "Precios, cuentas y sincronizacion" },
      ],
    },
    {
      id: "products",
      label: "Productos",
      items: [
        { id: "admin-rest", href: adminHref("/app/admin/rest"), label: "Vase Rest", icon: Building2, description: "Planes, contratos y operacion gastronomica" },
        { id: "admin-labs", href: adminHref("/app/admin/labs"), label: "Vase Labs", icon: FlaskConical, description: "Entitlements, limites y sincronizacion" },
      ],
    },
    {
      id: "money",
      label: "Finanzas",
      items: [
        { id: "admin-finance", href: adminHref("/app/admin/finance"), label: "Resumen", icon: Wallet, description: "Ingresos, cobros y saldos" },
        { id: "admin-expenses", href: adminHref("/app/admin/expenses"), label: "Gastos", icon: Receipt, description: "Egresos y vencimientos" },
      ],
    },
    {
      id: "operations",
      label: "Operaciones",
      items: [
        { id: "admin-meetings", href: adminHref("/app/admin/meetings"), label: "Reuniones", icon: CalendarDays, description: "Agenda y notas de clientes" },
        { id: "admin-quotes", href: adminHref("/app/admin/customizations"), label: "Presupuestos", icon: FileBarChart2, description: "Pipeline de cotizaciones" },
        { id: "admin-development", href: adminHref("/app/admin/development"), label: "Delivery", icon: Wrench, description: "Tareas y equipo dev" },
      ],
    },
    {
      id: "support",
      label: "Soporte",
      items: [
        { id: "admin-tickets", href: adminHref("/app/admin/tickets"), label: "Soporte", icon: MessageSquareWarning, description: "Gestor de incidencias" },
        { id: "admin-support", href: adminHref("/app/admin/support"), label: "Equipo", icon: LifeBuoy, description: "Base de soporte y equipo" },
      ],
    },
    {
      id: "knowledge",
      label: "Conocimiento",
      items: [
        { id: "admin-faqs", href: adminHref("/app/admin/faqs"), label: "FAQs", icon: ClipboardCheck, description: "Base de respuestas" },
        { id: "admin-wiki", href: adminHref("/app/admin/wiki"), label: "Wiki", icon: FileBarChart2, description: "Documentacion publica" },
      ],
    },
    {
      id: "settings",
      label: "Ajustes",
      items: [
        { id: "admin-settings", href: adminHref("/app/admin/settings"), label: "Ajustes", icon: SlidersHorizontal, description: "Reglas financieras y plataforma" },
        { id: "admin-audit", href: adminHref("/app/admin/audit"), label: "Auditoria", icon: ScrollText, description: "Eventos y trazabilidad" },
      ],
    },
  ];

  const navItems = isAdminShell ? adminNavGroups.flatMap((group) => group.items) : clientNavItems;

  const searchableItems = navItems.map((item) => ({
    id: item.id,
    href: item.href,
    label: item.label,
    description: item.description ?? "",
    icon: item.icon,
  }));

  const query = searchQuery.toLowerCase();
  const filteredResults = searchQuery.trim()
    ? searchableItems.filter((item) =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
      )
    : [];

  return (
    <SupportChatProvider>
    <div className="min-h-screen bg-[var(--surface)] text-[var(--foreground)]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--background)] lg:flex">
        <div className="p-6">
          <a
            href={resolveAppHomeHref()}
            aria-label="Ir a vase.ar"
            className="flex items-center gap-3"
          >
            <div className="grid h-10 w-10 place-items-center overflow-hidden">
              <Image src="/vasecolorlogo.png" alt="Vase" width={40} height={40} className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-newsreader)] text-[1.9rem] font-semibold italic leading-none tracking-tight text-[var(--foreground)]">
                Vase
              </h1>
            </div>
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-4">
          {isAdminShell ? (
            <div className="space-y-5 pb-4">
              {adminNavGroups.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const internalHref = toInternalAdminPath(item.href) ?? item.href;
                    const active = activeAdminPath === internalHref || activeAdminPath.startsWith(`${internalHref}/`);
                    return (
                      <Link
                        key={item.id}
                        href={item.href as Route}
                        className={[
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-200",
                          active
                            ? "bg-[var(--surface-strong)] font-semibold text-[var(--accent-strong)]"
                            : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]",
                        ].join(" ")}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {clientNavItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.id === activeSection ||
                  (item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)) ?? false);
                return (
                  <div key={item.id} className="space-y-1">
                    <NavLink
                      href={item.href as Route}
                      forceDocumentNavigation={item.forceDocumentNavigation}
                      className={[
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition-colors duration-200",
                        active
                          ? "bg-[var(--surface-strong)] font-semibold text-[var(--accent-strong)]"
                          : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]",
                      ].join(" ")}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                    {item.children ? (
                      <div className="ml-7 space-y-1">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <NavLink
                              key={child.id}
                              href={child.href as Route}
                              forceDocumentNavigation={child.forceDocumentNavigation}
                              className={[
                                "block rounded-lg px-3 py-2 text-[12px] transition-colors",
                                childActive
                                  ? "bg-[var(--surface-strong)] font-semibold text-[var(--accent-strong)]"
                                  : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]",
                              ].join(" ")}
                            >
                              {child.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] p-6">
          {!isAdminShell ? (
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)]"
            >
              <FolderPlus className="size-4" />
              Nuevo proyecto
            </button>
          ) : null}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="flex items-center gap-3 rounded-xl p-1 text-left transition hover:bg-[var(--surface-strong)]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--foreground)]">
                {tenantLabel?.slice(0, 2).toUpperCase() ?? "VA"}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--foreground)]">{accountDisplayName}</span>
                <span className="text-[10px] text-[var(--muted-soft)]">Gestion de cuenta</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsSignOutDialogOpen(true)}
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[var(--muted-soft)] transition-all hover:border-[#d9c2b8] hover:bg-[#fff4f1] hover:text-[#8a3c2b]"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 ml-0 flex h-20 items-center justify-between border-b border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--surface-strong)_88%,transparent)] px-6 backdrop-blur-md lg:ml-64 lg:px-8">
        <div className="flex flex-1 items-center gap-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-soft)]" />
            <input
              className="min-h-11 w-full rounded-full border-none bg-[color:color-mix(in_srgb,var(--background)_82%,white)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/20"
              placeholder={isAdminShell ? "Buscar secciones de administracion..." : "Buscar modulos, analiticas..."}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            {isSearchFocused && filteredResults.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-2 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-md">
                {filteredResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      href={item.href as Route}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--accent-soft)]"
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-strong)] text-[var(--accent-strong)]">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--foreground)]">{item.label}</span>
                        <span className="text-[11px] text-[var(--muted)]">{item.description}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            )}
            {isSearchFocused && searchQuery.trim() && filteredResults.length === 0 && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-4 text-center text-sm text-[var(--muted)] shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                No se encontraron resultados para &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
          <div />
        </div>

        <div className="flex items-center gap-5">
          <ThemeToggle
            checked={theme === "dark"}
            onChange={() => toggleTheme()}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((current) => !current)}
              className="relative text-[var(--muted)] transition-colors hover:text-[var(--accent-strong)]"
              aria-label="Notificaciones"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="size-5" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                  {unreadNotifications}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 top-12 z-50 w-[22rem] rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</p>
                    <p className="text-xs text-[var(--muted)]">{notificationsLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const platformUpdateIds = notifications
                          .filter((n) => n.notificationType === "platform_update" && !n.isRead)
                          .map((n) => n.id);
                        const adminNotificationIds = notifications
                          .filter((n) => n.notificationType === "admin_notification" && !n.isRead)
                          .map((n) => n.id);
                        const systemNotifications = notifications
                          .filter((n) => (n.notificationType === "system_hint" || n.notificationType === "labs_system") && !n.isRead)
                          .map((n) => ({
                            id: n.id,
                            notificationType: n.notificationType as "system_hint" | "labs_system",
                          }));
                        await markAllNotificationsAsReadAction({ platformUpdateIds, adminNotificationIds, systemNotifications });
                      }}
                      className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--border-subtle)] px-3 text-[11px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                    >
                      Marcar todo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)]"
                      aria-label="Cerrar notificaciones"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm leading-6 text-[var(--muted)]">
                    Todavía no hay novedades para este tenant.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="group relative flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 transition-all duration-200 hover:bg-[var(--accent-soft)]"
                      >
                        <NavLink
                          href={(notification.href ?? "#") as Route}
                          className="flex flex-1 items-start gap-3"
                          onClick={() => setIsNotificationsOpen(false)}
                        >
                          <NotificationToneIcon tone={notification.tone} />
                          <div className="space-y-1">
                            <span
                              className={[
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                                notificationSourceClass(notification.sourceLabel),
                              ].join(" ")}
                            >
                              {notification.sourceLabel ?? "Vase"}
                            </span>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {notification.title}
                            </p>
                            <p className="text-xs leading-6 text-[var(--muted)]">
                              {notification.description}
                            </p>
                          </div>
                        </NavLink>
                        {(notification.notificationType === "platform_update" ||
                          notification.notificationType === "admin_notification" ||
                          notification.notificationType === "system_hint" ||
                          notification.notificationType === "labs_system") && !notification.isRead && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (notification.notificationType === "platform_update") {
                                await markPlatformUpdateAsReadAction(notification.id);
                              } else if (notification.notificationType === "admin_notification") {
                                await markAdminNotificationAsReadAction(notification.id);
                              } else if (notification.notificationType === "system_hint" || notification.notificationType === "labs_system") {
                                await markSystemNotificationAsReadAction({
                                  notificationId: notification.id,
                                  notificationType: notification.notificationType,
                                });
                              }
                            }}
                            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-strong)] hover:text-white"
                            title="Marcar como leida"
                          >
                            <Check className="size-3.5" />
                            Leida
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="ml-0 space-y-10 p-6 lg:ml-64 lg:p-10">
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-5xl leading-tight text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-lg text-[var(--muted)]">{subtitle}</p>
          </div>
        </section>

        <section id="main-content" className="space-y-6">
          {children}
        </section>
      </main>

      {isSignOutDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,20,26,0.38)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Sesión
                </p>
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">
                  ¿Seguro que quieres cerrar sesión?
                </h3>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Si confirmas, cerraremos tu sesión actual y volverás a la pantalla de ingreso.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSignOutDialogOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                aria-label="Cerrar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsSignOutDialogOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
              >
                Cancelar
              </button>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#8a3c2b] px-5 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
                >
                  Sí, cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {!isAdminShell && isNewProjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,20,26,0.38)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Proyectos
                </p>
                <h3 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Crear nuevo proyecto
                </h3>
                <p className="text-[var(--muted)]">
                  Elige qué tipo de capacidad quieres desplegar en tu tenant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                aria-label="Cerrar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  key: "business",
                  title: "Tienda Online",
                  description: "Vende productos, gestiona catálogos y dominios.",
                  icon: Building2,
                  creationRoute: `${BUSINESS_WORKSPACE_PATH}#crear-pagina`,
                },
                {
                  key: "labs",
                  title: "Asistente Inteligente",
                  description: "IA entrenable para atención y automatización.",
                  icon: FlaskConical,
                  creationRoute: "/app/labs#knowledge",
                },
              ].map((option) => {
                const moduleAccess = modules.find((m) => m.key === option.key);
                const byModule = !moduleAccess?.isActive;
                const byCapacity =
                  option.key === "business"
                    ? !(projectCreation?.business.canCreate ?? true)
                    : !(projectCreation?.labs.canCreate ?? true);
                const isLocked = byModule || byCapacity;
                const Icon = option.icon;

                return (
                  <div
                    key={option.key}
                    className={[
                      "group relative flex flex-col justify-between rounded-[2rem] border p-6 transition-all duration-300",
                      isLocked
                        ? "border-dashed border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--background)_88%,white)] opacity-80"
                        : "border-[var(--border-subtle)] bg-[var(--surface-strong)] hover:-translate-y-1 hover:shadow-xl",
                    ].join(" ")}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          className={[
                            "grid h-12 w-12 place-items-center rounded-2xl transition-colors",
                            isLocked
                              ? "bg-[var(--surface)] text-[var(--muted-soft)]"
                              : "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
                          ].join(" ")}
                        >
                          <Icon className="size-6" />
                        </div>
                        {isLocked ? (
                          <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                            <LockKeyhole className="size-3" />
                            Bloqueado
                          </div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-[var(--accent-strong)]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[var(--foreground)]">
                          {option.title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <NavLink
                        href={(isLocked ? "/precios" : option.creationRoute) as Route}
                        className={[
                          "inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-all",
                          isLocked
                            ? "border border-[var(--border-subtle)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)]"
                            : "bg-[var(--accent-strong)] text-[var(--accent-contrast)] hover:opacity-90",
                        ].join(" ")}
                        onClick={() => setIsNewProjectModalOpen(false)}
                      >
                        {isLocked ? "Ver planes" : "Comenzar"}
                      </NavLink>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface-strong)_50%,transparent)] p-4 text-center">
              <p className="text-xs text-[var(--muted)]">
                ¿Necesitas algo a medida? {" "}
                <Link href={"/app/settings" as Route} className="font-semibold text-[var(--accent-strong)] hover:underline">
                  Ve a configuracion
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {supportWidget ?? <DashboardSupportWidget />}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </div>
    </SupportChatProvider>
  );
}

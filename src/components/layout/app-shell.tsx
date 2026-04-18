"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import {
  Bell,
  Building2,
  CircleHelp,
  CreditCard,
  FolderPlus,
  FlaskConical,
  Home,
  LogOut,
  Moon,
  Network,
  Sun,
  Search,
  Settings2,
  TriangleAlert,
  X,
  Info,
  Sparkles,
  TrendingUp,
  LockKeyhole,
  Check,
  Terminal,
} from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { markPlatformUpdateAsReadAction } from "@/app/(platform)/app/platform-updates-actions";
import { rolePanels } from "@/config/navigation";
import type { PlatformModuleAccess } from "@/config/modules";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useRouter } from "next/navigation";
import { PricingModal } from "@/components/platform/pricing-modal";

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
  notifications?: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    tone: "info" | "warning" | "danger";
    category: "platform" | "business" | "labs" | "billing";
    isPlatformUpdate?: boolean;
  }>;
}>;

function inferActiveSection(pathname: string) {
  if (pathname.startsWith("/app/help")) {
    return "help";
  }

  if (pathname.startsWith("/app/settings")) {
    return "settings";
  }

  if (pathname.startsWith("/app/billing")) {
    return "billing";
  }

  if (pathname.startsWith("/app/owner/integrations") || pathname.startsWith("/app/connections")) {
    return "connections";
  }

  if (pathname.startsWith("/app/labs")) {
    return "labs";
  }

  if (pathname.startsWith("/app/business") || pathname.startsWith("/app/owner")) {
    return "business";
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

export function AppShell({
  title,
  subtitle,
  tenantLabel,
  supportWidget,
  notifications = [],
  modules = [],
  shortcuts = [],
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
  const internalPortal =
    (tenantLabel ?? "").includes("Vision global") ||
    (tenantLabel ?? "").includes("Operacion interna") ||
    (tenantLabel ?? "").includes("Cobertura");

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
          try {
            routerRef.current.push(matched.target as any);
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
  const unreadNotifications = notifications.length;
  const notificationsLabel = useMemo(() => {
    if (unreadNotifications === 0) {
      return "No hay novedades";
    }

    return `${unreadNotifications} novedad${unreadNotifications === 1 ? "" : "es"}`;
  }, [unreadNotifications]);

  const navItems = [
    { id: "home", href: "/app", label: "Inicio", icon: Home },
    { id: "business", href: "/app/business", label: "Vase Business", icon: Building2 },
    { id: "labs", href: "/app/labs", label: "Vase Labs", icon: FlaskConical },
    { id: "connections", href: "/app/owner/integrations/api", label: "Conexiones", icon: Network },
    { id: "billing", href: "/app/billing", label: "Planes y facturación", icon: CreditCard },
    { id: "shortcuts", href: "/app/shortcuts", label: "Comandos", icon: Terminal },
    { id: "settings", href: "/app/settings", label: "Configuración", icon: Settings2 },
    { id: "help", href: "/app/help", label: "Ayuda", icon: CircleHelp },
  ] as const;

  const searchableItems = useMemo(() => [
    { id: "home", href: "/app", label: "Inicio", description: "Panel central de módulos", icon: Home },
    { id: "business", href: "/app/business", label: "Vase Business", description: "Ecommerce, páginas y presencia online", icon: Building2 },
    { id: "labs", href: "/app/labs", label: "Vase Labs", description: "IA, chatbot y automatización", icon: FlaskConical },
    { id: "analytics-sales", href: "/app/business", label: "Analíticas de Ventas", description: "KPIs comerciales y rendimiento", icon: TrendingUp },
    { id: "analytics-ia", href: "/app/labs", label: "Analíticas de IA", description: "Leads y conversaciones inteligentes", icon: Sparkles },
    { id: "connections", href: "/app/owner/integrations/api", label: "Conexiones", description: "APIs, webhooks e integraciones", icon: Network },
    { id: "billing", href: "/app/billing", label: "Planes y facturación", description: "Gestión de suscripción y recibos", icon: CreditCard },
    { id: "settings", href: "/app/settings", label: "Configuración", description: "Ajustes del tenant y la cuenta", icon: Settings2 },
    { id: "help", href: "/app/help", label: "Ayuda y Soporte", description: "Documentación y tickets humanos", icon: CircleHelp },
  ], []);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return searchableItems.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query)
    );
  }, [searchQuery, searchableItems]);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--foreground)]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--background)] lg:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Home className="size-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-[family-name:var(--font-newsreader)] text-2xl font-semibold italic tracking-tight text-[var(--foreground)]">
                Vase
              </h1>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted-soft)]">
                Premium Atelier
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeSection;

            return (
              <Link
                key={item.id}
                href={item.href as Route}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition-colors duration-200",
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
        </nav>

        <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] p-6">
          <button
            type="button"
            onClick={() => setIsNewProjectModalOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)]"
          >
            <FolderPlus className="size-4" />
            Nuevo proyecto
          </button>
          <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--background)_82%,white)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-strong)]">
              {internalPortal ? "Portal interno" : "Plan activo"}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {internalPortal ? "Acceso a herramientas operativas y de gobierno." : "Accede a módulos premium y más capacidad."}
            </p>
            <Link
              href={(internalPortal ? "/app" : "/precios") as Route}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#18c37e] px-4 text-xs font-bold text-[#004a2c] transition-opacity hover:opacity-90"
            >
              {internalPortal ? "Ir al resumen" : "Ver planes"}
            </Link>
          </div>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--foreground)]">
                {tenantLabel?.slice(0, 2).toUpperCase() ?? "VA"}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--foreground)]">Vase Admin</span>
                <span className="text-[10px] text-[var(--muted-soft)]">
                  {internalPortal ? "Acceso interno" : "Espacio del tenant"}
                </span>
              </div>
            </div>
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
              placeholder="Buscar módulos, analíticas..."
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
                    <Link
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
                    </Link>
                  );
                })}
              </div>
            )}
            {isSearchFocused && searchQuery.trim() && filteredResults.length === 0 && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-4 text-center text-sm text-[var(--muted)] shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                No se encontraron resultados para "{searchQuery}"
              </div>
            )}
          </div>
          <div className="hidden items-center gap-4 border-l border-[var(--border-subtle)] pl-6 md:flex">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)]" />
              <span className="text-[13px] font-bold text-[var(--accent-strong)]">
                {internalPortal ? "Portal interno" : "Estado: En línea"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <ThemeToggle
            checked={theme === "dark"}
            onChange={() => toggleTheme()}
          />
          {!internalPortal ? (
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="hidden min-h-10 items-center rounded-full bg-[var(--accent-strong)] px-6 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 md:inline-flex"
            >
              Ver planes
            </button>
          ) : null}
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
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)]"
                    aria-label="Cerrar notificaciones"
                  >
                    <X className="size-4" />
                  </button>
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
                        <Link
                          href={notification.href as Route}
                          className="flex flex-1 items-start gap-3"
                          onClick={() => setIsNotificationsOpen(false)}
                        >
                          <NotificationToneIcon tone={notification.tone} />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {notification.title}
                            </p>
                            <p className="text-xs leading-6 text-[var(--muted)]">
                              {notification.description}
                            </p>
                          </div>
                        </Link>
                        {notification.isPlatformUpdate && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await markPlatformUpdateAsReadAction(notification.id);
                            }}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted-soft)] opacity-0 transition-opacity hover:bg-[var(--accent-strong)] hover:text-white group-hover:opacity-100"
                            title="Marcar como visto"
                          >
                            <Check className="size-4" />
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
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-5xl leading-tight text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-lg text-[var(--muted)]">{subtitle}</p>
          </div>
          <div className="rounded-xl border-l-4 border-[var(--accent-strong)] bg-[var(--surface-strong)] px-6 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-soft)]">
              Estado general
            </p>
            <p className="font-[family-name:var(--font-newsreader)] text-lg text-[var(--accent-strong)]">
              {tenantLabel ?? "Operativo"}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {rolePanels.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--foreground)]">{item.label}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
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

      {isNewProjectModalOpen ? (
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
                  creationRoute: "/app/business#crear-pagina",
                },
                {
                  key: "labs",
                  title: "Asistente Inteligente",
                  description: "IA entrenable para atención y automatización.",
                  icon: FlaskConical,
                  creationRoute: "/app/labs#knowledge",
                },
              ].map((option) => {
                const module = modules.find((m) => m.key === option.key);
                const isLocked = !module?.isActive;
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
                      <Link
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
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface-strong)_50%,transparent)] p-4 text-center">
              <p className="text-xs text-[var(--muted)]">
                ¿Necesitas algo a medida? {" "}
                <Link href={"/app/help" as Route} className="font-semibold text-[var(--accent-strong)] hover:underline">
                  Contacta a soporte
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {supportWidget}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </div>
  );
}

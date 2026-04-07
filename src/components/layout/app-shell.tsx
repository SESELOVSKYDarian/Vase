import Link from "next/link";
import type { PropsWithChildren } from "react";
import {
  Bell,
  Building2,
  CircleHelp,
  CreditCard,
  FlaskConical,
  Home,
  Network,
  Search,
  Settings2,
} from "lucide-react";
import { rolePanels } from "@/config/navigation";

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  tenantLabel?: string;
}>;

function inferActiveSection(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("integraciones") || normalized.includes("api")) {
    return "connections";
  }

  if (normalized.includes("labs")) {
    return "labs";
  }

  if (normalized.includes("configuracion") || normalized.includes("presupuestos")) {
    return "settings";
  }

  if (normalized.includes("support")) {
    return "help";
  }

  if (normalized.includes("business")) {
    return "business";
  }

  return "home";
}

export function AppShell({ title, subtitle, tenantLabel, children }: AppShellProps) {
  const activeSection = inferActiveSection(title);
  const internalPortal =
    (tenantLabel ?? "").includes("Vision global") ||
    (tenantLabel ?? "").includes("Operacion interna") ||
    (tenantLabel ?? "").includes("Cobertura");

  const navItems = [
    { id: "home", href: "/app", label: "Inicio", icon: Home },
    { id: "business", href: "/app/owner", label: "Vase Business", icon: Building2 },
    { id: "labs", href: "/app/owner/labs", label: "Vase Labs", icon: FlaskConical },
    { id: "connections", href: "/app/owner/integrations/api", label: "Conexiones", icon: Network },
    { id: "billing", href: "/precios", label: "Planes y facturacion", icon: CreditCard },
    { id: "settings", href: "/app/owner/customizations", label: "Configuracion", icon: Settings2 },
    { id: "help", href: "/app/support", label: "Ayuda", icon: CircleHelp },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--foreground)]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-stone-50 lg:flex dark:bg-zinc-950">
        <div className="p-8">
          <h1 className="font-[family-name:var(--font-newsreader)] text-2xl italic text-emerald-900 dark:text-emerald-50">
            Vase Admin
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-stone-400">Management Portal</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeSection;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-4 py-3 text-[13px] transition-colors duration-200",
                  active
                    ? "border-r-4 border-[#18C37E] bg-white font-semibold text-emerald-800 dark:bg-zinc-900 dark:text-emerald-400"
                    : "text-stone-500 hover:bg-emerald-50/50 hover:text-emerald-700 dark:text-stone-400",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-6">
          <div className="rounded-xl bg-[var(--surface-strong)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-strong)]">
              {internalPortal ? "Portal interno" : "Plan activo"}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {internalPortal ? "Acceso a herramientas operativas y de gobierno." : "Accede a modulos premium y mas capacidad."}
            </p>
            <Link
              href={internalPortal ? "/app" : "/precios"}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[var(--accent-soft)] px-4 text-xs font-bold text-[var(--foreground)] transition-opacity hover:opacity-90"
            >
              {internalPortal ? "Ir al overview" : "Upgrade plan"}
            </Link>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 ml-0 flex h-20 items-center justify-between bg-white/80 px-6 backdrop-blur-md lg:ml-64 lg:px-8 dark:bg-zinc-950/80">
        <div className="flex flex-1 items-center gap-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input
              className="min-h-11 w-full rounded-full border-none bg-stone-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Search resources..."
              type="text"
            />
          </div>
          <div className="hidden items-center gap-4 border-l border-stone-100 pl-6 md:flex">
            <span className="text-[13px] font-bold text-emerald-600">
              {internalPortal ? "Portal interno" : "Pro Plan"}
            </span>
            <span className="text-[13px] text-stone-500">
              {tenantLabel ?? "Active status"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {!internalPortal ? (
            <Link
              href="/precios"
              className="hidden min-h-10 items-center rounded-full bg-[var(--accent-strong)] px-6 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 md:inline-flex"
            >
              Upgrade now
            </Link>
          ) : null}
          <button
            type="button"
            className="text-stone-500 transition-colors hover:text-emerald-500"
            aria-label="Notificaciones"
          >
            <Bell className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--accent-soft)] bg-[var(--surface-strong)] text-xs font-bold text-[var(--accent-strong)]">
              {tenantLabel?.slice(0, 2).toUpperCase() ?? "VA"}
            </div>
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
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
    </div>
  );
}

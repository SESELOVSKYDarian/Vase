import type { ReactNode } from "react";
import { Bot, LogOut, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { LabsOwnerNav, LabsOwnerMobileNav } from "./labs-owner-nav";
import { LabsSidebarShell } from "./labs-sidebar-shell";

function tenantInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function LabsOwnerLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error) {
      const authErrors = [
        "LABS_SESSION_REQUIRED",
        "LABS_SESSION_INVALID",
        "LABS_SESSION_EXPIRED",
        "LABS_AUTH_SECRET_MISSING",
      ];
      if (authErrors.includes(error.message)) {
        redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
      }
      if (error.message === "LABS_TENANT_FORBIDDEN") {
        redirect("https://app.vase.ar/app?labs=required");
      }
    }
    redirect("https://app.vase.ar/app");
  }

  const initials = tenantInitials(resolved.context.tenantName);
  const plan = resolved.context.entitlement.plan;

  return (
    <LabsSidebarShell mobileNav={<LabsOwnerMobileNav />} sidebar={<>
        <a href="/owner" className="labs-sidebar-brand mb-7 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="labs-sidebar-mark grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-newsreader)] text-[1.65rem] font-semibold italic leading-none tracking-tight text-[var(--foreground)]">
              Vase Labs
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Centro IA</p>
          </div>
        </a>

        <LabsOwnerNav />

        <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] px-1 pt-5">
          <a
            href="https://app.vase.ar/app"
            className="labs-sidebar-back flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-[var(--foreground)]"
          >
            <Sparkles className="size-4" />
            Volver a Vase
          </a>
          <div className="labs-sidebar-tenant flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[var(--foreground)]">{resolved.context.tenantName}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{plan}</p>
            </div>
            <LogOut className="size-4 text-[var(--muted-soft)]" aria-hidden="true" />
          </div>
        </div>
      </>}>{children}</LabsSidebarShell>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { ThemeToggleControl } from "@/components/ui/theme-toggle-control";
import { getLabsOwnerPageData } from "./_lib/labs-owner";
import { LabsOwnerMobileNav, LabsOwnerNav } from "./labs-owner-nav";

function tenantInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function LabsAdvancedLayout({ children }: { children: ReactNode }) {
  const { membership, dashboard } = await getLabsOwnerPageData();
  const initials = tenantInitials(membership.tenant.name);

  return (
    <div className="labs-shell overflow-x-hidden">
      <aside className="labs-sidebar fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col px-4 py-5 lg:flex">
        <Link
          href="/app/owner/labs"
          aria-label="Volver al Panel de Vase Labs"
          className="mb-7 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
        >
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-strong)] text-[var(--accent-contrast)]">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">Vase Labs</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Centro IA</p>
          </div>
        </Link>

        <LabsOwnerNav />

        <div className="mt-auto space-y-4 border-t border-[var(--border-subtle)] px-1 pt-5">
          <ThemeToggleControl compact />
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--foreground)]">{membership.tenant.name}</p>
              <p className="truncate text-[11px] text-[var(--muted)]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen px-4 py-5 sm:px-6 lg:ml-72 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[96rem]">
          <div className="mb-6 lg:hidden">
            <div className="grid gap-3">
              <ThemeToggleControl />
            </div>
          </div>
          <LabsOwnerMobileNav />
          {children}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-soft)_70%,transparent),transparent)]" />
    </div>
  );
}

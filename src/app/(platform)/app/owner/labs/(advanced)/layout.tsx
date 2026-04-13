import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-screen overflow-x-hidden bg-[#f8faf8] text-[#191c1b]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-[#e6e9e7] bg-[#f8faf8] px-5 py-6 shadow-[0px_24px_48px_rgba(25,28,27,0.06)] lg:flex">
        <div className="mb-10 flex items-center gap-3 px-3">
          <div className="grid h-11 w-11 place-items-center rounded-[1rem] bg-[#006d43] text-white">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-newsreader)] text-xl italic text-[#18c37e]">Vase Labs</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#191c1b]/60">El Atrio Organico</p>
          </div>
        </div>

        <LabsOwnerNav />

        <div className="mt-auto space-y-4 border-t border-[#e6e9e7] px-1 pt-6">
          <ThemeToggleControl compact />
          <div className="flex items-center gap-3 rounded-[1.2rem] bg-[#f2f4f2] p-4">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#18c37e]/20 text-[#006d43] ring-2 ring-[#18c37e]/10">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#191c1b]">{membership.tenant.name}</p>
              <p className="truncate text-[11px] text-[#6c7b70]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen px-6 py-8 lg:ml-72 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[96rem]">
          <div className="mb-6 lg:hidden">
            <ThemeToggleControl />
          </div>
          <LabsOwnerMobileNav />
          {children}
        </div>
      </main>

      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-1/2 w-1/3 rounded-full bg-gradient-to-bl from-[#006d43]/5 to-transparent blur-[120px] opacity-50" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-1/3 w-1/4 rounded-full bg-gradient-to-tr from-[#36684c]/5 to-transparent blur-[100px] opacity-50" />
    </div>
  );
}

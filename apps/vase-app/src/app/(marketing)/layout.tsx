import type { PropsWithChildren } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { CustomCursor } from "@/components/ui/custom-cursor";

export default function MarketingLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-x-hidden [--background:#EFF3F4] [--background-elevated:#EFF3F4] [--background-spot:rgba(115,147,116,0.16)] [--foreground:#000202] [--foreground-soft:#2F3030] [--surface:rgba(239,243,244,0.94)] [--surface-strong:rgba(245,248,248,0.98)] [--surface-inverse:#2F3030] [--muted:#4A5752] [--muted-soft:#739374] [--border-subtle:rgba(47,48,48,0.04)] [--border-strong:rgba(47,48,48,0.08)] [--accent:#3B633D] [--accent-strong:#2F3030] [--accent-soft:rgba(59,99,61,0.1)] [--accent-contrast:#EFF3F4] [--success:#3B633D] [--success-soft:rgba(59,99,61,0.1)] [--warning:#8A6B2D] [--warning-soft:rgba(138,107,45,0.1)] [--danger:#A1465E] [--danger-soft:rgba(161,70,94,0.1)] [--info:#4B6D7A] [--info-soft:rgba(75,109,122,0.1)] [--premium:#2F3030] [--premium-soft:rgba(47,48,48,0.08)] [--glass-highlight:rgba(255,255,255,0.42)] [--glass-shadow:rgba(47,48,48,0.06)] [--grid-line:rgba(47,48,48,0.02)]">
      <CustomCursor />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(115,147,116,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,99,61,0.08),transparent_24%),linear-gradient(180deg,#eff3f4_0%,#eff3f4_100%)]"
      />
      <SiteHeader />
      <main
        id="main-content"
        className="relative mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-6 pt-20 pb-8 lg:px-10 lg:pt-20 lg:pb-10"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

import type { PropsWithChildren } from "react";

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-3 py-1 text-xs font-semibold tracking-[0.24em] text-[#D7D0C7] uppercase">
      {children}
    </span>
  );
}

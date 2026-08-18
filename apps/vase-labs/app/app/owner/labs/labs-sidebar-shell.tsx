"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

const storageKey = "vase-labs-sidebar-pinned";

export function LabsSidebarShell({ sidebar, mobileNav, children }: { sidebar: ReactNode; mobileNav: ReactNode; children: ReactNode }) {
  const [pinned, setPinned] = useState(false);
  useEffect(() => setPinned(localStorage.getItem(storageKey) === "true"), []);
  function toggle() {
    setPinned((current) => {
      const next = !current;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }
  return <div className={`labs-shell overflow-x-hidden ${pinned ? "labs-sidebar-pinned" : ""}`}>
    <aside className="labs-sidebar labs-sidebar-frame fixed left-0 top-0 z-40 hidden h-screen flex-col px-4 py-5 lg:flex">
      <button className="labs-sidebar-toggle" type="button" onClick={toggle} aria-expanded={pinned} aria-label={pinned ? "Contraer barra lateral" : "Fijar barra lateral"}><Menu /></button>
      {sidebar}
    </aside>
    <main className="labs-shell-main min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8"><div className="mx-auto max-w-[96rem]">{mobileNav}{children}</div></main>
    <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-soft)_70%,transparent),transparent)]" />
  </div>;
}

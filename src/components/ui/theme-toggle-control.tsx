"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type ThemeMode = "light" | "dark";

export function ThemeToggleControl({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("vase-panel-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("vase-panel-theme", theme);
  }, [theme]);

  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-2xl border border-[#dbe3de] bg-white",
        compact ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Tema</p>
        <p className="truncate text-sm font-semibold text-[#191c1b]">{theme === "dark" ? "Modo oscuro" : "Modo claro"}</p>
      </div>
      <ThemeToggle checked={theme === "dark"} onChange={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
    </div>
  );
}

"use client";

import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThemeToggle({ checked, onChange }: ThemeToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center" aria-label="Cambiar tema">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="inline-flex h-10 w-20 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-1">
        <span
          className={[
            "inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200",
            checked
              ? "translate-x-10 bg-[var(--foreground)] text-[var(--background)]"
              : "translate-x-0 bg-[var(--accent-soft)] text-[var(--accent-strong)]",
          ].join(" ")}
        >
          {checked ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </span>
      </span>
    </label>
  );
}

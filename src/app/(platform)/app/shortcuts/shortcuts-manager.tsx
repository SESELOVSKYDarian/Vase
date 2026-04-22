"use client";

import { useState } from "react";
import { Command, Save, RotateCcw, Keyboard } from "lucide-react";
import { saveUserShortcutsAction } from "./actions";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";

export interface Shortcut {
  id: string;
  label: string;
  combo: string;
  action: "link" | "command";
  target: string;
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "goto_home", label: "Ir al Inicio", combo: "g h", action: "link", target: "/app" },
  { id: "goto_business", label: "Ir a Business", combo: "g b", action: "link", target: BUSINESS_LAUNCH_PATH },
  { id: "goto_labs", label: "Ir a Labs", combo: "g l", action: "link", target: "/app/labs" },
  { id: "new_project", label: "Nuevo Proyecto", combo: "n p", action: "command", target: "open-new-project" },
  { id: "toggle_theme", label: "Alternar Tema", combo: "t t", action: "command", target: "toggle-theme" },
];

export function ShortcutsManager({ initialShortcuts }: { initialShortcuts: any }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    if (initialShortcuts && Array.isArray(initialShortcuts)) {
      return initialShortcuts;
    }
    return DEFAULT_SHORTCUTS;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateCombo = (id: string, newCombo: string) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, combo: newCombo } : s));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveUserShortcutsAction(shortcuts);
    setIsSaving(false);
  };

  const handleReset = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Keyboard className="size-5" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Mis Atajos</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-6 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)]"
            >
              <RotateCcw className="size-4" />
              Restaurar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-strong)] px-8 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4 transition-colors hover:border-[var(--accent-strong)]/30"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--foreground)]">{shortcut.label}</span>
                <span className="text-xs text-[var(--muted)]">
                  Acción: {shortcut.action === 'link' ? `Ir a ${shortcut.target}` : 'Comando especial'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shortcut.combo}
                  onChange={(e) => handleUpdateCombo(shortcut.id, e.target.value)}
                  placeholder="Ej: g h"
                  className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-2 text-center text-sm font-mono text-[var(--accent-strong)] transition focus:ring-2 focus:ring-[var(--accent-strong)]/20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] bg-[var(--accent-soft)] p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Command className="size-5 text-[var(--accent-strong)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--accent-strong)]">Tip de productividad</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Presiona rápidamente las teclas indicadas en secuencia. Por ejemplo, para "Ir al Inicio", presiona <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-xs">g</kbd> y luego <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-xs">h</kbd>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

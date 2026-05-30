"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert, X } from "lucide-react";
import { type AdminPasswordResetActionState, resetUserPasswordByAdminAction } from "@/app/(platform)/app/admin/actions";

type Props = {
  userId: string;
  iconOnly?: boolean;
};

const initialState: AdminPasswordResetActionState = {};

export function AdminUserPasswordResetForm({ userId, iconOnly = false }: Props) {
  const [state, formAction] = useActionState(resetUserPasswordByAdminAction, initialState);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (state.generatedPassword) {
      setOpen(true);
    }
  }, [state.generatedPassword]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => copyButtonRef.current?.focus(), 40);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleCopy = async () => {
    if (!state.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(state.generatedPassword);
      setToast({ tone: "success", message: "Contrasena copiada al portapapeles." });
    } catch {
      setToast({ tone: "error", message: "No se pudo copiar automaticamente." });
    }
  };

  return (
    <>
      <form
        action={formAction}
        className={
          iconOnly
            ? "inline-flex"
            : "grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3"
        }
      >
        <input type="hidden" name="userId" value={userId} />
        {iconOnly ? (
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)]"
            title="Restablecer contrasena"
            aria-label="Restablecer contrasena"
          >
            <KeyRound className="h-4 w-4" />
          </button>
        ) : (
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold">
            <KeyRound className="h-4 w-4" />
            Restablecer contrasena
          </button>
        )}
        {!iconOnly && state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
        {!iconOnly && state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
      </form>

      {open && state.generatedPassword ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Contrasena temporal generada"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Contrasena temporal creada</p>
                  <p className="text-xs text-[var(--muted)]">
                    Entregala al usuario y pedile que la cambie al iniciar sesion.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar modal"
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted-soft)]">Temporal</p>
              <code className="break-all text-sm font-semibold text-[var(--foreground)]">{state.generatedPassword}</code>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                ref={copyButtonRef}
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                <Copy className="h-4 w-4" />
                Copiar contrasena
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[130] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm shadow-lg">
          <p className={`inline-flex items-center gap-2 ${toast.tone === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {toast.tone === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </p>
        </div>
      ) : null}
    </>
  );
}

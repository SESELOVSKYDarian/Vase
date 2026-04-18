"use client";

import { useActionState } from "react";
import { Globe, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestDomainConnectionAction } from "@/app/(platform)/app/owner/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { AuthNotice } from "@/components/auth/auth-notice";

const initialState = {};

export function DomainConnectionForm({ 
  pageId, 
  canUseCustomDomain 
}: { 
  pageId: string;
  canUseCustomDomain: boolean;
}) {
  const [state, formAction] = useActionState(requestDomainConnectionAction, initialState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <AuthNotice kind="success" message={state.success} />
        <AuthNotice kind="error" message={state.error} />
        
        <input type="hidden" name="storefrontPageId" value={pageId} />
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="hostname">
            Dominio
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
              <Globe className="size-4" />
            </div>
            <input
              id="hostname"
              name="hostname"
              type="text"
              placeholder="ej: www.mi-tienda.com"
              required
              disabled={!canUseCustomDomain}
              className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] pl-11 pr-4 text-[var(--foreground)] placeholder:text-[var(--muted-soft)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
            />
          </div>
          {state.fieldErrors?.hostname && (
            <p className="text-xs font-medium text-[var(--danger)]">
              {state.fieldErrors.hostname[0]}
            </p>
          )}
          <p className="text-xs text-[var(--muted)]">
            Ingresa el dominio completo incluyendo www o el subdominio que quieras usar.
          </p>
        </div>

        {!canUseCustomDomain ? (
            <div className="rounded-2xl border border-[#E7C7C1] bg-[#F9F1F0] p-4 text-sm text-[var(--danger)]">
                <div className="flex gap-3">
                    <AlertCircle className="size-5 shrink-0" />
                    <p>Tu plan actual no incluye el uso de dominios personalizados. Actualiza a un plan superior para habilitar esta función.</p>
                </div>
            </div>
        ) : (
            <SubmitButton
                pendingLabel="Registrando dominio..."
                className="w-full min-h-12 rounded-full bg-[var(--accent-strong)] text-sm font-semibold text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-soft)] hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
                Conectar dominio
            </SubmitButton>
        )}
      </form>

      {/* Guía DNS Rápida */}
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6 md:p-8">
        <h3 className="flex items-center gap-2 font-serif text-xl text-[var(--foreground)]">
          <CheckCircle2 className="size-5 text-[var(--accent)]" />
          Configuración DNS requerida
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
          Para que tu dominio funcione con Vase, debes añadir estos registros en el panel de tu proveedor de dominios (ej. Nic.ar, GoDaddy, Cloudflare).
        </p>

        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]">
            <div className="grid grid-cols-3 bg-[var(--surface-strong)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <span>Tipo</span>
              <span>Host/Nombre</span>
              <span>Valor/Destino</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-4 text-sm font-mono items-center">
              <span className="font-sans font-bold text-[var(--accent)]">A</span>
              <span>@</span>
              <span className="text-[var(--foreground)] font-bold">[IP_DEL_SERVIDOR]</span>
            </div>
            <div className="grid grid-cols-3 border-t border-[var(--border-subtle)] px-4 py-4 text-sm font-mono items-center">
              <span className="font-sans font-bold text-[var(--accent)]">CNAME</span>
              <span>www</span>
              <span className="text-[var(--foreground)] font-bold">vase.ar</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl bg-blue-50 p-4 text-xs leading-relaxed text-blue-700">
          <AlertCircle className="size-4 shrink-0" />
          <p>
            Los cambios en DNS pueden tardar hasta 24 horas en propagarse globalmente. 
            Una vez configurados, el sistema validará automáticamente la conexión.
          </p>
        </div>
      </div>
    </div>
  );
}

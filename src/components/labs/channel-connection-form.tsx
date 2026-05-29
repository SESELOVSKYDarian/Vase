"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { connectLabsChannelAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

type ChannelConnectionFormProps = {
  canUseInstagram: boolean;
  mode?: "ALL" | "META_ONLY" | "BAILEYS_ONLY";
};

export function ChannelConnectionForm({ canUseInstagram, mode = "ALL" }: ChannelConnectionFormProps) {
  const [state, formAction] = useActionState(connectLabsChannelAction, initialState);
  const [channelType, setChannelType] = useState("WHATSAPP");
  const [provider, setProvider] = useState(mode === "BAILEYS_ONLY" ? "OPENWA_UNOFFICIAL" : "META_OFFICIAL");
  const isWhatsApp = channelType === "WHATSAPP";
  const effectiveProvider =
    mode === "META_ONLY" ? "META_OFFICIAL" : mode === "BAILEYS_ONLY" ? "OPENWA_UNOFFICIAL" : provider;
  const isOfficial = effectiveProvider === "META_OFFICIAL";
  const isOpenWaOnly = mode === "BAILEYS_ONLY";
  const [copiedField, setCopiedField] = useState<"webhook" | "token" | null>(null);
  const officialHelper = useMemo(
    () => "Credenciales oficiales de Meta Cloud API. Recomendado para alta confiabilidad.",
    [],
  );
  const unofficialHelper = useMemo(
    () =>
      "Ruta no oficial via Baileys. Conexion rapida por QR y mayor riesgo operativo/compliance bajo responsabilidad del cliente.",
    [],
  );

  const copyValue = async (kind: "webhook" | "token", value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(kind);
      window.setTimeout(() => setCopiedField((prev) => (prev === kind ? null : prev)), 1800);
    } catch {
      setCopiedField(null);
    }
  };

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {mode === "ALL" ? (
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Canal</span>
            <select
              name="channelType"
              value={channelType}
              onChange={(event) => setChannelType(event.target.value)}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="WEBCHAT">Webchat</option>
              <option value="INSTAGRAM" disabled={!canUseInstagram}>
                Instagram
              </option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="channelType" value="WHATSAPP" />
        )}
        {mode === "ALL" ? (
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Proveedor WhatsApp</span>
            <select
              name="provider"
              disabled={!isWhatsApp}
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)] disabled:opacity-60"
            >
              <option value="META_OFFICIAL">Meta oficial (seguro)</option>
              <option value="OPENWA_UNOFFICIAL">Baileys QR (no oficial)</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="provider" value={effectiveProvider} />
        )}
        {isOpenWaOnly ? (
          <input name="accountLabel" type="hidden" value={`Baileys ${new Date().toISOString().slice(0, 10)}`} />
        ) : (
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Nombre de la cuenta</span>
            <input
              name="accountLabel"
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
        )}
      </div>
      {isOpenWaOnly ? null : (
        <>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Handle o telefono</span>
            <input
              name="externalHandle"
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Notas</span>
            <textarea
              name="notes"
              rows={3}
              className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
            />
          </label>
        </>
      )}

      {isWhatsApp ? (
        <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">{isOfficial ? officialHelper : unofficialHelper}</p>
          {isOfficial ? (
            <>
              <input name="accessToken" placeholder="Meta Access Token" className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
              <input name="phoneNumberId" placeholder="Phone Number ID" className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
              <input name="appSecret" placeholder="App Secret (firma webhook)" className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
              <input name="verifyToken" placeholder="Verify Token (opcional, autogenerado si vacio)" className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
            </>
          ) : (
            <>
              <input type="hidden" name="openwaBaseUrl" value="" />
              <input type="hidden" name="openwaApiKey" value="" />
              <div className="rounded-2xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,white)] px-4 py-3 text-sm text-[var(--foreground)]">
                Conexión automática por backend. Solo toca el botón y Vase generará el QR.
              </div>
            </>
          )}
        </div>
      ) : null}

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        {isOpenWaOnly ? "Guardar y habilitar QR" : "Conectar canal"}
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.info ? <p className="text-sm leading-6 text-[var(--muted)]">{state.info}</p> : null}
      {state.webhookUrl || state.webhookVerifyToken ? (
        <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">Webhook de Meta</p>
          {state.webhookUrl ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--muted)]">Callback URL</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-xl border border-[var(--border-subtle)] bg-white/80 px-3 py-2 text-xs text-[var(--foreground)]">
                  {state.webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyValue("webhook", state.webhookUrl)}
                  className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]"
                >
                  {copiedField === "webhook" ? "Copiado" : "Copiar URL"}
                </button>
              </div>
            </div>
          ) : null}
          {state.webhookVerifyToken ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--muted)]">Verify Token</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-xl border border-[var(--border-subtle)] bg-white/80 px-3 py-2 text-xs text-[var(--foreground)]">
                  {state.webhookVerifyToken}
                </code>
                <button
                  type="button"
                  onClick={() => copyValue("token", state.webhookVerifyToken)}
                  className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]"
                >
                  {copiedField === "token" ? "Copiado" : "Copiar token"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

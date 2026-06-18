"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Check, Copy } from "lucide-react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { connectLabsChannelAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

type ChannelConnectionFormProps = {
  canUseInstagram: boolean;
  mode?: "ALL" | "META_ONLY" | "BAILEYS_ONLY";
  webhookPreviewUrl?: string;
  initialWebhookVerifyToken?: string;
  channelId?: string;
  initialAccountLabel?: string;
  initialExternalHandle?: string | null;
  initialPhoneNumberId?: string;
  submitLabel?: string;
};

export function ChannelConnectionForm({
  canUseInstagram,
  mode = "ALL",
  webhookPreviewUrl,
  initialWebhookVerifyToken,
  channelId,
  initialAccountLabel,
  initialExternalHandle,
  initialPhoneNumberId,
  submitLabel,
}: ChannelConnectionFormProps) {
  const [state, formAction] = useActionState(connectLabsChannelAction, initialState);
  const [channelType, setChannelType] = useState("WHATSAPP");
  const [provider, setProvider] = useState(mode === "BAILEYS_ONLY" ? "OPENWA_UNOFFICIAL" : "META_OFFICIAL");
  const isWhatsApp = channelType === "WHATSAPP";
  const effectiveProvider =
    mode === "META_ONLY" ? "META_OFFICIAL" : mode === "BAILEYS_ONLY" ? "OPENWA_UNOFFICIAL" : provider;
  const isOfficial = effectiveProvider === "META_OFFICIAL";
  const isOpenWaOnly = mode === "BAILEYS_ONLY";
  const [copiedField, setCopiedField] = useState<"webhook" | "token" | null>(null);
  const [webhookVerifyToken] = useState(
    () =>
      initialWebhookVerifyToken ||
      (mode !== "BAILEYS_ONLY" && isOfficial
        ? `vase_meta_preview_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
        : ""),
  );
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

  const copyMetaSetup = async () => {
    const lines = [webhookPreviewUrl ? `Callback URL: ${webhookPreviewUrl}` : null, webhookVerifyToken ? `Verify Token: ${webhookVerifyToken}` : null].filter(Boolean);
    if (!lines.length) return;
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedField("token");
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setCopiedField(null);
    }
  };

  return (
    <form action={formAction} className="grid gap-4">
      {channelId ? <input type="hidden" name="channelId" value={channelId} /> : null}
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
        {channelId ? null : (
          <input
            name="accountLabel"
            type="hidden"
            value={isOpenWaOnly ? `Baileys ${new Date().toISOString().slice(0, 10)}` : `${isOfficial ? "Meta" : "Canal"} ${new Date().toISOString().slice(0, 10)}`}
          />
        )}
      </div>
      {channelId ? (
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="accountLabel"
            defaultValue={initialAccountLabel ?? ""}
            placeholder="Nombre visible del canal"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]"
          />
          <input
            name="externalHandle"
            defaultValue={initialExternalHandle ?? ""}
            placeholder="Handle o telefono visible"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]"
          />
        </div>
      ) : (
        <input name="externalHandle" type="hidden" value="" />
      )}
      <input name="notes" type="hidden" value="" />

      {isWhatsApp ? (
        <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-medium text-[var(--foreground)]">{isOfficial ? officialHelper : unofficialHelper}</p>
            {isOfficial && (webhookPreviewUrl || webhookVerifyToken) ? (
              <button
                type="button"
                onClick={copyMetaSetup}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white/80 px-4 text-xs font-semibold text-[var(--foreground)] transition hover:bg-white"
              >
                {copiedField ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiedField ? "Copiado" : "Copiar todo"}
              </button>
            ) : null}
          </div>
          {isOfficial && webhookPreviewUrl ? (
            <div className="grid gap-2 rounded-2xl border border-[#18c37e]/25 bg-[#f1fbf5] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2b6b4f]">Callback URL lista para copiar</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-xl border border-[#b9e7cc] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
                  {webhookPreviewUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyValue("webhook", webhookPreviewUrl)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#b9e7cc] px-4 text-xs font-semibold text-[#2b6b4f]"
                >
                  {copiedField === "webhook" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedField === "webhook" ? "Copiado" : "Copiar URL"}
                </button>
              </div>
            </div>
          ) : null}
          {isOfficial ? (
            <>
              <input type="hidden" name="verifyToken" value={webhookVerifyToken} />
              <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Verify Token</p>
                  <button
                    type="button"
                    onClick={() => copyValue("token", webhookVerifyToken)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]"
                  >
                    {copiedField === "token" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiedField === "token" ? "Copiado" : "Copiar token"}
                  </button>
                </div>
                <code className="break-all rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
                  {webhookVerifyToken}
                </code>
                <p className="text-xs leading-6 text-[var(--muted)]">
                  Usa este mismo token en Meta antes de presionar verificar. Vase lo reconocerá desde el inicio.
                </p>
              </div>
              <input name="accessToken" placeholder={channelId ? "Nuevo Meta Access Token (opcional)" : "Meta Access Token"} className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
              <input name="phoneNumberId" defaultValue={initialPhoneNumberId ?? ""} placeholder="Phone Number ID" className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
              <input name="appSecret" placeholder={channelId ? "Nuevo App Secret (opcional)" : "App Secret (firma webhook)"} className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-white/80 px-4 text-sm text-[var(--foreground)]" />
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
        {submitLabel ?? (isOpenWaOnly ? "Guardar y habilitar QR" : "Conectar canal")}
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
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]"
                >
                  {copiedField === "webhook" ? <Check className="size-4" /> : <Copy className="size-4" />}
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
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]"
                >
                  {copiedField === "token" ? <Check className="size-4" /> : <Copy className="size-4" />}
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

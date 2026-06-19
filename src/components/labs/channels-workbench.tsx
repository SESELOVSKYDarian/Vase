"use client";

import { Cable, CircleHelp, Pencil, Plus } from "lucide-react";
import { ChannelConnectionForm } from "@/components/labs/channel-connection-form";
import { ChannelDeleteForm } from "@/components/labs/channel-delete-form";
import { OpenWaQrCard } from "@/components/labs/openwa-qr-card";
import { LabsDrawer, LabsModal } from "@/components/labs/labs-overlays";
import { LabsEmptyState, LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";

type ChannelRow = {
  id: string;
  channelType: string;
  accountLabel: string;
  externalHandle: string | null;
  status: string;
  config: unknown;
};

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "ERROR":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

function readConfig(config: unknown) {
  return config && typeof config === "object" ? (config as Record<string, unknown>) : {};
}

export function ChannelsWorkbench({
  channels,
  canUseInstagram,
  webhookPreviewUrl,
  webhookVerifyToken,
}: {
  channels: ChannelRow[];
  canUseInstagram: boolean;
  webhookPreviewUrl: string;
  webhookVerifyToken: string;
}) {
  return (
    <div className="space-y-4">
      <LabsSection>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">{channels.length} canales registrados</p>
            <p className="text-xs text-[var(--muted)]">Meta oficial, WhatsApp QR y canales web.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LabsModal
              title="Conectar canal"
              description="Crea un canal oficial de Meta o un canal QR segun tu operacion."
              size="lg"
              trigger={<span className="labs-button labs-button-primary"><Plus className="size-4" /> Nuevo canal</span>}
            >
              <ChannelConnectionForm
                canUseInstagram={canUseInstagram}
                webhookPreviewUrl={webhookPreviewUrl}
                initialWebhookVerifyToken={webhookVerifyToken}
              />
            </LabsModal>
            <LabsDrawer
              title="Guia de Meta"
              description="Datos necesarios para activar WhatsApp Business e Instagram."
              trigger={<span className="labs-button labs-button-secondary"><CircleHelp className="size-4" /> Guia</span>}
            >
              <div className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
                {[
                  ["Crear app", "Crea una app tipo Business en Meta for Developers y agrega WhatsApp o Instagram Graph API."],
                  ["Credenciales", "Ten a mano Access Token, Phone Number ID, App Secret y permisos de negocio aprobados."],
                  ["Webhook", "Usa la Callback URL y Verify Token que Vase muestra al conectar el canal."],
                  ["Prueba", "Envia un mensaje de prueba y confirma que entra al inbox de Labs."],
                ].map(([title, description]) => (
                  <div key={title} className="labs-subpanel p-4">
                    <p className="font-semibold text-[var(--foreground)]">{title}</p>
                    <p className="mt-1">{description}</p>
                  </div>
                ))}
              </div>
            </LabsDrawer>
          </div>
        </div>
      </LabsSection>

      <LabsSection title="Canales">
        {channels.length === 0 ? (
          <LabsEmptyState title="Sin canales conectados" description="Conecta WhatsApp, Instagram o Webchat para empezar a recibir conversaciones." />
        ) : (
          <div className="grid gap-3">
            {channels.map((channel) => {
              const config = readConfig(channel.config);
              const provider = "provider" in config ? String(config.provider) : "N/A";
              const phoneNumberId = typeof config.phoneNumberId === "string" ? config.phoneNumberId : "";
              const isBaileys = provider === "BAILEYS_UNOFFICIAL";

              return (
                <article key={channel.id} className="labs-subpanel p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                        <Cable className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--foreground)]">
                            {channel.channelType} · {channel.accountLabel}
                          </p>
                          <LabsStatusPill label={channel.status} tone={statusTone(channel.status)} />
                        </div>
                        <p className="mt-1 text-sm text-[var(--muted)]">{channel.externalHandle ?? "Sin handle registrado"}</p>
                        <p className="mt-1 text-xs text-[var(--muted-soft)]">Proveedor: {provider}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LabsModal
                        title="Editar canal"
                        description="Actualiza credenciales, handle y datos visibles."
                        size="lg"
                        trigger={<span className="labs-button labs-button-secondary"><Pencil className="size-4" /> Editar</span>}
                      >
                        <ChannelConnectionForm
                          canUseInstagram={canUseInstagram}
                          mode={isBaileys ? "BAILEYS_ONLY" : "META_ONLY"}
                          webhookPreviewUrl={webhookPreviewUrl}
                          initialWebhookVerifyToken={typeof config.verifyToken === "string" ? config.verifyToken : webhookVerifyToken}
                          channelId={channel.id}
                          initialAccountLabel={channel.accountLabel}
                          initialExternalHandle={channel.externalHandle}
                          initialPhoneNumberId={phoneNumberId}
                          submitLabel="Guardar cambios"
                        />
                      </LabsModal>
                      <ChannelDeleteForm channelId={channel.id} />
                    </div>
                  </div>

                  {isBaileys ? (
                    <div className="mt-4">
                      <OpenWaQrCard
                        channelId={channel.id}
                        accountLabel={channel.accountLabel}
                        qrImageDataUrl={typeof config.qrImageDataUrl === "string" ? config.qrImageDataUrl : undefined}
                        connectionState={typeof config.connectionState === "string" ? config.connectionState : undefined}
                        failureReason={typeof config.failureReason === "string" ? config.failureReason : undefined}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </LabsSection>
    </div>
  );
}

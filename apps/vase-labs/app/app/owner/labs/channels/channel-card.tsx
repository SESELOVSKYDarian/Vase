"use client";

import type { LabsChannel, RedactedChannelSummary } from "@vase/contracts";
import { Check, CircleAlert, LoaderCircle, PlugZap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ChannelEditModal } from "./channel-edit-modal";
import { ChannelConnectModal } from "./channel-connect-modal";
import { channelIconSrc } from "./channel-icons";
import { ChannelHealthList, formatChannelDate, type ChannelHealth } from "./channel-health";

const channelNames: Record<LabsChannel, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK: "Facebook" };
const statusCopy: Record<string, string> = { CONNECTED: "Conectado", PENDING: "Configuración pendiente", QR_READY: "Configuración pendiente", ERROR: "Requiere atención" };

type Capacity = Record<LabsChannel, { limit: number; used: number; remaining: number }>;
export function ChannelCard({ channel, type, capacity }: { channel: RedactedChannelSummary | null; type: LabsChannel; capacity: Capacity }) {
  const [testing, setTesting] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  const health: ChannelHealth = channel ? { webhookVerified: channel.webhookVerified, credentialsPresent: channel.credentialsPresent, assetVerified: channel.assetVerified, subscriptionActive: channel.subscriptionActive } : { webhookVerified: false, credentialsPresent: false, assetVerified: false, subscriptionActive: false };
  const tone = !channel ? "neutral" : channel.status === "ERROR" ? "danger" : channel.status === "CONNECTED" ? "success" : "warning";
  async function testChannel() {
    if (!channel) return; setTesting(true); setNotice(null);
    try { const response = await fetch(`/api/v1/channels/${channel.id}/test`, { method: "POST" }); const payload = await response.json(); if (!response.ok) throw new Error(); setNotice(payload.ok ? "Canal funcionando correctamente" : "Se detectaron problemas"); }
    catch { setNotice("Se detectaron problemas. Abrí Administrar para ver el detalle."); }
    finally { setTesting(false); }
  }
  return <article className={`labs-channel-card is-${tone}`}>
    <header><span className="labs-channel-tag"><Image src={channelIconSrc[type]} alt="" width={28} height={28} /></span><div><h2>{channelNames[type]}</h2><p>{channel?.accountLabel ?? "Todavía no configuraste este canal."}</p></div><span className="labs-channel-state"><i aria-hidden="true" />{channel ? statusCopy[channel.status] ?? "Requiere atención" : "No conectado"}</span></header>
    <div className="labs-channel-card-body">
      <p className="labs-channel-last-check">Última comprobación: <strong>{formatChannelDate(channel?.lastSyncedAt)}</strong></p>
      {channel ? <ChannelHealthList health={health} compact /> : <p className="labs-channel-empty-copy">Conectalo para recibir mensajes y validar la integración con Meta.</p>}
      {channel?.lastError ? <p className="labs-channel-error"><CircleAlert aria-hidden="true" /><span>Este canal necesita atención. Abrí Administrar para revisar el diagnóstico.</span></p> : null}
      {notice ? <p className="labs-channel-test-notice" role="status" aria-live="polite">{testing ? <LoaderCircle className="is-spinning" /> : <Check />} {notice}</p> : null}
    </div>
    <footer>{channel ? <><button className="labs-button labs-button-secondary" type="button" onClick={() => void testChannel()} disabled={testing}>{testing ? "Probando…" : "Probar canal"}</button><ChannelEditModal channel={{ id: channel.id, type, accountLabel: channel.accountLabel }} /></> : <ChannelConnectModal capacity={capacity} initialChannel={type} triggerLabel={`Conectar ${channelNames[type]}`} />}</footer>
  </article>;
}

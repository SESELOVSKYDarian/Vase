"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LabsChannel,
  MetaAssetCandidate,
  RedactedChannelSummary,
} from "@vase/contracts";

type WizardStep = "channel" | "preparation" | "account" | "verifying" | "result";

const CHANNELS: Array<{
  id: LabsChannel;
  name: string;
  eyebrow: string;
  description: string;
  prerequisite: string;
}> = [
  {
    id: "WHATSAPP",
    name: "WhatsApp",
    eyebrow: "Cloud API",
    description: "Conecta un número de WhatsApp Business administrado en Meta.",
    prerequisite: "Necesitas acceso de administrador al portfolio y al número comercial.",
  },
  {
    id: "INSTAGRAM",
    name: "Instagram",
    eyebrow: "Mensajes profesionales",
    description: "Centraliza los mensajes de una cuenta profesional de Instagram.",
    prerequisite: "La cuenta debe ser profesional y estar disponible en tu negocio de Meta.",
  },
  {
    id: "FACEBOOK",
    name: "Facebook",
    eyebrow: "Messenger",
    description: "Recibe y responde mensajes enviados a una Página de Facebook.",
    prerequisite: "Debes administrar la Página y permitir mensajes en su configuración.",
  },
];

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "channel", label: "Canal" },
  { id: "preparation", label: "Preparación" },
  { id: "account", label: "Cuenta" },
  { id: "verifying", label: "Verificación" },
  { id: "result", label: "Listo" },
];

function ChannelMark({ channel }: { channel: LabsChannel }) {
  if (channel === "WHATSAPP") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z" />
        <path d="M9 8.2c.3-.4.6-.3.8.1l.7 1.7c.1.3 0 .5-.3.8l-.5.5c.6 1.2 1.5 2.1 2.8 2.7l.5-.6c.2-.3.5-.4.8-.2l1.7.8c.4.2.5.5.2.8-.5.8-1.3 1.2-2.2 1.1-2.9-.4-5.8-3.2-6.1-6.1-.1-.7.5-1.3 1.6-1.6Z" />
      </svg>
    );
  }
  if (channel === "INSTAGRAM") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.8" r="1" className="fill-current" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.7 21v-8h2.8l.4-3.2h-3.2V7.7c0-.9.3-1.6 1.7-1.6H17V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.4v2.4H7.5V13h2.8v8h3.4Z" />
    </svg>
  );
}

function statusLabel(status: RedactedChannelSummary["status"]) {
  if (status === "CONNECTED") return "Conectado";
  if (status === "PENDING") return "Pendiente";
  if (status === "ERROR") return "Necesita atención";
  return "Desconectado";
}

export function ChannelsClient({
  tenantName,
  enabledChannels,
  channels,
  initialAttemptId,
  oauthState,
  oauthReason,
}: {
  tenantName: string;
  enabledChannels: LabsChannel[];
  channels: RedactedChannelSummary[];
  initialAttemptId?: string;
  oauthState?: string;
  oauthReason?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(Boolean(initialAttemptId || oauthState));
  const [step, setStep] = useState<WizardStep>("channel");
  const [selectedChannel, setSelectedChannel] = useState<LabsChannel>("WHATSAPP");
  const [attemptId, setAttemptId] = useState(initialAttemptId);
  const [candidates, setCandidates] = useState<MetaAssetCandidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    oauthState === "cancelled"
      ? "La autorización de Meta fue cancelada. Puedes intentarlo nuevamente."
      : oauthState === "failed"
        ? "Meta no pudo completar la autorización."
        : "",
  );
  const selectedDefinition = useMemo(
    () => CHANNELS.find((channel) => channel.id === selectedChannel) ?? CHANNELS[0],
    [selectedChannel],
  );
  const activeCount = channels.filter((channel) => channel.status === "CONNECTED").length;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!initialAttemptId) return;
    let cancelled = false;
    setBusy(true);
    fetch(`/api/v1/meta/connections/${encodeURIComponent(initialAttemptId)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No pudimos recuperar la conexión.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setSelectedChannel(payload.channelType);
        setCandidates(payload.candidates ?? []);
        setCandidateId(payload.candidates?.[0]?.id ?? "");
        setStep(payload.status === "CONNECTED" ? "result" : "account");
        setMessage("");
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "No pudimos recuperar la conexión.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialAttemptId]);

  function openWizard(channel: LabsChannel = "WHATSAPP") {
    setSelectedChannel(channel);
    setStep("channel");
    setCandidates([]);
    setCandidateId("");
    setAttemptId(undefined);
    setMessage("");
    setOpen(true);
  }

  function closeWizard() {
    if (busy) return;
    setOpen(false);
    router.replace("/app/channels");
  }

  async function startMetaConnection() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/meta/connections/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelType: selectedChannel }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No pudimos iniciar Meta.");
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos iniciar Meta.");
      setBusy(false);
    }
  }

  async function completeConnection() {
    if (!attemptId || !candidateId) return;
    setStep("verifying");
    setBusy(true);
    setMessage("Validando permisos y suscripción al webhook oficial…");
    try {
      const response = await fetch(
        `/api/v1/meta/connections/${encodeURIComponent(attemptId)}/complete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateId }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No pudimos verificar el canal.");
      setStep("result");
      setMessage("El canal quedó conectado y listo para recibir mensajes.");
      router.refresh();
    } catch (error) {
      setStep("account");
      setMessage(error instanceof Error ? error.message : "No pudimos verificar el canal.");
    } finally {
      setBusy(false);
    }
  }

  async function channelAction(channelId: string, action: "test" | "disconnect") {
    if (action === "disconnect" && !window.confirm("¿Desconectar este canal oficial?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        action === "test"
          ? `/api/v1/channels/${encodeURIComponent(channelId)}/test`
          : `/api/v1/channels/${encodeURIComponent(channelId)}`,
        { method: action === "test" ? "POST" : "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "La acción no pudo completarse.");
      setMessage(
        action === "test"
          ? "Conexión verificada. Meta respondió correctamente."
          : "Canal desconectado.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La acción no pudo completarse.");
    } finally {
      setBusy(false);
    }
  }

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <main className="channels-shell" data-hydrated={hydrated}>
      <aside className="channels-rail">
        <a href="/" className="channels-brand" aria-label="Vase Labs, inicio">
          <span>V</span>
          <div><small>Vase</small><strong>Labs</strong></div>
        </a>
        <nav aria-label="Navegación de Labs">
          <a href="/">Resumen</a>
          <a href="/app/channels" aria-current="page">Canales</a>
          <a href="/#inbox">Inbox IA</a>
          <a href="/#tokens">Consumo</a>
        </nav>
        <div className="channels-rail-status">
          <span className="status-beacon" />
          <div><small>Espacio activo</small><strong>{tenantName}</strong></div>
        </div>
      </aside>

      <section className="channels-stage">
        <header className="channels-hero">
          <div>
            <p className="channels-kicker">Entrada de mensajes · Meta oficial</p>
            <h1>Canales</h1>
            <p>Conecta las cuentas donde tus clientes ya conversan. Vase se ocupa de la parte técnica.</p>
          </div>
          <button className="channels-primary" type="button" onClick={() => openWizard()}>
            <span aria-hidden="true">＋</span> Nuevo canal
          </button>
        </header>

        <div className="channels-summary">
          <div><strong>{channels.length}</strong><span>registrados</span></div>
          <div><strong>{activeCount}</strong><span>recibiendo mensajes</span></div>
          <p><span className="status-beacon" /> Conexiones protegidas por la API oficial de Meta</p>
        </div>

        <section className="channels-panel" aria-labelledby="registered-channels">
          <div className="channels-panel-heading">
            <div>
              <p className="channels-kicker">Operación</p>
              <h2 id="registered-channels">Tus conexiones</h2>
            </div>
            <span>{activeCount} activas</span>
          </div>

          {channels.length ? (
            <div className="registered-channel-list">
              {channels.map((channel) => (
                <article className={`registered-channel is-${channel.type.toLowerCase()}`} key={channel.id}>
                  <span className="registered-channel-mark"><ChannelMark channel={channel.type} /></span>
                  <div className="registered-channel-copy">
                    <div>
                      <h3>{channel.accountLabel ?? CHANNELS.find((item) => item.id === channel.type)?.name}</h3>
                      <span className={`channel-status is-${channel.status.toLowerCase()}`}>
                        {statusLabel(channel.status)}
                      </span>
                    </div>
                    <p>{channel.externalHandle ?? "Cuenta oficial de Meta"}</p>
                    <small>
                      {channel.lastSyncedAt
                        ? `Verificado ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(channel.lastSyncedAt))}`
                        : "Pendiente de primera verificación"}
                    </small>
                  </div>
                  <div className="registered-channel-actions">
                    <button type="button" disabled={busy} onClick={() => channelAction(channel.id, "test")}>Probar conexión</button>
                    <button type="button" disabled={busy} onClick={() => openWizard(channel.type)}>Reconectar</button>
                    <button className="is-danger" type="button" disabled={busy} onClick={() => channelAction(channel.id, "disconnect")}>Desconectar</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="channels-empty">
              <span><ChannelMark channel="WHATSAPP" /></span>
              <h3>Tu inbox está listo para su primer canal</h3>
              <p>Elige una cuenta, autoriza con Meta y comienza a recibir conversaciones.</p>
              <button className="channels-primary" type="button" onClick={() => openWizard()}>Conectar ahora</button>
            </div>
          )}
        </section>

        <p className="channels-toast" aria-live="polite">{!open ? message : ""}</p>
      </section>

      <dialog
        ref={dialogRef}
        className="channels-dialog"
        aria-labelledby="connect-channel-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else closeWizard();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeWizard();
        }}
      >
        <div className="channels-dialog-card">
          <header>
            <div>
              <p className="channels-kicker">Configuración guiada</p>
              <h2 id="connect-channel-title">Conectar un canal</h2>
            </div>
            <button className="dialog-close" type="button" aria-label="Cerrar" disabled={busy} onClick={closeWizard}>×</button>
          </header>

          <ol className="wizard-progress" aria-label="Progreso de conexión">
            {STEPS.map((item, index) => (
              <li key={item.id} className={index <= currentStepIndex ? "is-active" : ""} aria-current={item.id === step ? "step" : undefined}>
                <span>{index + 1}</span><small>{item.label}</small>
              </li>
            ))}
          </ol>

          <div className="wizard-body">
            {step === "channel" ? (
              <>
                <div className="wizard-heading">
                  <span>01</span>
                  <div><h3>¿Dónde llegan tus conversaciones?</h3><p>Solo usamos integraciones oficiales y aprobadas por Meta.</p></div>
                </div>
                <div className="channel-choice-grid">
                  {CHANNELS.map((channel) => {
                    const included = enabledChannels.includes(channel.id);
                    const selected = selectedChannel === channel.id;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        className={`channel-choice is-${channel.id.toLowerCase()} ${selected ? "is-selected" : ""}`}
                        aria-pressed={selected}
                        disabled={!included}
                        onClick={() => setSelectedChannel(channel.id)}
                      >
                        <span className="channel-choice-mark"><ChannelMark channel={channel.id} /></span>
                        <span><strong>{channel.name}</strong><small>{channel.eyebrow}</small></span>
                        <em>{included ? (selected ? "Seleccionado" : "Disponible") : "Requiere upgrade"}</em>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {step === "preparation" ? (
              <div className="preparation-card">
                <span className={`channel-choice-mark is-${selectedChannel.toLowerCase()}`}><ChannelMark channel={selectedChannel} /></span>
                <p className="channels-kicker">{selectedDefinition.eyebrow}</p>
                <h3>Vamos a conectar {selectedDefinition.name}</h3>
                <p>{selectedDefinition.description}</p>
                <div><strong>Antes de continuar</strong><span>{selectedDefinition.prerequisite}</span></div>
                <small>Meta abrirá una pantalla segura. Vase nunca verá tu contraseña.</small>
              </div>
            ) : null}

            {step === "account" ? (
              <>
                <div className="wizard-heading">
                  <span>03</span>
                  <div><h3>Elige la cuenta correcta</h3><p>Solo aparecen activos que Meta confirmó que puedes administrar.</p></div>
                </div>
                <div className="asset-list">
                  {candidates.map((candidate) => (
                    <label key={candidate.id} className={candidateId === candidate.id ? "is-selected" : ""}>
                      <input type="radio" name="meta-asset" value={candidate.id} checked={candidateId === candidate.id} onChange={() => setCandidateId(candidate.id)} />
                      <span className="channel-choice-mark"><ChannelMark channel={selectedChannel} /></span>
                      <span><strong>{candidate.name}</strong><small>{candidate.handle ?? "Cuenta comercial"}</small></span>
                      <em>{candidateId === candidate.id ? "Elegida" : "Elegir"}</em>
                    </label>
                  ))}
                </div>
              </>
            ) : null}

            {step === "verifying" ? (
              <div className="verification-state">
                <span className="verification-orbit"><i /></span>
                <p className="channels-kicker">Conexión segura</p>
                <h3>Verificando con Meta</h3>
                <p>Confirmamos permisos, cuenta y suscripción de mensajes. Suele tardar unos segundos.</p>
              </div>
            ) : null}

            {step === "result" ? (
              <div className="result-state">
                <span>✓</span>
                <p className="channels-kicker">Todo listo</p>
                <h3>{selectedDefinition.name} ya está conectado</h3>
                <p>Envía un mensaje desde otra cuenta para comprobar cómo aparece en el inbox.</p>
              </div>
            ) : null}

            <p className="wizard-message" aria-live="polite">{message}{oauthReason ? ` (${oauthReason})` : ""}</p>
          </div>

          <footer className="wizard-actions">
            {step === "channel" ? (
              <>
                <button type="button" className="channels-secondary" onClick={closeWizard}>Cancelar</button>
                <button type="button" className="channels-primary" disabled={!enabledChannels.includes(selectedChannel)} onClick={() => setStep("preparation")}>Continuar</button>
              </>
            ) : null}
            {step === "preparation" ? (
              <>
                <button type="button" className="channels-secondary" disabled={busy} onClick={() => setStep("channel")}>Atrás</button>
                <button type="button" className="channels-primary" disabled={busy} onClick={startMetaConnection}>{busy ? "Abriendo Meta…" : "Continuar con Meta"}</button>
              </>
            ) : null}
            {step === "account" ? (
              <>
                <button type="button" className="channels-secondary" disabled={busy} onClick={startMetaConnection}>Cambiar autorización</button>
                <button type="button" className="channels-primary" disabled={busy || !candidateId} onClick={completeConnection}>Conectar cuenta</button>
              </>
            ) : null}
            {step === "result" ? <button type="button" className="channels-primary" onClick={closeWizard}>Ir a mis canales</button> : null}
          </footer>
        </div>
      </dialog>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCcw } from "lucide-react";

const WEIGHT_FIELDS = [
  {
    key: "purchaseIntent",
    label: "Intención de compra",
    help: "Señales explícitas de que la persona quiere avanzar con una compra.",
    min: 0,
    max: 100,
  },
  {
    key: "productDefined",
    label: "Producto definido",
    help: "Premia conversaciones donde ya se identificó un producto o categoría.",
    min: 0,
    max: 100,
  },
  {
    key: "budgetAcceptance",
    label: "Aceptación de presupuesto",
    help: "Valora la aceptación de precio, rango o presupuesto disponible.",
    min: 0,
    max: 100,
  },
  {
    key: "urgency",
    label: "Urgencia",
    help: "Aumenta el score cuando existe una fecha o necesidad cercana.",
    min: 0,
    max: 100,
  },
  {
    key: "contactOrFulfillmentData",
    label: "Datos de contacto o entrega",
    help: "Reconoce datos útiles para coordinar contacto, envío o retiro.",
    min: 0,
    max: 100,
  },
  {
    key: "interactionDepth",
    label: "Profundidad de interacción",
    help: "Considera el avance y la calidad del intercambio comercial.",
    min: 0,
    max: 100,
  },
  {
    key: "objectionsOrNegativeSignals",
    label: "Objeciones o señales negativas",
    help: "Este peso resta puntos ante objeciones o señales de baja intención.",
    min: -100,
    max: 0,
  },
] as const;

type WeightKey = (typeof WEIGHT_FIELDS)[number]["key"];
type Settings = {
  version: number;
  hotLeadThreshold: number;
  weights: Record<WeightKey, number>;
};

type RequestState = "loading" | "ready" | "saving" | "success" | "error";
type RecalculationState = "idle" | "confirming" | "running" | "success" | "error";

export function ConversationInsightSettingsCard() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [message, setMessage] = useState("Cargando configuración…");
  const [recalculationState, setRecalculationState] = useState<RecalculationState>("idle");
  const [recalculationMessage, setRecalculationMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSettings() {
      try {
        const response = await fetch("/api/labs/settings/conversation-insights", {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const body = await response.json();
        if (!response.ok || !body.settings) {
          throw new Error("SETTINGS_LOAD_FAILED");
        }
        setSettings(body.settings);
        setRequestState("ready");
        setMessage("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setRequestState("error");
        setMessage(error instanceof Error && error.message === "SETTINGS_LOAD_FAILED"
          ? "No pudimos cargar la configuración. Intentá nuevamente."
          : "No pudimos conectarnos. Intentá nuevamente.");
      }
    }
    void loadSettings();
    return () => controller.abort();
  }, []);

  function updateWeight(key: WeightKey, value: number) {
    setSettings((current) => current
      ? { ...current, weights: { ...current.weights, [key]: value } }
      : current);
    setRequestState("ready");
    setMessage("");
  }

  async function saveSettings() {
    if (!settings || requestState === "saving") return;
    setRequestState("saving");
    setMessage("Guardando configuración…");
    try {
      const response = await fetch("/api/labs/settings/conversation-insights", {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok || !body.settings) {
        setRequestState("error");
        setMessage(body.error ?? "No pudimos guardar la configuración.");
        return;
      }
      setSettings(body.settings);
      setRequestState("success");
      setMessage(body.message ?? "Configuración guardada.");
      router.refresh();
    } catch {
      setRequestState("error");
      setMessage("No pudimos conectarnos para guardar. Intentá nuevamente.");
    }
  }

  async function recalculateOpenConversations() {
    if (recalculationState === "running") return;
    setRecalculationState("running");
    setRecalculationMessage("Encolando conversaciones abiertas…");
    try {
      const response = await fetch("/api/labs/settings/conversation-insights", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) {
        setRecalculationState("error");
        setRecalculationMessage(body.error ?? "No pudimos iniciar el reanálisis.");
        return;
      }
      setRecalculationState("success");
      setRecalculationMessage(
        `${body.message} ${body.queued} encoladas; ${body.skipped} omitidas sin mensajes entrantes.`,
      );
      router.refresh();
    } catch {
      setRecalculationState("error");
      setRecalculationMessage("No pudimos conectarnos para iniciar el reanálisis.");
    }
  }

  const threshold = settings?.hotLeadThreshold ?? 0;
  const bands = [
    { label: "Recién mira", range: `0 a ${Math.max(0, Math.round(threshold / 2) - 1)}` },
    { label: "Interesado", range: `${Math.round(threshold / 2)} a ${Math.max(0, threshold - 1)}` },
    { label: "Muy interesado", range: `${threshold} a 100` },
  ];

  return (
    <section className="labs-insight-settings vpa-stack" style={{ gap: 16 }} aria-labelledby="insight-settings-title">
      <p id="insight-settings-title" className="vpa-mut">
        Cada conversación tiene un puntaje de 0 a 100. Sube con lo que suma y baja con lo que resta.
      </p>

      {settings ? (
        <form
          className="vpa-stack"
          style={{ gap: 16 }}
          onSubmit={(event) => {
            event.preventDefault();
            void saveSettings();
          }}
        >
          <div className="labs-score-bands" aria-label="Franjas del puntaje">
            {bands.map((band, index) => (
              <div key={band.label} className={`labs-score-band b${index}`}>
                <b>{band.label}</b>
                <span>{band.range}</span>
              </div>
            ))}
          </div>

          <div className="vpa-row">
            <div className="vpa-g1">
              <b>Muy interesado desde</b>
              <span>Desde este puntaje te la marcamos para que no se te escape.</span>
            </div>
            <ScoreStepper
              id="hot-lead-threshold"
              label="Umbral de hot lead"
              value={settings.hotLeadThreshold}
              min={1}
              max={100}
              step={5}
              onChange={(value) => {
                setSettings({ ...settings, hotLeadThreshold: value });
                setRequestState("ready");
                setMessage("");
              }}
            />
          </div>

          <div>
            <div className="vpa-lab">Cuánto suma o resta cada cosa</div>
            {WEIGHT_FIELDS.map((field) => (
              <div className="vpa-row" key={field.key}>
                <div className="vpa-g1">
                  <b>{field.label}</b>
                  <span id={`weight-${field.key}-help`}>{field.help}</span>
                </div>
                <ScoreStepper
                  id={`weight-${field.key}`}
                  label={field.label}
                  value={settings.weights[field.key]}
                  min={field.min}
                  max={field.max}
                  step={5}
                  signed
                  onChange={(value) => updateWeight(field.key, value)}
                />
              </div>
            ))}
          </div>

          <div className="vpa-from" style={{ marginTop: 0 }}>
            <span>Los cambios se aplican a los próximos análisis.</span>
            <button className="vpa-btn acc sm" type="submit" disabled={requestState === "saving"}>
              {requestState === "saving" ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="labs-insight-settings-loading" aria-hidden={requestState === "error"}>
          <span />
          <span />
        </div>
      )}

      {settings ? (
        <div className="vpa-row" aria-labelledby="insight-recalculation-title">
          <div className="vpa-g1">
            <b id="insight-recalculation-title">Recalcular conversaciones abiertas</b>
            <span>Vuelve a puntuar las conversaciones abiertas con estos valores. Sigue solo en segundo plano.</span>
          </div>
          {recalculationState === "confirming" ? (
            <span role="group" aria-label="¿Recalcular todas las conversaciones abiertas?" style={{ display: "inline-flex", gap: 8 }}>
              <button
                className="vpa-btn soft sm"
                type="button"
                onClick={() => {
                  setRecalculationState("idle");
                  setRecalculationMessage("");
                }}
              >
                Cancelar
              </button>
              <button className="vpa-btn acc sm" type="button" onClick={() => void recalculateOpenConversations()}>
                Confirmar reanálisis
              </button>
            </span>
          ) : (
            <button
              className="vpa-btn line sm"
              type="button"
              disabled={recalculationState === "running"}
              onClick={() => {
                setRecalculationState("confirming");
                setRecalculationMessage("");
              }}
            >
              <RefreshCcw size={14} aria-hidden="true" />
              {recalculationState === "running" ? "Encolando…" : "Recalcular"}
            </button>
          )}
        </div>
      ) : null}
      {recalculationMessage ? (
        <p className="vpa-mut" aria-live="polite" role={recalculationState === "error" ? "alert" : "status"}>
          {recalculationMessage}
        </p>
      ) : null}

      <p
        className={`labs-insight-settings-message is-${requestState}`}
        aria-live="polite"
        role={requestState === "error" ? "alert" : "status"}
      >
        {requestState === "success" ? <CheckCircle2 aria-hidden="true" /> : null}
        {message}
      </p>
    </section>
  );
}

/** Número con botones − y +; también se puede escribir. */
function ScoreStepper({
  id,
  label,
  value,
  min,
  max,
  step,
  signed = false,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  signed?: boolean;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  return (
    <span className="labs-score-stepper">
      <button type="button" aria-label={`Bajar ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−</button>
      <input
        id={id}
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        required
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value)))}
        className={signed && value < 0 ? "neg" : signed && value > 0 ? "pos" : ""}
      />
      <button type="button" aria-label={`Subir ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+</button>
    </span>
  );
}

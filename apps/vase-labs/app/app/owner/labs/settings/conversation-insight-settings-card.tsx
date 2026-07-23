"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";

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

export function ConversationInsightSettingsCard() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [message, setMessage] = useState("Cargando configuración…");

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

  return (
    <section className="labs-panel labs-insight-settings" aria-labelledby="insight-settings-title">
      <header>
        <span><SlidersHorizontal aria-hidden="true" /></span>
        <div>
          <p className="vase-kicker">Calificación comercial</p>
          <h2 id="insight-settings-title">Cómo se construye el score</h2>
          <p>
            Ajustá el umbral y la importancia relativa de cada señal para priorizar
            oportunidades según la operación de tu negocio.
          </p>
        </div>
      </header>

      {settings ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSettings();
          }}
        >
          <label className="labs-insight-threshold" htmlFor="hot-lead-threshold">
            <span>
              <strong>Umbral de hot lead</strong>
              <small>Una conversación se destaca como hot lead al alcanzar este score.</small>
            </span>
            <span>
              <input
                id="hot-lead-threshold"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={settings.hotLeadThreshold}
                onChange={(event) => {
                  setSettings({ ...settings, hotLeadThreshold: Number(event.target.value) });
                  setRequestState("ready");
                  setMessage("");
                }}
              />
              <em>/ 100</em>
            </span>
          </label>

          <fieldset>
            <legend>Pesos de señales</legend>
            <p>
              Los pesos positivos suman prioridad. El peso negativo resta ante objeciones.
            </p>
            <div className="labs-insight-weight-grid">
              {WEIGHT_FIELDS.map((field) => {
                const helpId = `weight-${field.key}-help`;
                return (
                  <label key={field.key} htmlFor={`weight-${field.key}`}>
                    <span>
                      <strong>{field.label}</strong>
                      <small id={helpId}>{field.help}</small>
                    </span>
                    <input
                      id={`weight-${field.key}`}
                      aria-describedby={helpId}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={1}
                      required
                      value={settings.weights[field.key]}
                      onChange={(event) => updateWeight(field.key, Number(event.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <footer>
            <p>
              Los cambios se aplican a los próximos análisis. Las conversaciones existentes
              conservan su último resultado hasta recibir nueva actividad.
            </p>
            <button
              className="labs-button labs-button-primary"
              type="submit"
              disabled={requestState === "saving"}
            >
              {requestState === "saving" ? "Guardando…" : "Guardar configuración"}
            </button>
          </footer>
        </form>
      ) : (
        <div className="labs-insight-settings-loading" aria-hidden={requestState === "error"}>
          <span />
          <span />
          <span />
        </div>
      )}

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

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, HelpCircle, X } from "lucide-react";

type TourStep = {
  id: string;
  title: string;
  description: string;
};

const tourSteps: TourStep[] = [
  {
    id: "panel",
    title: "Panel",
    description: "Aca ves el estado general de la IA: conversaciones, leads, canales, conocimiento y training.",
  },
  {
    id: "inbox",
    title: "Inbox",
    description: "Entra cuando una conversacion necesite respuesta humana o quieras revisar el historial.",
  },
  {
    id: "actividad",
    title: "Actividad",
    description: "Sirve para analizar intenciones, derivaciones y ritmo de conversaciones.",
  },
  {
    id: "conocimiento",
    title: "Conocimiento",
    description: "Carga FAQs, archivos y URLs para que el asistente responda con contexto real.",
  },
  {
    id: "canales",
    title: "Canales",
    description: "Conecta WhatsApp, Instagram o webchat y revisa si algun canal necesita atencion.",
  },
  {
    id: "ajustes",
    title: "Ajustes",
    description: "Configura tono, horarios, escalamiento humano y proveedor de IA.",
  },
  {
    id: "metricas",
    title: "Metricas",
    description: "Estos numeros muestran si la operacion esta sana y donde conviene actuar primero.",
  },
  {
    id: "alertas",
    title: "Alertas importantes",
    description: "Los hot leads y pedidos de humano aparecen destacados para que no se pierdan.",
  },
];

export function LabsGuidedTour({ tenantId }: { tenantId: string }) {
  const storageKey = `vase-labs-tour-complete:${tenantId}`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const step = tourSteps[index];
  const progress = useMemo(() => Math.round(((index + 1) / tourSteps.length) * 100), [index]);

  useEffect(() => {
    if (window.localStorage.getItem(storageKey) === "true") return;
    const timeoutId = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, [storageKey]);

  useEffect(() => {
    if (!open || !step) return;
    const target = document.querySelector(`[data-labs-tour="${step.id}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [open, step]);

  const finish = () => {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  };

  const skipStep = () => {
    if (index >= tourSteps.length - 1) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        className="labs-button labs-button-secondary"
      >
        <HelpCircle className="size-4" />
        Tutorial
      </button>

      {open && step ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(12,18,16,0.34)] px-4 py-5 backdrop-blur-sm md:items-center">
          <section className="w-full max-w-lg rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[0_30px_90px_rgba(10,14,20,0.28)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Guia Vase Labs
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{step.title}</h3>
              </div>
              <button
                type="button"
                onClick={finish}
                className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                aria-label="Saltar tutorial"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-sm leading-7 text-[var(--muted)]">{step.description}</p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full rounded-full bg-[var(--accent-strong)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--muted-soft)]">
              Paso {index + 1} de {tourSteps.length}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={skipStep}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Saltar paso
              </button>
              <button
                type="button"
                onClick={finish}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Saltar tutorial
              </button>
              <button
                type="button"
                onClick={() => {
                  if (index >= tourSteps.length - 1) {
                    finish();
                  } else {
                    setIndex((current) => current + 1);
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
              >
                {index >= tourSteps.length - 1 ? "Finalizar" : "Siguiente"}
                {index >= tourSteps.length - 1 ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

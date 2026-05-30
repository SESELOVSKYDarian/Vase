"use client";

import { useActionState, useMemo, useState } from "react";
import { CloudUpload, FileImage, Sparkles } from "lucide-react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { requestCustomPageAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};
const displayTimeZone = "America/Argentina/Buenos_Aires";
const fieldMeta = {
  businessObjective: { label: "Objetivo del negocio", step: 1 },
  businessDescription: { label: "Descripción del negocio", step: 1 },
  pageScope: { label: "Página o experiencia", step: 1 },
  desiredColors: { label: "Colores deseados", step: 2 },
  brandStyle: { label: "Estilo de marca", step: 2 },
  desiredFeatures: { label: "Funcionalidades deseadas", step: 2 },
  visualReferences: { label: "Referencias visuales", step: 3 },
  designReferences: { label: "Referencias de diseño", step: 3 },
  requiredIntegrations: { label: "Integraciones necesarias", step: 4 },
  observations: { label: "Observaciones", step: 4 },
  notes: { label: "Detalles adicionales", step: 4 },
  slotId: { label: "Horario de reunión", step: 4 },
} as const;

type FieldName = keyof typeof fieldMeta;

type SlotOption = {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  capacity: number;
  reservedCount: number;
  notes: string | null;
};

function formatSlotLabel(slot: SlotOption) {
  const startsAt = new Date(slot.startsAt);
  const endsAt = new Date(slot.endsAt);
  const start = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTimeZone,
  }).format(startsAt);
  const end = new Intl.DateTimeFormat("es-AR", {
    timeStyle: "short",
    timeZone: displayTimeZone,
  }).format(endsAt);
  const remaining = Math.max(0, slot.capacity - slot.reservedCount);
  return `${start} - ${end} · ${remaining} cupo(s)`;
}

export function CustomPageRequestForm({ slots }: { slots: SlotOption[] }) {
  const [state, formAction] = useActionState(requestCustomPageAction, initialState);
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Client-side real-time validation state
  const [formValues, setFormValues] = useState({
    businessObjective: "",
    businessDescription: "",
    pageScope: "",
    desiredColors: "",
    brandStyle: "",
    desiredFeatures: "",
    slotId: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const totalSteps = 4;
  const requiredLabel = <span className="ml-1 text-[var(--danger)]">*</span>;

  const errorItems = useMemo(
    () =>
      Object.entries(state.fieldErrors ?? {}).flatMap(([field, messages]) => {
        const meta = fieldMeta[field as FieldName];
        return messages.map((message) => ({
          field,
          label: meta?.label ?? field,
          message,
          step: meta?.step ?? 1,
        }));
      }),
    [state.fieldErrors],
  );

  const selectedFilesLabel = useMemo(
    () => (files.length === 0 ? "Sin archivos seleccionados" : `${files.length} archivo(s) listos`),
    [files.length],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    setFiles(incoming);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  function getLocalError(name: string, value: string) {
    if (!touched[name]) return "";
    const val = value.trim();
    if (name === "businessObjective") {
      if (!val) return "El objetivo del negocio es obligatorio.";
      if (val.length < 10) return `El objetivo del negocio debe tener al menos 10 caracteres (llevas ${val.length}).`;
    }
    if (name === "businessDescription") {
      if (!val) return "La descripción del negocio es obligatoria.";
      if (val.length < 20) return `La descripción del negocio debe tener al menos 20 caracteres (llevas ${val.length}).`;
    }
    if (name === "pageScope") {
      if (!val) return "Qué página o experiencia necesitas es obligatorio.";
      if (val.length < 10) return `Este campo debe tener al menos 10 caracteres (llevas ${val.length}).`;
    }
    if (name === "desiredColors") {
      if (!val) return "Los colores deseados son obligatorios.";
      if (val.length < 3) return `Los colores deseados deben tener al menos 3 caracteres (llevas ${val.length}).`;
    }
    if (name === "brandStyle") {
      if (!val) return "El estilo de marca es obligatorio.";
      if (val.length < 5) return `El estilo de marca debe tener al menos 5 caracteres (llevas ${val.length}).`;
    }
    if (name === "desiredFeatures") {
      if (!val) return "Las funcionalidades deseadas son obligatorias.";
      if (val.length < 10) return `Las funcionalidades deseadas deben tener al menos 10 caracteres (llevas ${val.length}).`;
    }
    if (name === "slotId") {
      if (!value) return "Debes seleccionar un horario para la reunión.";
    }
    return "";
  }

  const fieldsByStep: Record<number, string[]> = {
    1: ["businessObjective", "businessDescription", "pageScope"],
    2: ["desiredColors", "brandStyle", "desiredFeatures"],
    3: [],
    4: ["slotId"],
  };

  function validateStep(stepNum: number) {
    const fields = fieldsByStep[stepNum] || [];
    let hasError = false;
    const newTouched = { ...touched };
    for (const f of fields) {
      newTouched[f] = true;
      const val = formValues[f as keyof typeof formValues] || "";
      if (getLocalError(f, val) || (f === "slotId" && !val) || (f !== "slotId" && !val.trim())) {
        hasError = true;
      }
    }
    setTouched(newTouched);
    return !hasError;
  }

  function handleContinue() {
    if (validateStep(step)) {
      setStep((current) => Math.min(totalSteps, current + 1));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validateStep(4)) {
      event.preventDefault();
    }
  }

  if (state.success) {
    return (
      <div className="grid gap-4 py-4 text-center">
        <AuthNotice kind="success" message={state.success} />
        <div className="mx-auto mt-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <Sparkles className="size-6" />
        </div>
        <p className="text-sm text-[var(--muted)]">El equipo de Super Admin ha sido notificado y se agendó la reunión.</p>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <AuthNotice kind="error" message={state.error} />
      {errorItems.length > 0 ? (
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 text-sm">
          <p className="font-semibold text-[var(--foreground)]">Campos a corregir</p>
          <ul className="mt-2 grid gap-1 text-[var(--muted)]">
            {errorItems.map((item) => (
              <li key={`${item.field}-${item.message}`} className="flex flex-wrap items-center gap-2">
                <span>
                  <span className="font-semibold text-[var(--foreground)]">{item.label}:</span>{" "}
                  {item.message}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(item.step)}
                  className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]"
                >
                  Ir al paso {item.step}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">
          <span>Paso {step} de {totalSteps}</span>
          <span>Los campos con * son obligatorios</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
          <div
            className="h-full rounded-full bg-[var(--accent-strong)] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className={step === 1 ? "grid gap-4" : "hidden"}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="businessObjective">Objetivo del negocio{requiredLabel}</label>
          <textarea
            id="businessObjective"
            name="businessObjective"
            rows={3}
            required
            minLength={10}
            maxLength={300}
            value={formValues.businessObjective}
            onChange={handleInputChange}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={getLocalError("businessObjective", formValues.businessObjective) || state.fieldErrors?.businessObjective?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="businessDescription">Descripción del negocio{requiredLabel}</label>
          <textarea
            id="businessDescription"
            name="businessDescription"
            rows={4}
            required
            minLength={20}
            maxLength={500}
            value={formValues.businessDescription}
            onChange={handleInputChange}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={getLocalError("businessDescription", formValues.businessDescription) || state.fieldErrors?.businessDescription?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="pageScope">Qué página o experiencia necesitas{requiredLabel}</label>
          <textarea
            id="pageScope"
            name="pageScope"
            rows={3}
            required
            minLength={10}
            maxLength={200}
            value={formValues.pageScope}
            onChange={handleInputChange}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={getLocalError("pageScope", formValues.pageScope) || state.fieldErrors?.pageScope?.[0]} />
        </div>
      </div>

      <div className={step === 2 ? "grid gap-4" : "hidden"}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="desiredColors">Colores deseados{requiredLabel}</label>
            <textarea
              id="desiredColors"
              name="desiredColors"
              rows={3}
              required
              minLength={3}
              maxLength={200}
              value={formValues.desiredColors}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
            />
            <FieldError message={getLocalError("desiredColors", formValues.desiredColors) || state.fieldErrors?.desiredColors?.[0]} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="brandStyle">Estilo de marca{requiredLabel}</label>
            <textarea
              id="brandStyle"
              name="brandStyle"
              rows={3}
              required
              minLength={5}
              maxLength={200}
              value={formValues.brandStyle}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
            />
            <FieldError message={getLocalError("brandStyle", formValues.brandStyle) || state.fieldErrors?.brandStyle?.[0]} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="desiredFeatures">Funcionalidades deseadas{requiredLabel}</label>
          <textarea
            id="desiredFeatures"
            name="desiredFeatures"
            rows={4}
            required
            minLength={10}
            maxLength={400}
            value={formValues.desiredFeatures}
            onChange={handleInputChange}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={getLocalError("desiredFeatures", formValues.desiredFeatures) || state.fieldErrors?.desiredFeatures?.[0]} />
        </div>
      </div>

      <div className={step === 3 ? "grid gap-4" : "hidden"}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="visualReferences">Referencias visuales (links)</label>
            <textarea id="visualReferences" name="visualReferences" rows={3} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]" />
            <FieldError message={state.fieldErrors?.visualReferences?.[0]} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="designReferences">Referencias de diseño</label>
            <textarea id="designReferences" name="designReferences" rows={3} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]" />
            <FieldError message={state.fieldErrors?.designReferences?.[0]} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="referenceFiles">Referencias visuales por archivo</label>
          <label
            htmlFor="referenceFiles"
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={() => setDragActive(false)}
            className={[
              "block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
              dragActive
                ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-soft)_35%,transparent)]"
                : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]",
            ].join(" ")}
          >
            <input id="referenceFiles" name="referenceFiles" type="file" multiple onChange={handleFileChange} className="hidden" />
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent-strong)]">
              <CloudUpload className="size-7" />
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Sube o arrastra tus archivos aquí</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Imágenes, PDFs o capturas de referencia</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]">
              <FileImage className="size-3.5" />
              {selectedFilesLabel}
            </p>
          </label>
        </div>
      </div>

      <div className={step === 4 ? "grid gap-4" : "hidden"}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="requiredIntegrations">Integraciones necesarias</label>
            <textarea id="requiredIntegrations" name="requiredIntegrations" rows={3} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]" />
            <FieldError message={state.fieldErrors?.requiredIntegrations?.[0]} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="observations">Observaciones</label>
            <textarea id="observations" name="observations" rows={3} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]" />
            <FieldError message={state.fieldErrors?.observations?.[0]} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="notes">Detalles adicionales</label>
          <textarea id="notes" name="notes" rows={3} className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]" />
          <FieldError message={state.fieldErrors?.notes?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="slotId">Agenda la reunión de definición{requiredLabel}</label>
          <select
            id="slotId"
            name="slotId"
            required
            value={formValues.slotId}
            onChange={handleInputChange}
            className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="" disabled>Selecciona fecha y hora</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>{formatSlotLabel(slot)}</option>
            ))}
          </select>
          <FieldError message={getLocalError("slotId", formValues.slotId) || state.fieldErrors?.slotId?.[0]} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-4 text-sm text-[var(--muted)]">
        <p className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)]"><Sparkles className="size-4 text-[var(--accent-strong)]" />Cómo funciona el modelo de 4 reuniones</p>
        <p className="mt-2">1) Definicion de objetivos y alcance.</p>
        <p>2) Revision de propuesta de diseno.</p>
        <p>3) Checkpoint de mitad de desarrollo.</p>
        <p>4) Entrega final y cierre del proyecto.</p>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1}
          className="min-h-11 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50"
        >
          Volver
        </button>
        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Continuar
          </button>
        ) : (
          <SubmitButton pendingLabel="Enviando solicitud..." className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60">
            Solicitar página personalizada
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

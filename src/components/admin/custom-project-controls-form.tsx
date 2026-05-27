"use client";

import { type FormEvent, useActionState, useEffect, useState } from "react";
import { CalendarCheck2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createMeetingAvailabilitySlotAction,
  enableCustomProjectMeetingAction,
  setCustomProjectMeetingLinkAction,
  type AdminGovernanceActionState,
  updateCustomProjectMilestoneAction,
} from "@/app/(platform)/app/admin/actions";

type Props = {
  requestId: string;
  tenantId: string;
  pageScope: string;
};

const meetingTypes = ["DEFINITION", "DESIGN", "MID_DEVELOPMENT", "FINAL_DELIVERY", "FOLLOW_UP"] as const;
const stages = ["DEFINITION", "DESIGN", "DELIVERY", "FOLLOW_UP"] as const;
const noZipLabel = "Ningun archivo seleccionado";

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomProjectControlsForm({ requestId, tenantId, pageScope }: Props) {
  const router = useRouter();
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [selectedZipLabel, setSelectedZipLabel] = useState(noZipLabel);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [provisionElapsedMs, setProvisionElapsedMs] = useState(0);
  const [provisionState, setProvisionState] = useState<AdminGovernanceActionState>({});
  const [provisionPending, setProvisionPending] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "processing">("idle");
  const [meetingState, meetingAction, meetingPending] = useActionState(enableCustomProjectMeetingAction, {});
  const [stageState, stageAction, stagePending] = useActionState(updateCustomProjectMilestoneAction, {});
  const [linkState, linkAction, linkPending] = useActionState(setCustomProjectMeetingLinkAction, {});
  const [slotState, slotAction, slotPending] = useActionState(createMeetingAvailabilitySlotAction, {});

  useEffect(() => {
    if (
      !meetingState.success &&
      !stageState.success &&
      !linkState.success &&
      !slotState.success &&
      !provisionState.success
    ) {
      return;
    }
    router.refresh();
  }, [
    router,
    linkState.success,
    meetingState.success,
    provisionState.success,
    slotState.success,
    stageState.success,
  ]);

  useEffect(() => {
    if (!provisionPending) {
      setProvisionElapsedMs(0);
      return;
    }

    const startedAt = Date.now();
    setProvisionElapsedMs(0);
    const timer = window.setInterval(() => {
      setProvisionElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [provisionPending]);

  const provisionSourceLabel = selectedZipLabel !== noZipLabel
    ? `ZIP: ${selectedZipLabel}`
    : repositoryUrl.trim()
      ? "GitHub: descargando repositorio publico"
      : "Plantilla Vase sin paquete externo";

  function handleProvisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const projectZip = formData.get("projectZip");
    const hasZip = projectZip instanceof File && projectZip.size > 0;

    setProvisionState({});
    setProvisionPending(true);
    setUploadPercent(hasZip ? 0 : null);
    setUploadPhase(hasZip ? "uploading" : "processing");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/customizations/provision");
    xhr.responseType = "json";

    xhr.upload.onprogress = (progressEvent) => {
      if (!hasZip || !progressEvent.lengthComputable) return;
      const percent = Math.min(99, Math.round((progressEvent.loaded / progressEvent.total) * 100));
      setUploadPercent(percent);
    };

    xhr.upload.onload = () => {
      if (hasZip) setUploadPercent(100);
      setUploadPhase("processing");
    };

    xhr.onload = () => {
      const response =
        xhr.response && typeof xhr.response === "object"
          ? (xhr.response as AdminGovernanceActionState)
          : ({ error: "No pudimos leer la respuesta del servidor." } satisfies AdminGovernanceActionState);

      setProvisionState(response);
      if (xhr.status >= 200 && xhr.status < 300 && response.success) {
        router.refresh();
      }
    };

    xhr.onerror = () => {
      setProvisionState({
        error: "No pudimos subir el ZIP. Revisa la conexion e intenta de nuevo.",
      });
    };

    xhr.onloadend = () => {
      setProvisionPending(false);
      setUploadPhase("idle");
    };

    xhr.send(formData);
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] p-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Reuniones del proyecto</p>
          <p className="text-xs text-[var(--muted)]">Habilita etapas y configura links de videollamada.</p>
        </div>
        <button
          type="button"
          onClick={() => setMeetingOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
        >
          <CalendarCheck2 className="size-4" />
          Habilitar reunión
        </button>
      </div>
      {meetingState.error ? <p className="text-xs text-[var(--danger)]">{meetingState.error}</p> : null}
      {meetingState.success ? <p className="text-xs text-[var(--success)]">{meetingState.success}</p> : null}
      {linkState.error ? <p className="text-xs text-[var(--danger)]">{linkState.error}</p> : null}
      {linkState.success ? <p className="text-xs text-[var(--success)]">{linkState.success}</p> : null}

      {meetingOpen ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_35px_90px_rgba(2,8,23,0.35)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Workflow</p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Configurar reuniones</h3>
              </div>
              <button type="button" onClick={() => setMeetingOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)]">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <form action={meetingAction} className="grid gap-2">
                <input type="hidden" name="requestId" value={requestId} />
                <input type="hidden" name="tenantId" value={tenantId} />
                <label className="text-xs text-[var(--muted)]">Habilitar reunión</label>
                <div className="flex gap-2">
                  <select name="meetingType" className="min-h-10 flex-1 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                    {meetingTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button disabled={meetingPending} className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">
                    Habilitar
                  </button>
                </div>
              </form>
              <form action={linkAction} className="grid gap-2">
                <input type="hidden" name="requestId" value={requestId} />
                <label className="text-xs text-[var(--muted)]">Definir link de reunión</label>
                <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                  <select name="meetingType" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
                    {meetingTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input name="meetingUrl" placeholder="https://meet.google.com/..." className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
                  <button disabled={linkPending} className="min-h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-sm font-semibold">
                    Guardar link
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <form action={slotAction} className="grid gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <label className="text-xs text-[var(--muted)]">Crear slot de agenda</label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-[var(--muted)]">
            <span>Inicio del slot</span>
            <input name="startsAt" type="datetime-local" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-xs text-[var(--muted)]">
            <span>Fin del slot</span>
            <input name="endsAt" type="datetime-local" required className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input name="durationMinutes" type="number" min={15} defaultValue={60} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <input name="capacity" type="number" min={1} defaultValue={1} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <button disabled={slotPending} className="min-h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-sm font-semibold">
            Crear slot
          </button>
        </div>
        <input name="notes" placeholder="Notas opcionales" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
        {slotState.error ? <p className="text-xs text-[var(--danger)]">{slotState.error}</p> : null}
        {slotState.success ? <p className="text-xs text-[var(--success)]">{slotState.success}</p> : null}
      </form>

      <form action={stageAction} className="grid gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <label className="text-xs text-[var(--muted)]">Actualizar etapa/progreso</label>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <select name="stage" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            {stages.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          <input name="progressPercent" type="number" min={0} max={100} defaultValue={10} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <button disabled={stagePending} className="min-h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-sm font-semibold">
            Guardar
          </button>
        </div>
        <input name="notes" placeholder="Notas internas visibles para cliente" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
        {stageState.error ? <p className="text-xs text-[var(--danger)]">{stageState.error}</p> : null}
        {stageState.success ? <p className="text-xs text-[var(--success)]">{stageState.success}</p> : null}
      </form>

      <form onSubmit={handleProvisionSubmit} encType="multipart/form-data" className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <label className="text-xs text-[var(--muted)]">Provision rapida (editor + vase.ar)</label>
        <input
          name="pageName"
          defaultValue={pageScope || "Sitio personalizado"}
          placeholder="Nombre de la pagina (ej. Tienda Oficial)"
          required
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
        <input
          name="repositoryUrl"
          placeholder="https://github.com/usuario/proyecto (opcional)"
          value={repositoryUrl}
          onChange={(event) => setRepositoryUrl(event.target.value)}
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
        <label className="grid gap-1 text-xs text-[var(--muted)]">
          <span>Proyecto comprimido (.zip)</span>
          <input
            name="projectZip"
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setSelectedZipLabel(file ? `${file.name} (${formatBytes(file.size)})` : noZipLabel);
            }}
            className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </label>
        <textarea
          name="deployNotes"
          placeholder="Notas de deploy/infra (opcional)"
          className="min-h-24 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
        />
        <button
          disabled={provisionPending}
          className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          {provisionPending ? `Publicando... ${formatDuration(provisionElapsedMs)}` : "Provisionar y publicar"}
        </button>
        <div className="rounded-xl bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          {provisionPending ? (
            <div className="grid gap-2">
              <p>
                <span className="font-semibold text-[var(--foreground)]">
                  {uploadPhase === "uploading" ? "Subiendo:" : "Procesando:"}
                </span>{" "}
                {provisionSourceLabel}. Tiempo transcurrido: {formatDuration(provisionElapsedMs)}.
              </p>
              {uploadPercent !== null ? (
                <div className="grid gap-1">
                  <div className="flex items-center justify-between gap-3 text-[var(--muted)]">
                    <span>Subida {uploadPercent}%</span>
                    <span>
                      {uploadPercent >= 100 ? "Procesando ZIP en servidor" : `Falta ${100 - uploadPercent}%`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-strong)] transition-all duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p>El servidor esta descargando o preparando el proyecto.</p>
              )}
            </div>
          ) : (
            <>
              Sube un ZIP ya compilado con <span className="font-semibold">index.html</span> o pega un repo GitHub publico. Si cargas ambos, Vase usa el ZIP.
            </>
          )}
        </div>
        {provisionState.error ? <p className="text-xs text-[var(--danger)]">{provisionState.error}</p> : null}
        {provisionState.success ? <p className="text-xs text-[var(--success)]">{provisionState.success}</p> : null}
        {provisionState.durationMs && !provisionPending ? (
          <p className="text-xs text-[var(--muted)]">
            Duracion registrada: {formatDuration(provisionState.durationMs)}
            {provisionState.publicUrl ? ` · ${provisionState.publicUrl}` : ""}
          </p>
        ) : null}
      </form>
    </div>
  );
}

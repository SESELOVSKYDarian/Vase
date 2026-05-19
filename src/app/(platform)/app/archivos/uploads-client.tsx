"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";

type UploadsSession = {
  token: string;
  uploads_base_url: string;
  user: {
    username: string;
    email?: string | null;
    name?: string | null;
  };
};

type UploadFile = {
  filename: string;
  size: number;
  mime_type: string;
  updated_at: string;
  private_url: string;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

type PreviewState = {
  url?: string;
  loading?: boolean;
};

const GENERIC_ERROR_MESSAGE = "No se pudo conectar con uploads.vase.ar. Revisa que el servicio este activo y que las variables de Vase coincidan.";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isImage(file: UploadFile) {
  return file.mime_type.startsWith("image/");
}

function fileIcon(file: UploadFile) {
  if (file.mime_type.startsWith("image/")) return FileImage;
  if (file.mime_type.startsWith("video/")) return Video;
  return FileText;
}

function getDisplayName(filename: string) {
  return filename.replace(/^\d+-[a-f0-9-]+-/i, "");
}

function getPrivateUrl(baseUrl: string, username: string, filename: string) {
  return `${baseUrl}/files/${encodeURIComponent(username)}/${encodeURIComponent(filename)}`;
}

async function readError(response: Response) {
  if (response.status === 429) {
    return "uploads.vase.ar esta limitando solicitudes. Espera un minuto o redeploya uploads-service con RATE_LIMIT_MAX mas alto.";
  }

  try {
    const body = (await response.clone().json()) as { error?: string; message?: string };
    if (body.error && body.error !== "request_error") {
      if (body.error === "too_many_requests") {
        return "uploads.vase.ar esta limitando solicitudes. Sube RATE_LIMIT_MAX en uploads-service.";
      }
      return body.error;
    }
    if (body.message) return body.message;
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) return text.trim();
    } catch {
      // Fall through to the generic message below.
    }
  }

  return GENERIC_ERROR_MESSAGE;
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

export function UploadsClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [session, setSession] = useState<UploadsSession | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadFile | null>(null);

  const imageCount = useMemo(() => files.filter(isImage).length, [files]);
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const showNotice = useCallback((tone: Notice["tone"], message: string) => {
    setNotice({ tone, message });
    window.setTimeout(() => setNotice(null), 5200);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextSession = await fetchJson<UploadsSession>("/api/uploads/token", { cache: "no-store" });
      const list = await fetchJson<{ files: UploadFile[] }>(`${nextSession.uploads_base_url}/files`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${nextSession.token}`,
        },
      });

      setSession(nextSession);
      setFiles(list.files || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
      setFiles([]);
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    void loadData();

    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];

    if (!session || files.length === 0) {
      setPreviews({});
      return;
    }

    const imageFiles = files.filter(isImage);

    if (imageFiles.length === 0) {
      setPreviews({});
      return;
    }

    setPreviews(
      Object.fromEntries(imageFiles.map((file) => [file.filename, { loading: true }])),
    );

    async function loadPreviews() {
      if (!session) return;

      await Promise.all(
        imageFiles.map(async (file) => {
          try {
            const response = await fetch(getPrivateUrl(session.uploads_base_url, session.user.username, file.filename), {
              cache: "no-store",
              headers: { Authorization: `Bearer ${session.token}` },
            });

            if (!response.ok) {
              if (!cancelled) {
                setPreviews((current) => ({
                  ...current,
                  [file.filename]: { loading: false },
                }));
              }
              return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            previewUrlsRef.current.push(url);

            if (!cancelled) {
              setPreviews((current) => ({
                ...current,
                [file.filename]: { url, loading: false },
              }));
            }
          } catch {
            if (!cancelled) {
              setPreviews((current) => ({
                ...current,
                [file.filename]: { loading: false },
              }));
            }
          }
        }),
      );
    }

    void loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [files, session]);

  const uploadFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const queue = Array.from(selectedFiles);
      if (queue.length === 0) return;

      setIsUploading(true);
      try {
        const activeSession = session || (await fetchJson<UploadsSession>("/api/uploads/token", { cache: "no-store" }));

        for (const file of queue) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(`${activeSession.uploads_base_url}/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeSession.token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`${file.name}: ${await readError(response)}`);
          }
        }

        setSession(activeSession);
        await loadData();
        showNotice("success", queue.length === 1 ? "Archivo subido correctamente." : "Archivos subidos correctamente.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
        showNotice("error", message);
      } finally {
        setIsUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [loadData, session, showNotice],
  );

  const downloadFile = useCallback(
    async (file: UploadFile) => {
      if (!session) return;

      setBusyFile(file.filename);
      try {
        const response = await fetch(getPrivateUrl(session.uploads_base_url, session.user.username, file.filename), {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = getDisplayName(file.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo descargar.";
        showNotice("error", message);
      } finally {
        setBusyFile(null);
      }
    },
    [session, showNotice],
  );

  const copyPublicLink = useCallback(
    async (file: UploadFile) => {
      if (!session) return;

      setBusyFile(file.filename);
      try {
        const body = await fetchJson<{ public_url: string }>(
          `${session.uploads_base_url}/files/${encodeURIComponent(file.filename)}/public-url`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );

        await navigator.clipboard.writeText(body.public_url);
        showNotice("success", "Link publico copiado.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el link publico.";
        showNotice("error", message);
      } finally {
        setBusyFile(null);
      }
    },
    [session, showNotice],
  );

  const copyPrivateUrl = useCallback(
    async (file: UploadFile) => {
      if (!session) return;

      const url = getPrivateUrl(session.uploads_base_url, session.user.username, file.filename);
      await navigator.clipboard.writeText(url);
      showNotice("success", "URL privada copiada.");
    },
    [session, showNotice],
  );

  const confirmDelete = useCallback(async () => {
    if (!session || !deleteTarget) return;

    setBusyFile(deleteTarget.filename);
    try {
      const response = await fetch(getPrivateUrl(session.uploads_base_url, session.user.username, deleteTarget.filename), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setDeleteTarget(null);
      await loadData();
      showNotice("success", "Archivo eliminado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el archivo.";
      showNotice("error", message);
    } finally {
      setBusyFile(null);
    }
  }, [deleteTarget, loadData, session, showNotice]);

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={[
            "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
            notice.tone === "success"
              ? "border-[color:color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
          ].join(" ")}
        >
          <span className="flex items-center gap-3">
            {notice.tone === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
            <span>{notice.message}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar alerta">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Carpeta privada</p>
          <p className="mt-2 truncate text-2xl font-semibold text-[var(--foreground)]">{session?.user.username ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Archivos</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{isLoading ? "-" : files.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Uso total</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{formatBytes(totalSize)}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void uploadFiles(event.dataTransfer.files);
          }}
          className={[
            "flex min-h-[21rem] flex-col justify-between rounded-3xl border border-dashed p-6 shadow-sm",
            dragActive
              ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]"
              : "border-[var(--border-strong)] bg-[var(--surface-strong)]",
          ].join(" ")}
        >
          <div className="space-y-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              {isUploading ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-[var(--foreground)]">Subir archivos</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Cada archivo queda asociado a tu usuario de Vase y se guarda en tu carpeta privada.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
                <span>Imagenes, videos y PDFs</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
                <span>Acceso privado con sesion</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  void uploadFiles(event.target.files);
                }
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Seleccionar archivos
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={["size-4", isLoading ? "animate-spin" : ""].join(" ")} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Biblioteca privada</p>
              <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Tus archivos</h3>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {files.length} archivo{files.length === 1 ? "" : "s"} · {imageCount} imagen{imageCount === 1 ? "" : "es"}
            </p>
          </div>

          {isLoading ? (
            <div className="grid min-h-64 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--muted)]">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center">
              <div>
                <FileImage className="mx-auto size-8 text-[var(--muted-soft)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Todavia no hay archivos</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Subi una imagen para probar el flujo real.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {files.map((file) => {
                const Icon = fileIcon(file);
                const isBusy = busyFile === file.filename;
                const preview = previews[file.filename];

                return (
                  <article
                    key={file.filename}
                    className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]"
                  >
                    <div className="grid aspect-[4/3] place-items-center bg-[color:color-mix(in_srgb,var(--surface-strong)_72%,transparent)]">
                      {preview?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview.url} alt="" className="h-full w-full object-cover" />
                      ) : preview?.loading ? (
                        <Loader2 className="size-6 animate-spin text-[var(--muted-soft)]" />
                      ) : (
                        <Icon className="size-10 text-[var(--muted-soft)]" />
                      )}
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]" title={getDisplayName(file.filename)}>
                          {getDisplayName(file.filename)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatBytes(file.size)} · {formatDate(file.updated_at)}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => void downloadFile(file)}
                          disabled={isBusy}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] disabled:opacity-50"
                          aria-label="Descargar"
                        >
                          {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyPublicLink(file)}
                          disabled={isBusy}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] disabled:opacity-50"
                          aria-label="Copiar link publico"
                        >
                          <Link2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyPrivateUrl(file)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                          aria-label="Copiar URL privada"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(file)}
                          disabled={isBusy}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,20,26,0.38)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Eliminar archivo</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{getDisplayName(deleteTarget.filename)}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Esta accion elimina el archivo de tu carpeta privada y no se puede deshacer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busyFile === deleteTarget.filename}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--danger)] px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busyFile === deleteTarget.filename ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

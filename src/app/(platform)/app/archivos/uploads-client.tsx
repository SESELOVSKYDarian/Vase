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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function fileKind(file: UploadFile) {
  if (file.mime_type.startsWith("image/")) return "image";
  if (file.mime_type.startsWith("video/")) return "video";
  if (file.mime_type === "application/pdf") return "pdf";
  return "file";
}

function fileIcon(file: UploadFile) {
  const kind = fileKind(file);
  if (kind === "image") return FileImage;
  if (kind === "video") return Video;
  return FileText;
}

function getDisplayName(filename: string) {
  return filename.replace(/^\d+-[a-f0-9-]+-/i, "");
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "request_error";
  } catch {
    return "request_error";
  }
}

export function UploadsClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<UploadsSession | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);

  const imageCount = useMemo(
    () => files.filter((file) => file.mime_type.startsWith("image/")).length,
    [files],
  );
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const showNotice = useCallback((tone: Notice["tone"], message: string) => {
    setNotice({ tone, message });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/uploads/token", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    return (await response.json()) as UploadsSession;
  }, []);

  const listFiles = useCallback(
    async (currentSession?: UploadsSession) => {
      const activeSession = currentSession || session || (await loadSession());
      if (!session && activeSession) {
        setSession(activeSession);
      }

      const response = await fetch(`${activeSession.uploads_base_url}/files`, {
        headers: {
          Authorization: `Bearer ${activeSession.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const body = (await response.json()) as { files: UploadFile[] };
      setFiles(body.files || []);
      return { activeSession, files: body.files || [] };
    },
    [loadSession, session],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeSession = await loadSession();
      setSession(activeSession);
      await listFiles(activeSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los archivos.";
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
  }, [listFiles, loadSession, showNotice]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    async function loadPreviews() {
      if (!session) return;

      const imageFiles = files.filter((file) => file.mime_type.startsWith("image/")).slice(0, 24);
      const entries = await Promise.all(
        imageFiles.map(async (file) => {
          try {
            const response = await fetch(file.private_url, {
              headers: { Authorization: `Bearer ${session.token}` },
            });

            if (!response.ok) return null;

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            urls.push(url);
            return [file.filename, url] as const;
          } catch {
            return null;
          }
        }),
      );

      if (!cancelled) {
        setPreviews(Object.fromEntries(entries.filter(Boolean) as Array<[string, string]>));
      }
    }

    void loadPreviews();

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, session]);

  const uploadFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const queue = Array.from(selectedFiles);
      if (queue.length === 0) return;

      setIsUploading(true);
      try {
        const activeSession = session || (await loadSession());
        if (!session) {
          setSession(activeSession);
        }

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

        await listFiles(activeSession);
        showNotice("success", queue.length === 1 ? "Archivo subido correctamente." : "Archivos subidos correctamente.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
        showNotice("error", message);
      } finally {
        setIsUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [listFiles, loadSession, session, showNotice],
  );

  const downloadFile = useCallback(
    async (file: UploadFile) => {
      if (!session) return;
      setBusyFile(file.filename);
      try {
        const response = await fetch(file.private_url, {
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
        const response = await fetch(
          `${session.uploads_base_url}/files/${encodeURIComponent(file.filename)}/public-url`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const body = (await response.json()) as { public_url: string };
        await navigator.clipboard.writeText(body.public_url);
        showNotice("success", "Link publico copiado.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el link.";
        showNotice("error", message);
      } finally {
        setBusyFile(null);
      }
    },
    [session, showNotice],
  );

  const deleteFile = useCallback(
    async (file: UploadFile) => {
      if (!session) return;
      const confirmed = window.confirm(`Eliminar ${getDisplayName(file.filename)}? Esta accion no se puede deshacer.`);
      if (!confirmed) return;

      setBusyFile(file.filename);
      try {
        const response = await fetch(
          `${session.uploads_base_url}/files/${encodeURIComponent(session.user.username)}/${encodeURIComponent(file.filename)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        await listFiles(session);
        showNotice("success", "Archivo eliminado.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar.";
        showNotice("error", message);
      } finally {
        setBusyFile(null);
      }
    },
    [listFiles, session, showNotice],
  );

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={[
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
            notice.tone === "success"
              ? "border-[color:color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
          ].join(" ")}
        >
          {notice.tone === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Carpeta privada</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{session?.user.username ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Archivos</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{files.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Imagenes</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{imageCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
            "flex min-h-[22rem] flex-col justify-between rounded-3xl border border-dashed p-6 shadow-sm",
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
              <h3 className="text-2xl font-semibold text-[var(--foreground)]">Subir archivos privados</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Los archivos quedan guardados en tu carpeta y se abren solo con tu sesion de Vase.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
                <span>Imagenes, videos y PDFs</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--accent-strong)]" />
                <span>Limite aplicado por uploads.vase.ar</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
              onClick={() => void reload()}
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
            <p className="text-sm text-[var(--muted)]">{formatBytes(totalSize)} usados</p>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="h-full w-full object-cover" />
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
                          {formatBytes(file.size)} · {file.mime_type}
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
                          onClick={() => navigator.clipboard.writeText(file.private_url).then(() => showNotice("success", "URL privada copiada."))}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                          aria-label="Copiar URL privada"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteFile(file)}
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
    </div>
  );
}

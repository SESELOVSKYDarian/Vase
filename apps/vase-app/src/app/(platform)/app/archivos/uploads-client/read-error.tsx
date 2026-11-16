"use client";

// Parte de uploads-client.tsx: UploadsSession, UploadFile, Notice, PreviewState, GENERIC_ERROR_MESSAGE, formatBytes y más.
import { FileImage, FileText, Video } from "lucide-react";

export type UploadsSession = {
  token: string;
  uploads_base_url: string;
  user: {
    username: string;
    email?: string | null;
    name?: string | null;
  };
};

export type UploadFile = {
  filename: string;
  size: number;
  mime_type: string;
  updated_at: string;
  private_url: string;
};

export type Notice = {
  tone: "success" | "error";
  message: string;
};

export type PreviewState = {
  url?: string;
  loading?: boolean;
};

export const GENERIC_ERROR_MESSAGE = "No se pudo conectar con uploads.vase.ar. Revisa que el servicio este activo y que las variables de Vase coincidan.";

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function isImage(file: UploadFile) {
  return file.mime_type.startsWith("image/");
}

export function fileIcon(file: UploadFile) {
  if (file.mime_type.startsWith("image/")) return FileImage;
  if (file.mime_type.startsWith("video/")) return Video;
  return FileText;
}

export function getDisplayName(filename: string) {
  return filename.replace(/^\d+-[a-f0-9-]+-/i, "");
}

export function getPrivateUrl(baseUrl: string, username: string, filename: string) {
  return `${baseUrl}/files/${encodeURIComponent(username)}/${encodeURIComponent(filename)}`;
}

export async function readError(response: Response) {
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

export async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

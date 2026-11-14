// Tipos y utilidades que comparten las acciones del admin.
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { type CustomSitePackageSource } from "@/server/services/custom-site-packages";

export type CustomProjectMeetingTypeInput =
  | "DEFINITION"
  | "DESIGN"
  | "MID_DEVELOPMENT"
  | "FINAL_DELIVERY"
  | "FOLLOW_UP";

export const customProjectMeetingTypes = new Set<CustomProjectMeetingTypeInput>([
  "DEFINITION",
  "DESIGN",
  "MID_DEVELOPMENT",
  "FINAL_DELIVERY",
  "FOLLOW_UP",
]);

export type AdminReviewActionState = {
  success?: string;
  error?: string;
};

export type AdminGovernanceActionState = {
  success?: string;
  error?: string;
  durationMs?: number;
  publicUrl?: string;
  sourceType?: CustomSitePackageSource;
  deletedSlotId?: string;
  createdSlot?: {
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    reservedCount: number;
    tenant: {
      id: string;
      accountName: string;
    };
  };
};

export type CustomizationPipelineTarget = "REQUESTS" | "WITHOUT_QUOTE" | "PENDING_CLIENT" | "ACCEPTED";

export const customizationPipelineTargets = new Set<CustomizationPipelineTarget>([
  "REQUESTS",
  "WITHOUT_QUOTE",
  "PENDING_CLIENT",
  "ACCEPTED",
]);

export const defaultProjectProcessTypes = [
  "DISCOVERY",
  "DESIGN",
  "FRONTEND",
  "BACKEND",
  "INTEGRATIONS",
  "TESTING",
  "DEPLOYMENT",
] as const;

export async function ensureProjectCreatedFromAcceptedQuote(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  customPageRequestId: string;
  actorUserId: string;
  moduleId?: string | null;
  submoduleId?: string | null;
  projectNameSeed?: string | null;
}) {
  const slug = `custom-${params.customPageRequestId.slice(-10).toLowerCase()}`;
  const projectName =
    params.projectNameSeed?.trim() || `Proyecto personalizado ${params.customPageRequestId.slice(-6)}`;

  const existing = await params.tx.project.findUnique({
    where: {
      tenantId_slug: {
        tenantId: params.tenantId,
        slug,
      },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await params.tx.project.create({
    data: {
      tenantId: params.tenantId,
      name: projectName,
      slug,
      status: "DISCOVERY",
      moduleId: params.moduleId ?? null,
      submoduleId: params.submoduleId ?? null,
      description: "Proyecto generado automaticamente al aprobar presupuesto.",
      createdById: params.actorUserId,
    },
    select: { id: true },
  });

  await params.tx.projectProcess.createMany({
    data: defaultProjectProcessTypes.map((processType) => ({
      projectId: created.id,
      processType,
      status: processType === "DISCOVERY" ? "IN_PROGRESS" : "PENDING",
      progressPercent: processType === "DISCOVERY" ? 5 : 0,
    })),
  });

  return created.id;
}

export function toNullableDate(value: string) {
  return value ? new Date(value) : null;
}

export function parseBuenosAiresDateTimeLocal(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + 3,
      Number(minute),
      Number(second),
    ),
  );
}

export function generateTemporaryPassword() {
  return `Vase-${randomUUID().slice(0, 8)}#${Math.floor(100 + Math.random() * 900)}`;
}

export function sanitizeModuleVersion(raw: string) {
  const value = raw.trim();
  if (!value) return "1.0.0";
  return value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "1.0.0";
}

export function hasZipSignature(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export async function validateModuleZip(file: File) {
  const maxBytes = 50 * 1024 * 1024;
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("MODULE_ZIP_EXTENSION_INVALID");
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error("MODULE_ZIP_SIZE_INVALID");
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasZipSignature(buffer)) {
    throw new Error("MODULE_ZIP_SIGNATURE_INVALID");
  }
  const sha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  return { bytes: buffer, sha256, sizeBytes: file.size, fileName: file.name, mimeType: file.type || "application/zip" };
}

export function formatDurationMs(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function describeCustomSitePackageError(error: unknown) {
  if (!(error instanceof Error)) {
    return "No pudimos importar el paquete personalizado.";
  }

  switch (error.message) {
    case "MODULE_ZIP_EXTENSION_INVALID":
      return "El archivo debe estar en formato .zip.";
    case "MODULE_ZIP_SIZE_INVALID":
      return "El .zip supera el tamano permitido o esta vacio.";
    case "MODULE_ZIP_SIGNATURE_INVALID":
      return "El archivo no tiene firma valida de zip.";
    case "CUSTOM_SITE_GITHUB_URL_INVALID":
      return "La URL de GitHub no es valida. Usa https://github.com/owner/repo o una rama /tree/rama.";
    case "CUSTOM_SITE_GITHUB_REPOSITORY_NOT_FOUND":
      return "No pudimos acceder a ese repositorio de GitHub. Debe ser publico o accesible.";
    case "CUSTOM_SITE_GITHUB_DOWNLOAD_FAILED":
      return "No pudimos descargar el ZIP del repositorio de GitHub.";
    case "CUSTOM_SITE_INDEX_MISSING":
      return "El paquete debe incluir un index.html publicado, por ejemplo el contenido de dist/ o build/.";
    case "CUSTOM_SITE_PATH_INVALID":
      return "El ZIP contiene rutas no permitidas.";
    case "CUSTOM_SITE_FILE_LIMIT_EXCEEDED":
      return "El paquete tiene demasiados archivos. Maximo permitido: 2000.";
    case "CUSTOM_SITE_SIZE_LIMIT_EXCEEDED":
      return "El paquete descomprimido supera el tamano permitido.";
    default:
      return "No pudimos importar el paquete personalizado.";
  }
}

export function validateDownloadedZip(bytes: Uint8Array, fileName: string) {
  const maxBytes = 50 * 1024 * 1024;
  if (bytes.byteLength <= 0 || bytes.byteLength > maxBytes) {
    throw new Error("MODULE_ZIP_SIZE_INVALID");
  }
  if (!hasZipSignature(bytes)) {
    throw new Error("MODULE_ZIP_SIGNATURE_INVALID");
  }
  return {
    bytes,
    sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
    sizeBytes: bytes.byteLength,
    fileName,
    mimeType: "application/zip",
  };
}


export function parseNullableInteger(formData: FormData, field: "minValue" | "maxValue") {
  const rawValue = String(formData.get(field) ?? "").trim();
  return rawValue ? Number(rawValue) : null;
}

export function toModuleFeatureJsonValue(value: boolean | number | string | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

export function isPrismaUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function mapModuleFeatureActionError(error: unknown, fallback: string) {
  if (isPrismaUniqueConflict(error)) return "Ya existe una característica con esa clave en este alcance.";
  if (error instanceof Error) {
    if (error.message === "FORBIDDEN") return "No tienes permisos para gestionar características.";
    if (error.message === "MODULE_FEATURE_NOT_FOUND") return "La característica ya no existe.";
    if (error.message === "Las características solo están disponibles para Vase Business.") {
      return "Las características solo están disponibles para Vase Business.";
    }
    if (error.message === "El submódulo no pertenece al módulo Business seleccionado.") {
      return "El submódulo seleccionado no pertenece a Vase Business.";
    }
    if (error.message === "Las características solo pueden asignarse a Plantilla o Personalizado.") {
      return "Las características solo pueden asignarse a Plantilla o Personalizado.";
    }
  }
  return fallback;
}


export function parseOptionalDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

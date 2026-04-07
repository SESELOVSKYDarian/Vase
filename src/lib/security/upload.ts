import { createHash } from "node:crypto";
import { appConfig } from "@/config/app";

const FILE_SIGNATURES: Record<string, Uint8Array[]> = {
  "image/png": [Uint8Array.from([0x89, 0x50, 0x4e, 0x47])],
  "image/jpeg": [
    Uint8Array.from([0xff, 0xd8, 0xff]),
  ],
  "image/webp": [
    Uint8Array.from([0x52, 0x49, 0x46, 0x46]),
  ],
  "application/pdf": [Uint8Array.from([0x25, 0x50, 0x44, 0x46])],
};

const SAFE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);

function getFileExtension(filename: string) {
  const normalized = filename.toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index >= 0 ? normalized.slice(index) : "";
}

function startsWithSignature(bytes: Uint8Array, signature: Uint8Array) {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

async function getHeadBytes(file: File, length = 16) {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function scanUploadedFile(file: File) {
  const mode = appConfig.security.uploadScanMode;

  if (mode === "off") {
    return { engine: "disabled", result: "skipped" as const };
  }

  const digest = createHash("sha256")
    .update(Buffer.from(await file.arrayBuffer()))
    .digest("hex");

  if (mode === "report_only" || !appConfig.security.malwareScanUrl) {
    return { engine: "report_only", result: "clean" as const, digest };
  }

  const response = await fetch(appConfig.security.malwareScanUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(appConfig.security.malwareScanToken
        ? { authorization: `Bearer ${appConfig.security.malwareScanToken}` }
        : {}),
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      sha256: digest,
    }),
  });

  if (!response.ok) {
    if (mode === "required") {
      throw new Error("FILE_SCAN_UNAVAILABLE");
    }

    return { engine: "remote", result: "scan_unavailable" as const, digest };
  }

  const payload = (await response.json()) as { verdict?: string };

  if (payload.verdict !== "clean") {
    throw new Error("FILE_MALWARE_DETECTED");
  }

  return { engine: "remote", result: "clean" as const, digest };
}

export async function validateUpload(file: File) {
  const maxBytes = appConfig.security.uploadMaxFileSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const extension = getFileExtension(file.name);

  if (!SAFE_EXTENSIONS.has(extension)) {
    throw new Error("FILE_EXTENSION_NOT_ALLOWED");
  }

  const signatures = FILE_SIGNATURES[file.type];

  if (!signatures) {
    throw new Error("FILE_TYPE_NOT_ALLOWED");
  }

  const headBytes = await getHeadBytes(file);
  const signatureMatches = signatures.some((signature) => startsWithSignature(headBytes, signature));

  if (!signatureMatches) {
    throw new Error("FILE_SIGNATURE_INVALID");
  }

  const scan = await scanUploadedFile(file);
  const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storageKey = [
    "tenants",
    "pending",
    `${Date.now()}-${originalName}`,
  ].join("/");

  return {
    size: file.size,
    type: file.type,
    originalName,
    storageKey,
    sha256: "digest" in scan ? scan.digest : undefined,
    scan,
  };
}

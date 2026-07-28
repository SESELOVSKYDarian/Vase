import { verify } from "node:crypto";
import { z } from "zod";
import type { EdgeDatabase } from "./db.js";
import { certificateFingerprint } from "./certificates.js";

const payloadSchema = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  installationId: z.string().min(1),
  certificateFingerprint: z.string().min(8),
  capabilities: z.array(z.string().min(1)),
  syncUrl: z.url(),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
}).strict();

export async function enrollEdge(input: {
  database: EdgeDatabase;
  code: string;
  certificatePath: string;
  cloudBaseUrl: string;
  cloudPublicKey: string;
  fetcher?: typeof fetch;
}) {
  if (input.database.raw.prepare(
    "SELECT id FROM edge_identity WHERE id = 'current'",
  ).get()) throw new Error("EDGE_ALREADY_ENROLLED");
  const fingerprint = certificateFingerprint(input.certificatePath);
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      new URL(
        `/api/v1/devices/enrollments/${encodeURIComponent(input.code.trim().toUpperCase())}/complete`,
        input.cloudBaseUrl,
      ),
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ certificateFingerprint: fingerprint }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new Error("EDGE_ENROLLMENT_CLOUD_UNAVAILABLE");
  }
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "EDGE_ENROLLMENT_FAILED");
  }
  const payload = payloadSchema.parse(body.payload);
  if (
    body.algorithm !== "Ed25519" ||
    typeof body.signature !== "string" ||
    !verify(
      null,
      Buffer.from(JSON.stringify(payload)),
      input.cloudPublicKey,
      Buffer.from(body.signature, "base64url"),
    )
  ) throw new Error("EDGE_ENROLLMENT_SIGNATURE_INVALID");
  if (payload.certificateFingerprint !== fingerprint) {
    throw new Error("EDGE_CERTIFICATE_PIN_MISMATCH");
  }
  if (new Date(payload.expiresAt) <= new Date()) throw new Error("EDGE_ENROLLMENT_EXPIRED");
  input.database.raw.exec("BEGIN IMMEDIATE");
  try {
    input.database.raw.prepare(`
      INSERT INTO edge_identity(
        id, global_tenant_id, branch_id, installation_id,
        certificate_fingerprint, status, enrolled_at
      ) VALUES ('current', ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(
      payload.globalTenantId,
      payload.branchId,
      payload.installationId,
      payload.certificateFingerprint,
      new Date().toISOString(),
    );
    input.database.raw.exec("COMMIT");
  } catch (error) {
    input.database.raw.exec("ROLLBACK");
    throw error;
  }
  return payload;
}

import { verify } from "node:crypto";
import { z } from "zod";
import type { EdgeDatabase } from "./db.js";

const projectionSchema = z.object({
  projectionRevision: z.number().int().positive(),
  generatedAt: z.iso.datetime(),
  employees: z.array(z.object({
    staffId: z.string().min(1),
    employeeCode: z.string().min(1),
    displayName: z.string().min(1),
    pinHash: z.string().min(20),
    active: z.boolean(),
    roles: z.array(z.object({
      branchId: z.string().min(1),
      role: z.string().min(1),
      capabilities: z.array(z.string()),
    }).strict()),
  }).strict()),
}).strict();

export function applyStaffProjection(
  database: EdgeDatabase,
  input: { payload: unknown; signature: string; cloudPublicKey: string },
): void;
export function applyStaffProjection(
  first: EdgeDatabase | { payload: unknown; signature: string; cloudPublicKey: string },
  second?: { payload: unknown; signature: string; cloudPublicKey: string },
) {
  const database = first as EdgeDatabase;
  const input = second!;
  const payload = projectionSchema.parse(input.payload);
  if (!verify(
    null,
    Buffer.from(JSON.stringify(payload)),
    input.cloudPublicKey,
    Buffer.from(input.signature, "base64url"),
  )) throw new Error("EDGE_STAFF_PROJECTION_SIGNATURE_INVALID");
  const current = database.raw.prepare(
    "SELECT COALESCE(MAX(projection_revision), 0) AS revision FROM staff_projection",
  ).get() as { revision: number };
  if (payload.projectionRevision <= current.revision) {
    throw new Error("EDGE_STAFF_PROJECTION_STALE");
  }
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    const keep = new Set(payload.employees.map((employee) => employee.staffId));
    const existing = database.raw.prepare("SELECT staff_id FROM staff_projection").all() as Array<{ staff_id: string }>;
    for (const row of existing) {
      if (!keep.has(row.staff_id)) {
        database.raw.prepare("UPDATE staff_projection SET active = 0, projection_revision = ? WHERE staff_id = ?")
          .run(payload.projectionRevision, row.staff_id);
      }
    }
    const upsert = database.raw.prepare(`
      INSERT INTO staff_projection(
        staff_id, employee_code, display_name, pin_hash, roles_json, active,
        projection_revision, updated_at, failed_pin_attempts, locked_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
      ON CONFLICT(staff_id) DO UPDATE SET
        employee_code = excluded.employee_code,
        display_name = excluded.display_name,
        pin_hash = excluded.pin_hash,
        roles_json = excluded.roles_json,
        active = excluded.active,
        projection_revision = excluded.projection_revision,
        updated_at = excluded.updated_at,
        failed_pin_attempts = 0,
        locked_until = NULL
    `);
    for (const employee of payload.employees) {
      upsert.run(
        employee.staffId,
        employee.employeeCode.toUpperCase(),
        employee.displayName,
        employee.pinHash,
        JSON.stringify(employee.roles),
        employee.active ? 1 : 0,
        payload.projectionRevision,
        payload.generatedAt,
      );
    }
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
}

export async function syncStaffProjection(input: {
  database: EdgeDatabase;
  cloudBaseUrl: string;
  cloudPublicKey: string;
  installationId: string;
  certificateFingerprint: string;
  fetcher?: typeof fetch;
}) {
  const response = await (input.fetcher ?? fetch)(
    new URL("/api/v1/edge/staff-projection", input.cloudBaseUrl),
    {
      headers: {
        "x-vase-edge-installation-id": input.installationId,
        "x-vase-client-cert-fingerprint": input.certificateFingerprint,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "EDGE_STAFF_SYNC_FAILED");
  }
  if (body.algorithm !== "Ed25519" || typeof body.signature !== "string") {
    throw new Error("EDGE_STAFF_PROJECTION_SIGNATURE_INVALID");
  }
  applyStaffProjection(input.database, {
    payload: body.payload,
    signature: body.signature,
    cloudPublicKey: input.cloudPublicKey,
  });
}

import { compare } from "bcryptjs";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { EdgeDatabase } from "./db.js";

export async function authenticateOfflinePin(database: EdgeDatabase, raw: unknown) {
  const input = z.object({
    employeeCode: z.string().min(1),
    pin: z.string().regex(/^\d{4,8}$/),
    branchId: z.string().min(1),
    deviceId: z.string().min(1),
    sessionSecret: z.string().min(24),
  }).strict().parse(raw);
  const employee = database.raw.prepare(`
    SELECT staff_id, display_name, pin_hash, roles_json, active,
           failed_pin_attempts, locked_until
    FROM staff_projection WHERE employee_code = ?
  `).get(input.employeeCode.trim().toUpperCase()) as {
    staff_id: string; display_name: string; pin_hash: string; roles_json: string;
    active: number; failed_pin_attempts: number; locked_until: string | null;
  } | undefined;
  if (!employee?.active) throw new Error("EDGE_PIN_INVALID");
  if (employee.locked_until && new Date(employee.locked_until) > new Date()) {
    throw new Error("EDGE_PIN_LOCKED");
  }
  if (!await compare(input.pin, employee.pin_hash)) {
    const attempts = employee.failed_pin_attempts + 1;
    database.raw.prepare(`
      UPDATE staff_projection
      SET failed_pin_attempts = ?, locked_until = ?
      WHERE staff_id = ?
    `).run(
      attempts,
      attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
      employee.staff_id,
    );
    throw new Error("EDGE_PIN_INVALID");
  }
  const roles = z.array(z.object({
    branchId: z.string(),
    role: z.string(),
    capabilities: z.array(z.string()),
  })).parse(JSON.parse(employee.roles_json)).filter((role) => role.branchId === input.branchId);
  if (!roles.length) throw new Error("EDGE_STAFF_BRANCH_FORBIDDEN");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHmac("sha256", input.sessionSecret).update(token).digest("base64url");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60_000);
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    database.raw.prepare(
      "UPDATE staff_projection SET failed_pin_attempts = 0, locked_until = NULL WHERE staff_id = ?",
    ).run(employee.staff_id);
    database.raw.prepare(`
      INSERT INTO staff_session(
        id, staff_id, branch_id, device_id, token_hash, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), employee.staff_id, input.branchId, input.deviceId,
      tokenHash, expiresAt.toISOString(), new Date().toISOString(),
    );
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
  return {
    sessionToken: token,
    expiresAt: expiresAt.toISOString(),
    staff: { id: employee.staff_id, displayName: employee.display_name, roles },
  };
}

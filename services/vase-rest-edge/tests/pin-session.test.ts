import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash } from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import { applyStaffProjection } from "../src/staff-projection.js";
import { authenticateOfflinePin } from "../src/pin-session.js";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Rest Edge offline PIN sessions", () => {
  it("applies signed role projections and authenticates without cloud", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-pin-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    const keys = generateKeyPairSync("ed25519");
    const payload = {
      projectionRevision: 2,
      generatedAt: new Date().toISOString(),
      employees: [{
        staffId: "staff_1", employeeCode: "MARI", displayName: "María",
        pinHash: await hash("1842", 4), active: true,
        roles: [{ branchId: "branch_1", role: "WAITER", capabilities: ["orders:write"] }],
      }],
    };
    const signature = sign(null, Buffer.from(JSON.stringify(payload)), keys.privateKey).toString("base64url");
    applyStaffProjection(database, {
      payload, signature,
      cloudPublicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
    });
    const result = await authenticateOfflinePin(database, {
      employeeCode: "MARI", pin: "1842", branchId: "branch_1", deviceId: "device_1",
      sessionSecret: "offline-session-secret-with-32-characters",
    });
    expect(result.staff.roles[0]?.role).toBe("WAITER");
    expect(result.sessionToken.length).toBeGreaterThan(30);
    database.close();
  });

  it("locks repeated failures, rejects wrong branches and expires sessions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-pin-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    database.raw.prepare(`
      INSERT INTO staff_projection(
        staff_id, employee_code, display_name, pin_hash, roles_json, active,
        projection_revision, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      "staff_1", "MARI", "María", await hash("1842", 4),
      JSON.stringify([{ branchId: "branch_1", role: "WAITER", capabilities: [] }]),
      new Date().toISOString(),
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(authenticateOfflinePin(database, {
        employeeCode: "MARI", pin: "9999", branchId: "branch_1", deviceId: "device_1",
        sessionSecret: "offline-session-secret-with-32-characters",
      })).rejects.toThrow("EDGE_PIN_INVALID");
    }
    await expect(authenticateOfflinePin(database, {
      employeeCode: "MARI", pin: "1842", branchId: "branch_1", deviceId: "device_1",
      sessionSecret: "offline-session-secret-with-32-characters",
    })).rejects.toThrow("EDGE_PIN_LOCKED");
    database.close();
  });
});

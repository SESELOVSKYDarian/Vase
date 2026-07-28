import type { EdgeDatabase } from "../db.js";
import type { PrinterAdapter } from "./printer-adapter.js";

type PrintJobInput = {
  id: string;
  idempotencyKey: string;
  printerId: string;
  payload: Buffer;
};

export function enqueuePrintJob(database: EdgeDatabase, input: PrintJobInput) {
  const existing = database.raw.prepare(
    "SELECT id, state FROM print_job WHERE idempotency_key = ?",
  ).get(input.idempotencyKey) as { id: string; state: string } | undefined;
  if (existing) return existing;
  database.raw.prepare(`
    INSERT INTO print_job(
      id, idempotency_key, printer_id, payload, state, attempts, next_attempt_at
    ) VALUES (?, ?, ?, ?, 'PENDING', 0, ?)
  `).run(
    input.id,
    input.idempotencyKey,
    input.printerId,
    input.payload,
    new Date(0).toISOString(),
  );
  return { id: input.id, state: "PENDING" };
}

export async function processPrintQueue(database: EdgeDatabase, input: {
  resolveAdapter(printerId: string): PrinterAdapter;
  now?: Date;
  maxAttempts?: number;
  limit?: number;
}) {
  const now = input.now ?? new Date();
  const maxAttempts = input.maxAttempts ?? 8;
  const jobs = database.raw.prepare(`
    SELECT id, printer_id, payload, attempts
    FROM print_job
    WHERE state = 'PENDING' AND next_attempt_at <= ?
    ORDER BY next_attempt_at, id
    LIMIT ?
  `).all(now.toISOString(), input.limit ?? 25) as Array<{
    id: string;
    printer_id: string;
    payload: Uint8Array;
    attempts: number;
  }>;
  for (const job of jobs) {
    const attempts = job.attempts + 1;
    database.raw.prepare(
      "UPDATE print_job SET state = 'PRINTING', attempts = ? WHERE id = ? AND state = 'PENDING'",
    ).run(attempts, job.id);
    try {
      await input.resolveAdapter(job.printer_id).send(Buffer.from(job.payload));
      database.raw.prepare(`
        UPDATE print_job
        SET state = 'PRINTED', printed_at = ?, last_error = NULL
        WHERE id = ?
      `).run(now.toISOString(), job.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "PRINTER_SEND_FAILED";
      const exhausted = attempts >= maxAttempts;
      const delaySeconds = Math.min(300, 2 ** attempts);
      database.raw.prepare(`
        UPDATE print_job
        SET state = ?, next_attempt_at = ?, last_error = ?
        WHERE id = ?
      `).run(
        exhausted ? "FAILED" : "PENDING",
        new Date(now.getTime() + delaySeconds * 1_000).toISOString(),
        message.slice(0, 500),
        job.id,
      );
    }
  }
}

export function retryPrintJob(database: EdgeDatabase, jobId: string) {
  const result = database.raw.prepare(`
    UPDATE print_job
    SET state = 'PENDING', attempts = 0, next_attempt_at = ?, last_error = NULL
    WHERE id = ? AND state = 'FAILED'
  `).run(new Date(0).toISOString(), jobId);
  if (result.changes !== 1) throw new Error("PRINT_JOB_NOT_RETRYABLE");
}


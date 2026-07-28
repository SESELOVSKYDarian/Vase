import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import {
  enqueuePrintJob,
  processPrintQueue,
  retryPrintJob,
} from "../src/printing/print-queue.js";
import { renderEscPosReceipt } from "../src/printing/receipt-template.js";
import type { PrinterAdapter } from "../src/printing/printer-adapter.js";
import {
  printersForRoute,
  queueKitchenTicketPrints,
  savePrinter,
} from "../src/printing/printer-config.js";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Rest Edge ESC/POS printing", () => {
  it("renders a deterministic receipt with initialization, content and cut commands", () => {
    const bytes = renderEscPosReceipt({
      title: "COMANDA #1042",
      lines: [
        { quantity: "2", name: "Hamburguesa", note: "Sin cebolla" },
        { quantity: "1", name: "Agua" },
      ],
      footer: "Mesa 7",
    });
    expect(bytes.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
    expect(bytes.toString("latin1")).toContain("2 x Hamburguesa");
    expect(bytes.toString("latin1")).toContain("Sin cebolla");
    expect(bytes.subarray(-3)).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
  });

  it("persists jobs, deduplicates commands and marks success only after adapter confirmation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-print-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    const first = enqueuePrintJob(database, {
      id: "job-1",
      idempotencyKey: "ticket-8-v1",
      printerId: "printer-kitchen",
      payload: Buffer.from("ticket"),
    });
    const duplicate = enqueuePrintJob(database, {
      id: "job-duplicate",
      idempotencyKey: "ticket-8-v1",
      printerId: "printer-kitchen",
      payload: Buffer.from("ticket"),
    });
    expect(duplicate.id).toBe(first.id);

    const adapter: PrinterAdapter = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    await processPrintQueue(database, {
      resolveAdapter: () => adapter,
      now: new Date("2026-07-28T12:00:00.000Z"),
    });
    expect(adapter.send).toHaveBeenCalledOnce();
    expect(database.raw.prepare("SELECT state, attempts FROM print_job WHERE id = ?")
      .get(first.id)).toEqual({ state: "PRINTED", attempts: 1 });
    database.close();
  });

  it("keeps failed jobs durable and requires an explicit retry after exhaustion", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-print-"));
    cleanup.push(dir);
    let database = openEdgeDatabase({ dataDir: dir });
    enqueuePrintJob(database, {
      id: "job-failed",
      idempotencyKey: "ticket-9-v1",
      printerId: "printer-offline",
      payload: Buffer.from("ticket"),
    });
    const adapter: PrinterAdapter = {
      send: vi.fn().mockRejectedValue(new Error("PRINTER_CONNECTION_REFUSED")),
    };
    await processPrintQueue(database, {
      resolveAdapter: () => adapter,
      now: new Date("2026-07-28T12:00:00.000Z"),
      maxAttempts: 1,
    });
    database.close();

    database = openEdgeDatabase({ dataDir: dir });
    expect(database.raw.prepare("SELECT state, last_error FROM print_job WHERE id = ?")
      .get("job-failed")).toEqual({
      state: "FAILED",
      last_error: "PRINTER_CONNECTION_REFUSED",
    });
    retryPrintJob(database, "job-failed");
    expect(database.raw.prepare("SELECT state, attempts FROM print_job WHERE id = ?")
      .get("job-failed")).toEqual({ state: "PENDING", attempts: 0 });
    database.close();
  });

  it("routes enabled printers by kitchen station or category without exposing credentials", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-print-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    savePrinter(database, {
      id: "printer-grill",
      name: "Cocina caliente",
      connection: { type: "NETWORK", host: "10.0.0.50", port: 9100 },
      routes: [
        { type: "STATION", value: "station-grill" },
        { type: "CATEGORY", value: "category-main" },
      ],
      enabled: true,
    });
    savePrinter(database, {
      id: "printer-disabled",
      name: "Respaldo",
      connection: { type: "WINDOWS_SPOOLER", printerName: "EPSON TM-T20" },
      routes: [{ type: "STATION", value: "station-grill" }],
      enabled: false,
    });
    expect(printersForRoute(database, {
      stationId: "station-grill",
      categoryId: "category-main",
    })).toEqual([expect.objectContaining({
      id: "printer-grill",
      name: "Cocina caliente",
    })]);
    database.close();
  });

  it("queues a kitchen ticket once for every matching printer without coupling KDS state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-print-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    savePrinter(database, {
      id: "printer-grill",
      name: "Parrilla",
      connection: { type: "NETWORK", host: "10.0.0.50", port: 9100 },
      routes: [{ type: "STATION", value: "station-grill" }],
      enabled: true,
    });
    const ticket = {
      id: "ticket-11",
      revision: 1,
      status: "QUEUED",
      stationId: "station-grill",
      order: { orderNumber: 1042, table: { code: "M7" } },
      orderItem: { quantity: "2", nameSnapshot: "Hamburguesa", notes: "Sin sal" },
    };
    expect(queueKitchenTicketPrints(database, ticket)).toBe(1);
    expect(queueKitchenTicketPrints(database, ticket)).toBe(0);
    expect(database.raw.prepare("SELECT COUNT(*) AS count FROM print_job").get())
      .toEqual({ count: 1 });
    expect(ticket.status).toBe("QUEUED");
    database.close();
  });
});

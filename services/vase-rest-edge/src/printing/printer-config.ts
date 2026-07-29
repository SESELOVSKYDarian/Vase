import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { EdgeDatabase } from "../db.js";
import type { PrinterConnection } from "./printer-adapter.js";
import { enqueuePrintJob } from "./print-queue.js";
import { renderEscPosReceipt } from "./receipt-template.js";

const printerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  connection: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("NETWORK"),
      host: z.string().min(1),
      port: z.number().int().positive().max(65535).default(9100),
      timeoutMs: z.number().int().positive().max(60_000).optional(),
    }).strict(),
    z.object({
      type: z.literal("WINDOWS_SPOOLER"),
      printerName: z.string().min(1),
      timeoutMs: z.number().int().positive().max(60_000).optional(),
    }).strict(),
  ]),
  routes: z.array(z.object({
    type: z.enum(["STATION", "CATEGORY", "RECEIPT"]),
    value: z.string().min(1),
  }).strict()).min(1),
  enabled: z.boolean(),
}).strict();

export type PrinterDefinition = z.infer<typeof printerSchema>;

export function savePrinter(database: EdgeDatabase, raw: unknown) {
  const input = printerSchema.parse(raw);
  database.raw.prepare(`
    INSERT INTO printer(
      id, name, connection_type, connection_json, routes_json, enabled, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      connection_type = excluded.connection_type,
      connection_json = excluded.connection_json,
      routes_json = excluded.routes_json,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(
    input.id,
    input.name,
    input.connection.type,
    JSON.stringify(input.connection),
    JSON.stringify(input.routes),
    input.enabled ? 1 : 0,
    new Date().toISOString(),
  );
  return input;
}

export function listPrinters(database: EdgeDatabase): PrinterDefinition[] {
  const rows = database.raw.prepare(`
    SELECT id, name, connection_json, routes_json, enabled
    FROM printer ORDER BY name
  `).all() as Array<{
    id: string;
    name: string;
    connection_json: string;
    routes_json: string;
    enabled: number;
  }>;
  return rows.map((row) => printerSchema.parse({
    id: row.id,
    name: row.name,
    connection: JSON.parse(row.connection_json) as PrinterConnection,
    routes: JSON.parse(row.routes_json),
    enabled: Boolean(row.enabled),
  }));
}

export function printersForRoute(database: EdgeDatabase, input: {
  stationId?: string;
  categoryId?: string;
  receiptType?: string;
}) {
  return listPrinters(database).filter((printer) =>
    printer.enabled && printer.routes.some((route) =>
      (route.type === "STATION" && route.value === input.stationId) ||
      (route.type === "CATEGORY" && route.value === input.categoryId) ||
      (route.type === "RECEIPT" && route.value === input.receiptType),
    ));
}

export function queueKitchenTicketPrints(database: EdgeDatabase, raw: unknown) {
  const ticket = z.object({
    id: z.string().min(1),
    revision: z.number().int().nonnegative(),
    status: z.string(),
    stationId: z.string().min(1),
    order: z.object({
      orderNumber: z.union([z.string(), z.number()]),
      table: z.object({ code: z.string() }).nullable().optional(),
    }).passthrough(),
    orderItem: z.object({
      quantity: z.union([z.string(), z.number()]),
      nameSnapshot: z.string(),
      notes: z.string().nullable().optional(),
      categoryId: z.string().min(1).optional(),
    }).passthrough(),
  }).passthrough().parse(raw);
  if (ticket.status !== "QUEUED") return 0;
  let queued = 0;
  for (const printer of printersForRoute(database, {
    stationId: ticket.stationId,
    categoryId: ticket.orderItem.categoryId,
  })) {
    const idempotencyKey = `KITCHEN_TICKET:${ticket.id}:v${ticket.revision}:${printer.id}`;
    if (database.raw.prepare(
      "SELECT id FROM print_job WHERE idempotency_key = ?",
    ).get(idempotencyKey)) continue;
    enqueuePrintJob(database, {
      id: randomUUID(),
      idempotencyKey,
      printerId: printer.id,
      payload: renderEscPosReceipt({
        title: `COMANDA #${ticket.order.orderNumber}`,
        lines: [{
          quantity: String(ticket.orderItem.quantity),
          name: ticket.orderItem.nameSnapshot,
          note: ticket.orderItem.notes ?? undefined,
        }],
        footer: ticket.order.table?.code
          ? `Mesa ${ticket.order.table.code}`
          : "Sin mesa",
      }),
    });
    queued += 1;
  }
  return queued;
}

export function queueOrderReceiptPrints(database: EdgeDatabase, raw: unknown) {
  const input = z.object({
    order: z.object({
      id: z.string().min(1),
      orderNumber: z.union([z.string(), z.number()]).nullable(),
      revision: z.number().int().nonnegative(),
      total: z.string().min(1),
      items: z.array(z.object({
        quantity: z.union([z.string(), z.number()]),
        nameSnapshot: z.string().min(1),
        lineTotal: z.string().min(1),
      }).passthrough()).min(1),
    }).passthrough(),
    idempotencyKey: z.string().min(1).max(200),
  }).strict().parse(raw);
  const printers = printersForRoute(database, { receiptType: "SALE_RECEIPT" });
  let queued = 0;
  for (const printer of printers) {
    const key = `${input.idempotencyKey}:${printer.id}`;
    if (database.raw.prepare(
      "SELECT id FROM print_job WHERE idempotency_key = ?",
    ).get(key)) continue;
    enqueuePrintJob(database, {
      id: randomUUID(),
      idempotencyKey: key,
      printerId: printer.id,
      payload: renderEscPosReceipt({
        title: input.order.orderNumber
          ? `PEDIDO #${input.order.orderNumber}` : "PEDIDO",
        lines: [
          ...input.order.items.map((item) => ({
            quantity: String(item.quantity),
            name: `${item.nameSnapshot} ARS ${item.lineTotal}`,
          })),
          { quantity: "", name: `TOTAL ARS ${input.order.total}` },
        ],
        footer: "COMPROBANTE NO FISCAL",
      }),
    });
    queued += 1;
  }
  if (!queued && !printers.length) {
    throw new Error("EDGE_RECEIPT_PRINTER_NOT_CONFIGURED");
  }
  return queued;
}

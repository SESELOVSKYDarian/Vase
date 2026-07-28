import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import { acceptLocalCommand } from "../src/events.js";
import { pendingOutbox } from "../src/outbox.js";
import { syncOnce } from "../src/sync-client.js";
import { applySignedConfigDelta, applySnapshots } from "../src/sync-client.js";
import { generateKeyPairSync, sign } from "node:crypto";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Rest Edge durable sync", () => {
  it("validates table and reservation cancellation transitions offline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "TABLE", aggregateId: "t1", version: 1,
      state: { id: "t1", status: "AVAILABLE", revision: 1, capacity: 4, code: "1" },
    }, {
      aggregateType: "RESERVATION", aggregateId: "r1", version: 1,
      state: {
        id: "r1", status: "CONFIRMED", revision: 1, guestName: "Ada",
        startsAt: "2026-07-28T20:00:00.000Z", endsAt: "2026-07-28T22:00:00.000Z",
        partySize: 2, tableIds: ["t1"], tables: [{ table: { id: "t1", code: "1" } }],
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "table-occupied", aggregateType: "TABLE", aggregateId: "t1",
      expectedVersion: 1, eventType: "TABLE_OCCUPIED", actorId: "staff",
      deviceId: "device", idempotencyKey: "table-command", payload: {},
    });
    acceptLocalCommand(database, {
      eventId: "reservation-cancelled", aggregateType: "RESERVATION",
      aggregateId: "r1", expectedVersion: 1,
      eventType: "RESERVATION_CANCELLED", actorId: "staff", deviceId: "device",
      idempotencyKey: "reservation-command", payload: { reason: "Cliente canceló" },
    });
    const table = database.raw.prepare(
      "SELECT state_json FROM aggregate_state WHERE aggregate_type = 'TABLE' AND aggregate_id = 't1'",
    ).get() as { state_json: string };
    const reservation = database.raw.prepare(
      "SELECT state_json FROM aggregate_state WHERE aggregate_type = 'RESERVATION' AND aggregate_id = 'r1'",
    ).get() as { state_json: string };
    expect(JSON.parse(table.state_json)).toMatchObject({ status: "OCCUPIED", revision: 2 });
    expect(JSON.parse(reservation.state_json)).toMatchObject({
      status: "CANCELLED", cancellationReason: "Cliente canceló", revision: 2,
    });
    database.close();
  });

  it("validates kitchen priority and recall transitions offline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "KITCHEN_TICKET",
      aggregateId: "ticket_1",
      version: 3,
      state: {
        id: "ticket_1", status: "READY", revision: 3, priority: 0,
        queuedAt: "2026-07-28T20:00:00.000Z",
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "priority", aggregateType: "KITCHEN_TICKET", aggregateId: "ticket_1",
      expectedVersion: 3, eventType: "KITCHEN_TICKET_PRIORITY_SET",
      actorId: "cook", deviceId: "device", idempotencyKey: "priority-command",
      payload: { priority: 2 },
    });
    acceptLocalCommand(database, {
      eventId: "recall", aggregateType: "KITCHEN_TICKET", aggregateId: "ticket_1",
      expectedVersion: 4, eventType: "KITCHEN_TICKET_RECALLED",
      actorId: "cook", deviceId: "device", idempotencyKey: "recall-command",
      payload: { reason: "Rehacer cocción" },
    });
    const state = database.raw.prepare(`
      SELECT version, state_json FROM aggregate_state
      WHERE aggregate_type = 'KITCHEN_TICKET' AND aggregate_id = 'ticket_1'
    `).get() as { version: number; state_json: string };
    expect(state.version).toBe(5);
    expect(JSON.parse(state.state_json)).toMatchObject({
      status: "PREPARING", revision: 5, priority: 2,
      recallReason: "Rehacer cocción",
    });
    expect(pendingOutbox(database).slice(-2).map((event) => event.payload)).toEqual([
      expect.objectContaining({ status: "READY", priority: 2 }),
      expect.objectContaining({ status: "PREPARING", recallReason: "Rehacer cocción" }),
    ]);
    database.close();
  });

  it("cancels an open order offline without trusting a browser total", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "ORDER", aggregateId: "o-cancel", version: 2,
      state: {
        id: "o-cancel", status: "OPEN", revision: 2, total: "100.00",
        subtotal: "82.64", taxTotal: "17.36", items: [{ id: "i1", status: "DRAFT" }],
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "order-cancelled", aggregateType: "ORDER", aggregateId: "o-cancel",
      expectedVersion: 2, eventType: "ORDER_CANCELLED", actorId: "staff",
      deviceId: "device", idempotencyKey: "cancel-command",
      payload: { reason: "Error de carga" },
    });
    const order = database.raw.prepare(
      "SELECT state_json FROM aggregate_state WHERE aggregate_type = 'ORDER' AND aggregate_id = 'o-cancel'",
    ).get() as { state_json: string };
    expect(JSON.parse(order.state_json)).toMatchObject({
      status: "CANCELLED", cancellationReason: "Error de carga", revision: 3,
    });
    database.close();
  });

  it("occupies a selected table atomically when opening its order", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "TABLE", aggregateId: "table-order", version: 3,
      state: {
        id: "table-order", code: "M4", status: "AVAILABLE",
        revision: 3, capacity: 4,
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "open-table-order", aggregateType: "ORDER", aggregateId: "order-table",
      expectedVersion: 0, eventType: "ORDER_OPENED", actorId: "staff",
      deviceId: "device", idempotencyKey: "open-table-command",
      payload: { tableId: "table-order", guestCount: 3 },
    });
    const table = database.raw.prepare(`
      SELECT version, state_json FROM aggregate_state
      WHERE aggregate_type = 'TABLE' AND aggregate_id = 'table-order'
    `).get() as { version: number; state_json: string };
    expect({ version: table.version, ...JSON.parse(table.state_json) }).toMatchObject({
      version: 4, status: "OCCUPIED", revision: 4,
    });
    database.close();
  });

  it("splits and merges draft orders atomically in local Edge state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    const item = (id: string, amount: string) => ({
      id, status: "DRAFT", lineTotal: amount, netTotal: amount, taxAmount: "0.00",
    });
    applySnapshots(database, [{
      aggregateType: "ORDER", aggregateId: "source", version: 1,
      state: {
        id: "source", status: "OPEN", revision: 1, orderNumber: 1,
        subtotal: "30.00", taxTotal: "0.00", total: "30.00",
        items: [item("i1", "10.00"), item("i2", "20.00")],
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "split", aggregateType: "ORDER", aggregateId: "source",
      expectedVersion: 1, eventType: "ORDER_SPLIT", actorId: "staff",
      deviceId: "device", idempotencyKey: "split-command",
      payload: { itemIds: ["i2"], newOrderId: "split-order" },
    });
    acceptLocalCommand(database, {
      eventId: "merge", aggregateType: "ORDER", aggregateId: "source",
      expectedVersion: 2, eventType: "ORDER_MERGED", actorId: "staff",
      deviceId: "device", idempotencyKey: "merge-command",
      payload: { sourceOrderId: "split-order", sourceExpectedVersion: 2 },
    });
    const target = database.raw.prepare(
      "SELECT state_json FROM aggregate_state WHERE aggregate_type = 'ORDER' AND aggregate_id = 'source'",
    ).get() as { state_json: string };
    const merged = database.raw.prepare(
      "SELECT state_json FROM aggregate_state WHERE aggregate_type = 'ORDER' AND aggregate_id = 'split-order'",
    ).get() as { state_json: string };
    expect(JSON.parse(target.state_json)).toMatchObject({ total: "30.00", revision: 3 });
    expect(JSON.parse(merged.state_json)).toMatchObject({ status: "MERGED", revision: 3 });
    database.close();
  });
  it("commits local aggregate and outbox together and orders uploads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    acceptLocalCommand(database, {
      eventId: "e1", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 0, eventType: "OPENED", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c1", payload: { status: "OPEN" },
    });
    acceptLocalCommand(database, {
      eventId: "e2", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 1, eventType: "ITEM_ADDED", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c2", payload: { items: 1 },
    });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e1", "e2"]);
    expect(() => acceptLocalCommand(database, {
      eventId: "e3", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 0, eventType: "STALE", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c3", payload: {},
    })).toThrow("EDGE_AGGREGATE_VERSION_CONFLICT");
    database.close();
  });

  it("acknowledges partial batches and retries remaining events after restart", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    let database = openEdgeDatabase({ dataDir: dir });
    for (const [index, id] of ["e1", "e2"].entries()) {
      acceptLocalCommand(database, {
        eventId: id, aggregateType: "ORDER", aggregateId: `o${index}`,
        expectedVersion: 0, eventType: "OPENED", actorId: "s1", deviceId: "d1",
        idempotencyKey: `c${index}`, payload: {},
      });
    }
    const upload = vi.fn(async () => ({
      receipts: [{ eventId: "e1", status: "ACCEPTED" as const, aggregateVersion: 1 }],
    }));
    await syncOnce(database, { upload });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e2"]);
    database.close();
    database = openEdgeDatabase({ dataDir: dir });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e2"]);
    database.close();
  });

  it("verifies config deltas and restores signed cloud snapshots after conflict", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    const keys = generateKeyPairSync("ed25519");
    const payload = {
      revision: 7, generatedAt: new Date().toISOString(),
      policies: [{
        family: "PRICING", scopeType: "BRANCH", scopeId: "branch_1",
        revision: 3, value: { taxIncluded: true },
      }],
    };
    applySignedConfigDelta(database, {
      payload,
      signature: sign(null, Buffer.from(JSON.stringify(payload)), keys.privateKey).toString("base64url"),
      cloudPublicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
    });
    expect(database.raw.prepare("SELECT revision FROM config_projection WHERE family = 'PRICING'")
      .get()).toEqual({ revision: 3 });
    applySnapshots(database, [{
      aggregateType: "ORDER", aggregateId: "o1", version: 8, state: { status: "READY" },
    }]);
    expect(database.raw.prepare(
      "SELECT version FROM aggregate_state WHERE aggregate_type = 'ORDER' AND aggregate_id = 'o1'",
    ).get()).toEqual({ version: 8 });
    database.close();
  });

  it("prices offline order items from the cloud catalog snapshot, not browser totals", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "CATALOG",
      aggregateId: "current",
      version: 2,
      state: {
        products: [{
          id: "product_1",
          categoryId: "category_1",
          sku: "BURGER",
          name: "Burger",
          available: true,
          unitPrice: "1210.00",
          taxRate: "21.00",
          taxIncluded: true,
          stationId: "station_1",
          recipeItems: [],
          modifierOptions: [],
        }],
        timezone: "America/Argentina/Buenos_Aires",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        branchGroupIds: [],
        promotions: [{
          id: "promo_1",
          code: "EFECTIVO",
          scopeType: "TENANT",
          scopeId: "tenant_1",
          discountType: "PERCENTAGE",
          discountValue: "10.0000",
          productIds: ["product_1"],
          paymentMethods: ["CASH"],
          weekdays: [],
          minimumQuantity: 1,
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2027-01-01T00:00:00.000Z",
          priority: 1,
          active: true,
        }],
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "open_1", aggregateType: "ORDER", aggregateId: "order_1",
      expectedVersion: 0, eventType: "ORDER_OPENED", actorId: "staff_1",
      deviceId: "device_1", idempotencyKey: "open_cmd_1",
      payload: { guestCount: 2 },
    });
    acceptLocalCommand(database, {
      eventId: "item_1", aggregateType: "ORDER", aggregateId: "order_1",
      expectedVersion: 1, eventType: "ORDER_ITEM_ADDED", actorId: "staff_1",
      deviceId: "device_1", idempotencyKey: "item_cmd_1",
      payload: {
        productId: "product_1",
        quantity: 2,
        course: 1,
        modifiers: [],
        paymentMethod: "CASH",
        lineTotal: "0.01",
      },
    });
    const state = database.raw.prepare(`
      SELECT state_json FROM aggregate_state
      WHERE aggregate_type = 'ORDER' AND aggregate_id = 'order_1'
    `).get() as { state_json: string };
    expect(JSON.parse(state.state_json)).toMatchObject({
      status: "OPEN",
      subtotal: "1800.00",
      discountTotal: "242.00",
      taxTotal: "378.00",
      total: "2178.00",
      items: [{
        skuSnapshot: "BURGER",
        grossBeforeDiscount: "2420.00",
        discountTotal: "242.00",
        promotionIds: ["promo_1"],
        lineTotal: "2178.00",
        netTotal: "1800.00",
        taxAmount: "378.00",
      }],
    });
    expect(pendingOutbox(database)[1]?.payload).toMatchObject({
      productId: "product_1",
      lineTotal: "2178.00",
      catalogRevision: 2,
    });
    acceptLocalCommand(database, {
      eventId: "submit_1", aggregateType: "ORDER", aggregateId: "order_1",
      expectedVersion: 2, eventType: "ORDER_SUBMITTED", actorId: "staff_1",
      deviceId: "device_1", idempotencyKey: "submit_cmd_1", payload: {},
    });
    expect(database.raw.prepare(`
      SELECT COUNT(*) AS count FROM aggregate_state
      WHERE aggregate_type = 'KITCHEN_TICKET'
    `).get()).toEqual({ count: 1 });
    expect(pendingOutbox(database)[2]?.payload).toMatchObject({
      tickets: [expect.objectContaining({ stationId: "station_1" })],
      consumptions: [],
    });
    database.close();
  });

  it("checks table capacity and overlap before accepting an offline reservation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "TABLE",
      aggregateId: "table_1",
      version: 1,
      state: { id: "table_1", code: "M1", capacity: 4, status: "AVAILABLE" },
    }]);
    const first = {
      guestName: "Ana",
      partySize: 4,
      startsAt: "2026-07-29T20:00:00.000Z",
      endsAt: "2026-07-29T22:00:00.000Z",
      tableIds: ["table_1"],
    };
    acceptLocalCommand(database, {
      eventId: "reservation_1",
      aggregateType: "RESERVATION",
      aggregateId: "reservation_1",
      expectedVersion: 0,
      eventType: "RESERVATION_CREATED",
      actorId: "staff_1",
      deviceId: "device_1",
      idempotencyKey: "reservation_cmd_1",
      payload: first,
    });
    expect(() => acceptLocalCommand(database, {
      eventId: "reservation_2",
      aggregateType: "RESERVATION",
      aggregateId: "reservation_2",
      expectedVersion: 0,
      eventType: "RESERVATION_CREATED",
      actorId: "staff_1",
      deviceId: "device_1",
      idempotencyKey: "reservation_cmd_2",
      payload: {
        ...first,
        guestName: "Luis",
        startsAt: "2026-07-29T21:00:00.000Z",
        endsAt: "2026-07-29T23:00:00.000Z",
      },
    })).toThrow("EDGE_RESERVATION_OVERLAP");
    database.close();
  });

  it("applies an offline cash payment atomically to payment, order, drawer, and outbox", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    applySnapshots(database, [{
      aggregateType: "ORDER",
      aggregateId: "order_1",
      version: 4,
      state: {
        id: "order_1",
        status: "SUBMITTED",
        total: "100.00",
        paidTotal: "0.00",
        revision: 4,
      },
    }]);
    acceptLocalCommand(database, {
      eventId: "drawer_open",
      aggregateType: "CASH_DRAWER",
      aggregateId: "drawer_1",
      expectedVersion: 0,
      eventType: "CASH_DRAWER_OPENED",
      actorId: "cashier_1",
      deviceId: "device_1",
      idempotencyKey: "drawer_open_cmd",
      payload: { stationId: "POS-1", openingFloat: "500.00" },
    });
    acceptLocalCommand(database, {
      eventId: "payment_1",
      aggregateType: "PAYMENT",
      aggregateId: "payment_1",
      expectedVersion: 0,
      eventType: "CASH_PAYMENT_APPLIED",
      actorId: "cashier_1",
      deviceId: "device_1",
      idempotencyKey: "payment_cmd_1",
      payload: { orderId: "order_1", amount: "100.00" },
    });
    const order = database.raw.prepare(`
      SELECT version, state_json FROM aggregate_state
      WHERE aggregate_type = 'ORDER' AND aggregate_id = 'order_1'
    `).get() as { version: number; state_json: string };
    const drawer = database.raw.prepare(`
      SELECT version, state_json FROM aggregate_state
      WHERE aggregate_type = 'CASH_DRAWER' AND aggregate_id = 'drawer_1'
    `).get() as { version: number; state_json: string };
    expect({ version: order.version, ...JSON.parse(order.state_json) }).toMatchObject({
      version: 5,
      status: "PAID",
      paidTotal: "100.00",
    });
    expect({ version: drawer.version, ...JSON.parse(drawer.state_json) }).toMatchObject({
      version: 2,
      expectedCash: "600.00",
    });
    expect(pendingOutbox(database).map((item) => item.eventId)).toEqual([
      "drawer_open",
      "payment_1",
    ]);
    database.close();
  });

  it("records paid-in and paid-out movements offline with exact drawer balance", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    acceptLocalCommand(database, {
      eventId: "drawer-movement-open", aggregateType: "CASH_DRAWER",
      aggregateId: "drawer-movement", expectedVersion: 0,
      eventType: "CASH_DRAWER_OPENED", actorId: "cashier",
      deviceId: "device", idempotencyKey: "drawer-movement-open-command",
      payload: { stationId: "POS-2", openingFloat: "500.00" },
    });
    acceptLocalCommand(database, {
      eventId: "drawer-paid-out", aggregateType: "CASH_DRAWER",
      aggregateId: "drawer-movement", expectedVersion: 1,
      eventType: "CASH_MOVEMENT_RECORDED", actorId: "cashier",
      deviceId: "device", idempotencyKey: "drawer-paid-out-command",
      payload: { type: "PAID_OUT", amount: "125.50", reason: "Compra urgente" },
    });
    const drawer = database.raw.prepare(`
      SELECT version, state_json FROM aggregate_state
      WHERE aggregate_type = 'CASH_DRAWER' AND aggregate_id = 'drawer-movement'
    `).get() as { version: number; state_json: string };
    expect({ version: drawer.version, ...JSON.parse(drawer.state_json) }).toMatchObject({
      version: 2, expectedCash: "374.50", revision: 2,
    });
    expect(pendingOutbox(database)[1]?.payload).toMatchObject({
      type: "PAID_OUT", amount: "125.50", signedAmount: "-125.50",
      balanceAfter: "374.50",
    });
    database.close();
  });
});

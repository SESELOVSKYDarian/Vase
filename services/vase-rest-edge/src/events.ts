import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { EdgeDatabase } from "./db.js";

const commandSchema = z.object({
  eventId: z.string().min(1), aggregateType: z.string().min(1),
  aggregateId: z.string().min(1), expectedVersion: z.number().int().nonnegative(),
  eventType: z.string().min(1), actorId: z.string().min(1), deviceId: z.string().min(1),
  idempotencyKey: z.string().min(1), payload: z.record(z.string(), z.unknown()),
}).strict();

const money = z.string().regex(/^(?:0|[1-9]\d{0,15})\.\d{2}$/);

function cents(value: string) {
  const [whole, fraction] = money.parse(value).split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction);
}

function formatMoney(value: bigint) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  return `${negative ? "-" : ""}${absolute / BigInt(100)}.${
    String(absolute % BigInt(100)).padStart(2, "0")
  }`;
}

type CatalogProduct = {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  available: boolean;
  unitPrice: string;
  taxRate: string;
  taxIncluded: boolean;
  stationId?: string;
  recipeItems: Array<{ ingredientId: string; quantity: string }>;
  modifierOptions: Array<{
    id: string;
    name: string;
    priceDelta: string;
    active: boolean;
  }>;
};

function catalog(database: EdgeDatabase) {
  const row = database.raw.prepare(`
    SELECT version, state_json FROM aggregate_state
    WHERE aggregate_type = 'CATALOG' AND aggregate_id = 'current'
  `).get() as { version: number; state_json: string } | undefined;
  if (!row) throw new Error("EDGE_CATALOG_NOT_AVAILABLE");
  const state = z.object({
    products: z.array(z.object({
      id: z.string(),
      categoryId: z.string(),
      sku: z.string(),
      name: z.string(),
      available: z.boolean(),
      unitPrice: money,
      taxRate: z.string().regex(/^\d{1,3}\.\d{2}$/),
      taxIncluded: z.boolean(),
      stationId: z.string().optional(),
      recipeItems: z.array(z.object({
        ingredientId: z.string(),
        quantity: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/),
      }).strict()).default([]),
      modifierOptions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        priceDelta: money,
        active: z.boolean(),
      }).strict()),
    }).strict()),
  }).passthrough().parse(JSON.parse(row.state_json));
  return { revision: row.version, products: state.products as CatalogProduct[] };
}

function orderTransition(
  database: EdgeDatabase,
  input: z.infer<typeof commandSchema>,
  current: Record<string, unknown> | undefined,
  nextVersion: number,
) {
  if (input.eventType === "ORDER_OPENED") {
    if (current) throw new Error("EDGE_ORDER_ALREADY_EXISTS");
    const intent = z.object({
      tableId: z.string().min(1).optional(),
      guestCount: z.number().int().positive().max(500),
    }).strict().parse(input.payload);
    const eventPayload = {
      ...intent,
      openedAt: new Date().toISOString(),
    };
    return {
      eventPayload,
      state: {
        id: input.aggregateId,
        orderNumber: null,
        status: "OPEN",
        guestCount: intent.guestCount,
        tableId: intent.tableId ?? null,
        subtotal: "0.00",
        discountTotal: "0.00",
        taxTotal: "0.00",
        total: "0.00",
        revision: nextVersion,
        items: [],
      },
    };
  }
  if (!current) throw new Error("EDGE_ORDER_NOT_FOUND");
  if (input.eventType === "ORDER_ITEM_ADDED") {
    if (current.status !== "OPEN") throw new Error("EDGE_ORDER_STATUS_INVALID");
    const intent = z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive().max(999),
      course: z.number().int().positive().max(20),
      notes: z.string().max(1000).optional(),
      modifiers: z.array(z.object({
        optionId: z.string().min(1),
        quantity: z.number().int().positive().max(99),
      }).strict()),
    }).passthrough().parse(input.payload);
    const currentCatalog = catalog(database);
    const product = currentCatalog.products.find((item) =>
      item.id === intent.productId && item.available);
    if (!product) throw new Error("EDGE_PRODUCT_UNAVAILABLE");
    const selected = intent.modifiers.map((requested) => {
      const option = product.modifierOptions.find((candidate) =>
        candidate.id === requested.optionId && candidate.active);
      if (!option) throw new Error("EDGE_MODIFIER_NOT_FOUND");
      return {
        optionId: option.id,
        nameSnapshot: option.name,
        quantity: requested.quantity,
        unitDelta: option.priceDelta,
        totalDelta: formatMoney(cents(option.priceDelta) * BigInt(requested.quantity)),
      };
    });
    const modifierCents = selected.reduce(
      (sum, option) => sum + cents(option.totalDelta),
      BigInt(0),
    );
    const unitGross = cents(product.unitPrice) + modifierCents;
    const gross = unitGross * BigInt(intent.quantity);
    const rateBasisPoints = BigInt(
      Math.round(Number(product.taxRate) * 100),
    );
    const net = product.taxIncluded
      ? (gross * BigInt(10_000) + (BigInt(10_000) + rateBasisPoints) / BigInt(2)) /
        (BigInt(10_000) + rateBasisPoints)
      : gross;
    const finalGross = product.taxIncluded
      ? gross
      : (net * (BigInt(10_000) + rateBasisPoints) + BigInt(5_000)) /
        BigInt(10_000);
    const item = {
      id: randomUUID(),
      productId: product.id,
      categoryId: product.categoryId,
      stationId: product.stationId,
      recipeItems: product.recipeItems,
      skuSnapshot: product.sku,
      nameSnapshot: product.name,
      quantity: intent.quantity,
      unitPrice: product.unitPrice,
      modifierTotal: formatMoney(modifierCents),
      lineTotal: formatMoney(finalGross),
      netTotal: formatMoney(net),
      taxAmount: formatMoney(finalGross - net),
      taxRate: product.taxRate,
      taxIncluded: product.taxIncluded,
      course: intent.course,
      notes: intent.notes,
      status: "DRAFT",
      revision: 1,
      modifiers: selected,
    };
    const items = z.array(z.record(z.string(), z.unknown()))
      .parse(current.items ?? []);
    const nextItems = [...items, item];
    const total = nextItems.reduce(
      (sum, candidate) => sum + cents(String(candidate.lineTotal)),
      BigInt(0),
    );
    const subtotal = nextItems.reduce(
      (sum, candidate) => sum + cents(String(candidate.netTotal)),
      BigInt(0),
    );
    const taxTotal = nextItems.reduce(
      (sum, candidate) => sum + cents(String(candidate.taxAmount)),
      BigInt(0),
    );
    return {
      eventPayload: {
        ...item,
        catalogRevision: currentCatalog.revision,
      },
      state: {
        ...current,
        items: nextItems,
        subtotal: formatMoney(subtotal),
        taxTotal: formatMoney(taxTotal),
        total: formatMoney(total),
        revision: nextVersion,
      },
    };
  }
  if (input.eventType === "ORDER_SUBMITTED") {
    if (current.status !== "OPEN") throw new Error("EDGE_ORDER_STATUS_INVALID");
    const items = z.array(z.record(z.string(), z.unknown()))
      .parse(current.items ?? []);
    if (!items.length) throw new Error("EDGE_ORDER_EMPTY");
    const tickets = items.map((item) => {
      const stationId = String(item.stationId ?? "");
      if (!stationId) throw new Error("EDGE_KITCHEN_STATION_NOT_CONFIGURED");
      return {
        id: randomUUID(),
        orderId: input.aggregateId,
        orderItemId: String(item.id),
        stationId,
        status: "QUEUED",
        revision: 1,
        order: {
          orderNumber: current.orderNumber ?? "OFFLINE",
          table: null,
        },
        orderItem: {
          ...item,
          status: "QUEUED",
        },
      };
    });
    const required = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      const recipes = z.array(z.object({
        ingredientId: z.string(),
        quantity: z.string(),
      })).parse(item.recipeItems ?? []);
      for (const recipe of recipes) {
        const units = Math.round(Number(recipe.quantity) * 1_000_000) * quantity;
        required.set(
          recipe.ingredientId,
          (required.get(recipe.ingredientId) ?? 0) + units,
        );
      }
    }
    const allocationRows = database.raw.prepare(`
      SELECT aggregate_id, version, state_json FROM aggregate_state
      WHERE aggregate_type = 'INVENTORY_ALLOCATION'
    `).all() as Array<{
      aggregate_id: string;
      version: number;
      state_json: string;
    }>;
    const allocationUpdates: Array<{
      aggregateType: string;
      aggregateId: string;
      version: number;
      state: Record<string, unknown>;
    }> = [];
    const consumptions = [...required].map(([ingredientId, units]) => {
      const row = allocationRows.find((candidate) =>
        JSON.parse(candidate.state_json).ingredientId === ingredientId);
      if (!row) throw new Error("EDGE_INVENTORY_ALLOCATION_REQUIRED");
      const allocation = z.object({
        id: z.string(),
        ingredientId: z.string(),
        warehouseId: z.string(),
        available: z.string(),
        safetyStock: z.string(),
        revision: z.number().int(),
      }).passthrough().parse(JSON.parse(row.state_json));
      const availableUnits = Math.round(Number(allocation.available) * 1_000_000);
      const safetyUnits = Math.round(Number(allocation.safetyStock) * 1_000_000);
      if (availableUnits - units < safetyUnits) {
        throw new Error("EDGE_INVENTORY_ALLOCATION_INSUFFICIENT");
      }
      const remainingAfter = ((availableUnits - units) / 1_000_000).toFixed(6);
      allocationUpdates.push({
        aggregateType: "INVENTORY_ALLOCATION",
        aggregateId: row.aggregate_id,
        version: row.version + 1,
        state: {
          ...allocation,
          available: remainingAfter,
          revision: row.version + 1,
        },
      });
      return {
        allocationId: allocation.id,
        ingredientId,
        warehouseId: allocation.warehouseId,
        quantity: (units / 1_000_000).toFixed(6),
        remainingAfter,
        expectedRevision: row.version,
      };
    });
    const submittedAt = new Date().toISOString();
    return {
      eventPayload: {
        submittedAt,
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          orderItemId: ticket.orderItemId,
          stationId: ticket.stationId,
        })),
        consumptions,
      },
      state: {
        ...current,
        status: "SUBMITTED",
        submittedAt,
        revision: nextVersion,
        items: items.map((item) => ({ ...item, status: "QUEUED" })),
      },
      additionalStates: [
        ...allocationUpdates,
        ...tickets.map((ticket) => ({
          aggregateType: "KITCHEN_TICKET",
          aggregateId: ticket.id,
          version: 1,
          state: ticket,
        })),
      ],
      createdTickets: tickets,
    };
  }
  return {
    eventPayload: input.payload,
    state: { ...current, ...input.payload, revision: nextVersion },
  };
}

function reservationTransition(
  database: EdgeDatabase,
  input: z.infer<typeof commandSchema>,
  current: Record<string, unknown> | undefined,
  nextVersion: number,
) {
  if (input.eventType !== "RESERVATION_CREATED" || current) {
    throw new Error("EDGE_RESERVATION_EVENT_INVALID");
  }
  const intent = z.object({
    guestName: z.string().trim().min(2).max(120),
    guestPhone: z.string().trim().min(6).max(30).optional(),
    partySize: z.number().int().positive().max(200),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    tableIds: z.array(z.string().min(1)).min(1),
    notes: z.string().max(1000).optional(),
  }).strict().parse(input.payload);
  const startsAt = new Date(intent.startsAt);
  const endsAt = new Date(intent.endsAt);
  if (endsAt <= startsAt) throw new Error("EDGE_RESERVATION_TIME_INVALID");
  const tableIds = [...new Set(intent.tableIds)];
  const tables = tableIds.map((tableId) => {
    const row = database.raw.prepare(`
      SELECT state_json FROM aggregate_state
      WHERE aggregate_type = 'TABLE' AND aggregate_id = ?
    `).get(tableId) as { state_json: string } | undefined;
    if (!row) throw new Error("EDGE_RESERVATION_TABLE_NOT_FOUND");
    return z.object({
      id: z.string(),
      code: z.string(),
      capacity: z.number().int().positive(),
    }).passthrough().parse(JSON.parse(row.state_json));
  });
  if (tables.reduce((sum, table) => sum + table.capacity, 0) < intent.partySize) {
    throw new Error("EDGE_RESERVATION_CAPACITY_INSUFFICIENT");
  }
  const reservations = database.raw.prepare(`
    SELECT state_json FROM aggregate_state WHERE aggregate_type = 'RESERVATION'
  `).all() as Array<{ state_json: string }>;
  const overlaps = reservations.some((row) => {
    const reservation = JSON.parse(row.state_json) as {
      status: string;
      startsAt: string;
      endsAt: string;
      tableIds: string[];
    };
    return reservation.status === "CONFIRMED" &&
      new Date(reservation.startsAt) < endsAt &&
      new Date(reservation.endsAt) > startsAt &&
      reservation.tableIds.some((id) => tableIds.includes(id));
  });
  if (overlaps) throw new Error("EDGE_RESERVATION_OVERLAP");
  const state = {
    id: input.aggregateId,
    ...intent,
    tableIds,
    tables: tables.map((table) => ({ table })),
    status: "CONFIRMED",
    revision: nextVersion,
  };
  return {
    state,
    eventPayload: { ...intent, tableIds },
    additionalStates: [],
    createdTickets: [],
  };
}

function cashDrawerTransition(
  database: EdgeDatabase,
  input: z.infer<typeof commandSchema>,
  current: Record<string, unknown> | undefined,
  nextVersion: number,
) {
  if (input.eventType === "CASH_DRAWER_OPENED") {
    if (current) throw new Error("EDGE_CASH_DRAWER_ALREADY_EXISTS");
    const intent = z.object({
      stationId: z.string().trim().min(1).max(100),
      openingFloat: money,
    }).strict().parse(input.payload);
    const openRows = database.raw.prepare(`
      SELECT state_json FROM aggregate_state WHERE aggregate_type = 'CASH_DRAWER'
    `).all() as Array<{ state_json: string }>;
    if (openRows.some((row) => {
      const drawer = JSON.parse(row.state_json) as {
        stationId: string;
        status: string;
      };
      return drawer.stationId === intent.stationId && drawer.status === "OPEN";
    })) throw new Error("EDGE_CASH_DRAWER_ALREADY_OPEN");
    const openedAt = new Date().toISOString();
    const state = {
      id: input.aggregateId,
      stationId: intent.stationId,
      status: "OPEN",
      openingFloat: intent.openingFloat,
      expectedCash: intent.openingFloat,
      countedCash: null,
      variance: null,
      revision: nextVersion,
      openedAt,
    };
    return {
      state,
      eventPayload: { ...intent, openedAt },
      additionalStates: [],
      createdTickets: [],
    };
  }
  if (input.eventType === "CASH_DRAWER_CLOSED" && current) {
    if (current.status !== "OPEN") throw new Error("EDGE_CASH_DRAWER_NOT_OPEN");
    const intent = z.object({ countedCash: money }).strict().parse(input.payload);
    const variance = cents(intent.countedCash) - cents(String(current.expectedCash));
    const closedAt = new Date().toISOString();
    return {
      state: {
        ...current,
        status: "CLOSED",
        countedCash: intent.countedCash,
        variance: formatMoney(variance < BigInt(0) ? -variance : variance),
        varianceDirection: variance < BigInt(0) ? "SHORT" : "OVER",
        revision: nextVersion,
        closedAt,
      },
      eventPayload: {
        countedCash: intent.countedCash,
        expectedCash: current.expectedCash,
        variance: formatMoney(variance),
        closedAt,
      },
      additionalStates: [],
      createdTickets: [],
    };
  }
  throw new Error("EDGE_CASH_DRAWER_EVENT_INVALID");
}

function paymentTransition(
  database: EdgeDatabase,
  input: z.infer<typeof commandSchema>,
  current: Record<string, unknown> | undefined,
) {
  if (input.eventType !== "CASH_PAYMENT_APPLIED" || current) {
    throw new Error("EDGE_PAYMENT_EVENT_INVALID");
  }
  const intent = z.object({
    orderId: z.string().min(1),
    amount: money,
  }).strict().parse(input.payload);
  const orderRow = database.raw.prepare(`
    SELECT version, state_json FROM aggregate_state
    WHERE aggregate_type = 'ORDER' AND aggregate_id = ?
  `).get(intent.orderId) as {
    version: number;
    state_json: string;
  } | undefined;
  if (!orderRow) throw new Error("EDGE_PAYMENT_ORDER_NOT_FOUND");
  const order = z.object({
    id: z.string(),
    status: z.string(),
    total: money,
    paidTotal: money.optional().default("0.00"),
    revision: z.number().int(),
  }).passthrough().parse(JSON.parse(orderRow.state_json));
  if (["CANCELLED", "PAID", "REFUNDED"].includes(order.status)) {
    throw new Error("EDGE_PAYMENT_ORDER_INVALID");
  }
  const remaining = cents(order.total) - cents(order.paidTotal);
  const amount = cents(intent.amount);
  if (amount <= BigInt(0) || amount > remaining) {
    throw new Error("EDGE_PAYMENT_EXCEEDS_BALANCE");
  }
  const drawerRows = database.raw.prepare(`
    SELECT aggregate_id, version, state_json FROM aggregate_state
    WHERE aggregate_type = 'CASH_DRAWER'
  `).all() as Array<{
    aggregate_id: string;
    version: number;
    state_json: string;
  }>;
  const drawerRow = drawerRows.find((row) =>
    (JSON.parse(row.state_json) as { status: string }).status === "OPEN");
  if (!drawerRow) throw new Error("EDGE_CASH_DRAWER_REQUIRED");
  const drawer = z.object({
    id: z.string(),
    status: z.literal("OPEN"),
    expectedCash: money,
    revision: z.number().int(),
  }).passthrough().parse(JSON.parse(drawerRow.state_json));
  const expectedCash = formatMoney(cents(drawer.expectedCash) + amount);
  const paidTotal = formatMoney(cents(order.paidTotal) + amount);
  const paid = amount === remaining;
  const occurredAt = new Date().toISOString();
  const state = {
    id: input.aggregateId,
    orderId: order.id,
    drawerId: drawer.id,
    tenderType: "CASH",
    amount: intent.amount,
    currency: "ARS",
    status: "APPLIED",
    createdAt: occurredAt,
  };
  return {
    state,
    eventPayload: {
      ...state,
      drawerExpectedCash: expectedCash,
      orderPaidTotal: paidTotal,
      orderStatus: paid ? "PAID" : order.status,
      occurredAt,
      orderExpectedRevision: orderRow.version,
      drawerExpectedRevision: drawerRow.version,
    },
    additionalStates: [{
      aggregateType: "ORDER",
      aggregateId: order.id,
      version: orderRow.version + 1,
      state: {
        ...order,
        paidTotal,
        status: paid ? "PAID" : order.status,
        revision: orderRow.version + 1,
      },
    }, {
      aggregateType: "CASH_DRAWER",
      aggregateId: drawer.id,
      version: drawerRow.version + 1,
      state: {
        ...drawer,
        expectedCash,
        revision: drawerRow.version + 1,
      },
    }],
    createdTickets: [],
  };
}

export function acceptLocalCommand(database: EdgeDatabase, raw: unknown) {
  const input = commandSchema.parse(raw);
  const duplicate = database.raw.prepare(
    "SELECT event_id FROM local_event WHERE idempotency_key = ?",
  ).get(input.idempotencyKey) as { event_id: string } | undefined;
  if (duplicate) return { eventId: duplicate.event_id, duplicate: true };
  const aggregate = database.raw.prepare(`
    SELECT version, state_json FROM aggregate_state
    WHERE aggregate_type = ? AND aggregate_id = ?
  `).get(input.aggregateType, input.aggregateId) as {
    version: number; state_json: string;
  } | undefined;
  const version = aggregate?.version ?? 0;
  if (version !== input.expectedVersion) throw new Error("EDGE_AGGREGATE_VERSION_CONFLICT");
  const nextVersion = version + 1;
  const occurredAt = new Date().toISOString();
  const transition = input.aggregateType === "ORDER" &&
      input.eventType.startsWith("ORDER_")
    ? orderTransition(
        database,
        input,
        aggregate ? JSON.parse(aggregate.state_json) as Record<string, unknown> : undefined,
        nextVersion,
      )
    : input.aggregateType === "RESERVATION"
      ? reservationTransition(
          database,
          input,
          aggregate
            ? JSON.parse(aggregate.state_json) as Record<string, unknown>
            : undefined,
          nextVersion,
        )
      : input.aggregateType === "CASH_DRAWER"
        ? cashDrawerTransition(
            database,
            input,
            aggregate
              ? JSON.parse(aggregate.state_json) as Record<string, unknown>
              : undefined,
            nextVersion,
          )
        : input.aggregateType === "PAYMENT"
          ? paymentTransition(
              database,
              input,
              aggregate
                ? JSON.parse(aggregate.state_json) as Record<string, unknown>
                : undefined,
            )
      : {
        state: input.payload,
        eventPayload: input.payload,
        additionalStates: [],
        createdTickets: [],
      };
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    database.raw.prepare(`
      INSERT INTO aggregate_state(
        aggregate_type, aggregate_id, version, state_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(aggregate_type, aggregate_id) DO UPDATE SET
        version = excluded.version, state_json = excluded.state_json, updated_at = excluded.updated_at
    `).run(
      input.aggregateType, input.aggregateId, nextVersion,
      JSON.stringify(transition.state), occurredAt,
    );
    database.raw.prepare(`
      INSERT INTO local_event(
        event_id, aggregate_type, aggregate_id, aggregate_version, event_type,
        actor_id, device_id, idempotency_key, payload_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.eventId, input.aggregateType, input.aggregateId, nextVersion,
      input.eventType, input.actorId, input.deviceId, input.idempotencyKey,
      JSON.stringify(transition.eventPayload), occurredAt,
    );
    database.raw.prepare(`
      INSERT INTO outbox(event_id, state, next_attempt_at)
      VALUES (?, 'PENDING', ?)
    `).run(input.eventId, occurredAt);
    for (const additional of transition.additionalStates ?? []) {
      database.raw.prepare(`
        INSERT INTO aggregate_state(
          aggregate_type, aggregate_id, version, state_json, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(aggregate_type, aggregate_id) DO UPDATE SET
          version = excluded.version,
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `).run(
        additional.aggregateType,
        additional.aggregateId,
        additional.version,
        JSON.stringify(additional.state),
        occurredAt,
      );
    }
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
  return {
    eventId: input.eventId,
    aggregateVersion: nextVersion,
    duplicate: false,
    createdTickets: transition.createdTickets ?? [],
  };
}

import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptSecret, encryptSecret } from "../secrets/encryption";
import { readSecretKeyring } from "../secrets/keyring";
import { signLoginTicketCms } from "./cms-signer";
import {
  arcaDate,
  arcaVatRateId,
  arcaVoucherType,
  fiscalQrPayload,
  parseArcaDate,
} from "./fiscal-mapping";
import { createWsaaClient } from "./wsaa-client";
import { createWsfeClient } from "./wsfe-client";
import type { ArcaCredentials } from "./arca-types";

type FiscalDb = Prisma.TransactionClient | PrismaClient;
const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();
const client = (): FiscalDb => transactionContext.getStore() ?? db;

type FiscalRequest = {
  concept: number;
  documentType: number;
  documentNumber: string;
  date: string;
  total: string;
  net: string;
  vat: string;
  exempt: string;
  untaxed: string;
  currency: string;
  currencyRate: string;
  vatLines: Array<{ id: number; base: string; amount: string }>;
};

type Prepared = {
  documentId: string;
  connectionId: string;
  pointOfSale: number;
  voucherType: number;
  request: FiscalRequest;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function connectionContext(connection: {
  globalTenantId: string;
  branchId: string;
}) {
  return `${connection.globalTenantId}:${connection.branchId}:arca`;
}

function endpoints(environment: string) {
  if (environment === "SANDBOX") {
    return {
      wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
      wsfe: "https://wswhomo.afip.gob.ar/wsfev1/service.asmx",
    };
  }
  if (environment === "PRODUCTION") {
    return {
      wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
      wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
    };
  }
  throw new Error("REST_ARCA_ENVIRONMENT_INVALID");
}

async function connectionFor(prepared: Prepared) {
  const connection = await client().fiscalConnection.findUnique({
    where: { id: prepared.connectionId },
  });
  if (!connection || !["SANDBOX", "ACTIVE"].includes(connection.status)) {
    throw new Error("REST_ARCA_CONNECTION_INACTIVE");
  }
  return connection;
}

async function credentials(prepared: Prepared): Promise<ArcaCredentials> {
  const connection = await connectionFor(prepared);
  const keyring = readSecretKeyring();
  const context = connectionContext(connection);
  const cached = await client().fiscalAccessTicket.findUnique({
    where: {
      connectionId_service: { connectionId: connection.id, service: "wsfe" },
    },
  });
  if (cached && cached.expiresAt.getTime() > Date.now() + 5 * 60_000) {
    return {
      token: decryptSecret({
        ciphertext: cached.tokenCiphertext,
        context: `${context}:wsfe:token`,
        keys: keyring.keys,
      }),
      sign: decryptSecret({
        ciphertext: cached.signCiphertext,
        context: `${context}:wsfe:sign`,
        keys: keyring.keys,
      }),
      cuit: connection.cuit,
    };
  }
  const certificatePem = decryptSecret({
    ciphertext: connection.certificateCiphertext,
    context: `${context}:certificate`,
    keys: keyring.keys,
  });
  const privateKeyPem = decryptSecret({
    ciphertext: connection.privateKeyCiphertext,
    context: `${context}:private-key`,
    keys: keyring.keys,
  });
  const passphrase = connection.passphraseCiphertext
    ? decryptSecret({
        ciphertext: connection.passphraseCiphertext,
        context: `${context}:passphrase`,
        keys: keyring.keys,
      })
    : undefined;
  const endpoint = endpoints(connection.environment);
  const ticket = await createWsaaClient({
    endpoint: endpoint.wsaa,
    signer: async (tra) => signLoginTicketCms({
      tra,
      certificatePem,
      privateKeyPem,
      passphrase,
    }),
  }).login("wsfe");
  const encrypt = (plaintext: string, suffix: string) => encryptSecret({
    plaintext,
    context: `${context}:wsfe:${suffix}`,
    keyVersion: keyring.activeVersion,
    key: keyring.keys[keyring.activeVersion]!,
  });
  await client().fiscalAccessTicket.upsert({
    where: {
      connectionId_service: { connectionId: connection.id, service: "wsfe" },
    },
    create: {
      connectionId: connection.id,
      service: "wsfe",
      tokenCiphertext: encrypt(ticket.token, "token"),
      signCiphertext: encrypt(ticket.sign, "sign"),
      expiresAt: ticket.expiresAt,
    },
    update: {
      tokenCiphertext: encrypt(ticket.token, "token"),
      signCiphertext: encrypt(ticket.sign, "sign"),
      expiresAt: ticket.expiresAt,
    },
  });
  return { token: ticket.token, sign: ticket.sign, cuit: connection.cuit };
}

function requestOf(prepared: Prepared) {
  return prepared.request;
}

export const prismaFiscalRepository = {
  async findReceipt(globalTenantId: string, commandId: string) {
    const document = await db.fiscalDocument.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    });
    if (!document || document.status === "PENDING") return null;
    return document;
  },

  async prepare(input: Record<string, unknown>): Promise<Prepared> {
    const globalTenantId = String(input.globalTenantId);
    const branchId = String(input.branchId);
    const orderId = String(input.orderId);
    const documentType = String(input.documentType);
    const commandId = String(input.commandId);
    const recipientDocType = Number(input.recipientDocType);
    const recipientDocNumber = String(input.recipientDocNumber);
    return db.$transaction(async (tx) => {
      const connection = await tx.fiscalConnection.findFirst({
        where: {
          globalTenantId,
          branchId,
          status: { in: ["SANDBOX", "ACTIVE"] },
        },
      });
      if (!connection) throw new Error("REST_ARCA_CONNECTION_INACTIVE");
      const allowed = Array.isArray(connection.authorizedVoucherTypes)
        ? connection.authorizedVoucherTypes.map(String)
        : [];
      if (!allowed.includes(documentType)) {
        throw new Error("REST_ARCA_DOCUMENT_TYPE_NOT_AUTHORIZED");
      }
      const order = await tx.restaurantOrder.findFirst({
        where: { id: orderId, globalTenantId, branchId, status: "PAID" },
        include: { items: true },
      });
      if (!order) throw new Error("REST_ARCA_ORDER_NOT_PAID");
      if (!order.discountTotal.isZero()) {
        throw new Error("REST_ARCA_DISCOUNT_ALLOCATION_REQUIRED");
      }
      const voucherType = arcaVoucherType(documentType);
      const grouped = new Map<string, { base: Prisma.Decimal; amount: Prisma.Decimal }>();
      for (const item of order.items) {
        const rate = item.taxRate.toFixed(2);
        const current = grouped.get(rate) ?? {
          base: new Prisma.Decimal(0),
          amount: new Prisma.Decimal(0),
        };
        current.base = current.base.add(item.netTotal);
        current.amount = current.amount.add(item.taxAmount);
        grouped.set(rate, current);
      }
      const request: FiscalRequest = {
        concept: 1,
        documentType: recipientDocType,
        documentNumber: recipientDocNumber,
        date: arcaDate(),
        total: order.total.toFixed(2),
        net: order.subtotal.toFixed(2),
        vat: order.taxTotal.toFixed(2),
        exempt: "0.00",
        untaxed: "0.00",
        currency: "PES",
        currencyRate: "1.000000",
        vatLines: [...grouped].map(([rate, amounts]) => ({
          id: arcaVatRateId(rate),
          base: amounts.base.toFixed(2),
          amount: amounts.amount.toFixed(2),
        })),
      };
      const prior = await tx.fiscalDocument.findUnique({
        where: { globalTenantId_commandId: { globalTenantId, commandId } },
      });
      if (prior) {
        if (
          prior.orderId !== orderId ||
          prior.documentType !== documentType ||
          prior.recipientDocType !== recipientDocType ||
          prior.recipientDocNumber !== recipientDocNumber
        ) throw new Error("REST_ARCA_IDEMPOTENCY_CONFLICT");
        return {
          documentId: prior.id,
          connectionId: prior.connectionId,
          pointOfSale: prior.pointOfSale,
          voucherType: prior.voucherType,
          request: prior.request as FiscalRequest,
        };
      }
      const document = await tx.fiscalDocument.create({
        data: {
          restTenantId: order.restTenantId,
          globalTenantId,
          branchId,
          orderId,
          connectionId: connection.id,
          documentType,
          voucherType,
          pointOfSale: connection.pointOfSale,
          total: order.total,
          net: order.subtotal,
          vat: order.taxTotal,
          recipientDocType,
          recipientDocNumber,
          observations: [],
          request: json(request),
          commandId,
          actorId: String(input.actorId),
        },
      });
      return {
        documentId: document.id,
        connectionId: connection.id,
        pointOfSale: connection.pointOfSale,
        voucherType,
        request,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  credentials,

  async lastAuthorized(prepared: Prepared, auth: ArcaCredentials) {
    const connection = await connectionFor(prepared);
    return createWsfeClient({ endpoint: endpoints(connection.environment).wsfe })
      .lastAuthorized({
        ...auth,
        pointOfSale: prepared.pointOfSale,
        voucherType: prepared.voucherType,
      });
  },

  async authorize(
    prepared: Prepared,
    auth: ArcaCredentials,
    voucherNumber: number,
  ) {
    const connection = await connectionFor(prepared);
    return createWsfeClient({ endpoint: endpoints(connection.environment).wsfe })
      .authorize({
        auth,
        pointOfSale: prepared.pointOfSale,
        voucherType: prepared.voucherType,
        voucherNumber,
        ...requestOf(prepared),
      });
  },

  async consult(
    prepared: Prepared,
    voucherNumber: number,
    auth?: ArcaCredentials,
  ) {
    const connection = await connectionFor(prepared);
    return createWsfeClient({ endpoint: endpoints(connection.environment).wsfe })
      .consult({
        auth: auth ?? await credentials(prepared),
        pointOfSale: prepared.pointOfSale,
        voucherType: prepared.voucherType,
        voucherNumber,
      });
  },

  async save(value: Record<string, unknown>) {
    const prepared = await client().fiscalDocument.findUniqueOrThrow({
      where: { id: String(value.documentId) },
      include: { connection: true },
    });
    const status = String(value.status);
    const cae = value.cae ? String(value.cae) : undefined;
    const voucherNumber = Number(value.voucherNumber);
    const request = prepared.request as FiscalRequest;
    const qrPayload = status === "AUTHORIZED" && cae
      ? fiscalQrPayload({
          date: request.date,
          cuit: prepared.connection.cuit,
          pointOfSale: prepared.pointOfSale,
          voucherType: prepared.voucherType,
          voucherNumber,
          total: request.total,
          currency: request.currency,
          currencyRate: request.currencyRate,
          recipientDocType: prepared.recipientDocType,
          recipientDocNumber: prepared.recipientDocNumber,
          cae,
        })
      : undefined;
    return client().fiscalDocument.update({
      where: { id: prepared.id },
      data: {
        voucherNumber,
        status,
        cae: cae ?? null,
        caeExpiresAt: value.caeExpiresAt
          ? parseArcaDate(String(value.caeExpiresAt))
          : null,
        observations: json(value.observations ?? []),
        response: json({
          status,
          voucherNumber,
          cae: cae ?? null,
          caeExpiresAt: value.caeExpiresAt ?? null,
          observations: value.observations ?? [],
        }),
        qrPayload: qrPayload ? json(qrPayload) : undefined,
      },
    });
  },

  async withSequenceLock<T>(prepared: Prepared, operation: () => Promise<T>) {
    return db.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(
          hashtext(${prepared.connectionId}),
          ${prepared.voucherType}
        )`,
      );
      return transactionContext.run(tx, operation);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 45_000,
    });
  },
};

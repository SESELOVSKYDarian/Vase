import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signLoginTicketCms } from "@/lib/fiscal/cms-signer";
import { validateFiscalCredential } from "@/lib/fiscal/fiscal-credential";
import { arcaVoucherType } from "@/lib/fiscal/fiscal-mapping";
import { createWsaaClient } from "@/lib/fiscal/wsaa-client";
import { createWsfeClient } from "@/lib/fiscal/wsfe-client";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { decryptSecret, encryptSecret } from "@/lib/secrets/encryption";
import { readSecretKeyring } from "@/lib/secrets/keyring";

const documentTypes = [
  "INVOICE_A", "INVOICE_B", "INVOICE_C",
  "CREDIT_NOTE_A", "CREDIT_NOTE_B", "CREDIT_NOTE_C",
  "DEBIT_NOTE_A", "DEBIT_NOTE_B", "DEBIT_NOTE_C",
] as const;

async function owner(request: Request) {
  const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenant,
  });
}

function endpoint(environment: string) {
  return environment === "SANDBOX"
    ? {
        wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
        wsfe: "https://wswhomo.afip.gob.ar/wsfev1/service.asmx",
      }
    : {
        wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
        wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
      };
}

function secretContext(globalTenantId: string, branchId: string) {
  return `${globalTenantId}:${branchId}:arca`;
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const connections = await db.fiscalConnection.findMany({
      where: { globalTenantId: context.globalTenantId },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { branch: { name: "asc" } },
    });
    return NextResponse.json({
      connections: connections.map((connection) => ({
        id: connection.id,
        branch: connection.branch,
        environment: connection.environment,
        status: connection.status,
        cuit: connection.cuit,
        legalName: connection.legalName,
        pointOfSale: connection.pointOfSale,
        certificateNotAfter: connection.certificateNotAfter,
        authorizedVoucherTypes: connection.authorizedVoucherTypes,
        hasPassphrase: Boolean(connection.passphraseCiphertext),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await owner(request);
    const input = z.object({
      branchId: z.string().min(1),
      environment: z.enum(["SANDBOX", "PRODUCTION"]),
      cuit: z.string().regex(/^\d{11}$/),
      legalName: z.string().min(2).max(200),
      pointOfSale: z.number().int().positive().max(99999),
      certificatePem: z.string().min(64),
      privateKeyPem: z.string().min(64),
      passphrase: z.string().max(500).optional(),
      authorizedVoucherTypes: z.array(z.enum(documentTypes)).min(1),
    }).strict().parse(await request.json());
    const branch = await db.branch.findFirst({
      where: {
        id: input.branchId,
        globalTenantId: context.globalTenantId,
        active: true,
      },
    });
    if (!branch) throw new Error("REST_BRANCH_NOT_FOUND");
    const credential = validateFiscalCredential({
      cuit: input.cuit,
      certificatePem: input.certificatePem,
      privateKeyPem: input.privateKeyPem,
      passphrase: input.passphrase,
    });
    const keyring = readSecretKeyring();
    const base = secretContext(context.globalTenantId, branch.id);
    const encrypt = (plaintext: string, suffix: string) => encryptSecret({
      plaintext,
      context: `${base}:${suffix}`,
      keyVersion: keyring.activeVersion,
      key: keyring.keys[keyring.activeVersion]!,
    });
    const data = {
      restTenantId: branch.restTenantId,
      globalTenantId: context.globalTenantId,
      environment: input.environment,
      status: input.environment === "SANDBOX"
        ? "SANDBOX" : "PRODUCTION_PENDING_SMOKE",
      cuit: input.cuit,
      legalName: input.legalName,
      pointOfSale: input.pointOfSale,
      certificateCiphertext: encrypt(input.certificatePem, "certificate"),
      privateKeyCiphertext: encrypt(input.privateKeyPem, "private-key"),
      passphraseCiphertext: input.passphrase
        ? encrypt(input.passphrase, "passphrase")
        : null,
      certificateNotAfter: credential.certificateNotAfter,
      authorizedVoucherTypes: input.authorizedVoucherTypes,
    };
    const connection = await db.fiscalConnection.upsert({
      where: { branchId: branch.id },
      create: { ...data, branchId: branch.id },
      update: data,
    });
    await db.fiscalAccessTicket.deleteMany({
      where: { connectionId: connection.id },
    });
    return NextResponse.json({
      status: connection.status,
      certificateNotAfter: connection.certificateNotAfter,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const input = z.object({
      branchId: z.string().min(1),
      action: z.literal("VERIFY_CONNECTION"),
    }).strict().parse(await request.json());
    const connection = await db.fiscalConnection.findFirst({
      where: {
        branchId: input.branchId,
        globalTenantId: context.globalTenantId,
      },
    });
    if (!connection) throw new Error("REST_ARCA_CONNECTION_NOT_FOUND");
    const keyring = readSecretKeyring();
    const base = secretContext(connection.globalTenantId, connection.branchId);
    const decrypt = (ciphertext: string, suffix: string) => decryptSecret({
      ciphertext,
      context: `${base}:${suffix}`,
      keys: keyring.keys,
    });
    const certificatePem = decrypt(connection.certificateCiphertext, "certificate");
    const privateKeyPem = decrypt(connection.privateKeyCiphertext, "private-key");
    const passphrase = connection.passphraseCiphertext
      ? decrypt(connection.passphraseCiphertext, "passphrase")
      : undefined;
    const urls = endpoint(connection.environment);
    const ticket = await createWsaaClient({
      endpoint: urls.wsaa,
      signer: async (tra) => signLoginTicketCms({
        tra,
        certificatePem,
        privateKeyPem,
        passphrase,
      }),
    }).login("wsfe");
    const firstType = z.array(z.enum(documentTypes)).min(1)
      .parse(connection.authorizedVoucherTypes)[0];
    const lastAuthorized = await createWsfeClient({ endpoint: urls.wsfe })
      .lastAuthorized({
        token: ticket.token,
        sign: ticket.sign,
        cuit: connection.cuit,
        pointOfSale: connection.pointOfSale,
        voucherType: arcaVoucherType(firstType),
      });
    await db.fiscalConnection.update({
      where: { id: connection.id },
      data: {
        status: connection.environment === "PRODUCTION" ? "ACTIVE" : "SANDBOX",
      },
    });
    return NextResponse.json({
      status: connection.environment === "PRODUCTION" ? "ACTIVE" : "SANDBOX",
      checkedVoucherType: firstType,
      lastAuthorized,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_ARCA_SETTINGS_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") ? 409 : 400,
  });
}

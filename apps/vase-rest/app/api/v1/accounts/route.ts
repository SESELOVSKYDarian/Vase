import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerAccountService } from "@/lib/accounts/customer-account-service";
import { prismaCustomerAccountRepository } from "@/lib/accounts/customer-account-repository";
import { db } from "@/lib/db";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const service = createCustomerAccountService(prismaCustomerAccountRepository);

async function context(request: Request) {
  return resolveRestStaffRequest({
    authorization: request.headers.get("authorization"),
    requiredCapability: "cash:operate",
  });
}

export async function GET(request: Request) {
  try {
    const actor = await context(request);
    const accounts = await db.customerAccount.findMany({
      where: { globalTenantId: actor.globalTenantId },
      include: {
        movements: { orderBy: { createdAt: "desc" }, take: 100 },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      accounts: accounts.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
        taxId: account.taxId,
        email: account.email,
        phone: account.phone,
        status: account.status,
        creditLimit: account.creditLimit?.toFixed(2) ?? null,
        balance: account.movements.reduce(
          (sum, movement) => sum.add(movement.amount),
          new Prisma.Decimal(0),
        ).toFixed(2),
        movements: account.movements.map((movement) => ({
          ...movement,
          amount: movement.amount.toFixed(2),
          balanceAfter: movement.balanceAfter.toFixed(2),
        })),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await context(request);
    const payload = z.object({
      action: z.enum(["CREATE", "CHARGE", "PAYMENT", "ADJUSTMENT", "REVERSE"]),
    }).passthrough().parse(await request.json());
    if (payload.action === "CREATE") {
      const input = z.object({
        action: z.literal("CREATE"),
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(2).max(200),
        taxId: z.string().trim().max(30).optional(),
        email: z.string().email().optional(),
        phone: z.string().trim().max(50).optional(),
        creditLimit: z.string().regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/).optional(),
        commandId: z.string().min(1),
      }).strict().parse(payload);
      const prior = await db.financialCommandReceipt.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: actor.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (prior) return NextResponse.json({ result: prior.response });
      const result = await db.$transaction(async (tx) => {
        const tenant = await tx.restTenant.findUniqueOrThrow({
          where: { globalTenantId: actor.globalTenantId },
        });
        const account = await tx.customerAccount.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: actor.globalTenantId,
            code: input.code,
            name: input.name,
            taxId: input.taxId || null,
            email: input.email || null,
            phone: input.phone || null,
            creditLimit: input.creditLimit
              ? new Prisma.Decimal(input.creditLimit) : null,
          },
        });
        const response = { id: account.id, code: account.code, name: account.name };
        await tx.financialCommandReceipt.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: actor.globalTenantId,
            commandId: input.commandId,
            response,
          },
        });
        return response;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return NextResponse.json({ result }, { status: 201 });
    }
    const { action, ...operation } = payload;
    const common = {
      ...operation,
      globalTenantId: actor.globalTenantId,
      branchId: actor.branchId,
      actorId: actor.actorId,
    };
    const result = action === "CHARGE" ? await service.charge(common)
      : action === "PAYMENT" ? await service.payment(common)
        : action === "ADJUSTMENT" ? await service.adjustment(common)
          : await service.reverse(common);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_ACCOUNT_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("LIMIT") ||
              code.includes("REVERSED") ? 409 : 400,
  });
}

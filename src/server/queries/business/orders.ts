import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function createOrderWithItems(input: {
  order: Prisma.OrderUncheckedCreateInput;
  items: Prisma.OrderItemUncheckedCreateInput[];
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: input.order,
    });

    if (input.items.length) {
      await tx.orderItem.createMany({
        data: input.items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      });
    }

    return tx.order.findUniqueOrThrow({
      where: {
        id: order.id,
      },
      include: {
        items: true,
        payments: true,
      },
    });
  });
}

export async function getOrderById(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function listOrdersByTenant(tenantId: string) {
  return prisma.order.findMany({
    where: { tenantId },
    include: {
      items: true,
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateOrderStatus(tenantId: string, orderId: string, status: Prisma.OrderUpdateInput["status"]) {
  return prisma.order.updateMany({
    where: {
      id: orderId,
      tenantId,
    },
    data: {
      status,
    },
  });
}

export async function createOrderPayment(input: Prisma.PaymentUncheckedCreateInput) {
  return prisma.payment.create({
    data: input,
  });
}

export async function getLatestPaymentForOrder(orderId: string) {
  return prisma.payment.findFirst({
    where: {
      orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

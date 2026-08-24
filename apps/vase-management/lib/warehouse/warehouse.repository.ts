import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { buildWarehouseProductWhere } from './warehouse-product-query';

export class WarehouseRepository {
  static async getLedCapacity(companyId: string) {
    const device = await prisma.warehouseDevice.findFirst({
      where: { companyId, active: true },
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
      select: { ledCount: true },
    })
    return device?.ledCount ?? 100
  }

  static async findLedConflicts(companyId: string, productId: string, ledNumbers: number[]) {
    if (!ledNumbers.length) return []
    return prisma.warehouseProductLocation.findMany({
      where: { companyId, productId: { not: productId }, active: true, ledNumbers: { hasSome: ledNumbers } },
      select: { ledNumbers: true, product: { select: { code: true, name: true } } },
    })
  }

  /**
   * Encuentra productos por código, código de barra, o nombre, e incluye su ubicación
   */
  static async searchProducts(
    companyId: string,
    query: string,
    limit = 10,
    filters: { sectorId?: string; rack?: string } = {},
  ) {
    return prisma.product.findMany({
      where: buildWarehouseProductWhere(companyId, query, filters),
      include: {
        warehouseLocations: {
          include: {
            sector: true,
          }
        },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      take: limit,
    });
  }

  /**
   * Obtiene la ubicación física de un producto específico
   */
  static async getProductLocation(companyId: string, productId: string) {
    return prisma.warehouseProductLocation.findUnique({
      where: {
        companyId_productId: { companyId, productId }
      },
      include: {
        sector: true,
        product: true
      }
    });
  }

  /**
   * Obtiene o crea un sector por su nombre normalizado
   */
  static async upsertSector(companyId: string, name: string, normalizedName: string) {
    return prisma.warehouseSector.upsert({
      where: {
        companyId_normalizedName: { companyId, normalizedName }
      },
      create: {
        companyId,
        name,
        normalizedName,
      },
      update: {
        name,
      }
    });
  }

  /**
   * Crea o actualiza la ubicación física de un producto.
   */
  static async upsertProductLocation(
    companyId: string,
    productId: string,
    data: Omit<Prisma.WarehouseProductLocationUncheckedCreateInput, 'id' | 'companyId' | 'productId' | 'createdAt' | 'updatedAt'>
  ) {
    return prisma.warehouseProductLocation.upsert({
      where: {
        companyId_productId: { companyId, productId }
      },
      create: {
        companyId,
        productId,
        ...data,
      },
      update: {
        ...data,
      },
      include: {
        sector: true
      }
    });
  }

  /**
   * Asigna un número de LED a una ubicación
   */
  static async assignLed(companyId: string, productId: string, ledNumber: number | null) {
    return prisma.warehouseProductLocation.update({
      where: {
        companyId_productId: { companyId, productId }
      },
      data: {
        ledNumber,
        ledNumbers: ledNumber == null ? [] : [ledNumber],
      }
    });
  }

  /**
   * Guarda un log de conversación
   */
  static async logConversation(data: Prisma.WarehouseConversationLogUncheckedCreateInput) {
    return prisma.warehouseConversationLog.create({
      data
    });
  }
}

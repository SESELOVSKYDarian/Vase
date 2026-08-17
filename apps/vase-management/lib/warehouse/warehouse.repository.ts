import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class WarehouseRepository {
  /**
   * Encuentra productos por código, código de barra, o nombre, e incluye su ubicación
   */
  static async searchProducts(companyId: string, query: string, limit = 10) {
    const q = query.trim();
    if (!q) return [];

    return prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        warehouseLocations: {
          include: {
            sector: true,
          }
        },
      },
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
        ledNumber
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

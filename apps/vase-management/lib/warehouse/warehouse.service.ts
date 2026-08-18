import { WarehouseRepository } from './warehouse.repository';
import { normalizeSectorName } from './normalize';
import type { Prisma } from '@prisma/client';

export type ProductLocationInput = {
  productId: string;
  warehouseId?: string;
  sectorName: string;
  rack: string;
  row: string;
  box?: string;
  observations?: string;
  ledNumber?: number;
};

export class WarehouseService {
  /**
   * Busca productos en el catálogo de la empresa
   */
  static async searchProducts(
    companyId: string,
    query: string,
    limit = 10,
    filters: { sectorId?: string; rack?: string } = {},
  ) {
    return WarehouseRepository.searchProducts(companyId, query, limit, filters);
  }

  /**
   * Obtiene la ubicación física de un producto
   */
  static async getProductLocation(companyId: string, productId: string) {
    return WarehouseRepository.getProductLocation(companyId, productId);
  }

  /**
   * Crea o actualiza la ubicación física de un producto, asegurando que el sector exista.
   */
  static async upsertProductLocation(companyId: string, input: ProductLocationInput) {
    const normalizedName = normalizeSectorName(input.sectorName);
    
    // 1. Asegurar que el sector exista
    const sector = await WarehouseRepository.upsertSector(companyId, input.sectorName, normalizedName);

    // 2. Guardar la ubicación
    const locationData: Omit<Prisma.WarehouseProductLocationUncheckedCreateInput, 'id' | 'companyId' | 'productId' | 'createdAt' | 'updatedAt'> = {
      sectorId: sector.id,
      warehouseId: input.warehouseId,
      rack: input.rack,
      row: input.row,
      box: input.box,
      observations: input.observations,
    };

    if (input.ledNumber !== undefined) {
      locationData.ledNumber = input.ledNumber;
    }

    return WarehouseRepository.upsertProductLocation(companyId, input.productId, locationData);
  }

  /**
   * Asigna un número de LED a la ubicación de un producto
   */
  static async assignLed(companyId: string, productId: string, ledNumber: number | null) {
    return WarehouseRepository.assignLed(companyId, productId, ledNumber);
  }

  /**
   * Formatea la ubicación física para devolverla como string natural
   */
  static formatLocation(location: { sector: { name: string }, rack: string, row: string, box: string | null }): string {
    let result = `Sector ${location.sector.name}, Rack ${location.rack}, Fila ${location.row}`;
    if (location.box) {
      result += `, Caja ${location.box}`;
    }
    return result;
  }
}

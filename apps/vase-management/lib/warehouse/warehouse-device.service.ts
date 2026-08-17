import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

export type CreateLedCommandInput = {
  deviceId: string;
  productLocationId?: string;
  ledNumber: number;
  activeCount?: number;
  color?: { r: number; g: number; b: number };
  durationMs?: number;
};

export class WarehouseDeviceService {
  /**
   * Genera un deviceKey seguro y aleatorio.
   */
  static generateDeviceKey(): string {
    return randomBytes(24).toString('hex');
  }

  /**
   * Lista los dispositivos de una empresa
   */
  static async listDevices(companyId: string) {
    return prisma.warehouseDevice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Crea un dispositivo nuevo para la empresa
   */
  static async createDevice(companyId: string, name: string) {
    return prisma.warehouseDevice.create({
      data: {
        companyId,
        name,
        deviceKey: this.generateDeviceKey(),
      }
    });
  }

  /**
   * Genera un comando LED
   */
  static async createLedCommand(companyId: string, input: CreateLedCommandInput) {
    // Si no se especifica color, usar verde oscuro (0, 80, 20)
    const colorPayload = input.color ?? { r: 0, g: 80, b: 20 };
    
    // Caducidad de comandos no reclamados en 1 minuto
    const expiresAt = new Date(Date.now() + 60_000);

    return prisma.warehouseLedCommand.create({
      data: {
        companyId,
        deviceId: input.deviceId,
        productLocationId: input.productLocationId,
        ledNumber: input.ledNumber,
        activeCount: input.activeCount ?? 1,
        color: colorPayload,
        durationMs: input.durationMs ?? 5000,
        expiresAt,
        status: 'PENDING'
      }
    });
  }

  /**
   * Reclama el próximo comando pendiente para un dispositivo.
   * La operación se realiza usando updateMany para garantizar atomicidad y evitar 
   * race conditions si el dispositivo hace llamadas concurrentes.
   */
  static async claimNextCommand(deviceKey: string) {
    const device = await prisma.warehouseDevice.findUnique({
      where: { deviceKey }
    });

    if (!device || !device.active) {
      return null;
    }

    // Actualizamos el lastSeenAt del dispositivo
    await prisma.warehouseDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), status: 'ONLINE' }
    });

    const now = new Date();

    // Buscar el comando más antiguo pendiente que no haya expirado
    const nextCommand = await prisma.warehouseLedCommand.findFirst({
      where: {
        deviceId: device.id,
        status: 'PENDING',
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!nextCommand) {
      return null;
    }

    // Intentar reclamarlo de forma segura
    const claimResult = await prisma.warehouseLedCommand.updateMany({
      where: {
        id: nextCommand.id,
        status: 'PENDING'
      },
      data: {
        status: 'CLAIMED',
        claimedAt: now
      }
    });

    if (claimResult.count === 0) {
      // Alguien más lo reclamó (race condition), devolver nulo en este poll
      return null;
    }

    return nextCommand;
  }

  /**
   * Completa un comando (éxito o fallo)
   */
  static async completeCommand(deviceKey: string, commandId: string, result: { status: 'DONE' | 'FAILED', error?: string }) {
    const device = await prisma.warehouseDevice.findUnique({
      where: { deviceKey }
    });

    if (!device) return false;

    const updated = await prisma.warehouseLedCommand.updateMany({
      where: {
        id: commandId,
        deviceId: device.id,
        status: 'CLAIMED'
      },
      data: {
        status: result.status,
        completedAt: new Date(),
        lastError: result.error
      }
    });

    return updated.count > 0;
  }

  /**
   * Marca comandos viejos como expirados
   */
  static async expireOldCommands() {
    const now = new Date();
    return prisma.warehouseLedCommand.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });
  }
}

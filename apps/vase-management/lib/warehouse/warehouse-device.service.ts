import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { normalizeWarehouseLedCommand } from './warehouse-led-command';

export const DEFAULT_WAREHOUSE_LED_PIN = 2;

export type CreateLedCommandInput = {
  deviceId: string;
  productLocationId?: string;
  ledNumber: number;
  activeCount?: number;
  color?: { r: number; g: number; b: number };
  durationMs?: number;
};

export function normalizeWarehouseBaseUrl(value: string | null | undefined) {
  return (value || 'http://localhost:3006').replace(/\/+$/, '');
}

export function buildWarehouseDeviceSetup(input: {
  baseUrl: string;
  deviceKey: string;
  ledCount: number;
  ledPin?: number;
}) {
  const serverBaseUrl = normalizeWarehouseBaseUrl(input.baseUrl);
  const ledPin = input.ledPin ?? DEFAULT_WAREHOUSE_LED_PIN;
  const pollingUrl = `${serverBaseUrl}/api/warehouse/devices/${input.deviceKey}/next-command`;
  const completeUrlTemplate = `${serverBaseUrl}/api/warehouse/devices/${input.deviceKey}/commands/{commandId}/complete`;

  return {
    serverBaseUrl,
    pollingUrl,
    completeUrlTemplate,
    arduinoConfig: [
      'const char* WIFI_SSID = "TU_WIFI";',
      'const char* WIFI_PASSWORD = "TU_PASSWORD";',
      `const char* SERVER_BASE_URL = "${serverBaseUrl}";`,
      `const char* DEVICE_KEY = "${input.deviceKey}";`,
      `const int LED_PIN = ${ledPin};`,
      `const int LED_COUNT = ${input.ledCount};`,
      'const unsigned long POLL_INTERVAL_MS = 2000;',
      `// GET ${pollingUrl}`,
      `// POST ${completeUrlTemplate.replace('{commandId}', '<commandId>')}`,
    ].join('\n'),
  };
}

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
   * Lista dispositivos con datos seguros de configuraciÃ³n para la UI autenticada.
   */
  static async listDeviceSetups(companyId: string, baseUrl: string) {
    const devices = await this.listDevices(companyId);
    return devices.map((device) => ({
      ...device,
      ...buildWarehouseDeviceSetup({
        baseUrl,
        deviceKey: device.deviceKey,
        ledCount: device.ledCount,
      }),
    }));
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

    const device = await prisma.warehouseDevice.findFirst({
      where: { id: input.deviceId, companyId, active: true },
      select: { ledCount: true, maxActiveLeds: true },
    });
    if (!device) throw new Error('Dispositivo no disponible');

    const normalized = normalizeWarehouseLedCommand({
      ledNumber: input.ledNumber,
      activeCount: input.activeCount ?? 1,
      color: colorPayload,
      durationMs: input.durationMs ?? 5000,
    }, device);
    
    // Caducidad de comandos no reclamados en 1 minuto
    const expiresAt = new Date(Date.now() + 60_000);

    return prisma.warehouseLedCommand.create({
      data: {
        companyId,
        deviceId: input.deviceId,
        productLocationId: input.productLocationId,
        ledNumber: normalized.ledNumber,
        activeCount: normalized.activeCount,
        color: normalized.color,
        durationMs: normalized.durationMs,
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

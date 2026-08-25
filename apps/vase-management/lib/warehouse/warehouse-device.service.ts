import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { normalizeWarehouseLedCommand } from './warehouse-led-command';
import { isWarehouseDeviceOnline } from './command-device';
import { normalizeWarehouseWifiSsid } from './warehouse-wifi-config';

export const DEFAULT_WAREHOUSE_LED_PIN = 2;
export type WarehouseNetworkMode = 'AUTO' | 'ETHERNET' | 'WIFI';
export type WarehouseDeviceTelemetry = {
  transport?: string | null;
  ipAddress?: string | null;
};

export type CreateLedCommandInput = {
  deviceId: string;
  productLocationId?: string;
  ledNumber: number;
  ledNumbers?: number[];
  activeCount?: number;
  color?: { r: number; g: number; b: number };
  durationMs?: number;
};

export function normalizeWarehouseBaseUrl(value: string | null | undefined) {
  return (value || 'http://localhost:3006').replace(/\/+$/, '');
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export function normalizeWarehouseNetworkMode(
  value: unknown,
  fallback: WarehouseNetworkMode = 'AUTO',
): WarehouseNetworkMode {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return normalized === 'AUTO' || normalized === 'ETHERNET' || normalized === 'WIFI'
    ? normalized
    : fallback;
}

function normalizeDeviceTelemetry(input?: WarehouseDeviceTelemetry) {
  const transport = input?.transport?.trim().toUpperCase();
  const rawIpAddress = input?.ipAddress?.trim();
  const ipAddress = rawIpAddress && rawIpAddress.length <= 64 && /^[0-9a-f:.]+$/i.test(rawIpAddress)
    ? rawIpAddress
    : undefined;

  return {
    ...(transport === 'ETHERNET' || transport === 'WIFI' ? { lastTransport: transport } : {}),
    ...(ipAddress ? { lastIpAddress: ipAddress } : {}),
  };
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
      'const char* NETWORK_MODE = "AUTO"; // AUTO | ETHERNET | WIFI',
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
    const devices = await prisma.warehouseDevice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    return devices.map((device) => ({
      ...device,
      status: isWarehouseDeviceOnline(device) ? 'ONLINE' : 'OFFLINE',
    }));
  }

  /**
   * Lista dispositivos con datos seguros de configuraciÃ³n para la UI autenticada.
   */
  static async listDeviceSetups(companyId: string, baseUrl: string) {
    const devices = await this.listDevices(companyId);
    return devices.map((device) => ({
      ...device,
      ...buildWarehouseDeviceSetup({
        baseUrl: device.serverBaseUrl || baseUrl,
        deviceKey: device.deviceKey,
        ledCount: device.ledCount,
      }),
      serverBaseUrl: device.serverBaseUrl || normalizeWarehouseBaseUrl(baseUrl),
      wifiSsid: device.wifiSsid,
      hasWifiPassword: Boolean(device.wifiPassword),
      wifiPassword: undefined,
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

  static async updateDeviceConfig(companyId: string, deviceId: string, input: {
    name?: string
    serverBaseUrl?: string | null
    wifiSsid?: string | null
    wifiPassword?: string | null
    networkMode?: WarehouseNetworkMode | string
    ledCount?: number
    brightness?: number
    maxActiveLeds?: number
  }) {
    const current = await prisma.warehouseDevice.findFirst({ where: { id: deviceId, companyId } })
    if (!current) return null

    const ledCount = clampInt(input.ledCount, current.ledCount, 1, 1000)
    const data: Prisma.WarehouseDeviceUpdateInput = {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.serverBaseUrl !== undefined ? { serverBaseUrl: input.serverBaseUrl ? normalizeWarehouseBaseUrl(input.serverBaseUrl) : null } : {}),
      ...(input.wifiSsid !== undefined ? { wifiSsid: normalizeWarehouseWifiSsid(input.wifiSsid) } : {}),
      ...(input.wifiPassword !== undefined && input.wifiPassword !== '' ? { wifiPassword: input.wifiPassword } : {}),
      ...(input.networkMode !== undefined ? { networkMode: normalizeWarehouseNetworkMode(input.networkMode, normalizeWarehouseNetworkMode(current.networkMode)) } : {}),
      ...(input.ledCount !== undefined ? { ledCount } : {}),
      ...(input.brightness !== undefined ? { brightness: clampInt(input.brightness, current.brightness, 0, 255) } : {}),
      ...(input.maxActiveLeds !== undefined ? { maxActiveLeds: clampInt(input.maxActiveLeds, current.maxActiveLeds, 1, ledCount) } : {}),
    }
    const updated = await prisma.warehouseDevice.update({ where: { id: deviceId }, data })
    return { ...updated, wifiPassword: undefined, hasWifiPassword: Boolean(updated.wifiPassword) }
  }

  static async deleteDevice(companyId: string, deviceId: string) {
    return prisma.$transaction(async (tx) => {
      const device = await tx.warehouseDevice.findFirst({ where: { id: deviceId, companyId } })
      if (!device) return null

      await tx.warehouseDevice.delete({ where: { id: device.id } })
      return { id: device.id, name: device.name }
    })
  }

  static async getDeviceConfig(deviceKey: string, telemetry?: WarehouseDeviceTelemetry) {
    const device = await prisma.warehouseDevice.findUnique({ where: { deviceKey } })
    if (!device || !device.active) return null
    await prisma.warehouseDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), status: 'ONLINE', ...normalizeDeviceTelemetry(telemetry) },
    })
    return {
      deviceKey: device.deviceKey,
      serverBaseUrl: device.serverBaseUrl,
      wifiSsid: device.wifiSsid,
      wifiPassword: device.wifiPassword,
      networkMode: normalizeWarehouseNetworkMode(device.networkMode),
      ledCount: device.ledCount,
      brightness: device.brightness,
      maxActiveLeds: device.maxActiveLeds,
      updatedAt: device.updatedAt.toISOString(),
    }
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
      ledNumbers: input.ledNumbers,
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
        ledNumbers: normalized.ledNumbers ?? [],
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
  static async claimNextCommand(deviceKey: string, telemetry?: WarehouseDeviceTelemetry) {
    const device = await prisma.warehouseDevice.findUnique({
      where: { deviceKey }
    });

    if (!device || !device.active) {
      return null;
    }

    // Actualizamos el lastSeenAt del dispositivo
    await prisma.warehouseDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), status: 'ONLINE', ...normalizeDeviceTelemetry(telemetry) }
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

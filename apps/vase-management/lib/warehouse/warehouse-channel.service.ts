import { WarehouseService } from './warehouse.service';
import { WarehouseDeviceService } from './warehouse-device.service';
import { WarehouseAIService } from './warehouse-ai.service';
import { Product, WarehouseProductLocation, WarehouseSector } from '@prisma/client';
import { selectWarehouseDeviceForCommand } from './command-device';

export type ChannelResponse = {
  text: string;
  products?: (Product & { location?: WarehouseProductLocation & { sector: WarehouseSector } })[];
  proposal?: any;
  requiresConfirmation?: boolean;
};

export class WarehouseChannelService {
  /**
   * Procesa un comando natural y devuelve una respuesta estructurada
   * que puede ser renderizada por la web, Telegram o WhatsApp.
   */
  static async processCommand(companyId: string, text: string): Promise<ChannelResponse> {
    const intent = WarehouseAIService.parseIntent(text);

    switch (intent.type) {
      case 'UNKNOWN':
        return {
          text: 'No logré entender qué producto buscas o qué acción deseas realizar. Intenta decir "donde esta PC06" o "apaga los leds".'
        };

      case 'TURN_OFF_LEDS':
        // Buscamos dispositivos para mandar comando de apagado (duración 0 o color negro)
        // Por simplicidad, se podría hacer que el endpoint de polling sepa que un color de {0,0,0} apaga, o que activeCount = 0.
        // Pero el requirement era turn off all leds via API.
        const devices = await WarehouseDeviceService.listDevices(companyId);
        let turnOffCount = 0;
        for (const device of devices) {
          if (device.status === 'ONLINE') {
            await WarehouseDeviceService.createLedCommand(companyId, {
              deviceId: device.id,
              ledNumber: 0,
              activeCount: device.ledCount,
              color: { r: 0, g: 0, b: 0 },
              durationMs: 1000 // un segundo para que asimilen el apagado
            });
            turnOffCount++;
          }
        }
        return {
          text: `Se enviaron comandos de apagado a ${turnOffCount} dispositivo(s).`
        };

      case 'ASSIGN_LED':
        // Esto es una mutación, debería pedir confirmación
        const candidates = await WarehouseService.searchProducts(companyId, intent.code, 1);
        if (candidates.length === 0) {
          return { text: `No encontré ningún producto parecido a "${intent.code}".` };
        }
        const prodToUpdate = candidates[0];
        
        return {
          text: `¿Confirmas que deseas asignar el LED ${intent.ledNumber} al producto ${prodToUpdate.name}?`,
          requiresConfirmation: true,
          proposal: {
            action: 'ASSIGN_LED',
            productId: prodToUpdate.id,
            ledNumber: intent.ledNumber
          }
        };

      case 'LOCATE_PRODUCT':
        const productsFound = [];
        for (const code of intent.codes) {
          const res = await WarehouseService.searchProducts(companyId, code, 1);
          if (res.length > 0) {
            productsFound.push(res[0]);
          }
        }

        if (productsFound.length === 0) {
          return {
            text: `No encontré productos para: ${intent.codes.join(', ')}.`
          };
        }

        let responseText = `Encontré ${productsFound.length} producto(s):\n`;
        
        // Disparamos luces si hay dispositivos
        const activeDevices = await WarehouseDeviceService.listDevices(companyId);
        const onlineDevice = selectWarehouseDeviceForCommand(activeDevices);

        for (const p of productsFound) {
          responseText += `- ${p.name}`;
          if (p.warehouseLocations && p.warehouseLocations.length > 0) {
            const loc = p.warehouseLocations[0];
            const locStr = WarehouseService.formatLocation(loc);
            responseText += ` (Ubicación: ${locStr})`;
            
            if (loc.ledNumber != null && onlineDevice) {
              await WarehouseDeviceService.createLedCommand(companyId, {
                deviceId: onlineDevice.id,
                productLocationId: loc.id,
                ledNumber: loc.ledNumber,
                activeCount: 4,
                durationMs: 8000
              });
              responseText += ` 💡 Encendiendo LED ${loc.ledNumber}`;
            }
          } else {
            responseText += ` (Sin ubicación física)`;
          }
          responseText += '\n';
        }

        return {
          text: responseText,
          products: productsFound.map(p => ({
            ...p,
            location: p.warehouseLocations?.[0]
          }))
        };
    }
  }

  /**
   * Ejecuta una propuesta confirmada por el usuario (ej: desde UI web)
   */
  static async executeProposal(companyId: string, proposal: any): Promise<ChannelResponse> {
    if (proposal.action === 'ASSIGN_LED') {
      await WarehouseService.assignLed(companyId, proposal.productId, proposal.ledNumber);
      return {
        text: '✅ LED asignado correctamente.'
      };
    }
    return {
      text: 'Propuesta desconocida.'
    };
  }
}

import { extractCandidateCodes, looksLikeDirectCodeQuery } from './normalize';

export type AIIntent = 
  | { type: 'LOCATE_PRODUCT'; codes: string[] }
  | { type: 'TURN_OFF_LEDS' }
  | { type: 'ASSIGN_LED'; code: string; ledNumber: number }
  | { type: 'UNKNOWN'; originalText: string };

export class WarehouseAIService {
  /**
   * Parsea determinísticamente un comando de texto natural básico para el MVP.
   */
  static parseIntent(text: string): AIIntent {
    const lower = text.toLowerCase();
    
    // Comando directo: "apagar", "apaga leds"
    if (lower.includes('apaga') || lower.includes('apagar')) {
      if (lower.includes('led') || lower.includes('luz') || lower.includes('luces') || lower.includes('todo')) {
        return { type: 'TURN_OFF_LEDS' };
      }
    }

    // Extraer códigos usando nuestro normalizador determinístico
    const candidates = extractCandidateCodes(text).map(c => c.normalized);
    
    if (candidates.length === 0) {
      return { type: 'UNKNOWN', originalText: text };
    }

    // Comando: "cambia el led de PC06 al 14" o "asignar led 14 a PC06"
    if (lower.includes('cambia') || lower.includes('asignar') || lower.includes('asigna') || lower.includes('poner')) {
      const matchLed = lower.match(/(?:al|el|led)\s*(\d{1,3})/);
      if (matchLed && matchLed[1]) {
        const ledNumber = parseInt(matchLed[1], 10);
        return {
          type: 'ASSIGN_LED',
          code: candidates[0],
          ledNumber
        };
      }
    }

    // Por defecto, o explícitamente "donde esta PC06", asumimos que quiere localizar
    return {
      type: 'LOCATE_PRODUCT',
      codes: candidates
    };
  }
}

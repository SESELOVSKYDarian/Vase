import { timingSafeEqual } from "node:crypto";

/**
 * Compara dos claves secretas (la del cron, la de un webhook) sin dar pistas.
 * Una comparación común (`===`) corta apenas encuentra una letra distinta, y midiendo
 * cuánto tarda alguien podría adivinar la clave de a poco. Esta tarda siempre lo mismo.
 * Si falta cualquiera de las dos, nunca da igual.
 */
export function safeEqual(candidate: string | null | undefined, expected: string | null | undefined) {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

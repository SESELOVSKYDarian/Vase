// Cambio de precios en bloque (Catálogo › Cambiar precios). Con apply=false solo calcula la vista previa.
export function computeBulkPrice(current, { mode, amount, unit }) {
  const base = Number(current || 0);
  let next = base;
  if (mode === 'set') next = amount;
  else if (unit === 'percent') next = base * (1 + (mode === 'lower' ? -amount : amount) / 100);
  else next = base + (mode === 'lower' ? -amount : amount);
  return Math.max(0, Math.round(next * 100) / 100);
}

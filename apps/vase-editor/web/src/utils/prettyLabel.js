// Nombres de rubros y marcas más fáciles de leer.
// Muchos sistemas de gestión mandan todo EN MAYÚSCULAS ("ACCESORIOS COCINA Y BAÑO"). Para mostrarlo en la
// tienda se pasa a mayúscula inicial ("Accesorios cocina y baño"), dejando las siglas como están (IPS, PVC).
// Si el nombre ya viene escrito con minúsculas, se respeta tal cual.

/** Siglas comunes en el rubro que siempre van en mayúsculas. */
const ACRONYMS = new Set(['IPS', 'PVC', 'PP', 'PE', 'PPR', 'CPVC', 'PEAD', 'HD', 'ABS', 'TV', 'LED', 'AC', 'DC', 'RM', 'RH', 'H3', 'H2', 'GLP', 'GNC', 'ACC', 'SA', 'SRL', 'TBF', 'AWADUCT']);

/** true si el texto tiene letras y ninguna está en minúscula. */
function isAllCaps(text) {
  return /[A-ZÁÉÍÓÚÑÜ]/.test(text) && !/[a-záéíóúñü]/.test(text);
}

/** Una palabra que parece sigla: está en la lista, tiene números o no tiene vocales (ej. "TBF"). */
function looksLikeAcronym(word) {
  const clean = word.replace(/[^A-ZÁÉÍÓÚÑÜ0-9]/g, '');
  if (!clean) return false;
  if (ACRONYMS.has(clean)) return true;
  if (/\d/.test(clean)) return true;
  return clean.length >= 2 && clean.length <= 4 && !/[AEIOUÁÉÍÓÚY]/.test(clean);
}

/**
 * "ACCESORIOS COCINA Y BAÑO" → "Accesorios cocina y baño"; "AGUA FUSION IPS" → "Agua fusion IPS".
 * Nombres que ya tienen minúsculas no se tocan.
 */
export function prettyLabel(value) {
  const text = String(value ?? '').trim();
  if (!text || !isAllCaps(text)) return text;
  return text
    .split(/(\s+)/)
    .map((word, index) => {
      if (/^\s+$/.test(word)) return word;
      if (looksLikeAcronym(word)) return word;
      const lower = word.toLocaleLowerCase('es-AR');
      return index === 0 ? lower.charAt(0).toLocaleUpperCase('es-AR') + lower.slice(1) : lower;
    })
    .join('');
}

/** Quita tildes y pasa a minúscula, para buscar sin importar cómo se escribió. */
export function searchKey(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

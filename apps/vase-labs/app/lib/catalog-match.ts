// Busca en el catálogo los productos más parecidos a lo que escribió el cliente, aunque no use el
// nombre exacto ("tapa gabinete gas" encuentra "Tapa para gabinete de gas 40x40"). Sin acentos,
// sin mayúsculas, singular y plural, y palabras que empiezan igual.

const STOPWORDS = new Set([
  "de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas", "para", "con", "sin", "por", "que", "y", "o", "en", "a",
  "al", "lo", "le", "les", "me", "mi", "mis", "tu", "tus", "su", "sus", "es", "son", "hay", "tienen", "tenes", "tienes", "tiene",
  "quiero", "queria", "busco", "buscaba", "necesito", "precio", "precios", "cuanto", "cuanta", "sale", "salen", "cuesta", "cuestan",
  "hola", "buenas", "buen", "dia", "dias", "tardes", "noches", "gracias", "favor", "porfa", "algo", "como", "donde", "cuando",
  "este", "esta", "eso", "esa", "ese", "estos", "estas", "venden", "vende", "stock", "disponible", "consulta", "consultar",
]);

export function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function singular(word: string) {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Palabras que importan de lo que pidió el cliente. */
export function queryTerms(query: string) {
  return [...new Set(normalizeText(query).split(" ").filter((word) => word.length >= 3 && !STOPWORDS.has(word)).map(singular))];
}

/** Qué tan parecido es un producto a lo que pidió (0 = nada). */
export function matchScore(terms: string[], haystack: string) {
  if (!terms.length) return 0;
  const words = normalizeText(haystack).split(" ").filter(Boolean).map(singular);
  let score = 0;
  let matched = 0;
  for (const term of terms) {
    if (words.includes(term)) {
      score += 3;
      matched += 1;
      continue;
    }
    const stem = term.slice(0, Math.max(4, term.length - 2));
    if (words.some((word) => word.startsWith(stem) || (word.length >= 4 && term.startsWith(word.slice(0, Math.max(4, word.length - 2)))))) {
      score += 2;
      matched += 1;
      continue;
    }
    if (/\d/.test(term) && words.some((word) => word.includes(term))) {
      score += 2;
      matched += 1;
    }
  }
  if (matched === terms.length && terms.length > 1) score += 2;
  return score;
}

/** Ordena los productos del más parecido al menos parecido (los que no se parecen en nada quedan afuera). */
export function rankProducts<T>(items: T[], query: string, text: (item: T) => string, limit = 40) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  return items
    .map((item, index) => ({ item, index, score: matchScore(terms, text(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

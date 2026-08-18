export type TrainerKnowledgeSource = { id: string; title: string; sourceType: string; content: string; extractedText?: string | null };
export type TrainerKnowledgeCorrection = { knowledgeItemId: string; content: string };

const stopWords = new Set(["para", "este", "esta", "hacer", "quiero", "cambio", "pase", "hasta", "desde", "horas", "horario", "atencion", "inicio"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

function queryTokens(instruction: string) {
  return [...new Set(normalize(instruction).match(/[a-z0-9]+/g)?.filter((token) => token.length > 3 && !stopWords.has(token)) ?? [])];
}

function relevantExcerpt(content: string, tokens: string[]) {
  const normalized = normalize(content);
  const positions = tokens.map((token) => normalized.indexOf(token)).filter((position) => position >= 0);
  if (!positions.length || content.length <= 3000) return content.slice(0, 3000);
  const center = Math.min(...positions);
  const start = Math.max(0, center - 900);
  return content.slice(start, start + 3000);
}

export function selectTrainerKnowledgeContext(
  instruction: string,
  items: TrainerKnowledgeSource[],
  corrections: TrainerKnowledgeCorrection[],
) {
  const activeByItem = new Map<string, string>();
  for (const correction of corrections) if (!activeByItem.has(correction.knowledgeItemId)) activeByItem.set(correction.knowledgeItemId, correction.content);
  const tokens = queryTokens(instruction);
  const ranked = items.map((item) => {
    const effectiveContent = activeByItem.get(item.id) ?? item.extractedText ?? item.content;
    const title = normalize(item.title);
    const body = normalize(effectiveContent);
    const titleScore = tokens.reduce((total, token) => total + (title.includes(token) ? 4 : 0), 0);
    const score = titleScore + tokens.reduce((total, token) => total + (body.includes(token) ? 1 : 0), 0);
    return { item, effectiveContent, score, titleScore };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const top = ranked[0];
  const second = ranked[1];
  return {
    // Generic facts such as "sábado" or "horario" can occur in every file.
    // Ask for a filename only when both tied candidates are actually named by
    // the trainer instruction; otherwise let the interpreter use the best file.
    ambiguous: Boolean(top && second && top.score === second.score && top.titleScore > 0 && second.titleScore > 0 && top.item.sourceType === "FILE" && second.item.sourceType === "FILE"),
    items: ranked.slice(0, 8).map(({ item, effectiveContent }) => ({ ...item, content: relevantExcerpt(effectiveContent, tokens) })),
  };
}

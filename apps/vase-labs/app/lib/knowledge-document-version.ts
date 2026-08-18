export type DocumentCorrectionInput = { content: string; beforeText?: string; afterText?: string };

export function resolveEffectiveDocumentContent(original: string, corrections: Array<{ content: string; active: boolean }>) {
  return corrections.find((correction) => correction.active)?.content ?? original;
}

export function applyDocumentCorrection(current: string, proposed: DocumentCorrectionInput) {
  const before = proposed.beforeText?.trim();
  const after = proposed.afterText?.trim();
  if (before && after && current.includes(before)) return current.replace(before, after);
  const correction = proposed.content.trim();
  if (!correction) throw new Error("TRAINER_DOCUMENT_CORRECTION_EMPTY");
  return `${current.trimEnd()}\n\n--- CORRECCIÓN VIGENTE ---\n${correction}`;
}

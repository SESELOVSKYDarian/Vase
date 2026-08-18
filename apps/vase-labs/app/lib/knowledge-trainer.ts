export function normalizeTrainerPhone(value: string) {
  const phone = value.replace(/\D/g, "");
  if (phone.length < 8 || phone.length > 15) throw new Error("TRAINER_PHONE_INVALID");
  return phone;
}

export function routeTrainerInbound(value: string, phones: Array<{ phone: string; active: boolean }>) {
  const normalized = normalizeTrainerPhone(value);
  return phones.some((candidate) => candidate.active && candidate.phone === normalized) ? "TRAINER" as const : "COMMERCIAL" as const;
}

export function confirmTrainerProposal(proposal: { status: string; baseRevision: number; expiresAt: Date }, response: string, currentRevision: number) {
  if (proposal.status !== "PENDING" || proposal.expiresAt.getTime() <= Date.now()) throw new Error("TRAINER_PROPOSAL_EXPIRED");
  if (!/^(confirmar|confirmo|sí|si)$/i.test(response.trim())) throw new Error("TRAINER_CONFIRMATION_REQUIRED");
  if (proposal.baseRevision !== currentRevision) throw new Error("TRAINER_PROPOSAL_STALE");
  return { accepted: true as const };
}

export function rejectTrainerProposal(response: string) {
  return /^(rechazar|rechazo|cancelar|cancel[oó])$/i.test(response.trim()) ? { rejected: true as const } : null;
}

export type TrainerProposal =
  | { changeType: "FAQ_CREATE"; baseRevision: number; proposedValue: { question: string; answer: string }; targetKnowledgeId?: undefined }
  | { changeType: "FAQ_EDIT"; baseRevision: number; targetKnowledgeId: string; proposedValue: { question: string; answer: string } }
  | { changeType: "DOCUMENT_CORRECTION"; baseRevision: number; targetKnowledgeId: string; proposedValue: { content: string } };

export function createTrainerProposal(instruction: string, baseRevision: number): TrainerProposal {
  const normalized = instruction.trim();
  const faq = normalized.match(/^agreg[aá]\s+faq\s*:\s*(.+?)\s*\|\s*(.+)$/i);
  if (faq) {
    const question = faq[1].trim();
    const answer = faq[2].trim();
    if (question && answer) return { changeType: "FAQ_CREATE" as const, baseRevision, proposedValue: { question, answer } };
  }
  const faqEdit = normalized.match(/^edit(?:ar|[aá])\s+faq\s+([\w-]+)\s*:\s*(.+?)\s*\|\s*(.+)$/i);
  if (faqEdit) {
    const targetKnowledgeId = faqEdit[1].trim();
    const question = faqEdit[2].trim();
    const answer = faqEdit[3].trim();
    if (targetKnowledgeId && question && answer) return { changeType: "FAQ_EDIT" as const, baseRevision, targetKnowledgeId, proposedValue: { question, answer } };
  }
  const correction = normalized.match(/^corregir\s+documento\s+([\w-]+)\s*:\s*(.+)$/i);
  if (correction) {
    const targetKnowledgeId = correction[1].trim();
    const content = correction[2].trim();
    if (targetKnowledgeId && content) return { changeType: "DOCUMENT_CORRECTION" as const, baseRevision, targetKnowledgeId, proposedValue: { content } };
  }
  throw new Error("TRAINER_INSTRUCTION_AMBIGUOUS");
}

export function buildTrainerProposalReply(proposal: { changeType: string; proposedValue: { question?: string; answer?: string; content?: string } }) {
  if (proposal.changeType === "FAQ_CREATE" || proposal.changeType === "FAQ_EDIT") {
    return `Revisé el conocimiento actual. Propuesta de FAQ: “${proposal.proposedValue.question}” → “${proposal.proposedValue.answer}”. Respondé CONFIRMAR para aplicarla o RECHAZAR para descartarla.`;
  }
  if (proposal.changeType === "DOCUMENT_CORRECTION") {
    return `Revisé el documento indicado. Propuesta de corrección: “${proposal.proposedValue.content}”. Respondé CONFIRMAR para aplicarla o RECHAZAR para descartarla.`;
  }
  return "No pude preparar una propuesta segura. Indicá la fuente y el cambio que querés realizar.";
}

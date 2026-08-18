import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildTrainerProposalReply, confirmTrainerProposal, createTrainerProposal, normalizeTrainerPhone, routeTrainerInbound, rejectTrainerProposal, shouldInterpretTrainerInstruction } from "../apps/vase-labs/app/lib/knowledge-trainer";

describe("Labs knowledge trainer", () => {
  it("normalizes authorized WhatsApp phones and separates them from commercial flow", () => {
    expect(normalizeTrainerPhone("+54 9 11 5555-0000")).toBe("5491155550000");
    expect(routeTrainerInbound("+54 9 11 5555-0000", [{ phone: "5491155550000", active: true }])).toBe("TRAINER");
    expect(routeTrainerInbound("5491155559999", [{ phone: "5491155550000", active: true }])).toBe("COMMERCIAL");
  });

  it("requires explicit confirmation and rejects stale proposals", () => {
    const proposal = { status: "PENDING", baseRevision: 3, expiresAt: new Date(Date.now() + 60_000) };
    expect(() => confirmTrainerProposal(proposal, "quizás", 3)).toThrow("TRAINER_CONFIRMATION_REQUIRED");
    expect(() => confirmTrainerProposal(proposal, "confirmar", 4)).toThrow("TRAINER_PROPOSAL_STALE");
    expect(confirmTrainerProposal(proposal, "confirmar", 3)).toEqual({ accepted: true });
  });

  it("turns an FAQ instruction into a reviewable proposal without mutating knowledge", () => {
    expect(createTrainerProposal("agregá FAQ: ¿Hacen envíos? | Sí, enviamos a todo el país", 7)).toEqual({
      changeType: "FAQ_CREATE", baseRevision: 7,
      proposedValue: { question: "¿Hacen envíos?", answer: "Sí, enviamos a todo el país" },
    });
  });

  it("creates explicit edit and document-correction proposals without touching the source", () => {
    expect(createTrainerProposal("editar FAQ faq_1: Horarios | Lun a vie de 9 a 18", 7)).toEqual({
      changeType: "FAQ_EDIT", baseRevision: 7, targetKnowledgeId: "faq_1",
      proposedValue: { question: "Horarios", answer: "Lun a vie de 9 a 18" },
    });
    expect(createTrainerProposal("corregir documento doc_1: El retiro es en Av. Siempre Viva 123", 7)).toEqual({
      changeType: "DOCUMENT_CORRECTION", baseRevision: 7, targetKnowledgeId: "doc_1",
      proposedValue: { content: "El retiro es en Av. Siempre Viva 123" },
    });
  });

  it("gives active document corrections precedence when building AI knowledge context", () => {
    const source = readFileSync("apps/vase-labs/app/lib/channel-ai-runner.ts", "utf8");
    expect(source).toContain("knowledgeCorrection.findMany");
    expect(source).toContain("correctionByKnowledgeId");
  });

  it("exposes the trainer revision history with an explicit reversal action", () => {
    const page = readFileSync("apps/vase-labs/app/app/owner/labs/chatbots/page.tsx", "utf8");
    const component = readFileSync("apps/vase-labs/app/app/owner/labs/chatbots/trainer-revision-history.tsx", "utf8");
    expect(page).toContain("TrainerRevisionHistory");
    expect(component).toContain("Revertir cambio");
    expect(component).toContain("/revert");
  });

  it("keeps the personal trainer in a dedicated inbox route", () => {
    const nav = readFileSync("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx", "utf8");
    const page = readFileSync("apps/vase-labs/app/app/owner/labs/inbox/trainer/page.tsx", "utf8");
    expect(nav).toContain('href: "/owner/inbox/trainer"');
    expect(page).toContain("Entrenador personal");
  });

  it("uses the AI instruction interpreter after transcribing trainer audio", () => {
    const worker = readFileSync("apps/vase-labs/scripts/trainer-audio-worker.ts", "utf8");
    expect(worker).toContain("createTrainerInstructionInterpreter");
    expect(worker).toContain("interpret({");
    expect(worker).toContain('status: { in: ["QUEUED", "FAILED"] }');
    expect(worker).toContain("attempts: { lt: 5 }");
    expect(worker).toContain("data: { transcript }");
    expect(worker).toContain("shouldInterpretTrainerInstruction(Boolean(pendingProposal))");
  });

  it("routes a spoken confirmation to the pending proposal instead of the AI interpreter", () => {
    expect(shouldInterpretTrainerInstruction(true)).toBe(false);
    expect(shouldInterpretTrainerInstruction(false)).toBe(true);
  });

  it("asks the trainer for an explicit WhatsApp confirmation before a proposed change", () => {
    expect(buildTrainerProposalReply({ changeType: "FAQ_CREATE", proposedValue: { question: "Horarios", answer: "9 a 18" } }))
      .toContain("CONFIRMAR");
  });

  it("recognizes an explicit rejection without mutating the proposal", () => {
    expect(rejectTrainerProposal("rechazar")).toEqual({ rejected: true });
    expect(rejectTrainerProposal("no estoy seguro")).toBeNull();
  });
});

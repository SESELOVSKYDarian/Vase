import { describe, expect, it } from "vitest";
import { mergeInboxConversationSummaries, reconcileInboxMessages } from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-conversation-merge";

describe("Labs Inbox queue refresh", () => {
  it("preserves the loaded thread when queue polling returns only summaries", () => {
    const current = [{
      id: "conversation_1",
      customerName: "Alexis",
      messages: [{ id: "message_1", content: "Mensaje cargado" }],
      handoffs: [{ id: "handoff_1" }],
      messageCount: 1,
    }];
    const refreshed = [{
      id: "conversation_1",
      customerName: "Alexis actualizado",
      messages: [],
      handoffs: [],
      messageCount: 2,
    }];

    expect(mergeInboxConversationSummaries(current, refreshed)).toEqual([{
      ...refreshed[0],
      messages: current[0].messages,
      handoffs: current[0].handoffs,
    }]);
  });

  it("adds conversations that arrived after the first render", () => {
    expect(mergeInboxConversationSummaries([], [{
      id: "conversation_2", messages: [], handoffs: [], messageCount: 1,
    }])).toHaveLength(1);
  });

  it("reconciles polling results by id without degrading a confirmed delivery", () => {
    const current = [{ id: "m1", content: "Hola", delivery: { status: "SENT" } }];
    const stale = [{ id: "m1", content: "Hola", delivery: null }];
    expect(reconcileInboxMessages(current, stale)).toEqual(current);
  });

  it("appends new messages in server order", () => {
    const current = [{ id: "m1", content: "Uno", delivery: null }];
    const refreshed = [current[0], { id: "m2", content: "Dos", delivery: null }];
    expect(reconcileInboxMessages(current, refreshed)).toEqual(refreshed);
  });
});

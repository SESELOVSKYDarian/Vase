import type { LabsChannel } from "@vase/contracts";
import { createKnowledgeRequestGuard, type KnowledgeRequestTicket } from "../chatbots/knowledge-request-guard";

export function buildChannelSetupRequest(channelType: LabsChannel): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelType }),
  };
}

export function buildChannelVerifyRequest(channelId: string): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelId }),
  };
}

export function createChannelUiFlow() {
  const requests = createKnowledgeRequestGuard();
  let terminalTimer: ReturnType<typeof setTimeout> | undefined;
  let latestCopy: KnowledgeRequestTicket | null = null;
  let terminalLocked = false;

  function invalidate() {
    if (terminalTimer !== undefined) clearTimeout(terminalTimer);
    terminalTimer = undefined;
    latestCopy = null;
    terminalLocked = false;
    requests.invalidate();
  }

  return {
    start(scope: string) { return requests.start(scope); },
    startLatestCopy() {
      if (terminalLocked) return null;
      if (latestCopy) {
        latestCopy.controller.abort();
        requests.finish(latestCopy);
      }
      latestCopy = requests.start("copy");
      return latestCopy;
    },
    startVerify() {
      if (latestCopy) {
        latestCopy.controller.abort();
        requests.finish(latestCopy);
        latestCopy = null;
      }
      return requests.start("verify");
    },
    isCurrent(ticket: KnowledgeRequestTicket) { return requests.isCurrent(ticket); },
    finish(ticket: KnowledgeRequestTicket) {
      if (latestCopy === ticket) latestCopy = null;
      requests.finish(ticket);
    },
    invalidate,
    scheduleConnected(announce: () => void, complete: () => void, delayMs = 900) {
      invalidate();
      terminalLocked = true;
      const terminal = requests.start("terminal");
      if (!terminal) return;
      announce();
      terminalTimer = setTimeout(() => {
        terminalTimer = undefined;
        if (!requests.isCurrent(terminal)) return;
        requests.finish(terminal);
        terminalLocked = false;
        complete();
      }, delayMs);
    },
  };
}

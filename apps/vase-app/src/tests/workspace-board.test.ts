import { describe, expect, it } from "vitest";
import {
  TASK_STATUS_FOR,
  TICKET_STATUS_FOR,
  columnFor,
  itemCode,
  itemKey,
  normalizePriority,
  parseItemKey,
  priorityFor,
} from "@/lib/workspace/board";
import { isWorkspaceRole, resolveWorkspaceAccessDecision, resolveWorkspaceUrl } from "@/lib/security/workspace-host-routing";

describe("tablero de Workspace", () => {
  it("pone tickets y trabajos en la misma columna según su estado", () => {
    expect(columnFor("ticket", "QUEUED")).toBe("todo");
    expect(columnFor("ticket", "WAITING_CUSTOMER")).toBe("waiting");
    expect(columnFor("task", "BLOCKED")).toBe("waiting");
    expect(columnFor("task", "COMPLETED")).toBe("done");
  });

  it("al mover vuelve a un estado que entiende cada uno", () => {
    for (const column of ["todo", "doing", "waiting", "done"] as const) {
      expect(columnFor("ticket", TICKET_STATUS_FOR[column])).toBe(column);
      expect(columnFor("task", TASK_STATUS_FOR[column])).toBe(column);
    }
  });

  it("traduce la prioridad media entre tickets y trabajos", () => {
    expect(normalizePriority("NORMAL")).toBe("MEDIUM");
    expect(priorityFor("ticket", "MEDIUM")).toBe("NORMAL");
    expect(priorityFor("task", "MEDIUM")).toBe("MEDIUM");
  });

  it("arma y lee la referencia de cada tarjeta", () => {
    expect(parseItemKey(itemKey("ticket", "cmabc12345xyz"))).toEqual({ kind: "ticket", id: "cmabc12345xyz" });
    expect(parseItemKey("X-123")).toBeNull();
    expect(itemCode("task", "cmabc12345xyz")).toBe("DEV-45XYZ");
  });
});

describe("workspace.vase.ar", () => {
  const input = { nodeEnv: "production", workspaceHost: "workspace.vase.ar", primaryHost: "app.vase.ar" };
  const base = { hostname: "workspace.vase.ar", isSignedIn: true, isEmailVerified: true, input };

  it("solo deja entrar al equipo", () => {
    expect(isWorkspaceRole("SUPPORT")).toBe(true);
    expect(isWorkspaceRole("USER")).toBe(false);
    expect(resolveWorkspaceAccessDecision({ ...base, url: "https://workspace.vase.ar/", platformRole: "USER" })).toEqual({ type: "reject", status: 403 });
  });

  it("muestra las páginas internas sin el prefijo", () => {
    expect(resolveWorkspaceAccessDecision({ ...base, url: "https://workspace.vase.ar/i/T-abc12345?x=1", platformRole: "SUPER_ADMIN" })).toEqual({
      type: "rewrite",
      url: "https://workspace.vase.ar/app/workspace/i/T-abc12345?x=1",
    });
  });

  it("sin sesión manda a iniciar sesión en app.vase.ar y vuelve", () => {
    const decision = resolveWorkspaceAccessDecision({ ...base, isSignedIn: false, url: "https://workspace.vase.ar/lista", platformRole: null });
    expect(decision.type).toBe("redirect");
    expect(decision.type === "redirect" && decision.url).toBe("https://app.vase.ar/signin?redirectTo=https%3A%2F%2Fworkspace.vase.ar%2Flista");
  });

  it("no expone otras APIs y deja pasar otros hosts", () => {
    expect(resolveWorkspaceAccessDecision({ ...base, url: "https://workspace.vase.ar/api/sites", platformRole: "SUPER_ADMIN" })).toEqual({ type: "reject", status: 404 });
    expect(resolveWorkspaceAccessDecision({ ...base, hostname: "app.vase.ar", url: "https://app.vase.ar/app", platformRole: "USER" })).toEqual({ type: "allow" });
    expect(resolveWorkspaceUrl("/lista", input)).toBe("https://workspace.vase.ar/lista");
  });
});

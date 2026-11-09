import { describe, expect, it } from "vitest";
import {
  describeSupportTicket,
  describeWorkProgress,
  formatCalendarTile,
  formatMeetingWhen,
  matchesWorkDate,
  mergeClientMeetings,
  meetingMinutes,
  type ClientMeetingSource,
} from "@/lib/business/work-board";
import { formatPlanPrice } from "@/components/panel/products";
import { assignableModuleIds, effectiveModuleIds, sanitizeModuleSelection } from "@/lib/team/team-access";

const contracted = ["vase_business", "vase_labs"];

describe("team product access", () => {
  it("keeps Business out of the Miembro role", () => {
    expect(assignableModuleIds("MEMBER", contracted)).toEqual(["vase_labs"]);
    expect(assignableModuleIds("MANAGER", contracted)).toEqual(contracted);
  });

  it("drops modules that are not contracted, repeated or not allowed", () => {
    expect(sanitizeModuleSelection("MANAGER", ["vase_labs", "vase_labs", "vase_rest", 3], contracted)).toEqual(["vase_labs"]);
    expect(sanitizeModuleSelection("MEMBER", ["vase_business"], contracted)).toEqual([]);
    expect(sanitizeModuleSelection("MANAGER", "vase_labs", contracted)).toEqual([]);
  });

  it("treats no explicit rows as everything contracted", () => {
    expect(effectiveModuleIds([], contracted)).toEqual(contracted);
    expect(effectiveModuleIds([{ moduleId: "vase_labs", isActive: true }, { moduleId: "vase_business", isActive: false }], contracted)).toEqual(["vase_labs"]);
  });
});

describe("work board", () => {
  const now = new Date(2026, 10, 9);

  it("filters by date", () => {
    expect(matchesWorkDate(new Date(2026, 10, 1), "mes", now)).toBe(true);
    expect(matchesWorkDate(new Date(2026, 9, 31), "mes", now)).toBe(false);
    expect(matchesWorkDate(new Date(2026, 8, 1), "tres", now)).toBe(true);
    expect(matchesWorkDate(new Date(2026, 1, 1), "tres", now)).toBe(false);
    expect(matchesWorkDate(new Date(2026, 1, 1), "anio", now)).toBe(true);
    expect(matchesWorkDate(new Date(2025, 11, 31), "anio", now)).toBe(false);
  });

  it("marks the client's turn when a quote is waiting", () => {
    const progress = describeWorkProgress({ status: "QUOTED", quoteStatus: "PENDING_CLIENT", quoteAmount: "$480.000" });
    expect(progress.isClientTurn).toBe(true);
    expect(progress.next).toContain("$480.000");
    expect(progress.segments).toEqual(["done", "done", "now", "todo", "todo"]);
  });

  it("completes every step on delivery", () => {
    const progress = describeWorkProgress({ status: "DELIVERED" });
    expect(progress.segments.every((segment) => segment === "done")).toBe(true);
    expect(progress.state).toBe("Terminado");
  });
});

describe("plan prices from admin", () => {
  it("combines one-time and monthly prices", () => {
    expect(
      formatPlanPrice([
        { price: 780000, currency: "ARS", type: "ONE_TIME" },
        { price: 25000, currency: "ARS", type: "MONTHLY" },
      ]).replace(/\s/g, " "),
    ).toBe("$ 780.000 + $ 25.000 por mes");
  });

  it("uses the newest row of each type", () => {
    expect(
      formatPlanPrice([
        { price: 200, currency: "ARS", type: "MONTHLY" },
        { price: 100, currency: "ARS", type: "MONTHLY" },
      ]).replace(/\s/g, " "),
    ).toBe("$ 200 por mes");
  });

  it("asks to consult when admin has no price", () => {
    expect(formatPlanPrice([])).toBe("A consultar");
  });
});

describe("client meetings", () => {
  const now = new Date("2026-11-09T18:00:00Z");
  const base: ClientMeetingSource = {
    id: "a",
    kind: "v2",
    title: "Revisión",
    start: new Date("2026-11-10T18:30:00Z"),
    end: null,
    url: null,
    finished: false,
    customMeetingId: null,
  };

  it("shows a meeting once when it exists in two sources, preferring the booking", () => {
    const { upcoming } = mergeClientMeetings(
      [
        { ...base, id: "v2", customMeetingId: "m1" },
        { ...base, id: "b1", kind: "booking", customMeetingId: "m1" },
      ],
      now,
    );
    expect(upcoming.map((meeting) => meeting.id)).toEqual(["b1"]);
  });

  it("splits upcoming and past, soonest and latest first", () => {
    const { upcoming, past } = mergeClientMeetings(
      [
        { ...base, id: "later", start: new Date("2026-12-01T10:00:00Z") },
        { ...base, id: "soon" },
        { ...base, id: "old", start: new Date("2026-10-01T10:00:00Z") },
        { ...base, id: "older", start: new Date("2026-09-01T10:00:00Z") },
        { ...base, id: "done", finished: true },
      ],
      now,
    );
    expect(upcoming.map((meeting) => meeting.id)).toEqual(["soon", "later"]);
    expect(past.map((meeting) => meeting.id)).toEqual(["done", "old", "older"]);
  });

  it("writes times in Argentina", () => {
    expect(formatMeetingWhen(new Date("2026-11-10T18:30:00Z"), now)).toBe("Mañana, 15:30");
    expect(formatMeetingWhen(new Date("2026-11-09T20:00:00Z"), now)).toBe("Hoy, 17:00");
    expect(formatCalendarTile(new Date("2026-11-10T18:30:00Z")).day).toBe("10");
  });

  it("computes duration only when it is known", () => {
    expect(meetingMinutes(new Date(0), new Date(30 * 60000))).toBe(30);
    expect(meetingMinutes(new Date(0), null)).toBeNull();
  });
});

describe("support tickets", () => {
  it("speaks the client's language", () => {
    expect(describeSupportTicket("WAITING_CUSTOMER", "2 de noviembre").state).toBe("Respondida");
    expect(describeSupportTicket("QUEUED", "2 de noviembre").state).toBe("En revisión");
    expect(describeSupportTicket("CLOSED", "2 de noviembre").state).toBe("Cerrada");
  });
});

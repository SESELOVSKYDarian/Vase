// Reglas de la prueba gratis (7 días, aviso un día antes, bloqueo al terminar) y de los recordatorios de reuniones.
import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, isTrialLocked, trialEndsAtFrom, trialPhase } from "@/server/services/trial/trial-rules";
import { dueMeetingReminders, meetingReminderKey } from "@/server/services/meeting-reminders/reminder-windows";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-11-25T12:00:00.000Z");
const trial = (endsInHours: number, extra: Partial<{ billingStatus: string; isTestAccount: boolean }> = {}) => ({
  billingStatus: "TRIAL",
  isTestAccount: false,
  trialEndsAt: new Date(now.getTime() + endsInHours * HOUR),
  ...extra,
});

describe("prueba gratis", () => {
  it("dura 7 días", () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(trialEndsAtFrom(now).toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });

  it("avisa en las últimas 24 horas y bloquea cuando termina", () => {
    expect(trialPhase(trial(48), now)).toBe("running");
    expect(trialPhase(trial(20), now)).toBe("ending");
    expect(trialPhase(trial(-1), now)).toBe("expired");
    expect(isTrialLocked(trial(-1), now)).toBe(true);
  });

  it("no bloquea si pagó o si es cuenta de prueba interna", () => {
    expect(isTrialLocked(trial(-100, { billingStatus: "ACTIVE" }), now)).toBe(false);
    expect(isTrialLocked(trial(-100, { isTestAccount: true }), now)).toBe(false);
    expect(isTrialLocked(null, now)).toBe(false);
  });
});

describe("recordatorios de reuniones", () => {
  const at = (hours: number) => new Date(now.getTime() + hours * HOUR);

  it("el día anterior y 30 minutos antes", () => {
    expect(dueMeetingReminders(at(23), now)).toEqual(["DAY_BEFORE"]);
    expect(dueMeetingReminders(at(0.4), now)).toEqual(["MINUTES_30"]);
    expect(dueMeetingReminders(at(1), now)).toEqual([]);
    expect(dueMeetingReminders(at(30), now)).toEqual([]);
    expect(dueMeetingReminders(at(-0.1), now)).toEqual([]);
  });

  it("si cambia el horario, el aviso vuelve a salir", () => {
    expect(meetingReminderKey("agenda:1", "DAY_BEFORE", at(20))).not.toBe(meetingReminderKey("agenda:1", "DAY_BEFORE", at(22)));
  });
});

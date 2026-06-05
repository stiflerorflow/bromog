import { describe, expect, it } from "vitest";
import { getWorkout } from "./program";
import {
  GRACE_MIN,
  evaluateSlot,
  lapsedAmendable,
  slotWindow,
  weekId,
  weekSlots,
} from "./schedule";
import type { Session } from "./types";

const monday = getWorkout("monday")!;
const anchor = new Date(2026, 5, 3, 12, 0); // any time; windows are derived per-week
const monWin = slotWindow(monday, anchor);

function at(base: Date, offsetMin: number): Date {
  return new Date(base.getTime() + offsetMin * 60_000);
}

function session(now: Date, slot: string, skippies = false): Session {
  return {
    id: `s-${slot}`,
    user_id: "stephen",
    workout_key: "monday",
    week_id: weekId(now),
    slot_id: slot,
    started_at: now.toISOString(),
    finished_at: now.toISOString(),
    status: "LOGGED",
    skippies,
    skippies_confessed_at: skippies ? now.toISOString() : null,
    sets: [],
  };
}

describe("slot state machine", () => {
  it("is UPCOMING before the window opens", () => {
    const now = at(monWin.start, -60);
    expect(evaluateSlot(monday, [], now).state).toBe("UPCOMING");
  });

  it("is ACTIVE inside the window", () => {
    const now = at(monWin.start, 120);
    expect(evaluateSlot(monday, [], now).state).toBe("ACTIVE");
  });

  it("is LAPSED after the window closes with no session", () => {
    const now = at(monWin.end, 60);
    expect(evaluateSlot(monday, [], now).state).toBe("LAPSED");
  });

  it("is LOGGED when a normal session exists this week", () => {
    const now = at(monWin.end, 60);
    expect(evaluateSlot(monday, [session(now, "S1_MON")], now).state).toBe("LOGGED");
  });

  it("is AMENDED when a skippies session exists", () => {
    const now = at(monWin.end, 60);
    expect(evaluateSlot(monday, [session(now, "S1_MON", true)], now).state).toBe("AMENDED");
  });

  it("stays ACTIVE for an in-progress draft within the grace period", () => {
    const now = at(monWin.end, GRACE_MIN - 10);
    expect(evaluateSlot(monday, [], now, "monday").state).toBe("ACTIVE");
  });

  it("lapses once the draft grace period elapses", () => {
    const now = at(monWin.end, GRACE_MIN + 30);
    expect(evaluateSlot(monday, [], now, "monday").state).toBe("LAPSED");
  });
});

describe("amendment selection", () => {
  it("amends the earliest lapsed slot when several have lapsed", () => {
    // After Thursday's window: Mon/Wed/Thu lapsed, Sat upcoming.
    const thu = getWorkout("thursday")!;
    const now = at(slotWindow(thu, anchor).end, 60);
    const slots = weekSlots([], now);
    const states = Object.fromEntries(slots.map((s) => [s.workout.key, s.state]));
    expect(states.monday).toBe("LAPSED");
    expect(states.wednesday).toBe("LAPSED");
    expect(states.thursday).toBe("LAPSED");
    expect(states.saturday).toBe("UPCOMING");
    expect(lapsedAmendable(slots)?.workout.key).toBe("monday");
  });
});

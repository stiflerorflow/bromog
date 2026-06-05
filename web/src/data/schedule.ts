import { WORKOUTS } from "./program";
import { isoWeek } from "./stats";
import type { Session, Workout } from "./types";

// Time-bound session logic. All functions take `now` explicitly so they are pure
// and unit-testable. Times are local wall-clock (no UTC/DST handling — per spec).

export type SlotState = "UPCOMING" | "ACTIVE" | "LOGGED" | "LAPSED" | "AMENDED";

/** Sessions started in-window may finish up to this long after window_end. */
export const GRACE_MIN = 120;

export interface SlotWindowDates {
  start: Date;
  end: Date;
}

export interface SlotInfo {
  workout: Workout;
  state: SlotState;
  window: SlotWindowDates;
  session?: Session;
}

/** ISO-8601 week id (Monday start) for `now`. */
export function weekId(now: Date): string {
  return isoWeek(now);
}

/** Days from `date`'s weekday back to Monday. */
function daysToMonday(jsDay: number): number {
  return jsDay === 0 ? -6 : 1 - jsDay;
}

/** Start/end Date of a slot's window within the ISO week containing `now`. */
export function slotWindow(w: Workout, now: Date): SlotWindowDates {
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday(now.getDay()));
  monday.setHours(0, 0, 0, 0);

  const fromMonday = w.window.weekday === 0 ? 6 : w.window.weekday - 1; // Mon=0 … Sun=6
  const day = new Date(monday);
  day.setDate(monday.getDate() + fromMonday);

  const start = new Date(day);
  start.setHours(w.window.startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(w.window.endHour, 0, 0, 0);
  return { start, end };
}

function sessionForSlot(w: Workout, sessions: Session[], now: Date): Session | undefined {
  const wk = weekId(now);
  return sessions.find(
    (s) => s.finished_at && s.week_id === wk && s.slot_id === w.slotId
  );
}

/**
 * Resolve a slot's state for the current ISO week.
 * `draftKey` is the workout_key of an in-progress draft, if any.
 */
export function evaluateSlot(
  w: Workout,
  sessions: Session[],
  now: Date,
  draftKey?: string | null
): SlotInfo {
  const window = slotWindow(w, now);
  const session = sessionForSlot(w, sessions, now);
  if (session) {
    return { workout: w, state: session.skippies ? "AMENDED" : "LOGGED", window, session };
  }
  // An in-progress draft keeps the slot enterable through the grace period.
  if (draftKey === w.key && now.getTime() <= window.end.getTime() + GRACE_MIN * 60_000) {
    return { workout: w, state: "ACTIVE", window };
  }
  if (now.getTime() < window.start.getTime()) return { workout: w, state: "UPCOMING", window };
  if (now.getTime() <= window.end.getTime()) return { workout: w, state: "ACTIVE", window };
  return { workout: w, state: "LAPSED", window };
}

/** All four slots of the current week, in program order. */
export function weekSlots(sessions: Session[], now: Date, draftKey?: string | null): SlotInfo[] {
  return WORKOUTS.map((w) => evaluateSlot(w, sessions, now, draftKey));
}

export function activeSlot(slots: SlotInfo[]): SlotInfo | null {
  return slots.find((s) => s.state === "ACTIVE") ?? null;
}

/** Most recent lapsed-and-unamended slot — the one the Tribunal will hear. */
export function lapsedAmendable(slots: SlotInfo[]): SlotInfo | null {
  return (
    slots
      .filter((s) => s.state === "LAPSED")
      .sort((a, b) => b.window.start.getTime() - a.window.start.getTime())[0] ?? null
  );
}

export function nextUpcoming(slots: SlotInfo[]): SlotInfo | null {
  return (
    slots
      .filter((s) => s.state === "UPCOMING")
      .sort((a, b) => a.window.start.getTime() - b.window.start.getTime())[0] ?? null
  );
}

/** "16:00" style label for a window boundary. */
export function clockLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

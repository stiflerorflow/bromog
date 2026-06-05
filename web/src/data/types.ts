export type UserId = "stephen" | "matt";

export interface User {
  id: UserId;
  name: string;
}

export type Equipment = "machine" | "cable" | "dumbbell" | "barbell" | "bodyweight";

export interface Exercise {
  key: string;
  name: string;
  muscle: string;
  bias?: boolean;
  equipment: Equipment;
  /** Default rest after a set, in seconds. */
  restSeconds: number;
  /** Smallest sensible weight bump for progressive overload, in kg. */
  increment: number;
  /** Inclusive rep range used by the double-progression engine. */
  repTarget: [number, number];
  /** Pre-filled weight (kg) the first time, before any history exists. */
  startWeight?: number;
}

/** Validity window for a slot, in local wall-clock hours on a weekday. */
export interface SlotWindow {
  /** JS Date.getDay(): Sun=0 … Sat=6. */
  weekday: number;
  startHour: number;
  endHour: number;
}

export interface Workout {
  key: string;
  /** Stable slot identifier, e.g. "S1_MON". */
  slotId: string;
  name: string;
  day: string;
  time: string;
  bias: string;
  window: SlotWindow;
  exercises: Exercise[];
}

/** A single logged set. Weight in kg, reps as performed. */
export interface LoggedSet {
  exercise_key: string;
  set_index: 1 | 2;
  weight_kg: number;
  reps: number;
  done_at: string;
}

export type SessionStatus = "LOGGED" | "PARTIAL";

/** A finished workout — immutable once completed. Identified by a client UUID. */
export interface Session {
  id: string;
  user_id: UserId;
  workout_key: string;
  /** ISO-8601 week the session belongs to (Monday start). */
  week_id: string;
  /** Slot identifier, e.g. "S1_MON". */
  slot_id: string;
  started_at: string;
  finished_at: string | null;
  /** LOGGED = finished normally; PARTIAL = auto-closed after the grace period. */
  status: SessionStatus;
  /** True = a Skippies Amendment Session performed out of window via the Tribunal. */
  skippies: boolean;
  /** When the Tribunal concluded (amendments only). */
  skippies_confessed_at: string | null;
  sets: LoggedSet[];
}

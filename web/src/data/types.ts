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
}

export interface Workout {
  key: string;
  name: string;
  day: string;
  time: string;
  bias: string;
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

/** A finished workout — immutable once completed. Identified by a client UUID. */
export interface Session {
  id: string;
  user_id: UserId;
  workout_key: string;
  started_at: string;
  finished_at: string | null;
  sets: LoggedSet[];
}

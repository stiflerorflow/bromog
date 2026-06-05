import type { Exercise, LoggedSet, Session } from "./types";

export type Basis = "first" | "hold" | "progress";

export interface Suggestion {
  /** Pre-fill weight in kg, or null when there is no history yet. */
  weightKg: number | null;
  /** Pre-fill target reps. */
  reps: number;
  basis: Basis;
  /** Human-readable rationale shown inline under the exercise. */
  note: string;
}

/** Most recent finished session (newest first) that contains the exercise. */
function lastSetsFor(exerciseKey: string, sessions: Session[]): LoggedSet[] | null {
  const sorted = [...sessions]
    .filter((s) => s.finished_at)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  for (const session of sorted) {
    const sets = session.sets
      .filter((set) => set.exercise_key === exerciseKey)
      .sort((a, b) => a.set_index - b.set_index);
    if (sets.length) return sets;
  }
  return null;
}

/**
 * Deterministic double-progression suggestion.
 *
 *  - No history → blank weight, aim for the bottom of the rep range.
 *  - Both sets hit the top of the range last time → add one increment, reset to
 *    the bottom of the range (progress the weight).
 *  - Otherwise → hold the weight and aim for one more rep than last time
 *    (capped at the top of the range).
 */
export function suggest(exercise: Exercise, sessions: Session[]): Suggestion {
  const [lo, hi] = exercise.repTarget;
  const last = lastSetsFor(exercise.key, sessions);

  if (!last || last.length === 0) {
    return { weightKg: null, reps: lo, basis: "first", note: "First time — log your working weight." };
  }

  const lastWeight = last[0].weight_kg;
  // Only progress the load from a complete (2-set) session — a lone set from a
  // partial/auto-closed session shouldn't trigger a weight increase.
  const allMaxed = last.length >= 2 && last.every((set) => set.reps >= hi);

  if (allMaxed && exercise.increment > 0) {
    const next = round(lastWeight + exercise.increment);
    return {
      weightKg: next,
      reps: lo,
      basis: "progress",
      note: `Hit ${hi}+ on both sets at ${fmt(lastWeight)}kg — go up to ${fmt(next)}kg.`,
    };
  }

  const weakest = Math.min(...last.map((set) => set.reps));
  const targetReps = Math.min(hi, weakest + 1);
  return {
    weightKg: lastWeight,
    reps: targetReps,
    basis: "hold",
    note: `Stay at ${fmt(lastWeight)}kg — aim for ${targetReps} reps (was ${weakest}).`,
  };
}

function round(n: number): number {
  // Keep to a sensible 0.25kg grid so dumbbell/cable suggestions stay loadable.
  return Math.round(n * 4) / 4;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

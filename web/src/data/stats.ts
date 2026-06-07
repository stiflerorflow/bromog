import type { LoggedSet, Session } from "./types";

/** Estimated 1-rep max via the Epley formula. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

export interface ExercisePR {
  exerciseKey: string;
  bestWeight: number;
  bestWeightReps: number;
  bestE1rm: number;
  bestE1rmAt: string;
}

function bestSet(sets: { set: LoggedSet; at: string }[]): ExercisePR | null {
  if (!sets.length) return null;
  const key = sets[0].set.exercise_key;
  let bestWeight = -1;
  let bestWeightReps = 0;
  let bestE1rm = -1;
  let bestE1rmAt = "";
  for (const { set, at } of sets) {
    // Track the heaviest set; on a weight tie keep the higher rep count.
    if (set.weight_kg > bestWeight || (set.weight_kg === bestWeight && set.reps > bestWeightReps)) {
      bestWeight = set.weight_kg;
      bestWeightReps = set.reps;
    }
    const est = e1rm(set.weight_kg, set.reps);
    if (est > bestE1rm) {
      bestE1rm = est;
      bestE1rmAt = at;
    }
  }
  return { exerciseKey: key, bestWeight, bestWeightReps, bestE1rm, bestE1rmAt };
}

/** Personal records per exercise across a user's finished sessions. */
export function personalRecords(sessions: Session[]): Record<string, ExercisePR> {
  const byExercise: Record<string, { set: LoggedSet; at: string }[]> = {};
  for (const session of sessions) {
    for (const set of session.sets) {
      (byExercise[set.exercise_key] ??= []).push({ set, at: session.started_at });
    }
  }
  const out: Record<string, ExercisePR> = {};
  for (const [key, sets] of Object.entries(byExercise)) {
    const pr = bestSet(sets);
    if (pr) out[key] = pr;
  }
  return out;
}

export interface RecentPR {
  exerciseKey: string;
  weightKg: number;
  reps: number;
  e1rm: number;
}

/**
 * PRs set in the most recent finished session — an exercise whose best estimated-1RM
 * that day beat every prior session's best for it. (First-ever instances don't count,
 * so a debut session doesn't spam "PR" on everything.)
 */
export function recentPRs(sessions: Session[]): RecentPR[] {
  const finished = [...sessions]
    .filter((s) => s.finished_at)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  if (!finished.length) return [];
  const latest = finished[0];
  const prior = finished.slice(1);

  const byExercise: Record<string, LoggedSet[]> = {};
  for (const set of latest.sets) (byExercise[set.exercise_key] ??= []).push(set);

  const out: RecentPR[] = [];
  for (const [exerciseKey, sets] of Object.entries(byExercise)) {
    const best = sets.reduce((a, b) => (e1rm(b.weight_kg, b.reps) > e1rm(a.weight_kg, a.reps) ? b : a));
    const bestE = e1rm(best.weight_kg, best.reps);
    const priorBest = Math.max(
      0,
      ...prior.flatMap((s) =>
        s.sets.filter((x) => x.exercise_key === exerciseKey).map((x) => e1rm(x.weight_kg, x.reps))
      )
    );
    if (priorBest > 0 && bestE > priorBest) {
      out.push({ exerciseKey, weightKg: best.weight_kg, reps: best.reps, e1rm: Math.round(bestE * 10) / 10 });
    }
  }
  return out;
}

export interface SeriesPoint {
  date: string;
  topWeight: number;
  e1rm: number;
}

/** Per-session progression for one exercise (oldest first), for charting. */
export function exerciseSeries(exerciseKey: string, sessions: Session[]): SeriesPoint[] {
  return [...sessions]
    .filter((s) => s.sets.some((set) => set.exercise_key === exerciseKey))
    .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
    .map((s) => {
      const sets = s.sets.filter((set) => set.exercise_key === exerciseKey);
      const topWeight = Math.max(...sets.map((set) => set.weight_kg));
      const best = Math.max(...sets.map((set) => e1rm(set.weight_kg, set.reps)));
      return {
        date: s.started_at.slice(0, 10),
        topWeight,
        e1rm: Math.round(best * 10) / 10,
      };
    });
}

/** Total working sets per ISO week, for the volume chart. */
export function weeklyVolume(sessions: Session[]): { week: string; sets: number }[] {
  const byWeek: Record<string, number> = {};
  for (const session of sessions) {
    const week = isoWeek(new Date(session.started_at));
    byWeek[week] = (byWeek[week] ?? 0) + session.sets.length;
  }
  return Object.entries(byWeek)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, sets]) => ({ week, sets }));
}

export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Compact text summary of recent training, fed to the LLM coach. */
export function trendSummary(sessions: Session[], exerciseName: (k: string) => string): string {
  const recent = [...sessions]
    .filter((s) => s.finished_at)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
    .slice(0, 6);
  if (!recent.length) return "No sessions logged yet.";
  return recent
    .map((s) => {
      const sets = s.sets
        .map((set) => `${exerciseName(set.exercise_key)} ${set.weight_kg}kg x${set.reps}`)
        .join("; ");
      return `${s.started_at.slice(0, 10)} (${s.workout_key}): ${sets}`;
    })
    .join("\n");
}

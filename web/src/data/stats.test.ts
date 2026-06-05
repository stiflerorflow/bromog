import { describe, expect, it } from "vitest";
import { e1rm, exerciseSeries, personalRecords, weeklyVolume } from "./stats";
import type { Session } from "./types";

function session(id: string, date: string, weight: number, reps: number): Session {
  return {
    id,
    user_id: "stephen",
    workout_key: "monday",
    week_id: "2026-W23",
    slot_id: "S1_MON",
    started_at: date,
    finished_at: date,
    status: "LOGGED",
    skippies: false,
    skippies_confessed_at: null,
    sets: [
      { exercise_key: "rdl", set_index: 1, weight_kg: weight, reps, done_at: date },
      { exercise_key: "rdl", set_index: 2, weight_kg: weight, reps: reps - 1, done_at: date },
    ],
  };
}

describe("stats", () => {
  it("computes Epley e1RM", () => {
    expect(e1rm(100, 0)).toBe(0);
    expect(e1rm(100, 30)).toBeCloseTo(200);
    expect(e1rm(60, 10)).toBeCloseTo(80);
  });

  it("tracks PRs by best weight and best e1RM", () => {
    const sessions = [session("a", "2026-05-01", 60, 10), session("b", "2026-06-01", 80, 5)];
    const pr = personalRecords(sessions).rdl;
    expect(pr.bestWeight).toBe(80);
    expect(pr.bestE1rm).toBeCloseTo(e1rm(80, 5));
  });

  it("builds an oldest-first series", () => {
    const series = exerciseSeries("rdl", [
      session("b", "2026-06-01", 80, 5),
      session("a", "2026-05-01", 60, 10),
    ]);
    expect(series.map((p) => p.topWeight)).toEqual([60, 80]);
  });

  it("counts weekly working-set volume", () => {
    const vol = weeklyVolume([session("a", "2026-06-01", 60, 10), session("b", "2026-06-02", 60, 10)]);
    expect(vol.reduce((sum, w) => sum + w.sets, 0)).toBe(4);
  });
});

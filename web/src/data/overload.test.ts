import { describe, expect, it } from "vitest";
import { suggest } from "./overload";
import { getExercise } from "./program";
import type { Session } from "./types";

const press = getExercise("machine_press")!; // repTarget [8,12], increment 2.5

function session(weight: number, reps: [number, number], date = "2026-06-01T18:00:00Z"): Session {
  return {
    id: date,
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
      { exercise_key: "machine_press", set_index: 1, weight_kg: weight, reps: reps[0], done_at: date },
      { exercise_key: "machine_press", set_index: 2, weight_kg: weight, reps: reps[1], done_at: date },
    ],
  };
}

describe("progressive overload", () => {
  it("uses the configured start weight when there's no history", () => {
    const s = suggest(press, []); // machine_press has startWeight 65
    expect(s.basis).toBe("first");
    expect(s.weightKg).toBe(65);
    expect(s.reps).toBe(8);
  });

  it("blanks the weight when no start weight is configured", () => {
    // bulgarian_split_squat has no startWeight set.
    const s = suggest(getExercise("bulgarian_split_squat")!, []);
    expect(s.basis).toBe("first");
    expect(s.weightKg).toBeNull();
  });

  it("adds an increment when both sets hit the top of the range", () => {
    const s = suggest(press, [session(40, [12, 12])]);
    expect(s.basis).toBe("progress");
    expect(s.weightKg).toBe(42.5);
    expect(s.reps).toBe(8);
  });

  it("holds weight and bumps reps when a set fell short", () => {
    const s = suggest(press, [session(40, [12, 9])]);
    expect(s.basis).toBe("hold");
    expect(s.weightKg).toBe(40);
    expect(s.reps).toBe(10); // weakest 9 -> +1
  });

  it("uses the most recent session", () => {
    const older = session(35, [12, 12], "2026-05-01T18:00:00Z");
    const newer = session(40, [8, 8], "2026-06-01T18:00:00Z");
    const s = suggest(press, [older, newer]);
    expect(s.weightKg).toBe(40);
    expect(s.basis).toBe("hold");
  });

  it("does NOT progress from a single-set (partial) session", () => {
    // One set logged at the top of the range — must hold, not bump the weight.
    const partial = sessionFor("machine_press", [[40, 12]]);
    const s = suggest(press, [partial]);
    expect(s.basis).toBe("hold");
    expect(s.weightKg).toBe(40);
  });

  it("progresses dumbbell laterals by their 0.5kg increment", () => {
    const lat = getExercise("db_lateral_raise")!; // range 12-20, +0.5, start 7.5
    const s = suggest(lat, [sessionFor("db_lateral_raise", [[7.5, 20], [7.5, 20]])]);
    expect(s.basis).toBe("progress");
    expect(s.weightKg).toBe(8); // 7.5 + 0.5
    expect(s.reps).toBe(12); // reset to bottom of range
  });

  it("holds (adds reps) for a bodyweight movement instead of adding load", () => {
    const abs = getExercise("roman_chair_leg_lift")!; // increment 0
    const s = suggest(abs, [sessionFor("roman_chair_leg_lift", [[0, 20], [0, 20]])]);
    expect(s.basis).toBe("hold"); // never "progress" — increment is 0
    expect(s.weightKg).toBe(0);
  });
});

function sessionFor(
  exerciseKey: string,
  sets: [number, number][],
  date = "2026-06-01T18:00:00Z"
): Session {
  return {
    id: `${exerciseKey}-${date}`,
    user_id: "stephen",
    workout_key: "monday",
    week_id: "2026-W23",
    slot_id: "S1_MON",
    started_at: date,
    finished_at: date,
    status: "LOGGED",
    skippies: false,
    skippies_confessed_at: null,
    sets: sets.map(([weight, reps], i) => ({
      exercise_key: exerciseKey,
      set_index: (i + 1) as 1 | 2,
      weight_kg: weight,
      reps,
      done_at: date,
    })),
  };
}

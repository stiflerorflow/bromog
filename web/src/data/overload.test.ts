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
  it("blanks the weight with no history", () => {
    const s = suggest(press, []);
    expect(s.basis).toBe("first");
    expect(s.weightKg).toBeNull();
    expect(s.reps).toBe(8);
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
});

import type { Exercise, User, Workout } from "./types";

// ── Users ────────────────────────────────────────────────────────────────────
// Hardcoded roster. Switch at the top of the app; data is namespaced per user.
export const USERS: User[] = [
  { id: "stephen", name: "Stephen" },
  { id: "matt", name: "Matt" },
];

// ── Exercise library ──────────────────────────────────────────────────────────
// Single source of truth for each movement. Compounds rest 120s, isolation 90s.
// Increments: machine/cable 2.5kg, dumbbell 2kg (lateral raise 1kg), barbell 2.5kg.
const E = {
  machine_press: {
    key: "machine_press", name: "Machine Press", muscle: "Chest",
    equipment: "machine", restSeconds: 120, increment: 2.5, repTarget: [8, 12],
  },
  machine_row: {
    key: "machine_row", name: "Machine Row", muscle: "Back",
    equipment: "machine", restSeconds: 120, increment: 2.5, repTarget: [8, 12],
  },
  lat_pulldown: {
    key: "lat_pulldown", name: "Lat Pulldown", muscle: "Back",
    equipment: "cable", restSeconds: 120, increment: 2.5, repTarget: [8, 12],
  },
  machine_shoulder_press: {
    key: "machine_shoulder_press", name: "Machine Shoulder Press", muscle: "Delts",
    equipment: "machine", restSeconds: 120, increment: 2.5, repTarget: [8, 12],
  },
  bulgarian_split_squat: {
    key: "bulgarian_split_squat", name: "Bulgarian Split Squat", muscle: "Quads/Glutes",
    equipment: "dumbbell", restSeconds: 120, increment: 2, repTarget: [8, 12],
  },
  leg_extension: {
    key: "leg_extension", name: "Leg Extension", muscle: "Quads",
    equipment: "machine", restSeconds: 90, increment: 2.5, repTarget: [10, 15],
  },
  rdl: {
    key: "rdl", name: "RDL", muscle: "Hams/Glutes",
    equipment: "barbell", restSeconds: 120, increment: 2.5, repTarget: [8, 12],
  },
  hip_abduction: {
    key: "hip_abduction", name: "Hip Abduction", muscle: "Glutes",
    equipment: "machine", restSeconds: 90, increment: 2.5, repTarget: [12, 20],
  },
  db_lateral_raise: {
    key: "db_lateral_raise", name: "Dumbbell Lateral Raise", muscle: "Side Delts",
    equipment: "dumbbell", restSeconds: 90, increment: 1, repTarget: [12, 20],
  },
  preacher_curl: {
    key: "preacher_curl", name: "Preacher Curl", muscle: "Biceps",
    equipment: "machine", restSeconds: 90, increment: 2.5, repTarget: [8, 12],
  },
  cable_oh_triceps: {
    key: "cable_oh_triceps", name: "Cable Overhead Triceps Extension", muscle: "Triceps",
    equipment: "cable", restSeconds: 90, increment: 2.5, repTarget: [10, 15],
  },
  rear_delt_fly: {
    key: "rear_delt_fly", name: "Rear Delt Fly", muscle: "Rear Delts",
    equipment: "machine", restSeconds: 90, increment: 2.5, repTarget: [12, 20],
  },
  cable_crunch: {
    key: "cable_crunch", name: "Cable Crunch", muscle: "Abs",
    equipment: "cable", restSeconds: 90, increment: 2.5, repTarget: [12, 20],
  },
  roman_chair_leg_lift: {
    key: "roman_chair_leg_lift", name: "Roman Chair Leg Lift", muscle: "Abs",
    equipment: "bodyweight", restSeconds: 90, increment: 0, repTarget: [10, 20],
  },
} satisfies Record<string, Exercise>;

/** Mark a movement as the day's bias (★ in the spec). */
const bias = (ex: Exercise): Exercise => ({ ...ex, bias: true });

// ── The four fixed workouts ─────────────────────────────────────────────────
export const WORKOUTS: Workout[] = [
  {
    key: "monday", name: "Monday", day: "Monday", time: "Evening", bias: "Quad bias",
    exercises: [
      E.machine_press, E.machine_row, bias(E.bulgarian_split_squat), bias(E.leg_extension),
      E.db_lateral_raise, E.preacher_curl, E.cable_oh_triceps, E.hip_abduction,
    ],
  },
  {
    key: "wednesday", name: "Wednesday", day: "Wednesday", time: "Morning (after VO2max run)",
    bias: "Chest/push bias",
    exercises: [
      E.machine_press, E.lat_pulldown, bias(E.machine_shoulder_press), E.db_lateral_raise,
      E.preacher_curl, E.cable_oh_triceps, E.rdl,
    ],
  },
  {
    key: "thursday", name: "Thursday", day: "Thursday", time: "Evening", bias: "Back/bicep bias",
    exercises: [
      E.machine_press, E.machine_row, E.bulgarian_split_squat, E.db_lateral_raise,
      bias(E.preacher_curl), E.rear_delt_fly, E.cable_crunch, E.hip_abduction,
    ],
  },
  {
    key: "saturday", name: "Saturday", day: "Saturday", time: "Afternoon (after parkrun)",
    bias: "Glute/posterior bias",
    exercises: [
      E.machine_press, E.machine_row, bias(E.rdl), E.leg_extension, E.db_lateral_raise,
      E.roman_chair_leg_lift, E.cable_oh_triceps,
    ],
  },
];

/** Every exercise is performed for exactly two working sets. */
export const SETS_PER_EXERCISE = 2;

export function getWorkout(key: string): Workout | undefined {
  return WORKOUTS.find((w) => w.key === key);
}

const ALL_EXERCISES: Record<string, Exercise> = E;
export function getExercise(key: string): Exercise | undefined {
  return ALL_EXERCISES[key];
}

/** Workout whose day matches today, else null (for the "today" highlight). */
export function todaysWorkout(date = new Date()): Workout | null {
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  return WORKOUTS.find((w) => w.day === day) ?? null;
}

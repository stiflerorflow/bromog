// Verbatim "Next Workout" card copy. Fixed, no rotation — the institution repeats
// itself on purpose. Cardio components are shown but never tracked.

export interface CardBlock {
  kind: "text" | "run" | "lift";
  text: string;
}

export interface SlotCard {
  slotId: string;
  dayUpper: string;
  sessionNo: number; // 1..4
  headline: string; // e.g. "Full body · quad bias · 16 sets"
  blocks: CardBlock[];
}

export const CARD_FOOTER = "60 hard sets a week · RIR 1–3 · the week is the unit.";

export const SLOT_CARDS: Record<string, SlotCard> = {
  S1_MON: {
    slotId: "S1_MON",
    dayUpper: "MONDAY",
    sessionNo: 1,
    headline: "Full body · quad bias · 16 sets",
    blocks: [
      { kind: "text", text: "The hardest session lands first, on the freshest legs of the week." },
      { kind: "text", text: "Two rest days behind you; everything ahead." },
      {
        kind: "text",
        text:
          "8 exercises × 2 sets. Quads get the extra exercise today — every other muscle gets its daily touch.",
      },
    ],
  },
  S2_WED: {
    slotId: "S2_WED",
    dayUpper: "WEDNESDAY",
    sessionNo: 2,
    headline: "VO₂max intervals → full body, upper bias · 14 sets",
    blocks: [
      {
        kind: "run",
        text: "First, the run: 10-min warm-up · 3 × (3 min hard / 3 min easy) · 5-min down.",
      },
      {
        kind: "text",
        text:
          "VO₂max is the one metric that decays without input — and one of the strongest predictors of longevity in all of preventive health. This is its weekly dose: ~25 minutes that defends decades. Hard, controlled, glad for the bell.",
      },
      {
        kind: "lift",
        text: "Then the lift: 14 sets, upper-biased — chest, delts and arms while the legs cool down.",
      },
      {
        kind: "text",
        text: "(The run isn't logged. It's still the most important thing you'll do today.)",
      },
    ],
  },
  S3_THU: {
    slotId: "S3_THU",
    dayUpper: "THURSDAY",
    sessionNo: 3,
    headline: "Full body · 16 sets",
    blocks: [
      {
        kind: "text",
        text:
          "The mid-week second touch. Your priority muscles recover fast — hitting them again now keeps every set fresh and the week dense.",
      },
      { kind: "text", text: "Frequency isn't magic; it's how 60 sets stay high-quality." },
    ],
  },
  S4_SAT: {
    slotId: "S4_SAT",
    dayUpper: "SATURDAY",
    sessionNo: 4,
    headline: "Parkrun → full body, glute/posterior bias · 14 sets",
    blocks: [
      { kind: "run", text: "First, parkrun: 5k. Easy is the assignment." },
      {
        kind: "text",
        text:
          "Conversational pace, no racing — Wednesday was the hard one; this is the other half of the pair. Aerobic base, fresh air, other humans.",
      },
      { kind: "text", text: "The benefit is in showing up, not in the time." },
      {
        kind: "lift",
        text: "Then the lift: 14 sets, glute and posterior bias — closes the week at 60.",
      },
    ],
  },
};

export function cardForSlot(slotId: string): SlotCard | undefined {
  return SLOT_CARDS[slotId];
}

// "The Week" — a single static info sheet, linked from any card via a small ⓘ.
export const WEEK_INFO_TITLE = "The Week";
export const WEEK_INFO_LINES = [
  "Four sessions, sixty hard sets, RIR 1–3.",
  "Every muscle most days; a bias is one extra exercise, never a cluster.",
  "One hard run, one easy run — polarized on purpose.",
  "Three rest days that are actually rest.",
  "Volume drives growth. Freshness drives volume quality.",
  "The schedule drives everything, so you never have to.",
];

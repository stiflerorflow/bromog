import {
  CARD_FOOTER,
  WEEK_INFO_LINES,
  WEEK_INFO_TITLE,
  type SlotCard,
} from "../data/cards";

interface Props {
  card: SlotCard;
  windowLabel: string;
  label?: string;
  onInfo: () => void;
}

/** The rich "Next Workout" card — fixed institutional copy, presented well. */
export function NextWorkoutCard({ card, windowLabel, label, onInfo }: Props) {
  return (
    <div className="card next-card">
      <div className="row between">
        <span className="session-badge">Session {card.sessionNo} of 4</span>
        <button className="info-btn" onClick={onInfo} aria-label="The Week">
          ⓘ
        </button>
      </div>

      {label && <div className="next-label">{label}</div>}
      <div className="next-day">{card.dayUpper}</div>
      <div className="muted small next-window">window {windowLabel}</div>
      <div className="next-headline">{card.headline}</div>

      <div className="next-blocks">
        {card.blocks.map((b, i) => (
          <p key={i} className={`card-block ${b.kind}`}>
            {b.kind === "run" && <span className="cb-ico">🏃</span>}
            {b.kind === "lift" && <span className="cb-ico">🏋️</span>}
            <span>{b.text}</span>
          </p>
        ))}
      </div>

      <div className="card-footer">{CARD_FOOTER}</div>
    </div>
  );
}

import type { SlotInfo } from "../data/schedule";

const MARK: Record<string, { sym: string; cls: string }> = {
  LOGGED: { sym: "✓", cls: "wk-done" },
  AMENDED: { sym: "✨", cls: "wk-amend" },
  LAPSED: { sym: "—", cls: "wk-miss" },
  UPCOMING: { sym: "·", cls: "" },
  ACTIVE: { sym: "·", cls: "" },
};

/** End-of-week summary shown once no sessions remain this week (Sat done → Sun). */
export function WeekReviewCard({
  slots,
  justFinished,
  onInfo,
}: {
  slots: SlotInfo[];
  justFinished?: boolean;
  onInfo: () => void;
}) {
  const completed = slots.filter((s) => s.state === "LOGGED" || s.state === "AMENDED").length;
  const setsLogged = slots.reduce((n, s) => n + (s.session?.sets.length ?? 0), 0);
  return (
    <div className="card next-card">
      <div className="row between">
        <span className="session-badge">Week in review</span>
        <button className="info-btn" onClick={onInfo} aria-label="The Week">
          ⓘ
        </button>
      </div>
      {justFinished && <div className="next-label">Week complete ✓</div>}
      <div className="next-day">The Week</div>

      <div className="wk-stats">
        <div className="wk-stat">
          <span className="wk-num">{completed}</span>
          <span className="wk-lbl">/ 4 sessions</span>
        </div>
        <div className="wk-stat">
          <span className="wk-num">{setsLogged}</span>
          <span className="wk-lbl">hard sets</span>
        </div>
      </div>

      <div className="wk-slots">
        {slots.map((s) => {
          const m = MARK[s.state] ?? MARK.UPCOMING;
          return (
            <div key={s.workout.slotId} className="wk-slot">
              <span className="wk-slot-day">{s.workout.day.slice(0, 3)}</span>
              <span className={`wk-slot-mark ${m.cls}`}>{m.sym}</span>
            </div>
          );
        })}
      </div>

      <div className="card-footer">{CARD_FOOTER}</div>
    </div>
  );
}

/** Full-screen "The Week" info sheet, opened from a card's ⓘ. */
export function TheWeekSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="scroll week-sheet">
      <div className="row between">
        <h1>{WEEK_INFO_TITLE}</h1>
        <button className="btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {WEEK_INFO_LINES.map((line, i) => (
        <p key={i} className="week-line">
          {line}
        </p>
      ))}
    </div>
  );
}

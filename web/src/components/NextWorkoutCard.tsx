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

import { useEffect } from "react";
import { USERS, getWorkout } from "../data/program";
import {
  currentUser,
  getDraft,
  getSessions,
  pendingSyncCount,
  reconcileDrafts,
  setUser,
} from "../data/store";
import { apiConfigured } from "../data/api";
import {
  activeSlot,
  clockLabel,
  lapsedAmendable,
  nextUpcoming,
  weekSlots,
  type SlotInfo,
} from "../data/schedule";
import { useStore } from "../components/useStore";
import { useNow } from "../components/useNow";

interface Props {
  onStart: (workoutKey: string) => void;
  onResume: () => void;
  onPetition: () => void;
}

export function Home({ onStart, onResume, onPetition }: Props) {
  const user = useStore(currentUser);
  const draft = useStore(getDraft);
  const sessions = useStore(() => getSessions(user));
  const pending = useStore(pendingSyncCount);
  const now = useNow();

  // Auto-close drafts whose grace period has elapsed (runs on each minute tick).
  useEffect(() => {
    reconcileDrafts(now);
  }, [now]);

  const slots = weekSlots(sessions, now, draft?.workout_key ?? null);
  const active = activeSlot(slots);
  const lapsed = lapsedAmendable(slots);
  const next = nextUpcoming(slots);

  return (
    <div className="scroll">
      <h1>Bromog</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Two sets per exercise · kilograms · sanctioned hours only
      </p>

      <div className="seg" style={{ margin: "14px 0 8px" }}>
        {USERS.map((u) => (
          <button key={u.id} className={u.id === user ? "active" : ""} onClick={() => setUser(u.id)}>
            {u.name}
          </button>
        ))}
      </div>

      {apiConfigured && pending > 0 && (
        <p className="muted small">{pending} session{pending > 1 ? "s" : ""} waiting to sync…</p>
      )}

      {draft ? (
        <div className="banner row between">
          <div>
            <strong>Workout in progress</strong>
            <div className="muted small">{getWorkout(draft.workout_key)?.name}</div>
          </div>
          <button className="btn-primary" onClick={onResume}>
            Resume
          </button>
        </div>
      ) : active ? (
        <div className="card open-now">
          <div className="row between">
            <strong>⚡ {active.workout.day} session is open</strong>
            <span className="chip chip-good">closes {clockLabel(active.window.end)}</span>
          </div>
          <div className="muted small" style={{ margin: "4px 0 12px" }}>
            {active.workout.exercises.length * 2} sets · {active.workout.bias}
          </div>
          <button className="btn-primary btn-block" onClick={() => onStart(active.workout.key)}>
            Enter session
          </button>
        </div>
      ) : (
        <div className="card">
          {next ? (
            <>
              <div className="muted small">Next sanctioned window</div>
              <strong>
                {next.workout.day} {next.workout.time}
              </strong>
              <div className="muted small">
                {next.workout.exercises.length * 2} sets · {next.workout.bias}
              </div>
            </>
          ) : (
            <div className="muted">All sessions of this week stand complete. ⚖️</div>
          )}
          {lapsed && (
            <button className="btn-ghost petition" onClick={onPetition}>
              petition the Tribunal…
            </button>
          )}
        </div>
      )}

      <h2>This week</h2>
      {slots.map((s) => (
        <SlotRow key={s.workout.slotId} slot={s} />
      ))}

      <h2>Recent</h2>
      {sessions.length === 0 && <p className="muted small">No sessions logged yet.</p>}
      {sessions.slice(0, 8).map((s) => (
        <div key={s.id} className="card row between">
          <div>
            <strong>
              {getWorkout(s.workout_key)?.name ?? s.workout_key}
              {s.skippies && <span title="Skippies Amendment Session"> ✨</span>}
            </strong>
            <div className="muted small">
              {new Date(s.started_at).toLocaleString()}
              {s.status === "PARTIAL" && " · partial"}
            </div>
          </div>
          <span className="chip chip-good">{s.sets.length} sets</span>
        </div>
      ))}
    </div>
  );
}

function SlotRow({ slot }: { slot: SlotInfo }) {
  const { workout, state } = slot;
  const chip = {
    UPCOMING: <span className="chip">{workout.time}</span>,
    ACTIVE: <span className="chip chip-good">open now</span>,
    LOGGED: <span className="chip chip-good">✓ done</span>,
    AMENDED: <span className="chip chip-amend">✨ amended</span>,
    LAPSED: <span className="chip chip-lapsed">missed</span>,
  }[state];
  return (
    <div className={`card row between${state === "LOGGED" || state === "AMENDED" ? " exercise-done" : ""}`}>
      <div>
        <strong>{workout.day}</strong>
        <div className="muted small">{workout.bias}</div>
      </div>
      {chip}
    </div>
  );
}

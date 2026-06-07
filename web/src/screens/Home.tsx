import { useEffect, useState } from "react";
import { USERS, getWorkout } from "../data/program";
import {
  currentUser,
  getDraft,
  getSessions,
  pendingSyncCount,
  reconcileDrafts,
  setUser,
} from "../data/store";
import type { UserId } from "../data/types";
import { apiConfigured } from "../data/api";
import {
  activeSlot,
  clockLabel,
  lapsedAmendable,
  nextUpcoming,
  weekId,
  weekSlots,
  type SlotInfo,
} from "../data/schedule";
import { useStore } from "../components/useStore";
import { useNow } from "../components/useNow";
import { NextWorkoutCard, TheWeekSheet, WeekReviewCard } from "../components/NextWorkoutCard";
import { cardForSlot } from "../data/cards";

interface Props {
  onStart: (workoutKey: string) => void;
  onResume: () => void;
  onPetition: () => void;
  justFinished?: boolean;
}

export function Home({ onStart, onResume, onPetition, justFinished }: Props) {
  const user = useStore(currentUser);
  const draft = useStore(getDraft);
  const sessions = useStore(() => getSessions(user));
  const pending = useStore(pendingSyncCount);
  const now = useNow();
  const [switching, setSwitching] = useState(false);
  const [confirmId, setConfirmId] = useState<UserId | null>(null);
  const [showWeek, setShowWeek] = useState(false);
  const userName = USERS.find((u) => u.id === user)?.name ?? user;

  // Auto-close drafts whose grace period has elapsed (runs on each minute tick).
  useEffect(() => {
    reconcileDrafts(now);
  }, [now]);

  // Only treat a draft as "in progress for a slot" if it belongs to the current
  // ISO week — a stale draft from last week shouldn't light a slot up as ACTIVE
  // (it gets auto-closed by reconcileDrafts, but guard the render path too).
  const draftKey =
    draft && weekId(now) === weekId(new Date(draft.started_at)) ? draft.workout_key : null;
  const slots = weekSlots(sessions, now, draftKey);
  const active = activeSlot(slots);
  const lapsed = lapsedAmendable(slots);
  const next = nextUpcoming(slots);
  const nextCard = next ? cardForSlot(next.workout.slotId) : undefined;

  function switchTo(id: UserId) {
    setUser(id);
    setConfirmId(null);
    setSwitching(false);
  }

  // Early returns only AFTER all hooks have run (Rules of Hooks).
  if (showWeek) return <TheWeekSheet onClose={() => setShowWeek(false)} />;

  return (
    <div className="scroll">
      <div className="row between" style={{ marginBottom: 2 }}>
        <span />
        <button className="user-chip" onClick={() => setSwitching((s) => !s)}>
          👤 {userName}
        </button>
      </div>
      <h1 className="brand">BROMOG</h1>

      {switching && (
        <div className="card">
          <div className="muted small" style={{ marginBottom: 8 }}>
            Switching changes whose history you log into. You normally won't need this.
          </div>
          {confirmId ? (
            <div className="row between">
              <span className="small">
                Switch to <strong>{USERS.find((u) => u.id === confirmId)?.name}</strong>?
              </span>
              <span className="row" style={{ gap: 8 }}>
                <button onClick={() => setConfirmId(null)}>Cancel</button>
                <button className="btn-primary" onClick={() => switchTo(confirmId)}>
                  Switch
                </button>
              </span>
            </div>
          ) : (
            <div className="seg">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  className={u.id === user ? "active" : ""}
                  onClick={() => (u.id === user ? setSwitching(false) : setConfirmId(u.id))}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          <button className="btn-go btn-block" onClick={() => onStart(active.workout.key)}>
            Enter session
          </button>
        </div>
      ) : next && nextCard ? (
        <>
          <NextWorkoutCard
            card={nextCard}
            windowLabel={next.workout.time}
            label={justFinished ? "Session logged ✓ · up next" : "Up next"}
            onInfo={() => setShowWeek(true)}
          />
          {lapsed && (
            <button className="btn-ghost petition" onClick={onPetition}>
              petition the Tribunal…
            </button>
          )}
        </>
      ) : (
        <>
          <WeekReviewCard slots={slots} justFinished={justFinished} onInfo={() => setShowWeek(true)} />
          {lapsed && (
            <button className="btn-ghost petition" onClick={onPetition}>
              petition the Tribunal…
            </button>
          )}
        </>
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

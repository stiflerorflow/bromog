import { USERS, WORKOUTS, todaysWorkout, getWorkout } from "../data/program";
import { currentUser, getDraft, getSessions, pendingSyncCount, setUser } from "../data/store";
import { apiConfigured } from "../data/api";
import { useStore } from "../components/useStore";
import type { Workout } from "../data/types";

interface Props {
  onStart: (workoutKey: string) => void;
  onResume: () => void;
}

export function Home({ onStart, onResume }: Props) {
  const user = useStore(currentUser);
  const draft = useStore(getDraft);
  const sessions = useStore(() => getSessions(user));
  const pending = useStore(pendingSyncCount);
  const today = todaysWorkout();

  return (
    <div className="scroll">
      <h1>Bromog</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Two sets per exercise · kilograms · clean logging
      </p>

      <div className="seg" style={{ margin: "14px 0 8px" }}>
        {USERS.map((u) => (
          <button
            key={u.id}
            className={u.id === user ? "active" : ""}
            onClick={() => setUser(u.id)}
          >
            {u.name}
          </button>
        ))}
      </div>

      {apiConfigured && pending > 0 && (
        <p className="muted small">{pending} session{pending > 1 ? "s" : ""} waiting to sync…</p>
      )}

      {draft && (
        <div className="banner row between">
          <div>
            <strong>Workout in progress</strong>
            <div className="muted small">{getWorkout(draft.workout_key)?.name}</div>
          </div>
          <button className="btn-primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      <h2>Start a workout</h2>
      {WORKOUTS.map((w) => (
        <WorkoutCard
          key={w.key}
          workout={w}
          isToday={today?.key === w.key}
          disabled={!!draft && draft.workout_key !== w.key}
          onStart={() => onStart(w.key)}
        />
      ))}

      <h2>Recent</h2>
      {sessions.length === 0 && <p className="muted small">No workouts logged yet.</p>}
      {sessions.slice(0, 8).map((s) => (
        <div key={s.id} className="card row between">
          <div>
            <strong>{getWorkout(s.workout_key)?.name ?? s.workout_key}</strong>
            <div className="muted small">{new Date(s.started_at).toLocaleString()}</div>
          </div>
          <span className="chip chip-good">{s.sets.length} sets</span>
        </div>
      ))}
    </div>
  );
}

function WorkoutCard({
  workout,
  isToday,
  disabled,
  onStart,
}: {
  workout: Workout;
  isToday: boolean;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <div className="card">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          <strong>{workout.day}</strong>
          {isToday && <span className="chip chip-good">Today</span>}
        </div>
        <span className="chip chip-bias">{workout.bias}</span>
      </div>
      <div className="muted small" style={{ margin: "4px 0 12px" }}>
        {workout.time} · {workout.exercises.length} exercises · {workout.exercises.length * 2} sets
      </div>
      <button className="btn-primary btn-block" disabled={disabled} onClick={onStart}>
        {disabled ? "Finish current workout first" : "Start"}
      </button>
    </div>
  );
}

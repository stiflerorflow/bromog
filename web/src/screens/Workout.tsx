import { useMemo, useRef, useState } from "react";
import { getWorkout, SETS_PER_EXERCISE } from "../data/program";
import { suggest } from "../data/overload";
import type { Draft } from "../data/store";
import { commitSession, currentUser, getDraft, getSessions, saveDraft } from "../data/store";
import { uuid } from "../data/uuid";
import { isoWeek } from "../data/stats";
import { RestBar, useRestTimer } from "../components/RestTimer";
import { Stepper } from "../components/Stepper";
import type { Exercise, LoggedSet, Session, UserId } from "../data/types";

interface Props {
  workoutKey: string;
  /** Performed out of window under the Tribunal — branded a Skippies Amendment Session. */
  amendment?: boolean;
  onExit: () => void;
  onFinish: (session: Session) => void;
}

interface SetState {
  weight: number;
  reps: number;
  done: boolean;
  /** When the set was first marked done — preserved across later edits. */
  doneAt?: string;
}

const setKey = (exKey: string, idx: number) => `${exKey}:${idx}`;

export function Workout({ workoutKey, amendment, onExit, onFinish }: Props) {
  const workout = getWorkout(workoutKey)!;
  const user = currentUser();
  const timer = useRestTimer();
  const [hideDone, setHideDone] = useState(false);

  // Suggestions are computed once from the user's history at workout start.
  const history = useMemo(() => getSessions(user), [user]);
  const suggestions = useMemo(
    () => Object.fromEntries(workout.exercises.map((ex) => [ex.key, suggest(ex, history)])),
    [workout, history]
  );

  // Draft identity (id + start time) — computed once per mount, not every render.
  const metaRef = useRef<ReturnType<typeof loadMeta>>();
  const meta = metaRef.current ?? (metaRef.current = loadMeta(workoutKey, user));
  const finishing = useRef(false);
  // Amendment status: set when entering via the Tribunal, preserved across resume
  // by reading it back off an in-progress draft.
  const isAmendment = amendment || meta.draft?.skippies || false;

  const [sets, setSets] = useState<Record<string, SetState>>(() =>
    seed(workout.exercises, suggestions, meta.draft)
  );

  function persist(next: Record<string, SetState>) {
    const draft: Draft = {
      id: meta.id,
      user_id: user,
      workout_key: workoutKey,
      started_at: meta.startedAt,
      skippies: isAmendment,
      sets: {},
      working: next, // full editor state, incl. not-yet-done sets
    };
    for (const [k, v] of Object.entries(next)) {
      if (!v.done) continue;
      const [exercise_key, idx] = k.split(":");
      draft.sets[k] = {
        exercise_key,
        set_index: Number(idx) as 1 | 2,
        weight_kg: v.weight,
        reps: v.reps,
        done_at: v.doneAt ?? new Date().toISOString(),
      };
    }
    saveDraft(draft);
  }

  function update(k: string, patch: Partial<SetState>) {
    setSets((prev) => {
      const next = { ...prev, [k]: { ...prev[k], ...patch } };
      persist(next); // persist prep edits too, not just done sets
      return next;
    });
  }

  function toggleDone(ex: Exercise, idx: number) {
    const k = setKey(ex.key, idx);
    const willBeDone = !sets[k].done;
    setSets((prev) => {
      const next = {
        ...prev,
        [k]: {
          ...prev[k],
          done: willBeDone,
          doneAt: willBeDone ? new Date().toISOString() : undefined,
        },
      };
      persist(next);
      return next;
    });
    if (willBeDone) timer.start(ex.restSeconds);
  }

  const exerciseDone = (ex: Exercise) =>
    [1, 2].every((i) => sets[setKey(ex.key, i)]?.done);

  const completedCount = workout.exercises.filter(exerciseDone).length;
  const loggedSetCount = Object.values(sets).filter((s) => s.done).length;

  // Incomplete exercises float to the top so logging flows in any order.
  const ordered = [...workout.exercises].sort(
    (a, b) => Number(exerciseDone(a)) - Number(exerciseDone(b))
  );

  function finish() {
    if (finishing.current) return; // guard against a double-tap committing twice
    finishing.current = true;
    const loggedSets: LoggedSet[] = workout.exercises.flatMap((ex) =>
      [1, 2]
        .map((i) => ({ ex, i, st: sets[setKey(ex.key, i)] }))
        .filter(({ st }) => st.done)
        .map(({ ex, i, st }) => ({
          exercise_key: ex.key,
          set_index: i as 1 | 2,
          weight_kg: st.weight,
          reps: st.reps,
          done_at: st.doneAt ?? new Date().toISOString(),
        }))
    );
    const session: Session = {
      id: meta.id,
      user_id: user,
      workout_key: workoutKey,
      week_id: isoWeek(new Date(meta.startedAt)),
      slot_id: workout.slotId,
      started_at: meta.startedAt,
      finished_at: new Date().toISOString(),
      status: "LOGGED",
      skippies: isAmendment,
      skippies_confessed_at: isAmendment ? meta.startedAt : null,
      sets: loggedSets,
    };
    commitSession(session);
    onFinish(session);
  }

  return (
    <>
      <div className="scroll" style={{ paddingBottom: timer.active ? 160 : 96 }}>
        <div className="row between">
          <button className="btn-ghost" onClick={onExit}>
            ‹ Back
          </button>
          <button className="btn-ghost" onClick={() => setHideDone((v) => !v)}>
            {hideDone ? "Show done" : "Hide done"}
          </button>
        </div>

        {isAmendment && (
          <div className="amend-banner">
            ⚖️ AMENDMENT SESSION — performed under supervision of the Court ⚖️
          </div>
        )}

        <h1 style={{ marginTop: 4 }}>{workout.day}</h1>
        <div className="muted small">
          {completedCount}/{workout.exercises.length} exercises · {loggedSetCount} sets logged
        </div>

        {ordered.map((ex) => {
          const done = exerciseDone(ex);
          if (hideDone && done) return null;
          const sug = suggestions[ex.key];
          return (
            <div key={ex.key} className={`card${done ? " exercise-done" : ""}`}>
              <div className="row between">
                <div className="row" style={{ gap: 8 }}>
                  <strong>{ex.name}</strong>
                  {ex.bias && <span className="chip chip-bias">bias</span>}
                </div>
                {done && <span className="chip chip-good">done</span>}
              </div>
              <div className="muted small">{ex.muscle}</div>

              <div className="colhead" style={{ marginTop: 12 }}>
                <span>Set</span>
                <span>Weight</span>
                <span>Reps</span>
                <span></span>
              </div>
              {[1, 2].map((idx) => {
                const k = setKey(ex.key, idx);
                const st = sets[k];
                return (
                  <div key={idx} className={`setrow${st.done ? " done" : ""}`}>
                    <span className="label">{idx}</span>
                    <Stepper
                      value={st.weight}
                      step={ex.increment || 1}
                      unit="kg"
                      onChange={(v) => update(k, { weight: v })}
                    />
                    <Stepper
                      value={st.reps}
                      step={1}
                      unit="reps"
                      min={1}
                      onChange={(v) => update(k, { reps: v })}
                    />
                    <button
                      className={st.done ? "btn-go" : ""}
                      aria-label="log set"
                      onClick={() => toggleDone(ex, idx)}
                    >
                      {st.done ? "✓" : "○"}
                    </button>
                  </div>
                );
              })}

              {!done && <div className="note">{sug.note}</div>}
            </div>
          );
        })}

        <button
          className="btn-primary btn-block"
          style={{ marginTop: 8 }}
          disabled={loggedSetCount === 0}
          onClick={finish}
        >
          Finish workout
        </button>
      </div>

      <RestBar timer={timer} />
    </>
  );
}

function loadMeta(workoutKey: string, user: UserId) {
  const existing = getDraft(user);
  if (existing && existing.workout_key === workoutKey && existing.user_id === user) {
    return { id: existing.id, startedAt: existing.started_at, draft: existing };
  }
  return { id: uuid(), startedAt: new Date().toISOString(), draft: null as Draft | null };
}

function seed(
  exercises: Exercise[],
  suggestions: Record<string, ReturnType<typeof suggest>>,
  draft: Draft | null
): Record<string, SetState> {
  const out: Record<string, SetState> = {};
  for (const ex of exercises) {
    const sug = suggestions[ex.key];
    for (let idx = 1; idx <= SETS_PER_EXERCISE; idx++) {
      const k = setKey(ex.key, idx);
      const working = draft?.working?.[k];
      const logged = draft?.sets[k];
      if (working) {
        // Restore exactly — including prep edits on not-yet-done sets.
        out[k] = { weight: working.weight, reps: working.reps, done: working.done, doneAt: working.doneAt };
      } else if (logged) {
        out[k] = { weight: logged.weight_kg, reps: logged.reps, done: true, doneAt: logged.done_at };
      } else {
        const fallback = ex.equipment === "bodyweight" ? 0 : 20;
        out[k] = { weight: sug.weightKg ?? fallback, reps: sug.reps, done: false };
      }
    }
  }
  return out;
}

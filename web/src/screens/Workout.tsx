import { useEffect, useMemo, useRef, useState } from "react";
import { getWorkout, SETS_PER_EXERCISE } from "../data/program";
import { suggest } from "../data/overload";
import type { Draft } from "../data/store";
import { commitSession, currentUser, getDraft, getSessions, saveDraft } from "../data/store";
import { uuid } from "../data/uuid";
import { isoWeek } from "../data/stats";
import { GRACE_MIN, slotWindow } from "../data/schedule";
import { RestBar, useRestTimer } from "../components/RestTimer";
import { Stepper } from "../components/Stepper";
import type { Exercise, LoggedSet, Session, UserId } from "../data/types";

interface Props {
  workoutKey: string;
  /** Performed out of window under the Tribunal — branded a Skippies Amendment Session. */
  amendment?: boolean;
  onExit: () => void;
  onFinish: () => void;
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
  const [celebrateEx, setCelebrateEx] = useState<string | null>(null);
  const [popSet, setPopSet] = useState<string | null>(null);

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

  // Persist as a side effect of state changes (never from inside a setState
  // updater — that double-writes under StrictMode and mutates the store mid-render).
  // `dirty` skips the initial seed so entering a workout doesn't create an empty draft.
  const dirty = useRef(false);
  useEffect(() => {
    if (dirty.current) persist(sets);
  }, [sets]);

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
    dirty.current = true;
    setSets((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  }

  function toggleDone(ex: Exercise, idx: number) {
    const k = setKey(ex.key, idx);
    const willBeDone = !sets[k].done;
    const willCompleteExercise =
      willBeDone && [1, 2].every((i) => i === idx || sets[setKey(ex.key, i)]?.done);
    dirty.current = true;
    setSets((prev) => ({
      ...prev,
      [k]: {
        ...prev[k],
        done: willBeDone,
        doneAt: willBeDone ? new Date().toISOString() : undefined,
      },
    }));
    if (willBeDone) {
      setPopSet(k);
      window.setTimeout(() => setPopSet((cur) => (cur === k ? null : cur)), 420);
      if (willCompleteExercise) {
        setCelebrateEx(ex.key);
        window.setTimeout(() => setCelebrateEx((cur) => (cur === ex.key ? null : cur)), 900);
      }
      timer.start(ex.restSeconds);
    }
  }

  const exerciseDone = (ex: Exercise) =>
    [1, 2].every((i) => sets[setKey(ex.key, i)]?.done);

  const completedCount = workout.exercises.filter(exerciseDone).length;
  const loggedSetCount = Object.values(sets).filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / workout.exercises.length) * 100);

  function setSummary(ex: Exercise): string {
    return [1, 2]
      .map((i) => {
        const st = sets[setKey(ex.key, i)];
        const w = st.weight > 0 ? `${fmtWeight(st.weight)} kg` : "BW";
        return `${w} × ${st.reps}`;
      })
      .join(" · ");
  }

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
    const finishedAt = new Date().toISOString();
    const end = slotWindow(workout, new Date(meta.startedAt)).end;
    const pastGrace = Date.now() > end.getTime() + GRACE_MIN * 60_000;
    const session: Session = {
      id: meta.id,
      user_id: user,
      workout_key: workoutKey,
      week_id: isoWeek(new Date(meta.startedAt)),
      slot_id: workout.slotId,
      started_at: meta.startedAt,
      finished_at: finishedAt,
      status: isAmendment || !pastGrace ? "LOGGED" : "PARTIAL",
      skippies: isAmendment,
      skippies_confessed_at: isAmendment ? meta.startedAt : null,
      sets: loggedSets,
    };
    commitSession(session);
    onFinish();
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
        <div className="workout-progress-wrap">
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="muted small">
              {completedCount}/{workout.exercises.length} exercises
            </span>
            <span className="muted small">{loggedSetCount} sets logged</span>
          </div>
          <div className="workout-progress-track" aria-hidden>
            <div className="workout-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {ordered.map((ex) => {
          const done = exerciseDone(ex);
          if (hideDone && done) return null;
          const sug = suggestions[ex.key];
          const oneSetDone = sets[setKey(ex.key, 1)]?.done || sets[setKey(ex.key, 2)]?.done;
          return (
            <div
              key={ex.key}
              className={[
                "card",
                "exercise-card",
                done ? "exercise-done" : oneSetDone ? "exercise-partial" : "",
                celebrateEx === ex.key ? "exercise-just-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="row between">
                <div className="row" style={{ gap: 8 }}>
                  {done ? (
                    <span className="exercise-check" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="exercise-pending" aria-hidden />
                  )}
                  <strong className={done ? "exercise-name-done" : ""}>{ex.name}</strong>
                  {ex.bias && !done && <span className="chip chip-bias">bias</span>}
                </div>
                {done ? (
                  <span className="chip chip-good exercise-done-chip">Complete</span>
                ) : oneSetDone ? (
                  <span className="chip chip-partial">1 of 2</span>
                ) : null}
              </div>
              <div className="muted small">{ex.muscle}</div>
              {done && <div className="exercise-summary">{setSummary(ex)}</div>}

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
                  <div
                    key={idx}
                    className={[
                      "setrow",
                      st.done ? "done" : "",
                      popSet === k ? "set-just-logged" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
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
                      className={`set-check${st.done ? " set-check-done" : ""}`}
                      aria-label={st.done ? "Unlog set" : "Log set"}
                      onClick={() => toggleDone(ex, idx)}
                    >
                      {st.done ? "✓" : ""}
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

function fmtWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

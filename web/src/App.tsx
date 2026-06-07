import { Suspense, lazy, useState } from "react";
import { Home } from "./screens/Home";
import { Workout } from "./screens/Workout";
import { Coach } from "./screens/Coach";

// Stats pulls in recharts (~the bulk of the bundle) — load it only when opened.
const Stats = lazy(() => import("./screens/Stats").then((m) => ({ default: m.Stats })));
import { Tribunal } from "./screens/Tribunal";
import { Onboarding } from "./screens/Onboarding";
import { Knowledge } from "./screens/Knowledge";
import { getChosenUser, getDraft } from "./data/store";
import { useStore } from "./components/useStore";

type Tab = "home" | "stats" | "coach" | "knowledge";
type View =
  | { kind: "tab"; tab: Tab }
  | { kind: "workout"; workoutKey: string; amendment?: boolean }
  | { kind: "tribunal" };

export function App() {
  const [view, setView] = useState<View>({ kind: "tab", tab: "home" });
  const [finished, setFinished] = useState<null | "normal" | "amendment">(null);
  const chosenUser = useStore(getChosenUser);

  // First launch: pick the user once. Sticky thereafter.
  if (!chosenUser) {
    return (
      <div className="app">
        <Onboarding />
      </div>
    );
  }

  if (view.kind === "workout") {
    return (
      <div className="app">
        <Workout
          workoutKey={view.workoutKey}
          amendment={view.amendment}
          onExit={() => setView({ kind: "tab", tab: "home" })}
          onFinish={() => {
            setFinished(view.amendment ? "amendment" : "normal");
            setView({ kind: "tab", tab: "home" });
          }}
        />
      </div>
    );
  }

  if (view.kind === "tribunal") {
    return (
      <div className="app">
        <Tribunal
          onProceed={(workoutKey) => setView({ kind: "workout", workoutKey, amendment: true })}
          onDismiss={() => setView({ kind: "tab", tab: "home" })}
        />
      </div>
    );
  }

  const tab = view.tab;
  return (
    <div className="app">
      {tab === "home" && (
        <Home
          justFinished={finished !== null}
          onStart={(workoutKey) => setView({ kind: "workout", workoutKey })}
          onResume={() => {
            const draft = getDraft();
            if (draft) setView({ kind: "workout", workoutKey: draft.workout_key });
          }}
          onPetition={() => setView({ kind: "tribunal" })}
        />
      )}
      {tab === "stats" && (
        <Suspense fallback={<div className="scroll"><h1>Stats</h1><p className="muted">Loading…</p></div>}>
          <Stats />
        </Suspense>
      )}
      {tab === "coach" && <Coach />}
      {tab === "knowledge" && <Knowledge />}

      <nav className="nav">
        {(
          [
            ["home", "🏋️", "Workout"],
            ["stats", "📈", "Stats"],
            ["coach", "💬", "Coach"],
            ["knowledge", "📚", "Learn"],
          ] as [Tab, string, string][]
        ).map(([t, icon, label]) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => {
              setFinished(null);
              setView({ kind: "tab", tab: t });
            }}
          >
            <span className="nav-ico">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

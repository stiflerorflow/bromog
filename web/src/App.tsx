import { useState } from "react";
import { Home } from "./screens/Home";
import { Workout } from "./screens/Workout";
import { Stats } from "./screens/Stats";
import { Coach } from "./screens/Coach";

type Tab = "home" | "stats" | "coach";
type View = { kind: "tab"; tab: Tab } | { kind: "workout"; workoutKey: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "tab", tab: "home" });
  const [justFinished, setJustFinished] = useState(false);

  if (view.kind === "workout") {
    return (
      <div className="app">
        <Workout
          workoutKey={view.workoutKey}
          onExit={() => setView({ kind: "tab", tab: "home" })}
          onFinish={() => {
            setJustFinished(true);
            setView({ kind: "tab", tab: "stats" });
          }}
        />
      </div>
    );
  }

  const tab = view.tab;
  return (
    <div className="app">
      {tab === "home" && (
        <Home
          onStart={(workoutKey) => setView({ kind: "workout", workoutKey })}
          onResume={() => {
            const draft = JSON.parse(localStorage.getItem("bromog.draft") || "null");
            if (draft) setView({ kind: "workout", workoutKey: draft.workout_key });
          }}
        />
      )}
      {tab === "stats" && (
        <>
          {justFinished && (
            <div style={{ padding: "calc(16px + var(--safe-top)) 16px 0" }}>
              <div className="banner">Workout saved 💪 Check your PRs below, or ask the Coach.</div>
            </div>
          )}
          <Stats />
        </>
      )}
      {tab === "coach" && <Coach />}

      <nav className="nav">
        {(["home", "stats", "coach"] as Tab[]).map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => {
              setJustFinished(false);
              setView({ kind: "tab", tab: t });
            }}
          >
            {t === "home" ? "Workout" : t === "stats" ? "Stats" : "Coach"}
          </button>
        ))}
      </nav>
    </div>
  );
}

import { useState } from "react";
import { Home } from "./screens/Home";
import { Workout } from "./screens/Workout";
import { Stats } from "./screens/Stats";
import { Coach } from "./screens/Coach";
import { Tribunal } from "./screens/Tribunal";
import { Onboarding } from "./screens/Onboarding";
import { getChosenUser, getDraft } from "./data/store";
import { useStore } from "./components/useStore";

type Tab = "home" | "stats" | "coach";
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
            setView({ kind: "tab", tab: "stats" });
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
          onStart={(workoutKey) => setView({ kind: "workout", workoutKey })}
          onResume={() => {
            const draft = getDraft();
            if (draft) setView({ kind: "workout", workoutKey: draft.workout_key });
          }}
          onPetition={() => setView({ kind: "tribunal" })}
        />
      )}
      {tab === "stats" && (
        <>
          {finished && (
            <div style={{ padding: "calc(16px + var(--safe-top)) 16px 0" }}>
              <div className="banner">
                {finished === "amendment"
                  ? "Order satisfied. The record stands amended. This Court is adjourned. (The export remembers.)"
                  : "Workout saved 💪 Check your PRs below, or ask the Coach."}
              </div>
            </div>
          )}
          <Stats />
        </>
      )}
      {tab === "coach" && <Coach />}

      <nav className="nav">
        {(
          [
            ["home", "🏋️", "Workout"],
            ["stats", "📈", "Stats"],
            ["coach", "💬", "Coach"],
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

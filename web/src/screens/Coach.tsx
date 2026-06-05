import { useState } from "react";
import { apiConfigured, fetchCoachNote } from "../data/api";
import { getExercise, USERS } from "../data/program";
import { knowledgeDigest } from "../data/knowledge";
import { trendSummary } from "../data/stats";
import { currentUser, getSessions } from "../data/store";
import { useStore } from "../components/useStore";

const exerciseName = (k: string) => getExercise(k)?.name ?? k;

export function Coach() {
  const user = useStore(currentUser);
  const sessions = useStore(() => getSessions(user));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate(kind: "session" | "weekly") {
    setLoading(true);
    setError("");
    setNote("");
    try {
      const summary = trendSummary(sessions, exerciseName);
      const userName = USERS.find((u) => u.id === user)?.name ?? "Athlete";
      const text = await fetchCoachNote({
        kind,
        user_name: userName,
        summary,
        principles: knowledgeDigest(),
      });
      setNote(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scroll">
      <h1>Coach</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Optional AI read on your recent training. Progressive overload itself is automatic —
        this is just colour commentary on the trends.
      </p>

      {!apiConfigured && (
        <div className="card muted">Coach needs the backend URL configured in this build.</div>
      )}

      {apiConfigured && (
        <>
          <div className="row" style={{ gap: 10, marginBottom: 12 }}>
            <button
              className="btn-primary grow"
              disabled={loading || sessions.length === 0}
              onClick={() => generate("session")}
            >
              Last session note
            </button>
            <button
              className="grow"
              disabled={loading || sessions.length === 0}
              onClick={() => generate("weekly")}
            >
              Weekly review
            </button>
          </div>

          {sessions.length === 0 && <p className="muted small">Log a workout first.</p>}
          {loading && <div className="card muted">Thinking…</div>}
          {error && <div className="card" style={{ color: "var(--danger)" }}>{error}</div>}
          {note && (
            <div className="card coach-note">{note}</div>
          )}
        </>
      )}
    </div>
  );
}

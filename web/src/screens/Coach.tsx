import { useState } from "react";
import { apiConfigured, fetchCoachNote } from "../data/api";
import { getExercise, USERS } from "../data/program";
import { knowledgeDigest } from "../data/knowledge";
import { trendSummary } from "../data/stats";
import { currentUser, getSessions } from "../data/store";
import { useStore } from "../components/useStore";

const exerciseName = (k: string) => getExercise(k)?.name ?? k;

const PERSONAS: { key: string; name: string; blurb: string; emoji: string }[] = [
  { key: "greger", name: "Dr Michael Greger", blurb: "Plant-based, longevity, giddy about fiber", emoji: "🥦" },
  { key: "norton", name: "Dr Layne Norton", blurb: "No-BS, evidence-based tough love", emoji: "📊" },
  { key: "trixie", name: "Trixie Mattel", blurb: "Camp, deadpan, glamorous nonsense", emoji: "💅" },
  { key: "trisha", name: "Trisha Paytas", blurb: "Chaotic, dramatic, heartfelt hype", emoji: "✨" },
];

export function Coach() {
  const user = useStore(currentUser);
  const sessions = useStore(() => getSessions(user));
  const [note, setNote] = useState("");
  const [from, setFrom] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function generate(
    kind: "session" | "weekly" | "motivation",
    persona?: string,
    fromLabel = ""
  ) {
    setLoading(persona || kind);
    setError("");
    setNote("");
    setFrom("");
    try {
      const summary = trendSummary(sessions, exerciseName);
      const userName = USERS.find((u) => u.id === user)?.name ?? "Athlete";
      const text = await fetchCoachNote({
        kind,
        user_name: userName,
        summary,
        principles: knowledgeDigest(),
        persona,
      });
      setNote(text);
      setFrom(fromLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading("");
    }
  }

  const busy = loading !== "";
  const noSessions = sessions.length === 0;

  return (
    <div className="scroll">
      <h1>Coach</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Optional AI read on your recent training, grounded in your Knowledge base.
      </p>

      {!apiConfigured && (
        <div className="card muted">Coach needs the backend URL configured in this build.</div>
      )}

      {apiConfigured && (
        <>
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <button
              className="btn-primary grow"
              disabled={busy || noSessions}
              onClick={() => generate("session")}
            >
              Last session note
            </button>
            <button className="grow" disabled={busy || noSessions} onClick={() => generate("weekly")}>
              Weekly review
            </button>
          </div>

          <h2>Motivation</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            Same science, four very different deliveries.
          </p>
          <div className="mot-grid">
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                className="mot-btn"
                disabled={busy || noSessions}
                onClick={() => generate("motivation", p.key, p.name)}
              >
                <span className="mot-emoji">{p.emoji}</span>
                <span className="mot-name">{p.name}</span>
                <span className="mot-blurb">{p.blurb}</span>
              </button>
            ))}
          </div>

          {noSessions && <p className="muted small">Log a workout first.</p>}
          {busy && <div className="card muted">Thinking…</div>}
          {error && <div className="card" style={{ color: "var(--danger)" }}>{error}</div>}
          {note && (
            <div className="card coach-note">
              {note}
              {from && <div className="coach-from">— {from}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

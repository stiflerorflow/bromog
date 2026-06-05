import { USERS } from "../data/program";
import { setUser } from "../data/store";

// One-time "who is this phone" pick. After this the identity is sticky — there's
// no switch on the main screen; changing it later takes a deliberate, confirmed tap.
export function Onboarding() {
  return (
    <div className="scroll onboarding">
      <h1 className="brand">BROMOG</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Whose phone is this?
      </p>
      <p className="muted small">
        Pick once. Your logs, history and progression all live under this name — you won't
        need to switch day to day.
      </p>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {USERS.map((u) => (
          <button key={u.id} className="btn-primary btn-block" onClick={() => setUser(u.id)}>
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
}

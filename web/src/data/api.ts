import type { Session, UserId } from "./types";

// Baked in at build time. For the APK these point at the Azure Container Apps URL +
// the shared token. A missing base URL means "offline only" — the app still works,
// it just won't sync or call the coach.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN = import.meta.env.VITE_APP_TOKEN ?? "";

export const apiConfigured = BASE.length > 0;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

export class SyncError extends Error {
  constructor(public status: number) {
    super(`sync failed (${status})`);
  }
}

export async function putSession(session: Session): Promise<void> {
  if (!apiConfigured) throw new Error("API not configured");
  const res = await fetch(`${BASE}/api/sessions/${session.id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new SyncError(res.status);
}

export async function fetchSessions(userId: UserId): Promise<Session[]> {
  if (!apiConfigured) throw new Error("API not configured");
  const res = await fetch(`${BASE}/api/sessions?user=${userId}`, { headers: headers() });
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  return (await res.json()) as Session[];
}

export interface CoachRequest {
  kind: "session" | "weekly" | "motivation";
  user_name: string;
  summary: string;
  /** The training framework digest the coach must ground its advice in. */
  principles?: string;
  /** Personality for the motivation mode (e.g. "greger", "trixie"). */
  persona?: string;
}

export async function fetchCoachNote(req: CoachRequest): Promise<string> {
  if (!apiConfigured) throw new Error("API not configured");
  const res = await fetch(`${BASE}/api/coach`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(req),
  });
  if (res.status === 503) throw new Error("Coach isn't enabled on the server.");
  if (!res.ok) throw new Error(`coach failed (${res.status})`);
  return ((await res.json()) as { note: string }).note;
}

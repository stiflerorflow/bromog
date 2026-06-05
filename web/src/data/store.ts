import { apiConfigured, fetchSessions, putSession } from "./api";
import type { LoggedSet, Session, UserId } from "./types";
import { USERS } from "./program";

// Local-first store. Everything lives in localStorage so the app is instant and
// works with zero signal. Finished sessions are pushed to the backend through a
// retry queue when online; the backend upsert is idempotent (keyed by session id).

const K = {
  user: "bromog.user",
  sessions: (u: UserId) => `bromog.sessions.${u}`,
  draft: "bromog.draft",
  queue: "bromog.syncqueue",
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Current user ──────────────────────────────────────────────────────────────
export function currentUser(): UserId {
  const stored = localStorage.getItem(K.user) as UserId | null;
  return stored && USERS.some((u) => u.id === stored) ? stored : USERS[0].id;
}
export function setUser(id: UserId) {
  localStorage.setItem(K.user, id);
  notify();
  void syncDown(id);
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export function getSessions(userId: UserId = currentUser()): Session[] {
  return read<Session[]>(K.sessions(userId), []);
}

function saveSessions(userId: UserId, sessions: Session[]) {
  write(K.sessions(userId), sessions);
}

/** Persist a finished session locally and enqueue it for backup sync. */
export function commitSession(session: Session) {
  const sessions = getSessions(session.user_id);
  const existing = sessions.findIndex((s) => s.id === session.id);
  if (existing >= 0) sessions[existing] = session;
  else sessions.unshift(session);
  saveSessions(session.user_id, sessions);
  enqueue(session);
  clearDraft();
  notify();
  void flushQueue();
}

// ── Draft (in-progress workout) ───────────────────────────────────────────────
export interface Draft {
  id: string;
  user_id: UserId;
  workout_key: string;
  started_at: string;
  sets: Record<string, LoggedSet>; // key: `${exercise_key}:${set_index}`
}

export function getDraft(): Draft | null {
  return read<Draft | null>(K.draft, null);
}
export function saveDraft(draft: Draft) {
  write(K.draft, draft);
  notify();
}
export function clearDraft() {
  localStorage.removeItem(K.draft);
  notify();
}

// ── Sync queue (offline-tolerant backup) ──────────────────────────────────────
function enqueue(session: Session) {
  const queue = read<Session[]>(K.queue, []).filter((s) => s.id !== session.id);
  queue.push(session);
  write(K.queue, queue);
}

export function pendingSyncCount(): number {
  return read<Session[]>(K.queue, []).length;
}

let flushing = false;
export async function flushQueue(): Promise<void> {
  if (flushing || !apiConfigured) return;
  flushing = true;
  try {
    let queue = read<Session[]>(K.queue, []);
    for (const session of [...queue]) {
      try {
        await putSession(session);
        queue = queue.filter((s) => s.id !== session.id);
        write(K.queue, queue);
        notify();
      } catch {
        break; // offline / server down — try again later
      }
    }
  } finally {
    flushing = false;
  }
}

/** Restore history from the backend (e.g. after a reinstall), merging by id. */
export async function syncDown(userId: UserId = currentUser()): Promise<void> {
  if (!apiConfigured) return;
  try {
    const remote = await fetchSessions(userId);
    const local = getSessions(userId);
    const byId = new Map<string, Session>();
    for (const s of [...remote, ...local]) byId.set(s.id, s); // local wins on conflict
    saveSessions(userId, [...byId.values()].sort((a, b) => (a.started_at < b.started_at ? 1 : -1)));
    notify();
  } catch {
    // offline — keep local data
  }
}

/** Call once on app start: push anything pending and pull remote history. */
export function bootSync() {
  void flushQueue();
  void syncDown();
}

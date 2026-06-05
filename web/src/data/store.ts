import { apiConfigured, fetchSessions, putSession } from "./api";
import type { LoggedSet, Session, UserId } from "./types";
import { USERS, getWorkout } from "./program";
import { GRACE_MIN, slotWindow } from "./schedule";
import { isoWeek } from "./stats";

// Local-first store. Everything lives in localStorage so the app is instant and
// works with zero signal. Finished sessions are pushed to the backend through a
// retry queue when online; the backend upsert is idempotent (keyed by session id).

const K = {
  user: "bromog.user",
  sessions: (u: UserId) => `bromog.sessions.${u}`,
  draft: (u: UserId) => `bromog.draft.${u}`,
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

// Cache parsed values keyed by their raw string so repeated reads return a
// referentially-stable result. This is required by useSyncExternalStore: a fresh
// object on every read would be seen as a change each render and loop forever.
const _readCache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = _readCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  _readCache.set(key, { raw, value });
  return value;
}
function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  localStorage.setItem(key, raw);
  // Keep the cache in sync so the next read returns this exact reference.
  _readCache.set(key, { raw, value });
}

// ── Current user ──────────────────────────────────────────────────────────────
export function currentUser(): UserId {
  return getChosenUser() ?? USERS[0].id;
}
/** The explicitly-chosen user, or null if onboarding hasn't happened yet. */
export function getChosenUser(): UserId | null {
  const stored = localStorage.getItem(K.user) as UserId | null;
  return stored && USERS.some((u) => u.id === stored) ? stored : null;
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
  clearDraft(session.user_id);
  notify();
  void flushQueue();
}

// ── Draft (in-progress workout) ───────────────────────────────────────────────
export interface Draft {
  id: string;
  user_id: UserId;
  workout_key: string;
  started_at: string;
  /** True when this draft is a Skippies Amendment Session (started via the Tribunal). */
  skippies: boolean;
  sets: Record<string, LoggedSet>; // key: `${exercise_key}:${set_index}`
}

export function getDraft(userId: UserId = currentUser()): Draft | null {
  return read<Draft | null>(K.draft(userId), null);
}
export function saveDraft(draft: Draft) {
  write(K.draft(draft.user_id), draft);
  notify();
}
export function clearDraft(userId: UserId = currentUser()) {
  localStorage.removeItem(K.draft(userId));
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

/**
 * Auto-close a stale in-progress draft. A session started in-window may finish up
 * to GRACE_MIN after window_end; past that it's committed as PARTIAL (or discarded
 * if nothing was logged — absence is the record).
 */
export function reconcileDrafts(now = new Date()): void {
  const draft = getDraft();
  if (!draft) return;
  const workout = getWorkout(draft.workout_key);
  if (!workout) return;
  const end = slotWindow(workout, new Date(draft.started_at)).end;
  if (now.getTime() <= end.getTime() + GRACE_MIN * 60_000) return;

  const sets = Object.values(draft.sets);
  if (sets.length === 0) {
    clearDraft();
    return;
  }
  commitSession({
    id: draft.id,
    user_id: draft.user_id,
    workout_key: draft.workout_key,
    week_id: isoWeek(new Date(draft.started_at)),
    slot_id: workout.slotId,
    started_at: draft.started_at,
    finished_at: now.toISOString(),
    status: "PARTIAL",
    skippies: draft.skippies,
    skippies_confessed_at: draft.skippies ? draft.started_at : null,
    sets,
  });
}

/** Call once on app start: close stale drafts, push pending, pull remote history. */
export function bootSync() {
  reconcileDrafts();
  void flushQueue();
  void syncDown();
}

import { SyncError, apiConfigured, fetchSessions, putSession } from "./api";
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
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Quota exceeded or private mode — keep in-memory cache but don't crash mid-commit.
    _readCache.set(key, { raw, value });
    return;
  }
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
  sets: Record<string, LoggedSet>; // done sets — these become the session
  /** Full editor state (incl. not-yet-done sets) so prep edits survive a reopen. */
  working?: Record<string, { weight: number; reps: number; done: boolean; doneAt?: string }>;
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
let flushAgain = false;

export async function flushQueue(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  if (!apiConfigured) return;
  flushing = true;
  try {
    // Snapshot decides WHAT to send; the persisted queue is always re-read fresh
    // before each write so a session enqueued mid-flush isn't clobbered.
    for (const session of read<Session[]>(K.queue, [])) {
      try {
        await putSession(session);
      } catch (e) {
        // A 4xx the server will never accept is a poison item — drop it so it
        // can't head-of-line-block the rest of the queue forever. Everything else
        // (auth, rate-limit, 5xx, offline) is transient: stop and retry later.
        const status = e instanceof SyncError ? e.status : 0;
        if (![400, 413, 422].includes(status)) break;
      }
      const remaining = read<Session[]>(K.queue, []).filter((s) => s.id !== session.id);
      write(K.queue, remaining);
      notify();
    }
  } finally {
    flushing = false;
    if (flushAgain) {
      flushAgain = false;
      void flushQueue();
    }
  }
}

/** Restore history from the backend (e.g. after a reinstall), merging by id. */
export async function syncDown(userId: UserId = currentUser()): Promise<void> {
  if (!apiConfigured) return;
  try {
    const remote = (await fetchSessions(userId)).map(normalizeSession);
    const local = getSessions(userId);
    const byId = new Map<string, Session>();
    for (const s of remote) byId.set(s.id, s);
    for (const s of local) {
      const other = byId.get(s.id);
      byId.set(s.id, other ? mergeSession(s, other) : s); // local first → wins ties
    }
    saveSessions(userId, [...byId.values()].sort((a, b) => (a.started_at < b.started_at ? 1 : -1)));
    notify();
  } catch {
    // offline — keep local data
  }
}

/** Backfill the Tribunal-era fields on any session that predates them. */
function normalizeSession(s: Session): Session {
  if (s.week_id && s.slot_id && s.status) return s;
  return {
    ...s,
    week_id: s.week_id || isoWeek(new Date(s.started_at)),
    slot_id: s.slot_id || getWorkout(s.workout_key)?.slotId || "",
    status: s.status || "LOGGED",
    skippies: s.skippies ?? false,
    skippies_confessed_at: s.skippies_confessed_at ?? null,
  };
}

/** On id conflict, keep the more-complete record (LOGGED over PARTIAL; else later finish). */
function mergeSession(local: Session, remote: Session): Session {
  const rank = (s: Session) => (s.status === "LOGGED" ? 2 : s.finished_at ? 1 : 0);
  if (rank(local) !== rank(remote)) return rank(local) > rank(remote) ? local : remote;
  return (local.finished_at ?? "") >= (remote.finished_at ?? "") ? local : remote;
}

/**
 * Auto-close a stale in-progress draft. A session started in-window may finish up
 * to GRACE_MIN after window_end; past that it's committed as PARTIAL (or discarded
 * if nothing was logged — absence is the record). Runs for every roster user so a
 * non-active user's stale draft can't linger and resurrect as ACTIVE on switch.
 */
export function reconcileDrafts(now = new Date()): void {
  for (const u of USERS) reconcileUserDraft(u.id, now);
}

function reconcileUserDraft(userId: UserId, now: Date): void {
  const draft = getDraft(userId);
  if (!draft) return;
  const workout = getWorkout(draft.workout_key);
  if (!workout) {
    clearDraft(userId);
    return;
  }
  const end = slotWindow(workout, new Date(draft.started_at)).end;
  if (now.getTime() <= end.getTime() + GRACE_MIN * 60_000) return;

  const sets = Object.values(draft.sets);
  if (sets.length === 0) {
    clearDraft(userId);
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

/**
 * One-time migration of pre-existing on-device data to the current shape. Runs
 * before anything reads sessions/drafts so an in-place app update doesn't lose a
 * draft or mis-read this week's already-logged slots. Idempotent.
 */
export function migrateLegacyData(): void {
  // 1. Drafts used to live under a single global key; move to the per-user key.
  try {
    const legacy = localStorage.getItem("bromog.draft");
    if (legacy) {
      const d = JSON.parse(legacy) as Draft;
      if (d?.user_id) localStorage.setItem(K.draft(d.user_id), legacy);
      localStorage.removeItem("bromog.draft");
    }
  } catch {
    localStorage.removeItem("bromog.draft");
  }

  // 2. Backfill session fields added with the Tribunal (week_id/slot_id/status/
  //    skippies). Without these, the schedule can't tell a session was logged this
  //    week and would show it as upcoming/lapsed.
  for (const u of USERS) {
    const sessions = getSessions(u.id);
    // Normalise, and drop any invalid 0-set session (a finished session always has
    // at least one set; 0-set rows are junk, e.g. old test data).
    const cleaned = sessions.map(normalizeSession).filter((s) => s.sets.length > 0);
    if (cleaned.length !== sessions.length || cleaned.some((s, i) => s !== sessions[i])) {
      saveSessions(u.id, cleaned);
    }
  }

  // 3. Normalise anything still sitting in the offline sync queue, so a legacy
  //    queued item doesn't reach the server (or get restored) without metadata.
  const queue = read<Session[]>(K.queue, []);
  const normQueue = queue.map(normalizeSession).filter((s) => s.sets.length > 0);
  if (normQueue.length !== queue.length || normQueue.some((s, i) => s !== queue[i])) {
    write(K.queue, normQueue);
  }
}

/** Call once on app start: migrate, close stale drafts, push pending, pull history. */
export function bootSync() {
  migrateLegacyData();
  reconcileDrafts();
  void flushQueue();
  void syncDown();
}

/** Wire browser events that should re-trigger sync/reconcile. Call once at startup. */
export function initSyncListeners(onReconcile: () => void): () => void {
  const onOnline = () => void flushQueue();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || !e.key.startsWith("bromog.")) return;
    _readCache.delete(e.key);
    notify();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      onReconcile();
      void flushQueue();
    }
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

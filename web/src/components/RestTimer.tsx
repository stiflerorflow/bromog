import { useCallback, useEffect, useRef, useState } from "react";

interface TimerState {
  secondsLeft: number;
  total: number;
  active: boolean;
  start: (seconds: number) => void;
  add: (delta: number) => void;
  stop: () => void;
}

/**
 * Rest countdown. Buzzes (Vibration API) and beeps (Web Audio) at zero — both
 * work inside the Android WebView with no native plugin. Tracks an absolute end
 * time so it stays accurate even if the timer tab is throttled.
 */
export function useRestTimer(): TimerState {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(false);
  const endRef = useRef<number>(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        alarm();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback((seconds: number) => {
    // start() runs inside the set-done tap (a user gesture), so this is where we
    // unlock/resume the shared AudioContext — Android blocks audio created later
    // in a bare timer callback.
    unlockAudio();
    endRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
    setSecondsLeft(seconds);
    setTotal(seconds);
    setActive(true);
  }, []);

  const add = useCallback((delta: number) => {
    endRef.current = Math.max(Date.now(), endRef.current + delta * 1000);
    firedRef.current = false;
    const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
    setSecondsLeft(left);
    // Grow the track when extending past the original rest so the bar never overflows.
    setTotal((t) => Math.max(t, left));
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setSecondsLeft(0);
  }, []);

  return { secondsLeft, total, active, start, add, stop };
}

export function RestBar({ timer }: { timer: TimerState }) {
  if (!timer.active) return null;
  const zero = timer.secondsLeft <= 0;
  const pct = timer.total > 0 ? Math.max(0, Math.min(100, (timer.secondsLeft / timer.total) * 100)) : 0;
  return (
    <div className={`rest${zero ? " zero" : ""}`}>
      <div
        className="rest-progress"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="time">{format(timer.secondsLeft)}</div>
      <div className="grow muted small">{zero ? "Rest done — next set" : "Resting"}</div>
      <button onClick={() => timer.add(-15)}>−15</button>
      <button onClick={() => timer.add(15)}>+15</button>
      <button className="btn-primary" onClick={timer.stop}>
        {zero ? "Done" : "Skip"}
      </button>
    </div>
  );
}

function format(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// One shared AudioContext, unlocked on a user gesture (set-done tap) and reused
// for every beep — creating one inside the timer callback is blocked on Android.
let audioCtx: AudioContext | null = null;

function unlockAudio() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* audio not available */
  }
}

function alarm() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignore */
  }
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* audio not available */
  }
}

import { useEffect, useState } from "react";

// Dev/testing override: append ?now=2026-06-01T18:30 to freeze the clock so you can
// exercise ACTIVE / LAPSED / Tribunal states without waiting for a real window.
function parseOverride(): Date | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("now");
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Current time, refreshed on an interval so window state opens/lapses live. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => parseOverride() ?? new Date());
  useEffect(() => {
    if (parseOverride()) return; // frozen for testing
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

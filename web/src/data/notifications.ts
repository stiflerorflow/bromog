import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { WORKOUTS } from "./program";

// One notification at each session's window_start, plus a gentle rest-day nudge on
// the three off days (with a Knowledge-base idea inline). No lapse/streak spam.
// No-op on the web; only fires inside the installed APK.

// Capacitor LocalNotifications weekday: 1=Sunday … 7=Saturday.
// JS Date.getDay(): 0=Sunday … 6=Saturday. So capWeekday = jsDay + 1.
const capWeekday = (jsDay: number): number => jsDay + 1;

// Rest days (Tue / Fri / Sun): rest + active-recovery steps, each anchored to a
// Knowledge-base headline so the framing stays on-message.
const REST_HOUR = 11;
const REST_NOTES = [
  {
    jsDay: 2, // Tuesday
    body:
      "Rest up and get some steps in for active recovery. Yesterday's work is still " +
      "paying off — a trained muscle stays primed to grow for 24–72 hours.",
  },
  {
    jsDay: 5, // Friday
    body:
      "Recovery day — a decent walk counts. Progress is slow by design; freshness is " +
      "what keeps every hard set high-quality.",
  },
  {
    jsDay: 0, // Sunday
    body:
      "Proper rest today, plus an easy walk if you fancy it. Three rest days that are " +
      "actually rest are part of the plan — the schedule drives everything so you don't have to.",
  },
];

export async function scheduleWindowNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    // Clear previously-scheduled ones so relaunches don't stack duplicates.
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const workoutNotes = WORKOUTS.map((w, i) => ({
      id: 1000 + i,
      title: `${w.day} session`,
      body: `Sanctioned window open — ${w.exercises.length * 2} sets`,
      schedule: {
        on: { weekday: capWeekday(w.window.weekday), hour: w.window.startHour, minute: 0 },
        allowWhileIdle: true,
      },
    }));

    const restNotes = REST_NOTES.map((r, i) => ({
      id: 2000 + i,
      title: "Rest day",
      body: r.body,
      schedule: {
        on: { weekday: capWeekday(r.jsDay), hour: REST_HOUR, minute: 0 },
        allowWhileIdle: true,
      },
    }));

    await LocalNotifications.schedule({ notifications: [...workoutNotes, ...restNotes] });
  } catch {
    // Notifications are best-effort; never block app start.
  }
}

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { WORKOUTS } from "./program";

// One local notification at each session's window_start ("Monday session"), and
// nothing else — no lapse summons, no streaks (spec §9: the Tribunal waits in
// silence). No-op on the web; only fires inside the installed APK.

// Capacitor LocalNotifications weekday: 1=Sunday … 7=Saturday.
// JS Date.getDay(): 0=Sunday … 6=Saturday. So capWeekday = jsDay + 1.
const capWeekday = (jsDay: number): number => jsDay + 1;

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

    await LocalNotifications.schedule({
      notifications: WORKOUTS.map((w, i) => ({
        id: 1000 + i,
        title: `${w.day} session`,
        body: `Sanctioned window open — ${w.exercises.length * 2} sets`,
        schedule: {
          on: { weekday: capWeekday(w.window.weekday), hour: w.window.startHour, minute: 0 },
          allowWhileIdle: true,
        },
      })),
    });
  } catch {
    // Notifications are best-effort; never block app start.
  }
}

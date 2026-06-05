import type { CapacitorConfig } from "@capacitor/cli";

// The web UI is bundled into the APK (webDir = dist) so it loads from the phone
// and works fully offline. Only history-sync and the coach call out to the API.
const config: CapacitorConfig = {
  appId: "com.bromog.app",
  appName: "Bromog",
  webDir: "dist",
  android: {
    // Allow http during local testing; production API is https on Container Apps.
    allowMixedContent: true,
  },
};

export default config;

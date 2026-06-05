import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the bundle works when loaded from inside the APK (file://).
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: true, port: 5173 },
});

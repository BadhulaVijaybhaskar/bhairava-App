import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Bhairava native shell (iOS + Android).
 *
 * Bhairava is a server-rendered TanStack Start app, so the native app loads the
 * deployed web app inside the native shell. Update `server.url` to the published
 * URL before producing a store build.
 */
const config: CapacitorConfig = {
  appId: "in.astranova.bhairava",
  appName: "Bhairava",
  webDir: "dist/client",
  server: {
    url: "https://id-preview--2261a9f8-c04c-462c-8244-abed8c72a1ac.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#0b1b3a",
  },
};

export default config;

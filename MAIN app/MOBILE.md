# Bhairava mobile

Bhairava ships in three forms from one codebase.

## 1. Web app

The responsive web app works on phone, tablet and desktop:

- phone: bottom tab bar (Home, Plots, Customers, Bookings, Collections) + slide-in drawer for the full menu
- tablet: same drawer with wider two-column panels
- desktop (`lg` and up): permanent sidebar

Tables collapse into stacked record cards below `md`, and the plot map/editor stack the canvas above their control panels.

## 2. Installable app (PWA)

`public/manifest.webmanifest` plus icons and Apple meta tags make Bhairava installable:

- iOS Safari: Share → Add to Home Screen
- Android Chrome: menu → Install app

It launches standalone (no browser chrome) with safe-area padding for notches and home indicators. No offline caching is enabled — the app always loads fresh data.

## 3. Native iOS + Android (Capacitor)

`capacitor.config.ts` is configured. Store builds need a local machine with Xcode / Android Studio:

```bash
npm install
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios      # or: npx cap open android
```

Before a store build, set `server.url` in `capacitor.config.ts` to the published Bhairava URL. The native shell renders the live server-rendered app, so web updates ship without resubmitting to the stores.

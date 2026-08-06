// src/types/app-badging.d.ts
//
// Ambient types for the Badging API (navigator.setAppBadge / clearAppBadge).
// Not yet part of TypeScript's built-in lib.dom.d.ts. Chrome/Edge desktop
// and Android support it once the app is installed as a PWA; Safari and
// Firefox don't implement it. Declared optional so every call site can use
// `navigator.setAppBadge?.(n)` rather than an `'setAppBadge' in navigator`
// check — see NotificationsContext.tsx.
// Spec: https://w3c.github.io/badging/

interface Navigator {
  setAppBadge?(contents?: number): Promise<void>;
  clearAppBadge?(): Promise<void>;
}
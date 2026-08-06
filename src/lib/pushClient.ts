// src/lib/pushClient.ts
//
// Browser-side half of Web Push: turns the "Push notifications" toggle in
// Profile → Settings into an actual PushManager subscription. Separate
// file from src/lib/push.ts on purpose — that one runs server-side only
// (it needs the VAPID *private* key, which must never reach the client);
// this one runs browser-side only (Notification/PushManager don't exist
// in a Next.js server context) and only ever touches the *public* key.
//
// Assumes the service worker is already registered — see the
// navigator.serviceWorker.register('/sw.js', ...) call in src/app/layout.tsx.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// PushManager.subscribe() wants the VAPID public key as a Uint8Array, not
// the base64url string `npx web-push generate-vapid-keys` prints out.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Requests notification permission, subscribes via the already-registered
 * service worker, and POSTs the subscription to the server. Returns false
 * (never throws) on any failure — permission denied, unsupported browser,
 * missing env var, network error — so the caller can just leave the
 * toggle switched off rather than needing its own try/catch.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — cannot subscribe to push.');
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok;
  } catch (err) {
    console.error('Push subscribe failed:', err);
    return false;
  }
}

/**
 * Unsubscribes the browser and tells the server to drop its row.
 * Best-effort — a failed server call here just means sendHealthAlertPush()
 * cleans that row up itself the next time it hits a 404/410.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => { /* best-effort — see comment above */ });
    await subscription.unsubscribe();
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

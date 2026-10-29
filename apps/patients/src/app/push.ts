/*
 * New booking request notifications on this browser (backend L16, D-054). The service worker side
 * is `public/push-sw.js`. iPhones need the installed app (iOS 16.4+): Safari tabs have no PushManager.
 */
import { useCallback, useEffect, useState } from 'react';
import { isIos, isStandalone } from '@atp/core';
import { api } from '@/api';

export type PushState = 'loading' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';

const SUBSCRIBE_TIMEOUT_MS = 20_000;

const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** VAPID keys are base64url; PushManager wants bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function save(sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('The browser gave no push keys.');
  await api.savePushSubscription({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
}

/** Stops notifications on this browser; runs before sign-out so a shared phone goes quiet. */
export async function dropPushSubscription(): Promise<void> {
  if (!supported()) return;
  const sub = await currentSubscription();
  if (!sub) return;
  await api.deletePushSubscription(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}

export function usePush() {
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    let live = true;
    const set = (s: PushState) => live && setState(s);
    (async () => {
      if (!supported()) return set(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');
      if (Notification.permission === 'denied') return set('blocked');
      const sub = await currentSubscription();
      // Re-save: the signed-in member takes over this browser's endpoint (D-054).
      if (sub) await save(sub).catch(() => undefined);
      set(sub ? 'on' : 'off');
    })().catch(() => set('unsupported'));
    return () => {
      live = false;
    };
  }, []);

  /** Must run from a tap: browsers only show the permission prompt for a user gesture. */
  const enable = useCallback(async () => {
    const key = await api.getPushKey();
    if (!key) throw new Error('Notifications are not switched on for the clinic yet.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'blocked' : 'off');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    // A subscription made with an older key can't be reused.
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    // The browser's push service can fail to answer (e.g. blocked networks): don't spin forever.
    const sub = await Promise.race([
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("The phone's push service didn't answer. Try again later.")),
          SUBSCRIBE_TIMEOUT_MS,
        ),
      ),
    ]);
    await save(sub);
    setState('on');
  }, []);

  const disable = useCallback(async () => {
    await dropPushSubscription();
    setState('off');
  }, []);

  return { state, enable, disable };
}

/** The number on the app icon follows the open requests (Badging API, where supported). */
export function setAppBadge(count: number) {
  if (!('setAppBadge' in navigator)) return;
  (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => undefined);
}

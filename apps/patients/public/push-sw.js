/*
 * New booking request notifications (D-054). Loaded by the generated service worker through
 * workbox `importScripts` (vite.config.ts). Payload: { title, body, url, badge }.
 */
self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : '' };
  }
  const shown = self.registration.showNotification(d.title || 'ATP Patients', {
    body: d.body || '',
    icon: '/pwa-192x192.png',
    badge: '/badge-96.png',
    tag: 'inquiry',
    renotify: true,
    data: { url: d.url || '/' },
  });
  const nav = self.navigator;
  const badge =
    typeof d.badge === 'number' && nav && 'setAppBadge' in nav
      ? (d.badge > 0 ? nav.setAppBadge(d.badge) : nav.clearAppBadge()).catch(() => undefined)
      : Promise.resolve();
  event.waitUntil(Promise.all([shown, badge]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const win = open.find((c) => new URL(c.url).origin === self.location.origin);
      if (!win) return self.clients.openWindow(url);
      await win.focus();
      if ('navigate' in win) await win.navigate(url).catch(() => undefined);
    })(),
  );
});

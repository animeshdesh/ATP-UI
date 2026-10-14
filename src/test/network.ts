/** Toggle `navigator.onLine` and fire the matching window event, as a browser would. */
export function setOnline(online: boolean, fireEvent = false) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });
  if (fireEvent) window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

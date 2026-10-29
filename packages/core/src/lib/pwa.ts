/* Install state of the PWA. iOS never prompts to install, and only installed apps get push there. */

type IosNavigator = Navigator & { standalone?: boolean };

/** Opened from the home screen (or as an installed app on desktop/Android). */
export function isStandalone(): boolean {
  if ((navigator as IosNavigator).standalone === true) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** iPhone or iPad; iPadOS reports itself as a Mac with touch. */
export function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Safari itself: other iOS browsers have their own (or no) "Add to Home Screen". */
export const isIosSafari = () =>
  isIos() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);

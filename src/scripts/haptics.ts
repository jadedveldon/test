/**
 * Small vibrations at key moments, on phones that support them (most Android
 * phones; iPhones do not let websites vibrate). Browsers only allow it after
 * the visitor has touched the page, so the very first intro stays silent.
 */
let enabled = true;

export const PATTERNS = {
  eyeOpens: [14, 60, 22],
  pageChange: [8],
  diya: [18, 70, 28, 70, 40],
  cardFlip: [12, 40, 12],
  choice: [6],
  soundOn: [10],
} as const;

export function setHaptics(on: boolean) {
  enabled = on;
}

export function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function buzz(pattern: readonly number[]) {
  if (!enabled || !canVibrate()) return;
  // browsers refuse (and complain) until the visitor has touched the page once
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua && !ua.hasBeenActive) return;
  try {
    navigator.vibrate(pattern as number[]);
  } catch {
    /* some viewers block it; nothing else depends on it */
  }
}

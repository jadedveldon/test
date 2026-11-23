import * as SunCalcNs from 'suncalc';
import type { SkyMode } from './experiments';
import type { SkyInput } from './world/World';
// suncalc is an older CommonJS package: take whichever shape the bundler hands us
const SunCalc = ((SunCalcNs as unknown as { default?: typeof SunCalcNs }).default ?? SunCalcNs) as unknown as { getMoonIllumination(d: Date): { phase: number; fraction: number } };

/**
 * The living sky. The site's darkness follows the visitor's own clock, and the
 * moon drawn in the world is tonight's real moon. Two nights matter most for
 * Kali: Amavasya (new moon), when the world goes deeper and redder, and
 * Purnima (full moon), when it turns silver.
 *
 * The lunar day (tithi) here comes from the moon's phase, which is close to
 * the panchang but can differ by a few hours near the change. The real site
 * can use a proper panchang source if the institute wants exact timings.
 */

const TITHI = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

export type SkyReading = SkyInput & {
  tithi: number;
  paksha: 'Shukla' | 'Krishna';
  name: string;
  lit: number;
  /** a sentence for the header card */
  note: string;
};

function hourMoods(h: number) {
  // night: fully on 21:00–04:00, easing in and out across dusk and dawn
  const night = h >= 21 || h < 4 ? 1 : h >= 18 ? (h - 18) / 3 : h < 7 ? 1 - (h - 4) / 3 : 0;
  // warm: the golden hours around sunrise and sunset
  const warm = Math.max(0, 1 - Math.abs(h - 6.5) / 1.8) + Math.max(0, 1 - Math.abs(h - 18.5) / 1.8);
  return { night: Math.max(0, Math.min(1, night)), warm: Math.min(1, warm) };
}

export function readSky(mode: SkyMode, now = new Date()): SkyReading {
  const ill = SunCalc.getMoonIllumination(now);
  let phase = ill.phase;
  const h = now.getHours() + now.getMinutes() / 60;
  let { night, warm } = hourMoods(h);
  if (mode === 'amavasya') phase = 0.985;
  if (mode === 'purnima') phase = 0.49;
  if (mode === 'night' || mode === 'amavasya' || mode === 'purnima') { night = 1; warm = 0; }
  if (mode === 'day') { night = 0; warm = 0; }

  const idx = Math.min(29, Math.floor(phase * 30));
  const tithi = idx + 1;
  const paksha = idx < 15 ? 'Shukla' : 'Krishna';
  const special = idx === 14 ? 'purnima' : idx === 29 ? 'amavasya' : null;
  const name = special === 'purnima' ? 'Purnima' : special === 'amavasya' ? 'Amavasya' : `${paksha} ${TITHI[idx % 15]}`;
  const lit = Math.round((0.5 - 0.5 * Math.cos(phase * Math.PI * 2)) * 100);

  let note: string;
  if (special === 'amavasya') note = 'Amavasya, the new moon: a night especially kept for Kali. The site turns deeper tonight.';
  else if (special === 'purnima') note = 'Purnima, the full moon. The site is washed in silver tonight.';
  else note = `${paksha === 'Shukla' ? 'Waxing' : 'Waning'} moon, ${lit}% lit. The moon in the sky behind this page is tonight's moon.`;
  if (mode !== 'now' && mode !== 'off') note += ' (Preview: chosen in the prototype panel.)';

  return { on: mode !== 'off', night, warm, special, phase, tithi, paksha, name, lit, note };
}

/** a small moon drawing for the header pill, lit like tonight's moon */
export function moonIcon(phase: number) {
  const r = 7;
  const c = Math.cos(phase * Math.PI * 2);
  const rx = Math.abs(c) * r;
  const waxing = phase < 0.5;
  // the lit part: half disc on the lit side, plus or minus an ellipse
  const sweepHalf = waxing ? 1 : 0;
  const sweepEll = c > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const d = `M8 1 A${r} ${r} 0 0 ${sweepHalf} 8 15 A${rx.toFixed(2)} ${r} 0 0 ${sweepEll} 8 1Z`;
  return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.18"/><path d="${d}" fill="currentColor"/></svg>`;
}

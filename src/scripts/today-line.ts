/**
 * Today's line, on the homepage (src/components/TodayLine.astro): today's short line, chosen from the library by the
 * visitor's own date (kept on today's weekday or on any day, a different one each day, the traditions taking turns),
 * then said nine times on a small mala by tap, click or keyboard. The ninth is kept in the visitor's own practice
 * record (logMantra) and counted as a step that matters (track). Returns a stop function that puts it all back.
 */
import { logMantra } from './practice-log';
import { track } from './track';
import { buzz } from './haptics';
import { tick } from './audio';
import { sitePath } from '../studio/client';
import type { WorldHandle as World } from './world/handle';

type Line = { slug: string; name: string; tradition: string; days: string[]; text: string; iast: string; read: string; meaning: string; lang: string };
const KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const NINE = 9;

/** today's line: of the lines kept on this weekday or on any day, the next in turn, a different one each day */
export function pickLine(lines: Line[], now = new Date()): Line | undefined {
  const day = KEYS[now.getDay()];
  const pool = lines.filter((l) => !l.days.length || l.days.includes(day));
  if (!pool.length) return lines[0];
  const start = new Date(now.getFullYear(), 0, 0);
  const doy = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return pool[doy % pool.length];
}

export function startTodayLine(world?: World) {
  const root = document.querySelector<HTMLElement>('[data-today-line]');
  if (!root) return () => {};
  const read = <T,>(sel: string): T | null => { try { return JSON.parse(root.querySelector(sel)?.textContent || 'null'); } catch { return null; } };
  const lines = read<Line[]>('[data-tl-lines]') ?? [];
  const W = read<Record<string, string>>('[data-tl-words]') ?? {};
  const line = pickLine(lines);
  if (!line) return () => {};
  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector<E>(s);
  const now = new Date();
  const dayKey = KEYS[now.getDay()];
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' });

  // show today's line
  q('[data-tl-day]')!.textContent = dayName;
  q('[data-tl-trad]')!.textContent = line.tradition;
  const link = q<HTMLAnchorElement>('[data-tl-link]')!;
  link.textContent = line.name;
  link.href = sitePath(`/practice/mantras/${line.slug}`);
  const text = q('[data-tl-text]')!;
  text.lang = line.lang;
  if (/^(he|ar|fa|ur)\b/.test(line.lang)) text.dir = 'rtl'; else text.removeAttribute('dir');
  text.replaceChildren(...line.text.split('\n').map((l) => Object.assign(document.createElement('span'), { textContent: l })));
  const iast = q('[data-tl-iast]')!; iast.textContent = line.iast; iast.hidden = !line.iast;
  const rd = q('[data-tl-read]')!; rd.textContent = line.read; rd.hidden = !line.read;
  q('[data-tl-meaning]')!.textContent = line.meaning;
  const more = q<HTMLAnchorElement>('[data-tl-more]')!;
  more.textContent = (W.more || 'More for {day}').replace('{day}', dayName);
  more.href = sitePath(`/practice/${dayKey}`);

  // the nine beads
  const bead = q<HTMLButtonElement>('[data-tl-bead]')!;
  const progress = q('[data-tl-progress]')!;
  const done = q('[data-tl-done]')!;
  const again = q<HTMLButtonElement>('[data-tl-again]')!;
  const dots = Array.from(root.querySelectorAll<SVGCircleElement>('[data-tl-b]'));
  let n = 0;
  const draw = () => {
    dots.forEach((d, i) => d.classList.toggle('is-on', i < n));
    progress.textContent = (W.progress || '{n} of 9').replace('{n}', String(n));
    bead.disabled = n >= NINE;
  };
  const onBead = () => {
    if (n >= NINE) return;
    n++;
    const last = n === NINE;
    tick(last);
    buzz(last ? [14, 50, 22] : [6]);
    draw();
    if (last) {
      logMantra(line.slug, NINE);
      track('today-line', line.slug);
      world?.flash(0.6);
      done.hidden = false;
      again.hidden = false;
      done.focus({ preventScroll: true });
    }
  };
  const onAgain = () => { n = 0; done.hidden = true; again.hidden = true; draw(); bead.focus(); };
  bead.addEventListener('click', onBead);
  again.addEventListener('click', onAgain);
  draw();
  root.classList.add('is-live');

  return () => {
    bead.removeEventListener('click', onBead);
    again.removeEventListener('click', onAgain);
    n = 0; done.hidden = true; again.hidden = true; draw();
    root.classList.remove('is-live');
  };
}

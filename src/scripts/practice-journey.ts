/**
 * Daily practice, the journey: today (the moon, the next sacred night, the visitor's own streak), the daily rite
 * (five guided steps whose length the visitor chooses), the month's lunar days, the visitor's record and journal,
 * and a daily reminder for their own calendar. The record lives only in this browser (localStorage, "sk-practice-log"):
 * nothing is sent. The mala, the fire and the diya below add to the same record.
 */
import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { crackle, ring, tick } from './audio';
import { daysUntil, download, inDays, moonEvents, niceDate, upcomingFestivals, FESTIVALS, dayKey } from './festivals';
import { moonIcon, tithiAt } from './sky';
import type { WorldHandle as World } from './world/handle';

/* ---------------------------------------------------------------- the record */

type DayRec = { rite?: number; japa?: number; fire?: number; diya?: number; minutes?: number };
type Log = { days: Record<string, DayRec>; journal: { at: string; text: string; kind: 'intention' | 'reflection' }[] };
const KEY = 'sk-practice-log';
let memory: Log | null = null;

export function readLog(): Log {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object' && v.days) return { days: v.days, journal: Array.isArray(v.journal) ? v.journal : [] };
  } catch { if (memory) return memory; }
  return memory ?? { days: {}, journal: [] };
}
function writeLog(l: Log) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { memory = l; }
  document.dispatchEvent(new CustomEvent('sk:practice-log'));
}
/** add to today's record (any of the practices calls this) */
export function logPractice(add: DayRec) {
  const l = readLog();
  const k = dayKey(new Date());
  const d = (l.days[k] ??= {});
  for (const [key, v] of Object.entries(add) as [keyof DayRec, number][]) d[key] = (d[key] ?? 0) + v;
  writeLog(l);
}
function addJournal(text: string, kind: 'intention' | 'reflection') {
  const t = text.trim().slice(0, 500);
  if (!t) return;
  const l = readLog();
  l.journal.unshift({ at: new Date().toISOString(), text: t, kind });
  l.journal = l.journal.slice(0, 365);
  writeLog(l);
}

/** days practised, the run up to today (or yesterday), the longest run */
export function stats(l = readLog()) {
  const keys = Object.keys(l.days).filter((k) => Object.values(l.days[k]).some((v) => (v ?? 0) > 0)).sort();
  const set = new Set(keys);
  const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
  let streak = 0;
  const start = set.has(day(0)) ? 0 : 1;
  for (let i = start; set.has(day(i)); i++) streak++;
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of keys) {
    const [y, m, dd] = k.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 864e5) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const japa = Object.values(l.days).reduce((a, d) => a + (d.japa ?? 0), 0);
  return { days: keys.length, streak, longest, japa, today: set.has(day(0)) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Words = Record<string, any>;
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* ---------------------------------------------------------------- today */

function renderToday(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-today]');
  if (!root) return;
  const now = new Date();
  const t = tithiAt(now);
  root.querySelector('[data-today-moon-icon]')!.innerHTML = moonIcon(t.phase);
  root.querySelector('[data-today-moon]')!.textContent = t.name;
  // the next sacred night: a new or full moon, or a festival, whichever comes first
  const m = moonEvents(now, 2).map((e) => ({ name: e.type === 'amavasya' ? 'Amavasya' : 'Purnima', at: e.at }));
  const f = upcomingFestivals(now, 2).map((x) => { const [y, mo, d] = x.start.split('-').map(Number); return { name: x.name, at: new Date(y, mo - 1, d) }; });
  const next = [...m, ...f].filter((x) => daysUntil(x.at, now) >= 0).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  root.querySelector('[data-today-next]')!.textContent = next ? `${next.name}, ${inDays(daysUntil(next.at, now))}` : '—';
  const s = stats();
  root.querySelector('[data-today-you]')!.textContent = s.today ? `${w.today.done}${s.streak > 1 ? ` · ${w.today.streak.replace('{n}', String(s.streak))}` : ''}` : s.days ? `${w.today.none}${s.streak ? ` · ${w.today.streak.replace('{n}', String(s.streak))}` : ''}` : w.today.first;
}

/* ---------------------------------------------------------------- the daily rite */

let riteTimers: number[] = [];
let riteTl: gsap.core.Tween | gsap.core.Timeline | null = null;
let riteOff: (() => void)[] = [];
/** everything a step started (timers, the breath, a key listener) stops when the step changes */
function clearRite() { riteTimers.forEach((t) => clearTimeout(t)); riteTimers = []; riteTl?.kill(); riteTl = null; riteOff.forEach((f) => f()); riteOff = []; }

function initRite(world: World, w: Words) {
  const root = document.querySelector<HTMLElement>('[data-rite]');
  if (!root) return;
  const r = w.rite;
  const start = root.querySelector<HTMLElement>('[data-rite-start]')!;
  const run = root.querySelector<HTMLElement>('[data-rite-run]')!;
  const panel = root.querySelector<HTMLElement>('[data-rite-panel]')!;
  const done = root.querySelector<HTMLElement>('[data-rite-done]')!;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-rite-dot]'));
  let length = 1;
  let step = 0;
  let began = 0;
  let beads = 0;
  let japaCount = 0;

  root.querySelectorAll<HTMLButtonElement>('[data-rite-length]').forEach((b) => b.addEventListener('click', () => {
    length = Number(b.dataset.riteLength);
    root.querySelectorAll('[data-rite-length]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  const next = () => { clearRite(); if (step < 4) { step++; show(); } else finish(); };
  const show = () => {
    clearRite();
    dots.forEach((d, i) => { d.classList.toggle('is-done', i < step); d.toggleAttribute('aria-current', i === step); });
    const s = r.steps[step];
    const head = `<p class="kicker">${step + 1} / 5</p><h3 class="display-m">${esc(s.title)}</h3><p>${esc(s.text)}</p>`;
    const L = r.lengths[length];
    if (step === 0) {
      panel.innerHTML = `${head}<div class="rite-breath" aria-hidden="true"><span class="rb-circle"></span><span class="rb-word" data-rb-word>${esc(r.breatheIn)}</span></div><p class="hint" data-rb-count></p><div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.arrived)}</button></div>`;
      const circle = panel.querySelector<HTMLElement>('.rb-circle')!;
      const word = panel.querySelector<HTMLElement>('[data-rb-word]')!;
      const count = panel.querySelector<HTMLElement>('[data-rb-count]')!;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let n = 0;
      const breathe = () => {
        if (n >= L.breaths) { count.textContent = ''; word.textContent = '·'; return; }
        n++;
        count.textContent = `${n} / ${L.breaths}`;
        word.textContent = r.breatheIn;
        riteTl = gsap.timeline({ onComplete: breathe })
          .to(circle, { scale: reduce ? 1 : 1.55, opacity: 1, duration: 4, ease: 'sine.inOut' })
          .call(() => { word.textContent = r.breatheOut; })
          .to(circle, { scale: reduce ? 1 : 1, opacity: 0.55, duration: 6, ease: 'sine.inOut' });
      };
      breathe();
    } else if (step === 1) {
      panel.innerHTML = `${head}<button type="button" class="rite-lamp" data-rite-lamp aria-pressed="false"><svg viewBox="0 0 160 130" aria-hidden="true"><g class="rl-flame"><path d="M80 70 C70 58 72 44 80 26 C88 44 90 58 80 70 Z" fill="#ffc35a"/><path d="M80 68 C76 62 77 55 80 47 C83 55 84 62 80 68 Z" fill="#fffaf0"/></g><path d="M80 70 L80 76" stroke="#2a120a" stroke-width="2.4" stroke-linecap="round"/><path d="M22 78 Q80 74 132 72 L142 66 Q140 80 128 86 Q80 122 32 92 Q22 86 22 78 Z" fill="#8a3a1c"/></svg><span data-rl-label>${esc(r.light)}</span></button><div class="cta-row"><button type="button" class="btn btn-ghost" data-rite-next>${esc(r.next)}</button></div>`;
      const lamp = panel.querySelector<HTMLButtonElement>('[data-rite-lamp]')!;
      lamp.addEventListener('click', () => {
        if (lamp.getAttribute('aria-pressed') === 'true') return;
        lamp.setAttribute('aria-pressed', 'true');
        lamp.querySelector('[data-rl-label]')!.textContent = r.lit;
        buzz(PATTERNS.diya); world.flash(0.6); ring('card');
        logPractice({ diya: 1 });
        riteTimers.push(window.setTimeout(next, 2600));
      });
    } else if (step === 2) {
      panel.innerHTML = `${head}<label class="sr-only" for="rite-intention">${esc(r.intentionLabel)}</label><textarea id="rite-intention" rows="2" maxlength="200" placeholder="${esc(r.intentionLabel)}"></textarea>
        <ul class="rite-ideas">${r.intentionExamples.map((x: string) => `<li><button type="button" class="chip-keep" data-idea>${esc(x)}</button></li>`).join('')}</ul>
        <label class="rite-check"><input type="checkbox" data-rite-keep /> ${esc(r.keepJournal)}</label>
        <div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.next)}</button></div>`;
      const ta = panel.querySelector<HTMLTextAreaElement>('textarea')!;
      panel.querySelectorAll<HTMLButtonElement>('[data-idea]').forEach((b) => b.addEventListener('click', () => { ta.value = b.textContent || ''; ta.focus(); }));
      panel.querySelector('[data-rite-next]')!.addEventListener('click', () => { if (panel.querySelector<HTMLInputElement>('[data-rite-keep]')!.checked) addJournal(ta.value, 'intention'); }, { capture: true });
    } else if (step === 3) {
      beads = L.beads; japaCount = 0;
      panel.innerHTML = `${head}<p class="mantra" lang="sa"><span>${esc(r.mantra)}</span><small lang="en">${esc(r.mantraNote)}</small></p>
        <button type="button" class="rite-japa" data-japa aria-label="${esc(r.bead)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="rj-track"/><circle cx="60" cy="60" r="52" class="rj-fill" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg><b data-japa-n>0</b><small>/ ${beads}</small></button>
        <div class="cta-row"><button type="button" class="btn btn-ghost btn-sm" data-japa-end>${esc(r.endRound)}</button></div>`;
      const btn = panel.querySelector<HTMLButtonElement>('[data-japa]')!;
      const fill = panel.querySelector<SVGCircleElement>('.rj-fill')!;
      const num = panel.querySelector<HTMLElement>('[data-japa-n]')!;
      const count = () => {
        if (japaCount >= beads) return;
        japaCount++;
        num.textContent = String(japaCount);
        fill.style.strokeDashoffset = String(1 - japaCount / beads);
        world.setMalaCount(japaCount);
        tick(japaCount === beads); buzz([5]);
        if (japaCount === beads) { logPractice({ japa: beads }); world.flash(0.7); riteTimers.push(window.setTimeout(next, 1400)); }
      };
      btn.addEventListener('click', count);
      panel.querySelector('[data-japa-end]')!.addEventListener('click', () => { if (japaCount) logPractice({ japa: japaCount }); next(); });
      // the space bar counts, while this step is open
      const key = (e: KeyboardEvent) => { if (e.key === ' ' && !(e.target as HTMLElement)?.closest('input, textarea, button:not([data-japa])')) { e.preventDefault(); count(); } };
      document.addEventListener('keydown', key);
      riteOff.push(() => document.removeEventListener('keydown', key));
      btn.focus();
    } else {
      panel.innerHTML = `${head}<form class="rite-offer" data-rite-offer><label class="sr-only" for="rite-offer">${esc(r.offerLabel)}</label><textarea id="rite-offer" rows="2" maxlength="90" placeholder="${esc(r.offerLabel)}"></textarea><button type="submit" class="btn btn-ghost">${esc(r.offer)}</button></form>
        <p class="rite-words" data-rite-words hidden></p>
        <p class="rite-closing">${esc(r.closing)}</p>
        <div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.close)}</button></div>`;
      const form = panel.querySelector<HTMLFormElement>('[data-rite-offer]')!;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ta = form.querySelector('textarea')!;
        const text = ta.value.trim();
        if (!text) { ta.focus(); return; }
        ta.value = '';
        form.hidden = true;
        const words = panel.querySelector<HTMLElement>('[data-rite-words]')!;
        words.textContent = text; words.hidden = false;
        crackle(); buzz(PATTERNS.diya); world.flash(0.5);
        logPractice({ fire: 1 });
        riteTl = gsap.to(words, { opacity: 0, y: -50, filter: 'blur(8px)', duration: 2.4, ease: 'power1.in', onComplete: () => { words.hidden = true; } });
      });
    }
    panel.querySelector('[data-rite-next]')?.addEventListener('click', next);
    gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  };
  const finish = () => {
    clearRite();
    const minutes = Math.max(1, Math.round((Date.now() - began) / 60000));
    logPractice({ rite: 1, minutes });
    run.hidden = true;
    done.hidden = false;
    const s = stats();
    done.querySelector('[data-rite-streak]')!.textContent = s.streak > 1 ? w.today.streak.replace('{n}', String(s.streak)) : w.today.first;
    world.impulse(1.4); ring('card');
    done.focus({ preventScroll: true });
    gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' });
  };
  root.querySelector('[data-rite-go]')!.addEventListener('click', () => {
    start.hidden = true; run.hidden = false; done.hidden = true;
    step = 0; began = Date.now();
    show();
    panel.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  });
  root.querySelector('[data-rite-back]')!.addEventListener('click', () => { if (step > 0) { step--; show(); } else { clearRite(); run.hidden = true; start.hidden = false; } });
  root.querySelector('[data-rite-skip]')!.addEventListener('click', next);
  root.querySelector('[data-rite-again]')!.addEventListener('click', () => { done.hidden = true; start.hidden = false; });
  root.querySelector<HTMLFormElement>('[data-rite-reflect]')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const ta = (e.target as HTMLFormElement).querySelector('textarea')!;
    if (!ta.value.trim()) { ta.focus(); return; }
    addJournal(ta.value, 'reflection');
    ta.value = '';
    root.querySelector<HTMLElement>('[data-rite-saved]')!.hidden = false;
  });
}

/* ---------------------------------------------------------------- the month's lunar days */

function initMonth(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-month]');
  if (!root) return;
  const grid = root.querySelector<HTMLElement>('[data-month-grid]')!;
  const title = root.querySelector<HTMLElement>('[data-month-title]')!;
  const detail = root.querySelector<HTMLElement>('[data-month-detail]')!;
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth();
  const marks: Record<string, string> = { amavasya: w.month.amavasya, purnima: w.month.purnima };
  const render = () => {
    title.textContent = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const days = new Date(y, m + 1, 0).getDate();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const head = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span class="mm-dow" role="columnheader">${d}</span>`).join('');
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="mm-blank"></span>';
    for (let d = 1; d <= days; d++) {
      // the tithi at sunrise in India (06:00 IST is 00:30 UTC)
      const t = tithiAt(new Date(Date.UTC(y, m, d, 0, 30)));
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const fest = FESTIVALS.filter((f) => f.start <= key && f.end >= key);
      const kind = t.special ?? (t.base === 'Ekadashi' ? 'ekadashi' : t.base === 'Ashtami' ? 'ashtami' : '');
      const label = t.special ? marks[t.special] : t.base === 'Ekadashi' ? w.month.ekadashi : t.base === 'Ashtami' ? w.month.ashtami : '';
      const isToday = key === dayKey(now);
      cells += `<button type="button" class="mm-day${kind ? ` mm-${kind}` : ''}${fest.length ? ' mm-fest' : ''}${isToday ? ' is-today' : ''}" data-day="${key}" data-name="${esc(t.name)}" data-fest="${esc(fest.map((f) => f.name).join(', '))}" aria-label="${d}: ${esc(t.name)}${fest.length ? `, ${esc(fest.map((f) => f.name).join(', '))}` : ''}"${isToday ? ' aria-current="date"' : ''}>
        <b>${d}</b>${moonIcon(t.phase)}${label ? `<small>${esc(label)}</small>` : ''}${fest.length ? `<i>${esc(fest[0].name)}</i>` : ''}</button>`;
    }
    grid.innerHTML = head + cells;
    detail.textContent = '';
  };
  grid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!b) return;
    const [yy, mm, dd] = b.dataset.day!.split('-').map(Number);
    detail.textContent = `${new Date(yy, mm - 1, dd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${b.dataset.name}${b.dataset.fest ? ` · ${b.dataset.fest}` : ''}`;
  });
  root.querySelector('[data-month-prev]')!.addEventListener('click', () => { m--; if (m < 0) { m = 11; y--; } render(); });
  root.querySelector('[data-month-next]')!.addEventListener('click', () => { m++; if (m > 11) { m = 0; y++; } render(); });
  render();
}

/* ---------------------------------------------------------------- the visitor's own record */

function renderLog(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-log]');
  if (!root) return;
  const L = w.log;
  const l = readLog();
  const s = stats(l);
  // twelve weeks, Monday first, ending this week
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() + (6 - ((today.getDay() + 6) % 7)));
  const cells: string[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const k = dayKey(d);
    const rec = l.days[k];
    const lvl = !rec ? 0 : (rec.rite ? 2 : 0) + ((rec.japa ?? 0) >= 108 ? 1 : 0) + (rec.fire || rec.diya || rec.japa ? 1 : 0);
    const future = d > today;
    cells.push(`<span class="pl-cell pl-${Math.min(3, lvl)}${future ? ' is-future' : ''}${k === dayKey(today) ? ' is-today' : ''}" title="${esc(niceDate(d))}${rec ? ': practised' : ''}"></span>`);
  }
  root.innerHTML = `
    <dl class="pl-stats"><div><dt>${esc(L.days)}</dt><dd>${s.days}</dd></div><div><dt>${esc(L.streak)}</dt><dd>${s.streak}</dd></div><div><dt>${esc(L.longest)}</dt><dd>${s.longest}</dd></div><div><dt>${esc(L.japa)}</dt><dd>${s.japa}</dd></div></dl>
    <div class="pl-grid" role="img" aria-label="${esc(`${s.days} days practised in all; ${s.streak} in a row`)}">${cells.join('')}</div>
    <div class="pl-journal"><h3 class="display-s">${esc(L.journal)}</h3>
      ${l.journal.length ? `<ul>${l.journal.slice(0, 30).map((j, i) => `<li><p>${esc(j.text)}</p><small>${esc(new Date(j.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))} · ${j.kind === 'intention' ? 'intention' : 'reflection'} <button type="button" class="path-back" data-journal-del="${i}">${esc(L.delete)}</button></small></li>`).join('')}</ul>` : `<p class="hint">${esc(L.empty)}</p>`}
    </div>
    ${s.days || l.journal.length ? `<div class="cta-row">${l.journal.length ? `<button type="button" class="btn btn-ghost btn-sm" data-journal-export>${esc(L.export)}</button>` : ''}<button type="button" class="btn btn-ghost btn-sm" data-log-clear>${esc(L.clear)}</button></div>` : ''}`;
}

function initLog(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-log]');
  if (!root) return () => {};
  const L = w.log;
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const del = t.closest<HTMLElement>('[data-journal-del]');
    if (del) { const l = readLog(); l.journal.splice(Number(del.dataset.journalDel), 1); writeLog(l); }
    if (t.closest('[data-journal-export]')) {
      const l = readLog();
      download('my-practice-journal.txt', l.journal.map((j) => `${new Date(j.at).toLocaleString('en-GB')} (${j.kind})\n${j.text}\n`).join('\n'), 'text/plain');
    }
    if (t.closest('[data-log-clear]') && confirm(L.clearConfirm)) writeLog({ days: {}, journal: [] });
  });
  const redraw = () => { renderLog(w); renderToday(w); };
  document.addEventListener('sk:practice-log', redraw);
  redraw();
  return () => document.removeEventListener('sk:practice-log', redraw);
}

/* ---------------------------------------------------------------- the daily reminder */

function initDaily(w: Words) {
  const btn = document.querySelector<HTMLButtonElement>('[data-daily-cal]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const t = (document.querySelector<HTMLInputElement>('[data-daily-time]')?.value || '07:00').replace(':', '');
    const d = new Date(); d.setDate(d.getDate() + 1);
    const day = dayKey(d).replace(/-/g, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sarvakali//Practice//EN', 'BEGIN:VEVENT', `UID:daily-practice-${Date.now()}@sarvakali`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${day}T${t}00`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
      'SUMMARY:Daily practice', 'DESCRIPTION:A few quiet minutes. Sarvakali’s daily rite is on the Daily practice page.', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Daily practice', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download('sarvakali-daily-practice.ics', ics);
    const note = document.querySelector('[data-daily-note]');
    if (note) note.textContent = w.reminder.addedNote;
  });
}

export function initJourney(world: World) {
  const data = document.querySelector('[data-practice-words]');
  if (!data) return () => {};
  const w = JSON.parse(data.textContent || '{}') as Words;
  renderToday(w);
  initRite(world, w);
  initMonth(w);
  const stopLog = initLog(w);
  initDaily(w);
  // the diya further down also counts as practice
  const diya = document.querySelector('[data-diya-light]');
  const onDiya = () => logPractice({ diya: 1 });
  diya?.addEventListener('click', onDiya);
  return () => { clearRite(); stopLog(); diya?.removeEventListener('click', onDiya); };
}

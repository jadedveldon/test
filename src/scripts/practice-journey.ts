/**
 * Daily practice, the journey: today (the moon, the next sacred night, the visitor's own streak), the daily rite
 * (five guided steps whose length the visitor chooses), the month's lunar days, the visitor's record and journal,
 * and a daily reminder for their own calendar. The record lives in this browser (an event log, "sk-events"; see practice-log.ts):
 * nothing is sent. The mala, the fire and the diya below add to the same record.
 */
import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { crackle, ring, tick } from './audio';
import { daysUntil, download, inDays, moonEvents, niceDate, upcomingFestivals, FESTIVALS, dayKey } from './festivals';
import { moonIcon, tithiAt } from './sky';
import type { WorldHandle as World } from './world/handle';
import { sitePath } from '../studio/client';

import { addJournal, clearAll, deleteJournal, logMantra, logPractice, myMantras, readLog, sessionsDone, stats, toggleMine } from './practice-log';
export { logPractice, readLog, stats } from './practice-log';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Words = Record<string, any>;
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* ---------------------------------------------------------------- the week and its mantras */

type DayInfo = { key: string; name: string; sanskrit: string; planet: string; planetSanskrit: string; question: string; intention: string; themes: string[]; opening: string; closing: string; practice: string };
type MantraInfo = { slug: string; name: string; days: string[]; deity: string; status: string; text: string; iast: string; read: string; meaning: string; intention: string };
type Week = { days: DayInfo[]; mantras: MantraInfo[]; badges: Record<string, string>; practices?: { slug: string; title: string; kind: string }[] };
let week: Week = { days: [], mantras: [], badges: {} };
const KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** today's day of the week on the visitor's own calendar, or the day a day page asked for (?day=tuesday) */
function todayKey() {
  const asked = new URLSearchParams(location.search).get('day');
  return asked && KEYS.includes(asked) ? asked : KEYS[new Date().getDay()];
}
const dayInfo = (k = todayKey()) => week.days.find((d) => d.key === k) ?? week.days[0];
const mantra = (slug: string) => week.mantras.find((m) => m.slug === slug);
/** a day's own mantras that anyone may recite (those to learn with guidance, or being checked, are left out of the rite) */
const reciteable = (k: string) => week.mantras.filter((m) => m.days.includes(k) && m.text && (m.status === 'open' || m.status === 'variant'));
const href = (p: string) => sitePath(p);
const lines = (t: string) => t.split('\n').map((l) => `<span>${esc(l)}</span>`).join('');

/** a mantra shown in the rite: Devanagari, transliteration and meaning, with a link to its page */
function mantraBlock(m: MantraInfo | undefined) {
  if (!m) return '';
  return `<div class="rite-mantra"><p class="rm-name"><a href="${esc(href(`/practice/mantras/${m.slug}`))}">${esc(m.name)}</a></p>
    <p class="mc-deva" lang="sa">${lines(m.text)}</p>${m.iast ? `<p class="mc-iast" lang="sa-Latn">${lines(m.iast)}</p>` : ''}
    ${m.meaning ? `<p class="mc-meaning">${esc(m.meaning)}</p>` : ''}</div>`;
}

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
  // the day itself
  const d = dayInfo();
  if (!d) return;
  const set = (sel: string, v: string) => { const el = document.querySelector(sel); if (el) el.textContent = v; };
  set('[data-today-day]', d.name);
  set('[data-today-sk]', d.sanskrit);
  set('[data-today-planet]', `${d.planet} · ${d.planetSanskrit}`);
  set('[data-today-question]', d.question);
  document.querySelectorAll<HTMLAnchorElement>('[data-today-link]').forEach((a) => { a.href = href(`/practice/${d.key}`); a.textContent = (a.dataset.template || '{day}').replace('{day}', d.name); });
  document.querySelectorAll<HTMLElement>('[data-today-hide]').forEach((el) => { el.hidden = false; });
  // the daily practice page features today's practice only (without scripts, all seven are shown)
  document.querySelectorAll<HTMLElement>('[data-day-feature]').forEach((el) => { el.hidden = el.dataset.dayFeature !== d.key; });
  document.querySelectorAll<HTMLElement>('[data-week-day]').forEach((a) => {
    const is = a.dataset.weekDay === d.key;
    a.classList.toggle('is-today', is);
    const tag = a.querySelector<HTMLElement>('[data-week-today]');
    if (tag) tag.hidden = !is;
  });
}

/** today's mantras, as a short list leading to each mantra's page */
function renderTodayMantras(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-today-mantras]');
  if (!root) return;
  const d = dayInfo();
  const own = week.mantras.filter((m) => m.days[0] === d.key);
  const also = week.mantras.filter((m) => m.days[0] !== d.key && m.days.includes(d.key));
  const item = (m: MantraInfo) => `<li><a href="${esc(href(`/practice/mantras/${m.slug}`))}"><b>${esc(m.name)}</b>${m.intention ? `<span>${esc(m.intention)}</span>` : ''}</a>${m.status !== 'open' && week.badges[m.status] ? `<span class="mc-badge mc-badge-${m.status}">${esc(week.badges[m.status])}</span>` : ''}</li>`;
  root.innerHTML = `<ul class="tm-list">${own.map(item).join('')}</ul>${also.length ? `<p class="kicker">${esc(w.todayList.also.replace('{day}', d.name))}</p><ul class="tm-list">${also.map(item).join('')}</ul>` : ''}`;
}

/** the visitor's kept mantras */
function renderMine(w: Words) {
  const root = document.querySelector<HTMLElement>('[data-mine]');
  if (!root) return;
  const l = readLog();
  const list = myMantras().map(mantra).filter(Boolean) as MantraInfo[];
  root.innerHTML = list.length
    ? `<ul class="tm-list">${list.map((m) => `<li><a href="${esc(href(`/practice/mantras/${m.slug}`))}"><b>${esc(m.name)}</b><span>${esc(m.intention || m.meaning.slice(0, 80))}</span></a>${l.mantras[m.slug] ? `<span class="hint">${esc(w.mine.chanted.replace('{n}', String(l.mantras[m.slug])))}</span>` : ''}<button type="button" class="path-back" data-unkeep="${esc(m.slug)}">${esc(w.mine.remove)}</button></li>`).join('')}</ul>`
    : `<p class="hint">${esc(w.mine.empty)}</p>`;
}

/** the guided practices the visitor has done: a list, and a mark on each card */
function renderDone(w: Words) {
  const done = sessionsDone();
  document.querySelectorAll<HTMLElement>('[data-practice-card]').forEach((a) => {
    const n = done[a.dataset.practiceCard!]?.n ?? 0;
    const em = a.querySelector<HTMLElement>('[data-done-badge]');
    if (em) { em.hidden = !n; em.textContent = n ? `· ${String(w.hub?.done || 'Done {n}×').replace('{n}', String(n))}` : ''; }
  });
  const root = document.querySelector<HTMLElement>('[data-done-list]');
  if (!root) return;
  const rows = Object.entries(done).sort((a, b) => b[1].last.localeCompare(a[1].last));
  const title = (slug: string) => week.practices?.find((p) => p.slug === slug)?.title ?? slug;
  root.innerHTML = rows.length
    ? `<ul class="tm-list">${rows.map(([slug, r]) => `<li><a href="${esc(href(`/practice/with/${slug}`))}"><b>${esc(title(slug))}</b><span>${esc(new Date(r.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</span></a><span class="hint">${esc((root.dataset.times || '{n}×').replace('{n}', String(r.n)))}</span></li>`).join('')}</ul>`
    : `<p class="hint">${esc(root.dataset.none || '')}</p>`;
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
  const LAST = r.steps.length - 1;
  let length = 1;
  let step = 0;
  let began = 0;
  let chosen = '';
  let count = 0;
  let target = 0;

  // the day in the rite's heading
  const d = dayInfo();
  const forDay = root.querySelector<HTMLElement>('[data-rite-day]');
  if (forDay && d) forDay.textContent = r.forDay.replace('{day}', d.name);

  root.querySelectorAll<HTMLButtonElement>('[data-rite-length]').forEach((b) => b.addEventListener('click', () => {
    length = Number(b.dataset.riteLength);
    root.querySelectorAll('[data-rite-length]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  // repetitions counted in the chant step still count when the visitor moves on before the round is complete
  const next = () => { clearRite(); if (step === 4 && count) { logMantra(chosen, count); count = 0; } if (step < LAST) { step++; show(); } else finish(); };
  const show = () => {
    clearRite();
    const day = dayInfo();
    dots.forEach((x, i) => { x.classList.toggle('is-done', i < step); x.toggleAttribute('aria-current', i === step); });
    const s = r.steps[step];
    const head = `<p class="kicker">${step + 1} / ${r.steps.length}</p><h3 class="display-m">${esc(s.title)}</h3><p>${esc(s.text)}</p>`;
    const L = r.lengths[length];
    if (step === 0) {
      panel.innerHTML = `${head}<div class="rite-breath" aria-hidden="true"><span class="rb-circle"></span><span class="rb-word" data-rb-word>${esc(r.breatheIn)}</span></div><p class="hint" data-rb-count></p><div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.arrived)}</button></div>`;
      const circle = panel.querySelector<HTMLElement>('.rb-circle')!;
      const word = panel.querySelector<HTMLElement>('[data-rb-word]')!;
      const counter = panel.querySelector<HTMLElement>('[data-rb-count]')!;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let n = 0;
      const breathe = () => {
        if (n >= L.breaths) { counter.textContent = ''; word.textContent = '·'; return; }
        n++;
        counter.textContent = `${n} / ${L.breaths}`;
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
      // the opening prayer of the day
      const m = mantra(day.opening) ?? reciteable(day.key)[0];
      panel.innerHTML = `${head}${mantraBlock(m)}<div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.next)}</button></div>`;
    } else if (step === 3) {
      // the day's question, and the visitor's intention
      panel.innerHTML = `${head}<blockquote class="pday-question"><p class="kicker">${esc(r.question)}</p><p>${esc(day.question)}</p></blockquote>
        <label class="sr-only" for="rite-intention">${esc(r.intentionLabel)}</label><textarea id="rite-intention" rows="2" maxlength="200" placeholder="${esc(r.intentionLabel)}"></textarea>
        <ul class="rite-ideas">${(day.themes.length ? day.themes : r.intentionExamples).map((x: string) => `<li><button type="button" class="chip-keep" data-idea>${esc(x)}</button></li>`).join('')}</ul>
        <label class="rite-check"><input type="checkbox" data-rite-keep /> ${esc(r.keepJournal)}</label>
        <div class="cta-row"><button type="button" class="btn btn-solid" data-rite-next>${esc(r.next)}</button></div>`;
      const ta = panel.querySelector<HTMLTextAreaElement>('textarea')!;
      panel.querySelectorAll<HTMLButtonElement>('[data-idea]').forEach((b) => b.addEventListener('click', () => { ta.value = b.textContent || ''; ta.focus(); }));
      panel.querySelector('[data-rite-next]')!.addEventListener('click', () => { if (panel.querySelector<HTMLInputElement>('[data-rite-keep]')!.checked) addJournal(ta.value, 'intention'); }, { capture: true });
    } else if (step === 4) {
      // the main mantra: one of the day's, or one of the visitor's own; then as many repetitions as feel true
      const mine = myMantras().map(mantra).filter((m): m is MantraInfo => !!m && !!m.text && m.status !== 'verify' && m.status !== 'guidance');
      const options = [...reciteable(day.key).filter((m) => m.slug !== day.opening && m.slug !== day.closing), ...mine.filter((m) => !m.days.includes(day.key))];
      if (!chosen || !options.some((m) => m.slug === chosen)) chosen = options[0]?.slug ?? '';
      target = L.beads; count = 0;
      const counts: number[] = r.counts;
      panel.innerHTML = `${head}<label class="rite-choose">${esc(r.choose)} <select data-rite-choose>${options.map((m) => `<option value="${esc(m.slug)}"${m.slug === chosen ? ' selected' : ''}>${esc(m.name)}${m.days.includes(day.key) ? '' : ` (${esc(r.mine)})`}</option>`).join('')}</select></label>
        <div data-rite-mantra>${mantraBlock(mantra(chosen))}</div>
        <div class="rite-lengths" role="radiogroup" aria-label="${esc(r.howMany)}">${counts.map((n) => `<button type="button" role="radio" aria-checked="${n === target}" data-rite-count="${n}">${n === 1 ? esc(r.once) : n}</button>`).join('')}</div>
        <button type="button" class="rite-japa" data-japa aria-label="${esc(r.bead)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="rj-track"/><circle cx="60" cy="60" r="52" class="rj-fill" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg><b data-japa-n>0</b><small data-japa-of>/ ${target}</small></button>
        <div class="cta-row"><button type="button" class="btn btn-ghost btn-sm" data-japa-end>${esc(r.endRound)}</button></div>`;
      const btn = panel.querySelector<HTMLButtonElement>('[data-japa]')!;
      const fill = panel.querySelector<SVGCircleElement>('.rj-fill')!;
      const num = panel.querySelector<HTMLElement>('[data-japa-n]')!;
      const of = panel.querySelector<HTMLElement>('[data-japa-of]')!;
      const draw = () => { num.textContent = String(count); of.textContent = `/ ${target}`; fill.style.strokeDashoffset = String(1 - count / target); };
      panel.querySelector<HTMLSelectElement>('[data-rite-choose]')?.addEventListener('change', (e) => {
        if (count) { logMantra(chosen, count); count = 0; }
        chosen = (e.target as HTMLSelectElement).value;
        panel.querySelector('[data-rite-mantra]')!.innerHTML = mantraBlock(mantra(chosen));
        draw();
      });
      panel.querySelectorAll<HTMLButtonElement>('[data-rite-count]').forEach((b) => b.addEventListener('click', () => {
        target = Number(b.dataset.riteCount);
        panel.querySelectorAll('[data-rite-count]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        count = Math.min(count, target); draw();
      }));
      const tap = () => {
        if (count >= target) return;
        count++;
        draw();
        world.setMalaCount(count);
        tick(count === target); buzz([5]);
        if (count === target) { logMantra(chosen, count); count = 0; world.flash(0.7); riteTimers.push(window.setTimeout(next, 1400)); }
      };
      btn.addEventListener('click', tap);
      panel.querySelector('[data-japa-end]')!.addEventListener('click', next);
      // the space bar counts, while this step is open
      const key = (e: KeyboardEvent) => { if (e.key === ' ' && !(e.target as HTMLElement)?.closest('input, textarea, select, button:not([data-japa])')) { e.preventDefault(); tap(); } };
      document.addEventListener('keydown', key);
      riteOff.push(() => document.removeEventListener('keydown', key));
      draw();
      btn.focus();
    } else {
      // closing: the day's closing prayer, something to set down if there is, and a closing intention
      const m = mantra(day.closing);
      panel.innerHTML = `${head}${mantraBlock(m)}<form class="rite-offer" data-rite-offer><label class="sr-only" for="rite-offer">${esc(r.offerLabel)}</label><textarea id="rite-offer" rows="2" maxlength="90" placeholder="${esc(r.offerLabel)}"></textarea><button type="submit" class="btn btn-ghost">${esc(r.offer)}</button></form>
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

/* ---------------------------------------------------------------- the mala's mantra */

/** the mala counts any mantra: today's first, or one the visitor chooses from today's and their own */
function initMalaChoice(w: Words) {
  const sel = document.querySelector<HTMLSelectElement>('[data-mala-choose]');
  const shown = document.querySelector<HTMLElement>('[data-mala-mantra]');
  if (!sel || !shown) return;
  const day = dayInfo();
  const mine = myMantras().map(mantra).filter((m): m is MantraInfo => !!m && !!m.text && m.status !== 'verify');
  const options = [...reciteable(day.key), ...mine.filter((m) => !m.days.includes(day.key))];
  if (!options.length) return;
  sel.innerHTML = options.map((m) => `<option value="${esc(m.slug)}">${esc(m.name)}</option>`).join('');
  sel.closest('[hidden]')?.removeAttribute('hidden');
  const draw = () => {
    const m = mantra(sel.value);
    if (!m) return;
    shown.innerHTML = `<span>${esc(m.text.split('\n')[0])}</span><small lang="en">${esc(m.iast.split('\n')[0] || m.name)} · <a href="${esc(href(`/practice/mantras/${m.slug}`))}">${esc(w.malaOpen)}</a></small>`;
  };
  sel.addEventListener('change', draw);
  draw();
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
      ${l.journal.length ? `<ul>${l.journal.slice(0, 30).map((j) => `<li${j.locked ? ' class="is-locked"' : ''}><p>${j.locked ? `<em>${esc(L.locked || '')}</em>` : esc(j.text)}</p><small>${esc(new Date(j.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))} · ${j.kind === 'intention' ? 'intention' : 'reflection'} <button type="button" class="path-back" data-journal-del="${esc(j.id)}">${esc(L.delete)}</button></small></li>`).join('')}</ul>` : `<p class="hint">${esc(L.empty)}</p>`}
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
    if (del) deleteJournal(del.dataset.journalDel!);
    if (t.closest('[data-journal-export]')) {
      const l = readLog();
      download('my-practice-journal.txt', l.journal.filter((j) => !j.locked).map((j) => `${new Date(j.at).toLocaleString('en-GB')} (${j.kind})\n${j.text}\n`).join('\n'), 'text/plain');
    }
    if (t.closest('[data-log-clear]') && confirm(L.clearConfirm)) clearAll();
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
  try { week = JSON.parse(document.querySelector('[data-practice-week]')?.textContent || 'null') ?? week; } catch { /* the page still works without the week */ }
  renderToday(w);
  renderTodayMantras(w);
  renderMine(w);
  renderDone(w);
  initMalaChoice(w);
  initRite(world, w);
  initMonth(w);
  const stopLog = initLog(w);
  initDaily(w);
  // the diya further down also counts as practice
  const diya = document.querySelector('[data-diya-light]');
  const onDiya = () => logPractice({ diya: 1 });
  diya?.addEventListener('click', onDiya);
  const onMine = () => { renderMine(w); renderDone(w); };
  document.addEventListener('sk:my-mantras', onMine);
  document.addEventListener('sk:practice-log', onMine);
  const mineRoot = document.querySelector('[data-mine]');
  const onUnkeep = (e: Event) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-unkeep]'); if (b) toggleMine(b.dataset.unkeep!); };
  mineRoot?.addEventListener('click', onUnkeep);
  return () => {
    clearRite(); stopLog(); diya?.removeEventListener('click', onDiya);
    document.removeEventListener('sk:my-mantras', onMine); document.removeEventListener('sk:practice-log', onMine); mineRoot?.removeEventListener('click', onUnkeep);
  };
}

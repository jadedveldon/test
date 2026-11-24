import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { crackle, ring, tick } from './audio';
import { sampleHeading } from './dust';
import { daysUntil, download, icsFile, inDays, moonCalendar, moonEvents, niceDate, upcomingFestivals } from './festivals';
import { canPrompt, installed, isIOS, onInstallChange, promptInstall } from './pwa';
import { store } from './tiers';
import type { WorldHandle as World } from './world/handle';

/**
 * Daily practice: a 108-bead mala, offering words to the fire, moon reminders,
 * the sacred days ahead and installing the site on a phone. Nothing typed here
 * is stored or sent.
 */

/* ---------------------------------------------------------------- mala */

const BEADS = 108;

function initMala(world: World) {
  const root = document.querySelector<HTMLElement>('[data-mala]');
  if (!root) return;
  const svg = root.querySelector<SVGSVGElement>('.mala-svg')!;
  const countEl = root.querySelector('[data-mala-count]')!;
  const roundsEl = root.querySelector('[data-mala-rounds]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-mala-tap]')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-mala-reset]')!;
  const NS = 'http://www.w3.org/2000/svg';
  const beads: SVGCircleElement[] = [];
  for (let i = 0; i < BEADS; i++) {
    const a = -Math.PI / 2 + (i / BEADS) * Math.PI * 2;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', (Math.cos(a) * 120).toFixed(2));
    c.setAttribute('cy', (Math.sin(a) * 120).toFixed(2));
    c.setAttribute('r', '3.3');
    c.setAttribute('class', 'mala-bead');
    svg.querySelector('.mala-beads')!.appendChild(c);
    beads.push(c);
  }
  const key = `sk-mala-${new Date().toDateString()}`;
  let count = 0;
  let rounds = Number((() => { try { return localStorage.getItem(key); } catch { return null; } })() || 0);
  const show = () => {
    countEl.textContent = String(count);
    roundsEl.textContent = rounds ? `${rounds} ${rounds === 1 ? 'round' : 'rounds'} today` : 'No rounds yet today';
    beads.forEach((b, i) => b.classList.toggle('is-done', i < count));
    beads.forEach((b, i) => b.classList.toggle('is-now', i === count % BEADS));
  };
  const step = () => {
    count++;
    world.setMalaCount(rounds * BEADS + count);
    if (count >= BEADS) {
      rounds++;
      try { localStorage.setItem(key, String(rounds)); } catch { /* fine */ }
      tick(true);
      buzz(PATTERNS.diya);
      world.flash(0.8);
      world.impulse(1.5);
      gsap.fromTo(svg, { scale: 1 }, { scale: 1.05, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.out' });
      count = 0;
    } else {
      tick();
      buzz([5]);
      gsap.fromTo(beads[count - 1], { attr: { r: 6 } }, { attr: { r: 3.3 }, duration: 0.5, ease: 'power3.out' });
    }
    show();
  };
  btn.addEventListener('click', step);
  svg.addEventListener('click', step);
  root.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && e.target === svg) { e.preventDefault(); step(); }
  });
  reset.addEventListener('click', () => { count = 0; show(); });
  show();
}

/* ----------------------------------------------------- offer to the fire */

/** the burn in progress, so leaving the page can stop it before it touches the next page's light */
let fireTl: gsap.core.Timeline | null = null;
let fireWorld: World | null = null;
let stopInstall: (() => void) | null = null;

export function stopPractice() {
  stopInstall?.();
  stopInstall = null;
  if (!fireTl) return;
  fireTl.kill();
  fireTl = null;
  if (fireWorld) { fireWorld.setDust(null, 0); fireWorld.setDustBurn(0); }
  fireWorld = null;
}

function initFire(world: World) {
  const root = document.querySelector<HTMLElement>('[data-fire]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const input = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const words = root.querySelector<HTMLElement>('[data-fire-words]')!;
  const after = root.querySelector<HTMLElement>('[data-fire-after]')!;
  const again = root.querySelector<HTMLButtonElement>('[data-fire-again]')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().replace(/\s+/g, ' ');
    if (!text) { input.focus(); return; }
    input.value = ''; // nothing is kept
    form.hidden = true;
    words.textContent = text;
    words.hidden = false;
    words.style.opacity = '1';
    buzz(PATTERNS.diya);
    crackle();
    world.flash(0.6);
    requestAnimationFrame(() => {
      const s = world.isLive ? sampleHeading(words, 7000) : null;
      const p = { v: 0 };
      if (s) {
        world.setDustBurn(1);
        world.setDust(s.pts, s.n);
        world.setDustProgress(0);
      }
      fireWorld = s ? world : null;
      fireTl = gsap.timeline({
        onComplete: () => {
          fireTl = null;
          fireWorld = null;
          if (s) { world.setDust(null, 0); world.setDustBurn(0); }
          words.hidden = true;
          after.hidden = false;
          gsap.fromTo(after, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 });
        },
      })
        // without the 3D world, the words simply rise and fade like smoke
        .to(words, { opacity: 0, y: s ? 0 : -60, filter: s ? 'none' : 'blur(8px)', duration: s ? 0.5 : 2.2, ease: 'power2.in' }, s ? 0.15 : 0)
        .to(p, { v: 1, duration: s ? 4.2 : 2.2, ease: 'power1.in', onUpdate: () => { if (s) world.setDustProgress(p.v); } }, 0);
    });
  });
  again.addEventListener('click', () => {
    after.hidden = true;
    form.hidden = false;
    gsap.set(words, { clearProps: 'opacity,transform,filter' }); // the next words start clear and in place
    input.focus();
  });
}

/* ---------------------------------------------- moon and sacred days */

function initDays() {
  const list = document.querySelector<HTMLElement>('[data-days]');
  if (list) {
    const moons = moonEvents(new Date(), 2);
    const rows: { title: string; date: Date; note: string; topic: string; end?: Date }[] = [];
    const nA = moons.find((m) => m.type === 'amavasya');
    const nP = moons.find((m) => m.type === 'purnima');
    if (nA) rows.push({ title: 'Amavasya', date: nA.at, note: 'The new moon, a night especially kept for Kali.', topic: 'A ritual on Amavasya' });
    if (nP) rows.push({ title: 'Purnima', date: nP.at, note: 'The full moon.', topic: 'Something for Purnima' });
    upcomingFestivals(new Date(), 5).forEach((f) => {
      const [y, m, d] = f.start.split('-').map(Number);
      const [y2, m2, d2] = f.end.split('-').map(Number);
      rows.push({ title: f.name, date: new Date(y, m - 1, d), end: new Date(y2, m2 - 1, d2), note: f.note, topic: `Something for ${f.name}` });
    });
    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    list.innerHTML = '';
    const connect = document.querySelector<HTMLAnchorElement>('[data-connect-href]')?.getAttribute('href') || '/connect';
    rows.forEach((r) => {
      const li = document.createElement('li');
      const n = daysUntil(r.date);
      const range = r.end && r.end.getTime() !== r.date.getTime() ? ` – ${niceDate(r.end)}` : '';
      li.innerHTML = `<div class="day-when"><b></b><span></span></div><div class="day-what"><h3></h3><p></p></div><div class="day-act"><button type="button" class="btn btn-ghost btn-sm" data-day-cal>Add to calendar</button><a class="btn btn-ghost btn-sm" data-topic>Ask about a ritual</a></div>`;
      li.querySelector('b')!.textContent = niceDate(r.date) + range;
      li.querySelector('.day-when span')!.textContent = inDays(n);
      li.querySelector('h3')!.textContent = r.title;
      li.querySelector('p')!.textContent = r.note;
      const a = li.querySelector<HTMLAnchorElement>('[data-topic]')!;
      a.href = connect;
      a.dataset.topic = r.topic;
      li.querySelector<HTMLButtonElement>('[data-day-cal]')!.addEventListener('click', () => {
        download(`sarvakali-${r.title.toLowerCase().replace(/\W+/g, '-')}.ics`, icsFile([{ title: r.title, date: r.date, description: `${r.note} From Sarvakali.` }]));
      });
      list.appendChild(li);
    });
  }
  document.querySelector('[data-moon-cal]')?.addEventListener('click', () => {
    download('sarvakali-moon-reminders.ics', moonCalendar(12));
    const note = document.querySelector('[data-moon-note]');
    if (note) note.textContent = 'Saved. Open the file to add the next 12 Amavasyas and Purnimas to your calendar, each with a reminder the evening before.';
  });
  const email = document.querySelector<HTMLFormElement>('[data-moon-email]');
  email?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!email.reportValidity()) return;
    email.hidden = true;
    const done = document.querySelector<HTMLElement>('[data-moon-email-done]');
    if (done) done.hidden = false;
  });
}

/* ------------------------------------------------------------ install */

function initInstall() {
  const btns = document.querySelectorAll<HTMLButtonElement>('[data-install]');
  if (!btns.length) return;
  const note = document.querySelector<HTMLElement>('[data-install-note]');
  const render = () => {
    btns.forEach((b) => { b.textContent = installed() ? 'Installed' : canPrompt() ? 'Add Sarvakali to your home screen' : isIOS() ? 'How to add it on iPhone' : 'Add to your home screen'; });
  };
  btns.forEach((b) => b.addEventListener('click', async () => {
    const msg = await promptInstall();
    if (note) note.textContent = msg;
    render();
  }));
  stopInstall?.();
  stopInstall = onInstallChange(render);
  render();
}

export function initPractice(world: World) {
  if (!document.querySelector('[data-practice]')) return;
  initMala(world);
  initFire(world);
  initDays();
  initInstall();
  // opened from the app shortcut: show today's card straight away
  if (new URLSearchParams(location.search).get('card') === '1') {
    setTimeout(() => document.querySelector<HTMLElement>('[data-practice] [data-card-open]')?.click(), 900);
  }
  ring('choice');
  store('sk-practice', '1');
}

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { WorldHandle } from './world/handle';
import { runLoader } from './loader';
import { initTransitions } from './transitions';
import {
  HERO_PRESET,
  cursorIsActive,
  exp,
  initExpPanel,
  loadExp,
  renderExpPanel,
  resetMagnets,
  setCursor,
  setExp,
  startHeroEye,
  stopHeroEye,
  type Exp,
} from './experiments';
import {
  FpsMeter,
  TIER_LABEL,
  chooseManual,
  manualTier,
  prefersReducedMotion,
  read,
  rememberAuto,
  rememberedTier,
  store,
  hasWebGL,
  type Tier,
} from './tiers';
import { moonIcon, readSky } from './sky';
import { onSoundChange, ring, setMix, setSound, soundIsOn, soundLevel } from './audio';
import { PATTERNS, buzz, setHaptics } from './haptics';
import type { Incense } from './fluid';
import { initCard } from './card';
import { initDiya } from './diya';
import { initPath } from './path';
import { sampleHeading } from './dust';
import { FEST_LOOK, activeFestival, daysUntil, inDays, nextMoon, niceDate, type FestMode } from './festivals';
import { initSearch, revealFound, closeSearch } from './search';
import { initKeep, keepTopic, renderKeep } from './keep';
import { closeMenu, initMenu } from './menu';
import { initPwa } from './pwa';
import { runDeviceTest } from './devicetest';
import { loadHealingFont, loadMagicFonts, loadSettledFonts } from './fonts';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const LABELS: Record<string, string> = {
  loader: 'Intro', hero: 'Hero · living eye', heroName: 'Hero · name of light', dawn: 'Hero · dawn',
  dawnRise: 'Hero · eye at dawn (rising)', dawnName: 'Hero · eye at dawn', connect: 'Connect',
  devotion: 'Devotion & the Unseen', magic: 'Witchcraft & Magic', healing: 'Healing & Inner Work',
  identity: 'Identity, Intimacy & the Body', divination: 'Divination & Insight', learning: 'Learning', close: 'Close',
};

let world: WorldHandle;
let worldLoading: Promise<boolean> | null = null;
let festival: ReturnType<typeof activeFestival> = null;
let incense: Incense | null = null;
let incenseLoading = false;
let tier: Tier = 'full';
let autoProbe = false;
let lenis: Lenis | null = null;
let chapters: HTMLElement[] = [];
let tweens: gsap.core.Animation[] = [];
let splits: SplitText[] = [];
let heroTl: gsap.core.Timeline | null = null;
let heroWanted = false;
let dawnTween: gsap.core.Tween | null = null;
let heroCalls: gsap.core.Tween[] = [];
let dawnSettled = false;
let mainEl: HTMLElement | null = null;
let skewing = false;
/** a Magic chapter is a day (parchment) or night (gold on black) page; the page says which */
const magPage = (key: string) => (document.querySelector(`[data-chapter="magG_${key}"]`)?.classList.contains('mg-day') ? 'day' : 'night');

/**
 * Each pillar's own code (and the practice page, the depth demo) is a separate download, fetched only on the page
 * that uses it. A module that arrives after the visitor has already moved on is ignored.
 */
let pageToken = 0;
let pageStops: (() => void)[] = [];
function pageModule<M>(when: string, load: () => Promise<M>, start: (m: M) => (() => void) | null | void) {
  if (!document.querySelector(when)) return;
  const t = pageToken;
  load().then((m) => {
    if (t !== pageToken) return;
    const stop = start(m);
    if (stop) pageStops.push(stop);
  }).catch(() => { /* this page's extras could not be downloaded; its words and links still work */ });
}
const meter = new FpsMeter();
const probe = { phase: 0, t: 0 };
const finePointer = () => matchMedia('(pointer: fine)').matches;
const isPhone = () => matchMedia('(pointer: coarse)').matches && innerWidth < 900;

/* ------------------------------------------------------------- tiers */

const LIVE: Tier[] = ['ultra', 'full', 'lighter'];

function setTier(t: Tier) {
  tier = t;
  html.dataset.tier = t;
  world.setTier(t);
  markParticles();
  applyCursor();
  hudRender();
  if (LIVE.includes(t) && !world.ready) afterPaint(ensureWorld);
}

/** run once the page has painted, so words appear before any heavy work */
function afterPaint(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(fn, 0)));
}

/**
 * The 3D world (Three.js and everything built on it) is its own download.
 * Visitors on Still, Calm or data saver never fetch it at all.
 */
function ensureWorld(): Promise<boolean> {
  if (world.ready) return Promise.resolve(world.available);
  if (worldLoading) return worldLoading;
  worldLoading = import('./world/World').then(({ World }) => {
    const canvas = document.getElementById('world-canvas') as HTMLCanvasElement;
    const w = new World(canvas);
    world.attach(w);
    if (!w.available) { autoProbe = false; setTier('still'); return false; }
    html.dataset.world = 'ready';
    worldArrived = performance.now();
    markParticles();
    applyCursor();
    hudRender();
    probe.phase = 0; probe.t = 0; // measure from now, not while it was loading
    return true;
  }).catch(() => {
    // the 3D world could not be downloaded (offline, or an old page after an update): carry on without it,
    // and allow another try later
    worldLoading = null;
    autoProbe = false;
    if (LIVE.includes(tier)) setTier('still');
    return false;
  });
  return worldLoading;
}

let particlesTimer = 0;
function markParticles() {
  const on = world.isLive && exp.forms === 'on';
  clearTimeout(particlesTimer);
  // when the world has only just arrived, give the points a moment to gather
  // into the name before the written title fades out
  if (on && html.dataset.particles !== 'on' && performance.now() - worldArrived < 1500) {
    particlesTimer = window.setTimeout(markParticles, 1500 - (performance.now() - worldArrived));
    return;
  }
  html.dataset.particles = on ? 'on' : 'off';
}
let worldArrived = -1e9;

/** a desktop with plenty of cores and memory, where 240,000 points are worth trying */
function strongMachine() {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return finePointer() && (navigator.hardwareConcurrency || 0) >= 8 && (mem === undefined || mem >= 8) && !saverOn();
}

let testing = false; // the device test is choosing levels itself

function runAutoProbe(dt: number) {
  if (!autoProbe || !world.ready || testing) return;
  probe.t += dt;
  if (probe.phase === 0 && probe.t > 2.5) { meter.reset(); probe.phase = 1; probe.t = 0; }
  else if (probe.phase === 1 && probe.t > 2) {
    const fps = meter.fps;
    if (tier === 'full' && fps < 45) { setTier('lighter'); meter.reset(); probe.phase = 2; probe.t = 0; }
    else if (tier === 'full' && fps >= 56 && strongMachine()) { setTier('ultra'); probe.phase = 3; probe.t = 0; }
    else { rememberAuto(tier); autoProbe = false; hudRender(); }
  } else if (probe.phase === 2 && probe.t > 2) {
    if (meter.fps < 26) setTier('still');
    rememberAuto(tier);
    autoProbe = false;
    hudRender();
  } else if (probe.phase === 3 && world.ultraReady && probe.t > 0.5) {
    meter.reset(); probe.phase = 4; probe.t = 0;
  } else if (probe.phase === 3 && probe.t > 20) {
    setTier('full'); rememberAuto('full'); autoProbe = false; // building took too long: stay on Full
  } else if (probe.phase === 4 && probe.t > 2.5) {
    if (meter.fps < 50) setTier('full');
    rememberAuto(tier);
    autoProbe = false;
    hudRender();
  }
}

/**
 * Smoothness watchdog: keeps listening for the whole visit. If a device
 * struggles for four seconds in a row, step down a level. Never overrides a
 * level someone picked by hand.
 */
const watch = { t: 0, low: 0 };
function watchdog(dt: number) {
  if (testing || autoProbe || read('sk-tier-manual') || !['ultra', 'full', 'lighter'].includes(tier) || document.hidden) return;
  watch.t += dt;
  if (watch.t < 1) return;
  watch.t = 0;
  const fps = meter.fps;
  watch.low = fps > 0 && fps < (tier === 'ultra' ? 40 : 22) ? watch.low + 1 : 0;
  if (watch.low >= 4) {
    setTier(tier === 'ultra' ? 'full' : tier === 'full' ? 'lighter' : 'still');
    rememberAuto(tier);
    watch.low = 0;
    meter.reset();
  }
}

/* -------------------------------------------------------- data saver */

function saverDetected() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g');
}
const saverOn = () => exp.saver === 'on' || saverDetected();

function toast(text: string, action?: { label: string; run: () => void }, seconds = 10) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.querySelector('[data-toast-text]')!.textContent = text;
  const btn = el.querySelector<HTMLButtonElement>('[data-toast-action]')!;
  btn.hidden = !action;
  btn.onclick = action ? () => { action.run(); el.hidden = true; } : null;
  el.querySelector<HTMLButtonElement>('[data-toast-close]')!.onclick = () => (el.hidden = true);
  el.hidden = false;
  gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  clearTimeout(Number(el.dataset.timer || 0));
  el.dataset.timer = String(window.setTimeout(() => (el.hidden = true), seconds * 1000));
}

function saverNotice() {
  toast('Data saver is on, so Sarvakali is showing still pictures instead of the moving world.', {
    label: 'Show the moving world',
    run: () => { chooseManual('full'); autoProbe = false; setTier('full'); },
  });
}

function renderSaverNote() {
  const note = document.querySelector('[data-saver-note]');
  if (!note) return;
  note.textContent = saverDetected()
    ? 'This device asked for data saving.'
    : exp.saver === 'on' ? 'On: the site starts in Still mode and shows a notice.' : 'Detected automatically on phones with data saver on.';
}

/* ---------------------------------------------------------- chapters */

function trackChapters() {
  if (!chapters.length) return;
  const mid = innerHeight * 0.5;
  // pages that change sharply (Magic's day and night pages) turn only near each edge, so the
  // middle of a long chapter keeps its own colours instead of drifting between two
  const edge = document.querySelector('[data-blend="edge"]') ? innerHeight * 0.6 : 0;
  let pos = 0;
  for (let i = 0; i < chapters.length; i++) {
    const r = chapters[i].getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) {
      if (edge && r.height > edge) {
        pos = i;
        if (i > 0 && mid - r.top < edge / 2) pos = i - 0.5 + (mid - r.top) / edge;
        else if (i < chapters.length - 1 && r.bottom - mid < edge / 2) pos = i + 0.5 - (r.bottom - mid) / edge;
      } else pos = i + (mid - r.top) / r.height - 0.5;
      break;
    }
    if (i === chapters.length - 1 && r.bottom <= mid) pos = chapters.length - 1;
  }
  world.setPosition(pos);
}

function heroKey() {
  if (festival) return FEST_LOOK[festival.f.kind].preset;
  if (exp.hero === 'dawneye') return dawnSettled ? 'dawnName' : 'dawnRise';
  return HERO_PRESET[exp.hero];
}

/** pillar 1 (direction C, Cosmic mother): each movement of the page has its own world */
const devKey = (part: string) => `devC_${part}`;
/** pillar 2 (the gilded grimoire): day pages and night pages, each with its own world */
const magKey = (part: string) => `magG_${part}`;
/** pillar 3 (still water, with gold): each chapter has its own world */
const healKey = (part: string) => `heal_${part}`;
/** pillars 4, 5 and 6: each chapter's data-chapter is its world (id_*, div_*, lrn_*); these are their homepage chapters */
const HOME_KEY: Record<string, string> = { identity: 'id_home', divination: 'div_home', learning: 'lrn_home' };

function chapterKeys() {
  return chapters.map((c) => {
    if (c.hasAttribute('data-hero-chapter')) return heroKey();
    if (c.dataset.devChapter) return devKey(c.dataset.devChapter);
    if (c.dataset.magChapter) return magKey(c.dataset.magChapter);
    if (c.dataset.healChapter) return healKey(c.dataset.healChapter);
    if (c.dataset.chapter === 'healing') return healKey('home');
    if (HOME_KEY[c.dataset.chapter!]) return HOME_KEY[c.dataset.chapter!];
    if (c.dataset.chapter === 'magic') return magKey('home');
    if (c.dataset.chapter === 'devotion') return devKey('home');
    return c.dataset.chapter!;
  });
}

/* ----------------------------------------------------------- reveals */

function splitWords(el: HTMLElement) {
  const s = SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'sk-word', aria: 'auto' });
  splits.push(s);
  return s.words;
}

function buildHero() {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-hero]'));
  if (!items.length) return;
  heroTl = gsap.timeline({ paused: true });
  items.forEach((el, i) => {
    const at = i * 0.12;
    heroTl!.set(el, { opacity: 1 }, 0);
    if (el.hasAttribute('data-split')) {
      heroTl!.from(splitWords(el), { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, at);
    } else {
      heroTl!.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, at + 0.15);
    }
  });
  if (heroWanted) heroTl.play();
}

/**
 * The dawn heroes. "Dawn": light rises from below. "Eye at dawn": the light
 * rises, the points gather out of the horizon into the name, and the eye rises
 * like the sun, then stays alive (it watches you and blinks).
 */
function startDawn() {
  dawnTween?.kill();
  heroCalls.forEach((c) => c.kill());
  heroCalls = [];
  const hasHero = !!document.querySelector('[data-hero-chapter]');
  if (!hasHero || (exp.hero !== 'dawn' && exp.hero !== 'dawneye')) { world.dawnProgress = 1; return; }
  if (tier === 'calm') { world.dawnProgress = 1; dawnSettled = true; world.setSequence(chapterKeys()); return; }
  world.dawnProgress = 0;
  dawnTween = gsap.to(world, { dawnProgress: 1, duration: 5.5, ease: 'sine.inOut', delay: 0.2 });
  if (exp.hero === 'dawneye') {
    dawnSettled = false;
    world.setSequence(chapterKeys());
    heroCalls.push(gsap.delayedCall(2.4, () => { dawnSettled = true; world.setSequence(chapterKeys()); anchorName(); }));
    heroCalls.push(gsap.delayedCall(4.6, () => startHeroEye()));
  }
}

/** the name of light forms over the real heading, wherever the layout puts it */
function anchorName() {
  const h1 = document.querySelector<HTMLElement>('.hero-title');
  if (!h1) { world.setNameAnchor(null); return; }
  const masks = Array.from(h1.querySelectorAll<HTMLElement>('.sk-word-mask'));
  let r: DOMRect;
  if (masks.length) {
    const rs = masks.map((m) => m.getBoundingClientRect());
    const l = Math.min(...rs.map((x) => x.left)), t = Math.min(...rs.map((x) => x.top));
    const rr = Math.max(...rs.map((x) => x.right)), b = Math.max(...rs.map((x) => x.bottom));
    r = new DOMRect(l, t, rr - l, b - t);
  } else {
    const range = document.createRange();
    range.selectNodeContents(h1);
    r = range.getBoundingClientRect();
  }
  if (!r.width) return;
  world.setNameAnchor({ cx: r.left + r.width / 2, cy: r.top + r.height / 2 + window.scrollY, w: r.width });
}
window.addEventListener('resize', () => anchorName(), { passive: true });

function playHero() {
  heroWanted = true;
  heroTl?.play();
  world.releaseForms();
  document.querySelector('.chapter-hero')?.classList.add('is-on');
  startDawn();
  if (exp.hero === 'eye' && document.querySelector('.hero-eye')) startHeroEye();
}

/* headings to dust */
let dustOwner: HTMLElement | null = null;
let dustTop = 0;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function dustUpdate(h: HTMLElement, p: number) {
  const can = exp.dust === 'on' && world.isLive && tier !== 'calm';
  if (!can) {
    if (dustOwner) { world.setDust(null, 0); dustOwner = null; }
    h.style.opacity = '';
    return;
  }
  if (p <= 0.001 || p >= 0.999) {
    if (dustOwner === h) { world.setDust(null, 0); dustOwner = null; }
    h.style.opacity = p >= 0.999 ? '0' : '';
    h.classList.remove('is-dusting');
    return;
  }
  if (dustOwner !== h) {
    h.style.opacity = '';
    const s = sampleHeading(h, isPhone() ? 3500 : 9000);
    if (!s) return;
    world.setDust(s.pts, s.n);
    dustOwner = h;
    dustTop = s.top;
    h.classList.add('is-dusting');
  }
  world.setDustProgress(p, h.getBoundingClientRect().top - dustTop);
  // the heading hands over to its dust while the dust still reads as letters
  h.style.opacity = String(1 - smooth(0.03, 0.16, p));
}

function setupReveals() {
  // Reveals play once and stay. (They used to reverse when scrolled back past,
  // which, with positions measured before late layout changes, could leave
  // content invisible while scrolling down.)
  document.querySelectorAll<HTMLElement>('[data-split]:not([data-hero])').forEach((el) => {
    tweens.push(gsap.from(splitWords(el), {
      yPercent: 118, duration: 1.15, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    }));
  });
  document.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
    tweens.push(gsap.from(el, {
      opacity: 0, y: 28, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 96%', once: true },
    }));
  });
  // a short chapter fades as it leaves; a long one never does, so its last lines stay readable
  document.querySelectorAll<HTMLElement>('[data-chapter] > .chapter-inner').forEach((inner) => {
    if (inner.parentElement!.offsetHeight > innerHeight * 1.25) return;
    tweens.push(gsap.to(inner, {
      opacity: 0, y: -80, ease: 'none',
      scrollTrigger: { trigger: inner.parentElement, start: 'bottom 72%', end: 'bottom 16%', scrub: true },
    }));
  });
  // kind words drift gently, like offerings on water
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el, i) => {
    tweens.push(gsap.to(el, {
      yPercent: gsap.utils.random(-6, 6), xPercent: gsap.utils.random(-2.5, 2.5), rotation: gsap.utils.random(-1.4, 1.4),
      duration: gsap.utils.random(4.5, 7.5), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.3,
    }));
  });
  // the yantra on pillar pages draws itself as you read down the page
  const yPaths = document.querySelectorAll<SVGElement>('.yantra .y-path');
  if (yPaths.length) {
    gsap.set(yPaths, { strokeDasharray: 1, strokeDashoffset: 1 });
    tweens.push(gsap.timeline({ scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 } })
      .to(yPaths, { strokeDashoffset: 0, ease: 'none', duration: 1, stagger: 0.35 }));
  }
  document.querySelectorAll<HTMLElement>('[data-chapter] [data-dust]').forEach((h) => {
    ScrollTrigger.create({
      // starts while the heading is still well in view, ends as it leaves the top
      trigger: h, start: 'top 20%', end: 'top -14%',
      onUpdate: (self) => dustUpdate(h, self.progress),
      onLeave: () => dustUpdate(h, 1),
      onLeaveBack: () => dustUpdate(h, 0),
    });
  });
}

function lockScroll(on: boolean) {
  html.classList.toggle('locked', on);
  if (on) lenis?.stop(); else lenis?.start();
}

/** text leans a touch with scroll speed, matching the bend of the world */
function skewText() {
  if (!mainEl) return;
  const on = exp.bend === 'on' && tier !== 'calm';
  const k = on ? world.speed * 2.2 : 0;
  if (Math.abs(k) > 0.02) {
    mainEl.style.transform = `skewY(${k.toFixed(3)}deg)`;
    skewing = true;
  } else if (skewing) {
    mainEl.style.transform = '';
    skewing = false;
  }
}

/* ---------------------------------------------------------------- sky */

let skyTimer = 0;
function applySky() {
  const s = readSky(exp.sky);
  world.setSky(s);
  html.dataset.skySpecial = s.special ?? '';
  const wrap = document.querySelector<HTMLElement>('[data-sky]');
  if (!wrap) return;
  wrap.hidden = exp.sky === 'off';
  wrap.querySelector('[data-sky-icon]')!.innerHTML = moonIcon(s.phase);
  const nA = nextMoon('amavasya');
  const next = nA && s.special !== 'amavasya' ? ` Next Amavasya: ${niceDate(nA.at)}, ${inDays(daysUntil(nA.at))}.` : '';
  if (festival) {
    wrap.querySelector('[data-sky-name]')!.textContent = festival.f.name;
    wrap.querySelector('[data-sky-title]')!.textContent = festival.f.name;
    wrap.querySelector('[data-sky-note]')!.textContent = `${festival.f.note} The site is dressed for the day.${festival.preview ? ' (Preview: chosen in the prototype panel.)' : ''}`;
  } else {
    wrap.querySelector('[data-sky-name]')!.textContent = s.name;
    wrap.querySelector('[data-sky-title]')!.textContent = s.special ? s.name : `${s.name} · tithi ${s.tithi}`;
    wrap.querySelector('[data-sky-note]')!.textContent = s.note + next;
  }
  wrap.querySelector('[data-sky-btn]')!.setAttribute('aria-label', `Tonight's moon: ${s.name}`);
}

/** festival days dress the site: the hero's world, its first line and the moon */
function applyFestival() {
  festival = activeFestival(exp.festival as FestMode);
  html.dataset.festival = festival?.f.kind ?? '';
  if (festival) html.dataset.festivalOn = '1'; else delete html.dataset.festivalOn;
  world.setMoonMode(festival ? FEST_LOOK[festival.f.kind].moon : 0);
  const k = document.querySelector('[data-hero-kicker]');
  if (k) k.textContent = festival ? FEST_LOOK[festival.f.kind].kicker(festival.f, festival.day) : 'Welcome to';
  if (chapters.length && document.querySelector('[data-hero-chapter]')) world.setSequence(chapterKeys());
}

/** the countdown to the next Amavasya, at the end of the homepage */
function renderMoonLine() {
  const el = document.querySelector<HTMLElement>('[data-moon-line]');
  if (!el) return;
  const n = nextMoon('amavasya');
  if (!n) return;
  const d = daysUntil(n.at);
  el.textContent = `Next Amavasya: ${niceDate(n.at)}, ${inDays(d)}. `;
  const a = document.createElement('a');
  a.href = document.querySelector('.chapter-close a.btn-solid')?.getAttribute('href') || '/connect';
  a.dataset.topic = 'A ritual on Amavasya';
  a.textContent = 'Ask about a ritual for that night';
  el.appendChild(a);
}

function skyTick(dt: number) {
  skyTimer += dt;
  if (skyTimer < 60) return;
  skyTimer = 0;
  if (exp.sky === 'now') applySky();
}

/* ------------------------------------------------------------- cursor */

function applyCursor() {
  if (!world) return;
  const liveOk = world.isLive && ['ultra', 'full', 'lighter'].includes(tier);
  if (exp.cursor === 'incense' && liveOk && finePointer() && !incense && !incenseLoading) {
    // the smoke simulation is its own download, fetched only when someone chooses the incense cursor
    incenseLoading = true;
    import('./fluid').then(({ Incense }) => {
      try {
        const c = document.getElementById('incense') as HTMLCanvasElement | null;
        if (c) incense = new Incense(c);
      } catch {
        incense = null;
      }
      applyCursor();
    }).catch(() => { incenseLoading = false; });
  }
  const wantsIncense = exp.cursor === 'incense' && !!incense?.ok && liveOk && finePointer();
  setCursor(exp.cursor !== 'off' && tier !== 'calm', wantsIncense ? 'incense' : 'flame');
  incense?.setActive(wantsIncense, tier === 'lighter' ? 0.6 : 1);
}

/* -------------------------------------------------------------- sound */

function renderSound() {
  document.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) => {
    b.setAttribute('aria-pressed', String(soundIsOn()));
    b.title = soundIsOn() ? 'Turn the sound off' : 'Turn on ambient sound (a tanpura drone, with each pillar adding its own layer)';
  });
}

function soundTick() {
  if (!soundIsOn()) { world.setAudioLevel(soundLevel()); return; }
  const [a, b, t] = world.blend;
  // the Devotion directions each have their own sound layer
  // Magic's night pages share Devotion's cosmic layer; its day pages are the quiet room of the book
  const layer = (k: string) => (k.startsWith('devC_') ? 'cosmic' : k.startsWith('magG_') ? (magPage(k.slice(5)) === 'day' ? 'learning' : 'cosmic')
    : k.startsWith('heal_') ? 'healing' : k.startsWith('id_') ? 'identity' : k.startsWith('div_') ? 'divination' : k.startsWith('lrn_') ? 'learning' : k === 'practice' ? 'divination' : k === 'care' ? 'healing' : k);
  const w: Record<string, number> = {};
  w[layer(a)] = (w[layer(a)] ?? 0) + (1 - t);
  w[layer(b)] = (w[layer(b)] ?? 0) + t;
  setMix(w);
  world.setAudioLevel(soundLevel());
}

/* ------------------------------------------------------------- pages */

function initPage() {
  const main = document.getElementById('main');
  if (!main || main.dataset.init) return;
  main.dataset.init = '1';
  mainEl = main;
  heroWanted = false;
  lastMainHeight = 0;
  mainSizeWatch?.disconnect();
  mainSizeWatch?.observe(main);

  chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  const seq = chapters.length ? chapterKeys() : (main.dataset.sequence || 'hero').split(',').map((k) => (k === 'devotion' ? devKey('hero') : k));
  world.setSequence(seq);
  if (!chapters.length) world.setPosition(0);
  world.forceCss();
  if (!document.querySelector('[data-hero-chapter]')) world.dawnProgress = 1;

  if (tier !== 'calm') {
    lenis = new Lenis({ lerp: 0.085, anchors: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
  }

  const loaderEl = document.getElementById('loader');
  const forceIntro = new URLSearchParams(location.search).has('intro');
  const introSeen = !!read('sk-intro-seen') && !forceIntro;

  if (loaderEl && !introSeen) {
    lockScroll(true);
    runLoader(loaderEl, {
      calm: tier === 'calm',
      world,
      onReveal: playHero,
      onDone: () => {
        lockScroll(false);
        store('sk-intro-seen', '1');
        html.dataset.intro = 'seen';
      },
    });
  } else {
    loaderEl?.remove();
    world.setPosition(0);
    playHero();
  }

  const fontsReady = Promise.race([
    (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 1200)),
  ]);
  fontsReady.then(() => {
    if (main !== document.getElementById('main')) return;
    anchorName(); // measure the heading before its words are lowered for their entrance
    if (tier === 'calm') {
      document.querySelectorAll<HTMLElement>('[data-hero]').forEach((el) => (el.style.opacity = '1'));
    } else {
      buildHero();
      setupReveals();
    }
    ScrollTrigger.refresh();
    revealFound((el) => { if (lenis) lenis.scrollTo(el, { offset: -innerHeight * 0.35 }); else el.scrollIntoView({ block: 'center' }); });
  });

  initConnect();
  const calm = tier === 'calm';
  pageModule('[data-practice]', () => import('./practice'), (m) => { m.initPractice(world); return m.stopPractice; });
  pageModule('[data-invoice]', () => import('./invoice'), (m) => { m.initInvoice(); });
  pageModule('[data-devotion]', () => import('./devotion'), (m) => { m.startDevotion(world, calm); return m.stopDevotion; });
  pageModule('[data-magic]', () => import('./magic'), (m) => { m.startMagic(world, calm); return m.stopMagic; });
  pageModule('[data-healing]', () => import('./healing'), (m) => { m.startHealing(world); return m.stopHealing; });
  pageModule('[data-identity]', () => import('./identity'), (m) => { m.startIdentity(); return m.stopIdentity; });
  pageModule('[data-divination]', () => import('./divination'), (m) => { m.startDivination(world); return m.stopDivination; });
  pageModule('[data-learning]', () => import('./learning'), (m) => { m.startLearning(world); return m.stopLearning; });
  // the demo has its own WebGL, so it follows the level, not whether the 3D world has arrived yet
  pageModule('[data-depth]', () => import('./depth'), (m) => m.initDepth(LIVE.includes(tier)));
  loadMagicFonts(); // for the homepage chapters too
  loadHealingFont();
  loadSettledFonts();
  renderKeep();
  applyFestival();
  renderMoonLine();
  initDiya(world);
  initPath(world, () => { ScrollTrigger.refresh(); lenis?.resize(); });
  applySky();
  renderSound();
  hudRender();
}

function cleanupPage() {
  pageToken++;
  pageStops.forEach((s) => s());
  pageStops = [];
  tweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
  tweens = [];
  ScrollTrigger.getAll().forEach((st) => st.kill());
  splits.forEach((s) => s.revert());
  splits = [];
  heroTl?.kill();
  heroTl = null;
  heroCalls.forEach((c) => c.kill());
  heroCalls = [];
  lenis?.destroy();
  lenis = null;
  chapters = [];
  stopHeroEye();
  resetMagnets();
  if (dustOwner) { world.setDust(null, 0); dustOwner = null; }
  if (mainEl) mainEl.style.transform = '';
  mainEl = null;
  skewing = false;
  html.classList.remove('locked', 'menu-open', 'search-open');
  closeSearch();
  world.setDustBurn(0);
}

/* ------------------------------------------------- experiment switches */

function onExpChange(k: keyof Exp, v: string) {
  if (k === 'forms') { world.setForms(v === 'on'); markParticles(); }
  if (k === 'bend') world.setBend(v === 'on');
  if (k === 'cursor') applyCursor();
  if (k === 'sky') applySky();
  if (k === 'festival') { applyFestival(); applySky(); }


  if (k === 'haptics') { setHaptics(v === 'on'); if (v === 'on') buzz(PATTERNS.choice); }
  if (k === 'page') html.dataset.pageStyle = v;
  if (k === 'dust' && v === 'off' && dustOwner) { dustOwner.style.opacity = ''; world.setDust(null, 0); dustOwner = null; }
  if (k === 'saver') {
    renderSaverNote();
    if (v === 'on' && !read('sk-tier-manual')) { autoProbe = false; setTier('still'); saverNotice(); }
    if (v === 'off' && !read('sk-tier-manual') && tier === 'still') { setTier('full'); autoProbe = true; probe.phase = 0; probe.t = 0; }
  }
  if (k === 'hero') {
    html.dataset.heroVariant = v;
    anchorName();
    if (document.querySelector('[data-hero-chapter]') && chapters.length) {
      dawnSettled = v !== 'dawneye';
      world.setSequence(chapterKeys());
      stopHeroEye();
      if (heroWanted) {
        heroTl?.restart();
        const hero = document.querySelector('.chapter-hero');
        hero?.classList.remove('is-on');
        void (hero as HTMLElement | null)?.offsetWidth;
        hero?.classList.add('is-on');
        startDawn();
        if (v === 'eye') startHeroEye();
      }
    }
  }
}

/* ----------------------------------------------------- connect page */

function initConnect() {
  const form = document.getElementById('connect-form') as HTMLFormElement | null;
  if (!form) return;
  const topicInput = form.querySelector<HTMLInputElement>('#topic');
  const fromUrl = new URLSearchParams(location.search).get('topic');
  const topic = fromUrl || read('sk-topic') || keepTopic();
  store('sk-topic', null); // used once; a later visit through Book or the menu starts from the kept list
  if (topic && topicInput) topicInput.value = topic;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    form.hidden = true;
    const done = document.getElementById('connect-done');
    if (done) done.hidden = false;
    ScrollTrigger.refresh();
  });
}

document.addEventListener('click', (e) => {
  const t = e.target as Element | null;
  const a = t?.closest<HTMLElement>('[data-topic]');
  if (a) store('sk-topic', a.dataset.topic || '');
  if (t?.closest('[data-sound]')) {
    setSound(!soundIsOn());
    buzz(PATTERNS.soundOn);
  }
  const skyBtn = t?.closest('[data-sky-btn]');
  const card = document.querySelector<HTMLElement>('[data-sky-card]');
  if (skyBtn && card) {
    card.hidden = !card.hidden;
    skyBtn.setAttribute('aria-expanded', String(!card.hidden));
  } else if (card && !card.hidden && !t?.closest('[data-sky-card]')) {
    card.hidden = true;
    document.querySelector('[data-sky-btn]')?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const card = document.querySelector<HTMLElement>('[data-sky-card]');
  if (card && !card.hidden) { card.hidden = true; document.querySelector<HTMLElement>('[data-sky-btn]')?.focus(); }
});

let refreshTimer = 0;
function refreshSoon(ms = 120) {
  clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => { ScrollTrigger.refresh(); lenis?.resize(); }, ms);
}
document.addEventListener('toggle', () => refreshSoon(60), true);
// fonts that arrive late change the height of headings, and so where everything below sits
(document as Document & { fonts?: FontFaceSet }).fonts?.addEventListener?.('loadingdone', () => refreshSoon());
// any other change in the page's height (lists opening, images, layout) re-measures the scroll positions
let lastMainHeight = 0;
const mainSizeWatch = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
  const h = Math.round(entries[0].contentRect.height);
  if (Math.abs(h - lastMainHeight) > 4) { lastMainHeight = h; refreshSoon(200); }
}) : null;

/* --------------------------------------------------- prototype panel */

let hudTimer = 0;
function hudInit() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const pref = read('sk-hud');
  if (pref !== 'open') {
    hud.dataset.open = 'false';
    hud.querySelector('[data-hud-toggle]')?.setAttribute('aria-expanded', 'false');
  }
  delete html.dataset.hudClosed; // from here the panel's own state rules
  hud.querySelector('[data-hud-toggle]')?.addEventListener('click', () => {
    const open = hud.dataset.open !== 'false';
    hud.dataset.open = open ? 'false' : 'true';
    hud.querySelector('[data-hud-toggle]')?.setAttribute('aria-expanded', String(!open));
    store('sk-hud', open ? 'closed' : 'open');
  });
  hud.querySelectorAll<HTMLButtonElement>('[data-tier-btn]').forEach((b) => {
    b.addEventListener('click', () => {
      const t = b.dataset.tierBtn as Tier | 'auto';
      chooseManual(t);
      if (t === 'auto' || t === 'calm' || tier === 'calm') {
        const u = new URL(location.href);
        if (u.searchParams.has('tier')) { u.searchParams.delete('tier'); history.replaceState(history.state, '', u); }
        location.reload();
        return;
      }
      autoProbe = false;
      setTier(t);
    });
  });
  hud.querySelector('[data-hud-replay]')?.addEventListener('click', () => {
    store('sk-intro-seen', null);
    const home = document.querySelector<HTMLAnchorElement>('.wordmark');
    location.href = home ? home.href : location.href;
  });
  initExpPanel(onExpChange, world);
  renderSaverNote();
}

function hudRender() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const manual = !!read('sk-tier-manual');
  const label = hud.querySelector('[data-hud-tier]');
  if (label) label.textContent = `${TIER_LABEL[tier]}${manual ? '' : autoProbe ? ' · measuring' : ' · auto'}`;
  hud.querySelectorAll<HTMLButtonElement>('[data-tier-btn]').forEach((b) => {
    const v = b.dataset.tierBtn;
    b.setAttribute('aria-pressed', String(manual ? v === tier : v === 'auto'));
  });
  renderExpPanel();
}

function hudTick(dt: number) {
  hudTimer += dt;
  if (hudTimer < 0.5) return;
  hudTimer = 0;
  const hud = document.getElementById('hud');
  if (!hud || hud.dataset.open === 'false') return;
  const f = hud.querySelector('[data-hud-fps]');
  if (f) f.textContent = `${Math.round(meter.fps)} fps`;
  const c = hud.querySelector('[data-hud-chapter]');
  const ck = world.chapterKey;
  const dv = /^devC_(\w+)$/.exec(ck);
  const mg = /^magG_(\w+)$/.exec(ck);
  const hl = /^heal_(\w+)$/.exec(ck);
  const dp = /^(id|div|lrn)_(\w+)$/.exec(ck);
  if (c) c.textContent = LABELS[ck] ?? (dv ? `Devotion · ${dv[1]}` : mg ? `Magic · ${mg[1]} (${magPage(mg[1])} page)` : hl ? `Healing · ${hl[1]}` : dp ? `${({ id: 'Identity', div: 'Divination', lrn: 'Learning' } as Record<string, string>)[dp[1]]} · ${dp[2]}` : ck);
  const p = hud.querySelector('[data-hud-points]');
  if (p) {
    const n = world.pointCount;
    p.textContent = LIVE.includes(tier) && !world.ready ? 'loading the 3D world…' : tier === 'ultra' && world.ultraBuildingNow ? 'building 240,000…' : n ? n.toLocaleString('en-IN') : 'none';
  }
  if (autoProbe) hudRender();
}

/* -------------------------------------------------------------- boot */

// a page change can be cut short when a phone's address bar resizes the screen
// mid-animation; the new page still arrives, so this is not an error worth showing
window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason as Error | undefined)?.message || e.reason || '');
  if (/transition was (aborted|skipped)/i.test(msg)) e.preventDefault();
});

function boot() {
  loadExp();
  html.dataset.heroVariant = exp.hero;
  html.dataset.pageStyle = exp.page;
  setHaptics(exp.haptics === 'on');
  dawnSettled = exp.hero !== 'dawneye';

  world = new WorldHandle(hasWebGL());
  world.setForms(exp.forms === 'on');
  world.setBend(exp.bend === 'on');
  world.onLost(() => {
    autoProbe = false;
    setTier('still');
    rememberAuto('still');
  });
  (window as unknown as { sarvakali: unknown }).sarvakali = { world, exp, setExp, ScrollTrigger, get tier() { return tier; } };


  const manual = manualTier();
  let t: Tier;
  let showSaver = false;
  if (manual) t = manual;
  else if (prefersReducedMotion()) t = 'calm';
  else if (saverOn()) { t = 'still'; showSaver = true; }
  else {
    const remembered = rememberedTier();
    t = remembered ?? 'full';
    autoProbe = !remembered;
  }
  if (!world.available && (t === 'ultra' || t === 'full' || t === 'lighter')) { t = 'still'; autoProbe = false; }
  setTier(t);
  if (showSaver) setTimeout(saverNotice, 1500);

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    meter.push(dt);
    lenis?.raf(time * 1000);
    trackChapters();
    world.setVelocity(lenis ? lenis.velocity : 0);
    soundTick();
    world.update(dt);
    if (incense) {
      const pal = world.palette;
      incense.setColors(pal.glow.map((v, i) => v * 0.55 + pal.inkSoft[i] * 0.45), pal.ink, pal.light);
      incense.update(dt);
    }
    skewText();
    runAutoProbe(dt);
    watchdog(dt);
    skyTick(dt);
    hudTick(dt);
  });

  // the pointer: light follows it, forms part around it, incense smoke rises from it
  let lastX = 0, lastY = 0, lastT = 0;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    world.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    const now = performance.now();
    const dtm = Math.max(1, now - lastT);
    const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dtm; // px per ms
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    if (exp.touch === 'on') world.setTouch(e.clientX, e.clientY, Math.min(1, 0.25 + speed * 0.5));
    incense?.move(e.clientX, e.clientY);
  }, { passive: true });
  html.addEventListener('pointerleave', () => incense?.leave());
  const onTouch = (e: TouchEvent) => {
    if (exp.touch !== 'on' || !e.touches.length) return;
    const t0 = e.touches[0];
    world.setTouch(t0.clientX, t0.clientY, 1);
  };
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });

  onSoundChange((on) => { renderSound(); if (on) ring('choice'); });
  initKeep();
  initMenu(world);

  initPwa();
  initSearch({
    preview: (preset) => world.setSequence([preset]),
    restore: () => world.setSequence(chapters.length ? chapterKeys() : (mainEl?.dataset.sequence || 'hero').split(',')),
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Element | null)?.closest('[data-device-test]')) return;
    const dlg = document.getElementById('report-dialog') as HTMLDialogElement | null;
    if (!dlg) return;
    const step = dlg.querySelector('[data-report-step]')!;
    const text = dlg.querySelector<HTMLTextAreaElement>('[data-report-text]')!;
    const copy = dlg.querySelector<HTMLButtonElement>('[data-report-copy]')!;
    if (testing) { if (!dlg.open) dlg.showModal(); return; } // one test at a time: reopening shows the one running
    text.value = '';
    copy.disabled = true;
    dlg.showModal();
    testing = true;
    runDeviceTest({
      tier: () => tier,
      setTier: (t) => setTier(t),
      fps: () => meter.fps,
      resetMeter: () => meter.reset(),
      ensureWorld,
      points: () => world.pointCount,
    }, (m) => (step.textContent = m)).then((report) => {
      text.value = report;
      copy.disabled = false;
      step.textContent = 'Done. Copy the report and send it to whoever asked you to test.';
    }).catch(() => {
      step.textContent = 'The test stopped early. Please try again.';
    }).finally(() => { testing = false; });
    copy.onclick = async () => { try { await navigator.clipboard.writeText(text.value); copy.textContent = 'Copied'; } catch { text.select(); } };
    (dlg.querySelector('[data-report-close]') as HTMLButtonElement).onclick = () => dlg.close();
  });
  // the header turns frosted once the page has moved
  let scrolledRaf = 0;
  const markScrolled = () => { scrolledRaf = 0; html.classList.toggle('is-scrolled', scrollY > 24); };
  addEventListener('scroll', () => { if (!scrolledRaf) scrolledRaf = requestAnimationFrame(markScrolled); }, { passive: true });
  document.addEventListener('astro:page-load', markScrolled);
  initTransitions(world, () => tier === 'calm');
  initCard(world);

  document.addEventListener('astro:before-preparation', () => buzz(PATTERNS.pageChange));
  document.addEventListener('astro:before-swap', cleanupPage);
  document.addEventListener('astro:after-swap', () => {
    closeMenu(true);
    html.classList.add('js');
    html.classList.toggle('x-cursor', cursorIsActive());
    html.dataset.tier = tier;
    html.dataset.heroVariant = exp.hero;
    html.dataset.pageStyle = exp.page;
    if (world.ready) html.dataset.world = 'ready';
    html.dataset.festival = festival?.f.kind ?? '';
    if (festival) html.dataset.festivalOn = '1';
    markParticles();
    if (read('sk-intro-seen')) html.dataset.intro = 'seen';
    world.forceCss();
    applySky();
  });
  document.addEventListener('astro:page-load', initPage);

  hudInit();
  initPage();
}

boot();

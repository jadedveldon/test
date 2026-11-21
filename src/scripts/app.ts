import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { World } from './world/World';
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
  type Tier,
} from './tiers';
import { moonIcon, readSky } from './sky';
import { onSoundChange, ring, setMix, setSound, soundIsOn, soundLevel } from './audio';
import { PATTERNS, buzz, setHaptics } from './haptics';
import { Incense } from './fluid';
import { initCard } from './card';
import { initDiya } from './diya';
import { initPath } from './path';
import { sampleHeading } from './dust';
import { initDepth } from './depth';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const LABELS: Record<string, string> = {
  loader: 'Intro', hero: 'Hero · living eye', heroName: 'Hero · name of light', dawn: 'Hero · dawn',
  dawnRise: 'Hero · eye at dawn (rising)', dawnName: 'Hero · eye at dawn', connect: 'Connect',
  devotion: 'Devotion & the Unseen', magic: 'Witchcraft & Magic', healing: 'Healing & Inner Work',
  identity: 'Identity, Intimacy & the Body', divination: 'Divination & Insight', learning: 'Learning', close: 'Close',
};

let world: World;
let incense: Incense | null = null;
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
let depthDispose: (() => void) | null = null;
const meter = new FpsMeter();
const probe = { phase: 0, t: 0 };
const finePointer = () => matchMedia('(pointer: fine)').matches;
const isPhone = () => matchMedia('(pointer: coarse)').matches && innerWidth < 900;

/* ------------------------------------------------------------- tiers */

function setTier(t: Tier) {
  tier = t;
  html.dataset.tier = t;
  world.setTier(t);
  markParticles();
  applyCursor();
  hudRender();
}

function markParticles() {
  html.dataset.particles = world.isLive && exp.forms === 'on' ? 'on' : 'off';
}

/** a desktop with plenty of cores and memory, where 240,000 points are worth trying */
function strongMachine() {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return finePointer() && (navigator.hardwareConcurrency || 0) >= 8 && (mem === undefined || mem >= 8) && !saverOn();
}

function runAutoProbe(dt: number) {
  if (!autoProbe) return;
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
  if (autoProbe || read('sk-tier-manual') || !['ultra', 'full', 'lighter'].includes(tier) || document.hidden) return;
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
  let pos = 0;
  for (let i = 0; i < chapters.length; i++) {
    const r = chapters[i].getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) { pos = i + (mid - r.top) / r.height - 0.5; break; }
    if (i === chapters.length - 1 && r.bottom <= mid) pos = chapters.length - 1;
  }
  world.setPosition(pos);
}

function heroKey() {
  if (exp.hero === 'dawneye') return dawnSettled ? 'dawnName' : 'dawnRise';
  return HERO_PRESET[exp.hero];
}

function chapterKeys() {
  return chapters.map((c) => (c.hasAttribute('data-hero-chapter') ? heroKey() : c.dataset.chapter!));
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
  document.querySelectorAll<HTMLElement>('[data-split]:not([data-hero])').forEach((el) => {
    tweens.push(gsap.from(splitWords(el), {
      yPercent: 118, duration: 1.15, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' },
    }));
  });
  document.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
    tweens.push(gsap.from(el, {
      opacity: 0, y: 32, duration: 1.0, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' },
    }));
  });
  document.querySelectorAll<HTMLElement>('[data-chapter] > .chapter-inner').forEach((inner) => {
    tweens.push(gsap.to(inner, {
      opacity: 0, y: -80, ease: 'none',
      scrollTrigger: { trigger: inner.parentElement, start: 'bottom 72%', end: 'bottom 16%', scrub: true },
    }));
  });
  document.querySelectorAll<HTMLElement>('[data-chapter] [data-dust]').forEach((h) => {
    ScrollTrigger.create({
      // starts while the heading is still well in view, ends as it leaves the top
      trigger: h, start: 'top 30%', end: 'top -12%',
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
  wrap.querySelector('[data-sky-name]')!.textContent = s.name;
  wrap.querySelector('[data-sky-title]')!.textContent = s.special ? s.name : `${s.name} · tithi ${s.tithi}`;
  wrap.querySelector('[data-sky-note]')!.textContent = s.note;
  wrap.querySelector('[data-sky-btn]')!.setAttribute('aria-label', `Tonight's moon: ${s.name}`);
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
  const w: Record<string, number> = {};
  w[a] = (w[a] ?? 0) + (1 - t);
  w[b] = (w[b] ?? 0) + t;
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

  chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  const seq = chapters.length ? chapterKeys() : (main.dataset.sequence || 'hero').split(',');
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
  });

  initConnect();
  initDiya(world);
  initPath(world, () => { ScrollTrigger.refresh(); lenis?.resize(); });
  depthDispose = initDepth(world.isLive && tier !== 'calm');
  applySky();
  renderSound();
  hudRender();
}

function cleanupPage() {
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
  depthDispose?.();
  depthDispose = null;
  if (dustOwner) { world.setDust(null, 0); dustOwner = null; }
  if (mainEl) mainEl.style.transform = '';
  mainEl = null;
  skewing = false;
  html.classList.remove('locked');
}

/* ------------------------------------------------- experiment switches */

function onExpChange(k: keyof Exp, v: string) {
  if (k === 'forms') { world.setForms(v === 'on'); markParticles(); }
  if (k === 'bend') world.setBend(v === 'on');
  if (k === 'cursor') applyCursor();
  if (k === 'sky') applySky();
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
  const topic = fromUrl || read('sk-topic');
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
document.addEventListener('toggle', () => {
  clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => { ScrollTrigger.refresh(); lenis?.resize(); }, 60);
}, true);

/* --------------------------------------------------- prototype panel */

let hudTimer = 0;
function hudInit() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  const pref = read('sk-hud');
  if (pref === 'closed' || (!pref && innerWidth < 600)) {
    hud.dataset.open = 'false';
    hud.querySelector('[data-hud-toggle]')?.setAttribute('aria-expanded', 'false');
  }
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
      if (t === 'auto' || t === 'calm' || tier === 'calm') { location.reload(); return; }
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
  if (c) c.textContent = LABELS[world.chapterKey] ?? world.chapterKey;
  const p = hud.querySelector('[data-hud-points]');
  if (p) {
    const n = world.pointCount;
    p.textContent = tier === 'ultra' && world.ultraBuildingNow ? 'building 240,000…' : n ? n.toLocaleString('en-IN') : 'none';
  }
  if (autoProbe) hudRender();
}

/* -------------------------------------------------------------- boot */

function boot() {
  loadExp();
  html.dataset.heroVariant = exp.hero;
  html.dataset.pageStyle = exp.page;
  setHaptics(exp.haptics === 'on');
  dawnSettled = exp.hero !== 'dawneye';

  const canvas = document.getElementById('world-canvas') as HTMLCanvasElement;
  world = new World(canvas);
  world.setForms(exp.forms === 'on');
  world.setBend(exp.bend === 'on');
  world.onLost(() => {
    autoProbe = false;
    setTier('still');
    rememberAuto('still');
  });
  (window as unknown as { sarvakali: unknown }).sarvakali = { world, exp, setExp, ScrollTrigger, get tier() { return tier; } };

  if (finePointer()) {
    try {
      const c = document.getElementById('incense') as HTMLCanvasElement | null;
      if (c) incense = new Incense(c);
    } catch {
      incense = null;
    }
  }

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
  initTransitions(world, () => tier === 'calm');
  initCard(world);

  document.addEventListener('astro:before-preparation', () => buzz(PATTERNS.pageChange));
  document.addEventListener('astro:before-swap', cleanupPage);
  document.addEventListener('astro:after-swap', () => {
    html.classList.add('js');
    html.classList.toggle('x-cursor', cursorIsActive());
    html.dataset.tier = tier;
    html.dataset.heroVariant = exp.hero;
    html.dataset.pageStyle = exp.page;
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

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { World } from './world/World';
import { runLoader } from './loader';
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

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const LABELS: Record<string, string> = {
  loader: 'Intro', hero: 'Hero', connect: 'Connect', devotion: 'Devotion & the Unseen', magic: 'Witchcraft & Magic',
  healing: 'Healing & Inner Work', identity: 'Identity, Intimacy & the Body', divination: 'Divination & Insight',
  learning: 'Learning', close: 'Close',
};

let world: World;
let tier: Tier = 'full';
let autoProbe = false;
let lenis: Lenis | null = null;
let chapters: HTMLElement[] = [];
let tweens: gsap.core.Animation[] = [];
let splits: SplitText[] = [];
let heroTl: gsap.core.Timeline | null = null;
let heroWanted = false;
const meter = new FpsMeter();
const probe = { phase: 0, t: 0 };

/* ------------------------------------------------------------- tiers */

function setTier(t: Tier) {
  tier = t;
  html.dataset.tier = t;
  world.setTier(t);
  hudRender();
}

function runAutoProbe(dt: number) {
  if (!autoProbe) return;
  probe.t += dt;
  // warm up, then measure two seconds; step down once or twice if needed
  if (probe.phase === 0 && probe.t > 2.5) { meter.reset(); probe.phase = 1; probe.t = 0; }
  else if (probe.phase === 1 && probe.t > 2) {
    const fps = meter.fps;
    if (tier === 'full' && fps < 45) { setTier('lighter'); meter.reset(); probe.phase = 2; probe.t = 0; }
    else { rememberAuto(tier); autoProbe = false; }
  } else if (probe.phase === 2 && probe.t > 2) {
    if (meter.fps < 26) setTier('still');
    rememberAuto(tier);
    autoProbe = false;
  }
}

/* ---------------------------------------------------------- chapters */

function trackChapters() {
  if (!chapters.length) { world.setPosition(0); return; }
  const mid = innerHeight * 0.5;
  let pos = 0;
  for (let i = 0; i < chapters.length; i++) {
    const r = chapters[i].getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) { pos = i + (mid - r.top) / r.height - 0.5; break; }
    if (i === chapters.length - 1 && r.bottom <= mid) pos = chapters.length - 1;
  }
  world.setPosition(pos);
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

function playHero() {
  heroWanted = true;
  heroTl?.play();
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
  // each chapter dissolves upward as the next one arrives
  document.querySelectorAll<HTMLElement>('[data-chapter] > .chapter-inner').forEach((inner) => {
    tweens.push(gsap.to(inner, {
      opacity: 0, y: -80, ease: 'none',
      scrollTrigger: { trigger: inner.parentElement, start: 'bottom 72%', end: 'bottom 16%', scrub: true },
    }));
  });
}

function lockScroll(on: boolean) {
  html.classList.toggle('locked', on);
  if (on) lenis?.stop(); else lenis?.start();
}

/* ------------------------------------------------------------- pages */

function initPage() {
  const main = document.getElementById('main');
  if (!main || main.dataset.init) return;
  main.dataset.init = '1';
  heroWanted = false;

  chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  const seq = chapters.length ? chapters.map((c) => c.dataset.chapter!) : (main.dataset.sequence || 'hero').split(',');
  world.setSequence(seq);
  world.forceCss();

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
    (document as any).fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 1200)),
  ]);
  fontsReady.then(() => {
    if (main !== document.getElementById('main')) return; // already navigated away
    if (tier === 'calm') {
      document.querySelectorAll<HTMLElement>('[data-hero]').forEach((el) => (el.style.opacity = '1'));
    } else {
      buildHero();
      setupReveals();
    }
    ScrollTrigger.refresh();
  });

  initConnect();
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
  lenis?.destroy();
  lenis = null;
  chapters = [];
  html.classList.remove('locked');
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

// remember which category someone asked about, for the Connect page
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest<HTMLElement>('[data-topic]');
  if (a) store('sk-topic', a.dataset.topic || '');
});

// opening a subcategory changes the page height
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
      // calm and auto change how the page itself is set up, so reload
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
  if (autoProbe) hudRender();
}

/* -------------------------------------------------------------- boot */

function boot() {
  const canvas = document.getElementById('world-canvas') as HTMLCanvasElement;
  world = new World(canvas);

  const manual = manualTier();
  let t: Tier;
  if (manual) t = manual;
  else if (prefersReducedMotion()) t = 'calm';
  else {
    const remembered = rememberedTier();
    t = remembered ?? 'full';
    autoProbe = !remembered;
  }
  if (!world.available && (t === 'full' || t === 'lighter')) { t = 'still'; autoProbe = false; }
  setTier(t);

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    meter.push(dt);
    lenis?.raf(time * 1000);
    trackChapters();
    world.setVelocity(lenis ? lenis.velocity : 0);
    world.update(dt);
    runAutoProbe(dt);
    hudTick(dt);
  });

  window.addEventListener('pointermove', (e) => {
    world.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  }, { passive: true });

  document.addEventListener('astro:before-swap', cleanupPage);
  document.addEventListener('astro:after-swap', () => {
    // the router copies the new page's <html> attributes, so restore ours
    html.classList.add('js');
    html.dataset.tier = tier;
    if (read('sk-intro-seen')) html.dataset.intro = 'seen';
    world.forceCss();
  });
  document.addEventListener('astro:page-load', initPage);

  hudInit();
  initPage();
}

boot();

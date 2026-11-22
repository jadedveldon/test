import gsap from 'gsap';
import { DIRECTIONS, type DirKey } from '../data/devotion';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 1, Devotion & the Unseen: the three directions being compared, and
 * each one's signature moment.
 *   A · Midnight temple: offer aarti by circling the lamp around the eye
 *   B · Smoke and ash:   the opening is veiled in smoke that parts as you move
 *   C · Cosmic mother:   turn the great yantra until it comes into alignment
 */

const loaded = new Set<string>();
export function applyDirection(dir: DirKey) {
  document.documentElement.dataset.dev = dir;
  const d = DIRECTIONS.find((x) => x.key === dir);
  if (d?.type.fontHref && !loaded.has(d.type.fontHref)) {
    loaded.add(d.type.fontHref);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = d.type.fontHref;
    document.head.appendChild(l);
  }
  document.querySelectorAll<HTMLElement>('[data-dev-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.devSet === dir)));
}

/* ------------------------------------------------------- A · aarti */

function petals() {
  const box = document.createElement('div');
  box.className = 'petals';
  document.body.appendChild(box);
  const colours = ['#f2a52b', '#f7c548', '#e8731c', '#c8321e'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('span');
    p.style.background = colours[i % colours.length];
    p.style.left = `${Math.random() * 100}%`;
    box.appendChild(p);
    gsap.fromTo(p, { y: -30 - Math.random() * 200, rotation: Math.random() * 360, opacity: 1 },
      { y: innerHeight + 40, x: (Math.random() - 0.5) * 160, rotation: `+=${360 + Math.random() * 360}`, duration: 3.2 + Math.random() * 2.4, ease: 'power1.in', delay: Math.random() * 0.8 });
  }
  setTimeout(() => box.remove(), 6500);
}

function initAarti(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const lamp = root.querySelector<SVGGElement>('[data-aarti-lamp]')!;
  const label = root.querySelector<HTMLElement>('[data-aarti-count]')!;
  const R = 118;
  const st = { a: -90, total: 0, circles: 0, done: false };
  let dragging = false;
  let last = 0;
  const place = () => {
    const r = (st.a * Math.PI) / 180;
    lamp.setAttribute('transform', `translate(${(Math.cos(r) * R).toFixed(1)} ${(Math.sin(r) * R).toFixed(1)})`);
  };
  const advance = (delta: number) => {
    if (st.done) return;
    st.a += delta;
    st.total += delta;
    place();
    const c = Math.floor(Math.abs(st.total) / 360);
    if (c > st.circles) {
      st.circles = c;
      if (c < 3) { ring('choice'); buzz([8]); label.textContent = `${c} of 3 circles`; world.flash(0.25); }
      else {
        st.done = true;
        label.textContent = 'Your aarti is offered';
        ring('diya');
        buzz(PATTERNS.diya);
        world.flash(0.9);
        world.impulse(1.6);
        petals();
        setTimeout(() => { st.done = false; st.total = 0; st.circles = 0; label.textContent = 'Circle the lamp around the eye'; }, 5000);
      }
    }
  };
  const angleOf = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
  };
  const down = (e: PointerEvent) => { dragging = true; last = angleOf(e); svg.setPointerCapture(e.pointerId); root.classList.add('is-holding'); };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const a = angleOf(e);
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last = a;
    advance(d);
  };
  const up = () => { dragging = false; root.classList.remove('is-holding'); };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  const auto = root.querySelector<HTMLButtonElement>('[data-aarti-auto]')!;
  const autoClick = () => {
    if (st.done) return;
    const o = { v: 0 };
    let prev = 0;
    gsap.to(o, { v: 3 * 360 + 2, duration: 5.4, ease: 'sine.inOut', onUpdate: () => { advance(o.v - prev); prev = o.v; } });
  };
  auto.addEventListener('click', autoClick);
  place();
  return () => { svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); auto.removeEventListener('click', autoClick); };
}

/* ------------------------------------------------- B · part the smoke */

function smokeTexture(size = 160) {
  // soft fractal noise, made once: the smoke's grain
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const img = x.createImageData(size, size);
  const g = (n: number) => { const t: number[] = []; for (let i = 0; i < n * n; i++) t.push(Math.random()); return t; };
  const layers = [8, 16, 32, 64].map((n) => ({ n, t: g(n) }));
  const sample = (l: { n: number; t: number[] }, u: number, v: number) => {
    const fx = u * l.n, fy = v * l.n, x0 = Math.floor(fx) % l.n, y0 = Math.floor(fy) % l.n;
    const x1 = (x0 + 1) % l.n, y1 = (y0 + 1) % l.n, sx = fx - Math.floor(fx), sy = fy - Math.floor(fy);
    const s = (a: number) => a * a * (3 - 2 * a);
    const a = l.t[y0 * l.n + x0] + (l.t[y0 * l.n + x1] - l.t[y0 * l.n + x0]) * s(sx);
    const b = l.t[y1 * l.n + x0] + (l.t[y1 * l.n + x1] - l.t[y1 * l.n + x0]) * s(sx);
    return a + (b - a) * s(sy);
  };
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    let v = 0, amp = 0.55;
    for (const l of layers) { v += sample(l, xx / size, y / size) * amp; amp *= 0.5; }
    v = Math.min(1, Math.max(0, (v - 0.2) * 1.25));
    const i = (y * size + xx) * 4;
    const shade = 70 + v * 90; // ash grey, warmer in the thick parts
    img.data[i] = shade * 1.02; img.data[i + 1] = shade; img.data[i + 2] = shade * 0.96;
    img.data[i + 3] = 40 + v * 170;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function initSmoke(canvas: HTMLCanvasElement) {
  const section = canvas.parentElement!;
  const x = canvas.getContext('2d');
  if (!x || matchMedia('(prefers-reduced-motion: reduce)').matches) { canvas.hidden = true; return () => {}; }
  const tex = smokeTexture();
  const scale = 0.5;
  let w = 0, h = 0, raf = 0, t = 0, last = performance.now(), visible = true;
  const trail: [number, number][] = [];
  const size = () => {
    const r = section.getBoundingClientRect();
    w = canvas.width = Math.max(2, Math.round(r.width * scale));
    h = canvas.height = Math.max(2, Math.round(r.height * scale));
  };
  const drawTex = (alpha: number, ox: number) => {
    x.globalAlpha = alpha;
    const tw = 420 * scale * 2.2, th = tw;
    for (let yy = -th; yy < h + th; yy += th) for (let xx = -tw; xx < w + tw; xx += tw) x.drawImage(tex, xx + (ox % tw), yy - (t * 6) % th, tw, th);
    x.globalAlpha = 1;
  };
  const erase = (px: number, py: number, r: number, a = 1) => {
    const gr = x.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(0,0,0,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = gr;
    x.fillRect(px - r, py - r, r * 2, r * 2);
    x.globalCompositeOperation = 'source-over';
  };
  size();
  x.globalCompositeOperation = 'source-over';
  drawTex(1, 0); drawTex(1, 140);
  // the smoke breathes apart once by itself, so the name can be read even before you move
  const breath = { p: 0 };
  gsap.to(breath, { p: 1, duration: 2.6, delay: 0.6, ease: 'sine.inOut' });
  const onMove = (e: PointerEvent | TouchEvent) => {
    const r = section.getBoundingClientRect();
    const pt = 'touches' in e ? e.touches[0] : e;
    if (!pt) return;
    if (pt.clientY < r.top || pt.clientY > r.bottom) return;
    trail.push([(pt.clientX - r.left) * scale, (pt.clientY - r.top) * scale]);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('resize', size, { passive: true });
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
  io.observe(section);
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    t += dt;
    // smoke drifts back in, and thins a little, settling at a soft haze
    drawTex(0.45 * dt, t * 9);
    x.globalCompositeOperation = 'destination-out';
    x.globalAlpha = 0.55 * dt;
    x.fillRect(0, 0, w, h);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    if (breath.p > 0 && breath.p < 1) {
      const bx = w * (0.08 + breath.p * 0.5), by = h * (0.42 + Math.sin(breath.p * Math.PI) * 0.08);
      erase(bx, by, 220 * scale, 0.35);
    }
    while (trail.length) { const [px, py] = trail.shift()!; erase(px, py, 120 * scale, 1); }
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('touchmove', onMove); window.removeEventListener('resize', size); };
}

/* ------------------------------------------------- C · turn the yantra */

function initYantra(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const g = root.querySelector<SVGGElement>('[data-yt-rot]')!;
  const hint = root.querySelector<HTMLElement>('[data-yt-hint]')!;
  const st = { rot: 47, vel: 0, turned: 0, aligned: false };
  let dragging = false, last = 0, lastT = 0, raf = 0, prevNow = performance.now();
  const angleOf = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
  };
  const off = () => { const m = ((st.rot % 120) + 120) % 120; return m > 60 ? m - 120 : m; };
  const check = () => {
    const o = off();
    if (!st.aligned && st.turned > 50 && Math.abs(o) < 4 && Math.abs(st.vel) < 160) {
      st.aligned = true;
      st.vel = 0;
      gsap.to(st, { rot: st.rot - o, duration: 0.5, ease: 'power3.out' });
      root.classList.add('is-aligned');
      hint.textContent = 'Aligned. The ten Mahavidyas surround the bindu.';
      ring('card');
      buzz(PATTERNS.cardFlip);
      world.flash(0.8);
      world.impulse(1.2);
    } else if (st.aligned && Math.abs(o) > 10) {
      st.aligned = false;
      st.turned = 0;
      root.classList.remove('is-aligned');
      hint.textContent = 'Drag to turn the yantra into alignment';
    }
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prevNow) / 1000);
    prevNow = now;
    if (!dragging && Math.abs(st.vel) > 0.5) { st.rot += st.vel * dt; st.turned += Math.abs(st.vel * dt); st.vel *= Math.exp(-dt * 2.6); }
    g.setAttribute('transform', `rotate(${st.rot.toFixed(2)})`);
    svg.setAttribute('aria-valuenow', String(Math.round(((st.rot % 360) + 360) % 360)));
    check();
  };
  const down = (e: PointerEvent) => { dragging = true; last = angleOf(e); lastT = performance.now(); st.vel = 0; svg.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const a = angleOf(e), now = performance.now();
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    st.rot += d;
    st.turned += Math.abs(d);
    st.vel = (d / Math.max(1, now - lastT)) * 1000;
    last = a; lastT = now;
  };
  const up = () => { dragging = false; };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { st.rot += 5; st.turned += 5; e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { st.rot -= 5; st.turned += 5; e.preventDefault(); }
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', key);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('keydown', key); };
}

/* ------------------------------------------------------------- page */

let cleanups: (() => void)[] = [];

export function stopDevotion() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

/** start the signature moment of the chosen direction on the Devotion page */
export function startDevotion(world: World, dir: DirKey) {
  stopDevotion();
  const page = document.querySelector('[data-devotion]');
  if (!page) return;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-aarti]'); if (el) cleanups.push(initAarti(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLCanvasElement>('[data-smoke]'); if (el) cleanups.push(initSmoke(el)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-yantra]'); if (el) { el.classList.remove('is-aligned'); cleanups.push(initYantra(el, world)); } }
}

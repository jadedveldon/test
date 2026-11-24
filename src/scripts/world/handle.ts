import { PRESETS, dampInto, mixInto, toNumeric, type Numeric } from './presets';
import type { SkyInput, World } from './World';
import type { Tier } from '../tiers';

type Anchor = { cx: number; cy: number; w: number } | null;

/**
 * Stands in for the 3D world while it downloads, so the page can show its
 * words straight away. Everything the page asks of the world is remembered and
 * handed over the moment the real world arrives. Until then (and for visitors
 * on Still, Calm or data saver, who never download the 3D code at all) it
 * still blends the page colours chapter by chapter, exactly like the world.
 */
export class WorldHandle {
  impl: World | null = null;
  private readyFns: (() => void)[] = [];
  private lostFn: (() => void) | null = null;
  private st = {
    seq: ['loader'], pos: 0, tier: 'full' as Tier, forms: true, bend: true,
    sky: null as SkyInput | null, anchor: null as Anchor, released: false, mala: 0, moon: 0,
  };
  private veilV = 0;
  private dawnV = 1;
  private seqN: Numeric[] = [toNumeric(PRESETS.loader)];
  private target: Numeric = toNumeric(PRESETS.loader);
  private cur: Numeric = toNumeric(PRESETS.loader);
  private lastCss = '';

  constructor(readonly webgl: boolean) {}

  get ready() {
    return !!this.impl;
  }

  onReady(fn: () => void) {
    if (this.impl) fn(); else this.readyFns.push(fn);
  }

  attach(w: World) {
    this.impl = w;
    const s = this.st;
    if (this.lostFn) w.onLost(this.lostFn);
    w.setTier(s.tier);
    w.setForms(s.forms);
    w.setBend(s.bend);
    if (s.sky) w.setSky(s.sky);
    w.setNameAnchor(s.anchor);
    w.setSequence(s.seq);
    w.setPosition(s.pos);
    w.setMalaCount(s.mala);
    w.setMoonMode(s.moon);
    w.veil = this.veilV;
    w.dawnProgress = this.dawnV;
    if (s.released) w.releaseForms();
    w.forceCss();
    this.readyFns.splice(0).forEach((f) => f());
  }

  /* ----------------------------------------------- remembered state */

  setSequence(keys: string[]) {
    const valid = keys.filter((k) => PRESETS[k]);
    if (!valid.length) return;
    this.st.seq = valid;
    this.seqN = valid.map((k) => toNumeric(PRESETS[k]));
    this.impl?.setSequence(valid);
  }
  setPosition(p: number) { this.st.pos = Math.max(0, Math.min(this.st.seq.length - 1, p)); this.impl?.setPosition(p); }
  setTier(t: Tier) { this.st.tier = t; this.impl?.setTier(t); }
  setForms(on: boolean) { this.st.forms = on; this.impl?.setForms(on); }
  setBend(on: boolean) { this.st.bend = on; this.impl?.setBend(on); }
  setSky(s: SkyInput) { this.st.sky = s; this.impl?.setSky(s); }
  setNameAnchor(a: Anchor) { this.st.anchor = a; this.impl?.setNameAnchor(a); }
  setMalaCount(n: number) { this.st.mala = n; this.impl?.setMalaCount(n); }
  setMoonMode(m: number) { this.st.moon = m; this.impl?.setMoonMode(m); }
  releaseForms() { this.st.released = true; this.impl?.releaseForms(); }
  onLost(fn: () => void) { this.lostFn = fn; this.impl?.onLost(fn); }

  get veil() { return this.impl ? this.impl.veil : this.veilV; }
  set veil(v: number) { this.veilV = v; if (this.impl) this.impl.veil = v; }
  get dawnProgress() { return this.impl ? this.impl.dawnProgress : this.dawnV; }
  set dawnProgress(v: number) { this.dawnV = v; if (this.impl) this.impl.dawnProgress = v; }

  /* ------------------------------------------ only meaningful when live */

  setPointer(x: number, y: number) { this.impl?.setPointer(x, y); }
  setTouch(x: number, y: number, s: number) { this.impl?.setTouch(x, y, s); }
  setVelocity(v: number) { this.impl?.setVelocity(v); }
  setAudioLevel(v: number) { this.impl?.setAudioLevel(v); }
  impulse(a: number) { this.impl?.impulse(a); }
  flash(a: number) { this.impl?.flash(a); }
  setDust(pts: Float32Array | null, n: number) { this.impl?.setDust(pts, n); }
  setDustProgress(p: number, dy = 0) { this.impl?.setDustProgress(p, dy); }
  setDustBurn(b: number) { this.impl?.setDustBurn(b); }
  forceCss() { if (this.impl) this.impl.forceCss(); else { this.lastCss = ''; this.writeCss(); } }

  get available() { return this.impl ? this.impl.available : this.webgl; }
  get isLive() { return this.impl?.isLive ?? false; }
  get speed() { return this.impl?.speed ?? 0; }
  get pointCount() { return this.impl?.pointCount ?? 0; }
  get formOpacity() { return this.impl?.formOpacity ?? 0; }
  get ultraReady() { return this.impl?.ultraReady ?? false; }
  get ultraBuildingNow() { return this.impl?.ultraBuildingNow ?? false; }
  get chapterKey() { return this.impl?.chapterKey ?? this.st.seq[Math.round(this.st.pos)] ?? ''; }
  get blend(): [string, string, number] {
    if (this.impl) return this.impl.blend;
    const i = Math.floor(this.st.pos), j = Math.min(this.st.seq.length - 1, i + 1);
    return [this.st.seq[i] ?? '', this.st.seq[j] ?? '', this.st.pos - i];
  }
  get palette() {
    if (this.impl) return this.impl.palette;
    return { glow: this.cur.glow, ink: this.cur.ink, inkSoft: this.cur.inkSoft, light: this.cur.light };
  }

  update(dt: number) {
    if (this.impl) { this.impl.update(dt); return; }
    // no 3D: still blend the colours so the page recolours as you scroll
    const i = Math.floor(this.st.pos), j = Math.min(this.seqN.length - 1, i + 1);
    const f = this.st.pos - i, s = f * f * (3 - 2 * f);
    mixInto(this.target, this.seqN[Math.min(i, this.seqN.length - 1)], this.seqN[j], s);
    dampInto(this.cur, this.target, 1 - Math.exp(-dt * 3.2));
    this.writeCss();
  }

  private writeCss() {
    const c = this.cur;
    const t = (v: number[]) => v.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)).join(' ');
    const css = `${t(c.ink)}|${t(c.inkSoft)}|${t(c.glow)}|${t(c.a)}|${t(c.b)}|${t(c.c)}|${c.light > 0.5 ? 1 : 0}`;
    if (css === this.lastCss) return;
    this.lastCss = css;
    const [ink, inkSoft, glow, a, b, cc, light] = css.split('|');
    const st = document.documentElement.style;
    st.setProperty('--ink', ink);
    st.setProperty('--ink-soft', inkSoft);
    st.setProperty('--glow', glow);
    st.setProperty('--bg-a', a);
    st.setProperty('--bg-b', b);
    st.setProperty('--bg-c', cc);
    document.documentElement.dataset.light = light;
  }
}

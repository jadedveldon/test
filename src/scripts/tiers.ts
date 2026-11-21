export type Tier = 'ultra' | 'full' | 'lighter' | 'still' | 'calm';
export const TIERS: Tier[] = ['ultra', 'full', 'lighter', 'still', 'calm'];

export const TIER_LABEL: Record<Tier, string> = {
  ultra: 'Ultra',
  full: 'Full',
  lighter: 'Lighter',
  still: 'Still',
  calm: 'Calm',
};

const KEY = 'sk-tier';
const MANUAL = 'sk-tier-manual';

export function store(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the site still works without it */
  }
}

export function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

const isTier = (v: string | null): v is Tier => !!v && (TIERS as string[]).includes(v);

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** a tier chosen by link (?tier=lighter) or picked in the prototype panel */
export function manualTier(): Tier | null {
  const q = new URLSearchParams(location.search).get('tier');
  if (isTier(q)) {
    store(KEY, q);
    store(MANUAL, '1');
    return q;
  }
  const s = read(KEY);
  return read(MANUAL) && isTier(s) ? s : null;
}

/** a tier measured earlier in this visit */
export function rememberedTier(): Tier | null {
  const s = read(KEY);
  return isTier(s) ? s : null;
}

export function chooseManual(t: Tier | 'auto') {
  if (t === 'auto') {
    store(KEY, null);
    store(MANUAL, null);
  } else {
    store(KEY, t);
    store(MANUAL, '1');
  }
}

export function rememberAuto(t: Tier) {
  store(KEY, t);
}

/** rolling frame-rate meter */
export class FpsMeter {
  private samples: number[] = [];
  push(dt: number) {
    if (dt <= 0) return;
    this.samples.push(dt);
    if (this.samples.length > 120) this.samples.shift();
  }
  get fps() {
    if (!this.samples.length) return 0;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return 1 / avg;
  }
  reset() {
    this.samples = [];
  }
}

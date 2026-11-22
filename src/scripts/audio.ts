/**
 * Ambient sound, off until the visitor turns it on.
 *
 * Underneath everything is a tanpura drone (Pa, Sa, Sa, low Sa, tuned to C#),
 * made in the browser by plucking virtual strings (the Karplus-Strong method),
 * so there are no audio files to download. Each pillar adds its own layer on
 * top, and the layers cross-fade as you scroll, exactly like the colours do.
 * A soft bell answers moments such as lighting the diya.
 *
 * Everything here is a PLACEHOLDER sketch of the idea: the real site can use
 * recorded instruments chosen with the institute.
 */

type Layer = 'devotion' | 'magic' | 'healing' | 'identity' | 'divination' | 'learning';
const LAYERS: Layer[] = ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning'];

const SA = 138.59;
const PA_LOW = 103.83;
const SA_LOW = 69.3;

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode;
let dry: GainNode;
let wet: GainNode;
let analyser: AnalyserNode;
let droneBus: GainNode;
const layerGain = {} as Record<Layer, GainNode>;
const layerLevel = {} as Record<Layer, number>;
const strings: Record<string, AudioBuffer> = {};
let on = false;
let timer = 0;
let nextPluck = 0;
let pluckIndex = 0;
const nextEvent = {} as Record<Layer, number>;
let levelBuf: Uint8Array<ArrayBuffer> | null = null;
let levelSmooth = 0;
const listeners = new Set<(on: boolean) => void>();

export function soundIsOn() {
  return on;
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
}

/* ------------------------------------------------------------- strings */

function pluckBuffer(c: Ctx, freq: number, seconds: number, seed: number) {
  const sr = c.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = c.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  // the pluck: a burst of softened noise, one string length long
  let prev = 0;
  for (let i = 0; i < N; i++) { const v = rand() * 2 - 1; prev = prev * 0.5 + v * 0.5; y[i] = prev; }
  // decay per period so the string rings for several seconds, like a tanpura
  const rho = Math.pow(0.001, 1 / (seconds * freq));
  for (let i = N; i < len; i++) y[i] = rho * 0.5 * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
  // jawari: the tanpura's bright buzz, a gentle clipping that adds overtones
  let peak = 0;
  for (let i = 0; i < len; i++) { y[i] = Math.tanh(y[i] * 2.2); peak = Math.max(peak, Math.abs(y[i])); }
  const fadeIn = Math.floor(sr * 0.004);
  for (let i = 0; i < len; i++) y[i] = (y[i] / (peak || 1)) * (i < fadeIn ? i / fadeIn : 1);
  return buf;
}

function impulse(c: Ctx, seconds: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

/* ------------------------------------------------------------- building */

function build() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const c = ctx;

  master = c.createGain();
  master.gain.value = 0;
  analyser = c.createAnalyser();
  analyser.fftSize = 512;
  master.connect(analyser);
  analyser.connect(c.destination);

  const reverb = c.createConvolver();
  reverb.buffer = impulse(c, 4.2);
  dry = c.createGain();
  dry.gain.value = 0.75;
  wet = c.createGain();
  wet.gain.value = 0.55;
  dry.connect(master);
  reverb.connect(wet);
  wet.connect(master);

  const sendBoth = (node: AudioNode, wetAmt = 1) => {
    node.connect(dry);
    if (wetAmt >= 1) node.connect(reverb);
    else { const g = c.createGain(); g.gain.value = wetAmt; node.connect(g); g.connect(reverb); }
  };

  // tanpura bus
  droneBus = c.createGain();
  droneBus.gain.value = 0.36;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3400;
  const sparkle = c.createBiquadFilter();
  sparkle.type = 'peaking';
  sparkle.frequency.value = 2200;
  sparkle.Q.value = 0.8;
  sparkle.gain.value = 5;
  droneBus.connect(sparkle);
  sparkle.connect(tone);
  sendBoth(tone, 0.6);
  strings.pa = pluckBuffer(c, PA_LOW, 6, 3);
  strings.sa1 = pluckBuffer(c, SA, 6, 7);
  strings.sa2 = pluckBuffer(c, SA * 1.0015, 6, 11);
  strings.low = pluckBuffer(c, SA_LOW, 7, 13);

  for (const l of LAYERS) {
    const g = c.createGain();
    g.gain.value = 0;
    sendBoth(g);
    layerGain[l] = g;
    layerLevel[l] = 0;
    nextEvent[l] = 0;
  }

  // continuous textures (cheap: a handful of oscillators and one noise loop)
  const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noiseSrc = () => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; s.start(); return s; };
  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const o = c.createOscillator(); o.frequency.value = rate;
    const g = c.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(target); o.start();
  };
  const osc = (type: OscillatorType, f: number, gain: number, to: AudioNode, detune = 0) => {
    const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    const g = c.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(to); o.start();
    return g;
  };

  // devotion: a low hum under the temple bells
  const hum = osc('sine', SA_LOW, 0.12, layerGain.devotion);
  lfo(0.13, 0.05, hum.gain);

  // magic: a shimmering, slowly moving chord high above
  const magicF = c.createBiquadFilter();
  magicF.type = 'bandpass'; magicF.frequency.value = 1400; magicF.Q.value = 1.4;
  magicF.connect(layerGain.magic);
  lfo(0.07, 700, magicF.frequency);
  osc('triangle', SA * 4, 0.05, magicF, -7);
  osc('triangle', SA * 4, 0.05, magicF, 7);
  osc('triangle', PA_LOW * 8, 0.035, magicF, 4);

  // healing: water, shaped from noise
  const water = c.createBiquadFilter();
  water.type = 'bandpass'; water.frequency.value = 820; water.Q.value = 2.2;
  noiseSrc().connect(water);
  const waterG = c.createGain(); waterG.gain.value = 0.11;
  water.connect(waterG); waterG.connect(layerGain.healing);
  lfo(0.18, 380, water.frequency);
  lfo(0.11, 0.05, waterG.gain);

  // identity: a warm, close chord that breathes
  const warm = c.createBiquadFilter();
  warm.type = 'lowpass'; warm.frequency.value = 900;
  warm.connect(layerGain.identity);
  const w1 = osc('sine', SA * 2, 0.07, warm, -4);
  osc('sine', SA * 3, 0.045, warm, 5);
  osc('sawtooth', SA, 0.012, warm, 3);
  lfo(0.09, 0.04, w1.gain);

  // learning: breath through a reed, very quiet
  const breath = c.createBiquadFilter();
  breath.type = 'bandpass'; breath.frequency.value = SA * 4; breath.Q.value = 18;
  noiseSrc().connect(breath);
  const breathG = c.createGain(); breathG.gain.value = 0.35;
  breath.connect(breathG); breathG.connect(layerGain.learning);
  lfo(0.12, 0.2, breathG.gain);

  // divination has no bed: only chimes, like stars

  levelBuf = new Uint8Array(analyser.fftSize);
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  return true;
}

/* ------------------------------------------------------------- events */

function playString(key: string, at: number, gain: number, pan: number) {
  if (!ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = strings[key];
  s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.0012;
  const g = ctx.createGain();
  g.gain.value = gain;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  s.connect(g);
  if (p) { p.pan.value = pan; g.connect(p); p.connect(droneBus); } else g.connect(droneBus);
  s.start(at);
}

/** a struck bell: inharmonic partials that fade at different speeds */
function bellAt(at: number, base: number, gain: number, to: AudioNode, length = 5) {
  if (!ctx) return;
  const partials = [[1, 1, 1], [2.76, 0.5, 0.7], [5.4, 0.28, 0.45], [8.93, 0.16, 0.3], [0.5, 0.35, 1.3]];
  for (const [ratio, amp, life] of partials) {
    const o = ctx.createOscillator();
    o.frequency.value = base * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * amp, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length * life);
    o.connect(g); g.connect(to);
    o.start(at); o.stop(at + length * life + 0.1);
  }
}

function chimeAt(at: number, f: number, gain: number, to: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
  o.connect(g); g.connect(to);
  o.start(at); o.stop(at + 2.7);
}

function dropAt(at: number, gain: number, to: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  const f = 700 + Math.random() * 900;
  o.frequency.setValueAtTime(f, at);
  o.frequency.exponentialRampToValueAtTime(f * 2.2, at + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g); g.connect(to);
  o.start(at); o.stop(at + 0.25);
}

function tokAt(at: number, gain: number, to: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(SA * 1.5, at);
  o.frequency.exponentialRampToValueAtTime(SA * 1.15, at + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
  o.connect(g); g.connect(to);
  o.start(at); o.stop(at + 0.65);
}

const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

function schedule() {
  if (!ctx || !on) return;
  const now = ctx.currentTime;
  const ahead = now + 0.6;
  // tanpura: Pa, Sa, Sa, low Sa, then round again
  const order: [string, number, number][] = [['pa', 0.8, -0.35], ['sa1', 0.7, 0.2], ['sa2', 0.7, 0.35], ['low', 1, -0.1]];
  if (nextPluck < now) nextPluck = now + 0.05;
  while (nextPluck < ahead) {
    const [key, g, pan] = order[pluckIndex % 4];
    playString(key, nextPluck, g * (0.85 + Math.random() * 0.15), pan);
    pluckIndex++;
    nextPluck += pluckIndex % 4 === 0 ? 1.6 : 1.05;
  }
  // each pillar's occasional sounds, only while you are in it
  for (const l of LAYERS) {
    if (layerLevel[l] < 0.05) { nextEvent[l] = 0; continue; }
    if (!nextEvent[l]) nextEvent[l] = now + 0.4;
    if (nextEvent[l] > ahead) continue;
    const at = nextEvent[l];
    const to = layerGain[l];
    if (l === 'devotion') { bellAt(at, 520, 0.16, to, 6); nextEvent[l] = at + 8 + Math.random() * 4; }
    else if (l === 'divination') { chimeAt(at, SA * 8 * PENTA[Math.floor(Math.random() * PENTA.length)], 0.07, to); nextEvent[l] = at + 0.9 + Math.random() * 2.4; }
    else if (l === 'healing') { dropAt(at, 0.06, to); nextEvent[l] = at + 1.2 + Math.random() * 3; }
    else if (l === 'learning') { tokAt(at, 0.22, to); nextEvent[l] = at + (Math.random() < 0.5 ? 1.6 : 3.2); }
    else if (l === 'magic') { chimeAt(at, SA * 6 * PENTA[Math.floor(Math.random() * PENTA.length)], 0.035, to); nextEvent[l] = at + 2 + Math.random() * 3; }
    else nextEvent[l] = at + 4;
  }
}

/* ------------------------------------------------------------------ API */

export async function setSound(want: boolean) {
  if (want === on) return;
  if (want) {
    if (!ctx && !build()) return;
    on = true;
    await ctx!.resume();
    const t = ctx!.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0.55, t + 2.5);
    schedule();
    timer = window.setInterval(schedule, 200);
  } else {
    on = false;
    clearInterval(timer);
    if (ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.8);
      const c = ctx;
      setTimeout(() => { if (!on) c.suspend(); }, 900);
    }
  }
  listeners.forEach((fn) => fn(on));
}

/** blend the pillar layers: weights by preset name, e.g. { devotion: 0.7, magic: 0.3 } */
export function setMix(weights: Record<string, number>) {
  if (!ctx || !on) return;
  const t = ctx.currentTime;
  for (const l of LAYERS) {
    const w = weights[l] ?? 0;
    if (Math.abs(w - layerLevel[l]) < 0.01) continue;
    layerLevel[l] = w;
    layerGain[l].gain.setTargetAtTime(w, t, 0.4);
  }
}

/** a bell for special moments (the diya, a card turning over) */
export function ring(kind: 'diya' | 'card' | 'choice' = 'diya') {
  if (!ctx || !on) return;
  const at = ctx.currentTime + 0.02;
  if (kind === 'diya') bellAt(at, 392, 0.22, dry, 7);
  else if (kind === 'card') { chimeAt(at, SA * 8, 0.08, dry); chimeAt(at + 0.12, SA * 12, 0.06, dry); }
  else chimeAt(at, SA * 6, 0.05, dry);
}

/** a soft wooden click for each bead of the mala */
export function tick(last = false) {
  if (!ctx || !on) return;
  const at = ctx.currentTime + 0.005;
  if (last) { bellAt(at, 330, 0.24, dry, 8); return; }
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1800, at);
  o.frequency.exponentialRampToValueAtTime(700, at + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.09, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  o.connect(g); g.connect(dry);
  o.start(at); o.stop(at + 0.08);
}

/** the fire taking an offering: a whoosh and a few crackles */
export function crackle() {
  if (!ctx || !on) return;
  const c = ctx;
  const at = c.currentTime + 0.01;
  const len = c.sampleRate * 2.6;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t);
    d[i] = (Math.random() * 2 - 1) * env * 0.5 + (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0);
  }
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.setValueAtTime(400, at); f.frequency.exponentialRampToValueAtTime(2200, at + 1.6); f.Q.value = 0.7;
  const g = c.createGain(); g.gain.value = 0.35;
  s.connect(f); f.connect(g); g.connect(dry); g.connect(wet);
  s.start(at);
}

/** loudness, 0..1, so the world's glow can breathe with the sound */
export function soundLevel() {
  if (!ctx || !on || !levelBuf) { levelSmooth *= 0.9; return levelSmooth; }
  analyser.getByteTimeDomainData(levelBuf);
  let sum = 0;
  for (let i = 0; i < levelBuf.length; i++) { const v = (levelBuf[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / levelBuf.length);
  levelSmooth += (Math.min(1, rms * 4) - levelSmooth) * 0.15;
  return levelSmooth;
}

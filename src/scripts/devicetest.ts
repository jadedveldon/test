import type { Tier } from './tiers';

/**
 * "Test this device": for checking real phones. It tries each quality level
 * for a few seconds, measures smoothness, and writes a short report a friend
 * can copy and send back. No data leaves the phone unless they send it.
 */
type Hooks = {
  tier: () => Tier;
  setTier: (t: Tier) => void;
  fps: () => number;
  resetMeter: () => void;
  ensureWorld: () => Promise<boolean>;
  points: () => number;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function gpuName() {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name);
  } catch {
    return 'unknown';
  }
}

export async function runDeviceTest(h: Hooks, onStep: (msg: string) => void): Promise<string> {
  const before = h.tier();
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; saveData?: boolean } };
  const lines = [
    'Sarvakali device report',
    `Date: ${new Date().toLocaleString('en-IN')}`,
    `Browser: ${navigator.userAgent}`,
    `Screen: ${screen.width}×${screen.height} at ${devicePixelRatio}x, window ${innerWidth}×${innerHeight}`,
    `Graphics: ${gpuName()}`,
    `Cores: ${navigator.hardwareConcurrency || '?'} · Memory: ${nav.deviceMemory ? `${nav.deviceMemory} GB` : '?'} · Network: ${nav.connection?.effectiveType || '?'}${nav.connection?.saveData ? ' (data saver on)' : ''}`,
    `Touch: ${matchMedia('(pointer: coarse)').matches ? 'yes' : 'no'} · Reduce motion: ${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'}`,
    '',
    'Smoothness (frames per second; 50+ is smooth, under 25 struggles):',
  ];
  const ok = await h.ensureWorld();
  if (!ok) {
    lines.push('3D could not start on this device: it would use Still mode.');
  } else {
    const tiers: Tier[] = matchMedia('(pointer: fine)').matches ? ['lighter', 'full', 'ultra'] : ['lighter', 'full'];
    for (const t of tiers) {
      onStep(`Trying ${t}…`);
      h.setTier(t);
      await wait(t === 'ultra' ? 5000 : 1200); // Ultra builds its points first
      h.resetMeter();
      await wait(3000);
      lines.push(`  ${t.padEnd(8)} ${Math.round(h.fps())} fps with ${h.points().toLocaleString('en-IN')} points`);
    }
    h.setTier(before);
  }
  lines.push('', `Level in use before the test: ${before}`);
  onStep('Done');
  return lines.join('\n');
}

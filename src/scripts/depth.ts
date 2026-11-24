/**
 * The AI depth demo: a painting plus its depth map (made ahead of time by
 * Depth Anything V2). Near parts of the picture move more than far parts as
 * you look around, which reads as real depth.
 */
const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uLook;
uniform float uShowDepth;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 uv = (vUv - 0.5) / 1.07 + 0.5;          // a little zoom hides the edges
  float d = texture2D(uDepth, uv).r;          // 1 = near, 0 = far
  // look around: sample a few times so steep edges smear less
  vec2 off = uLook * 0.028;
  vec2 p = uv;
  for (int i = 0; i < 3; i++) {
    float dd = texture2D(uDepth, p).r;
    p = uv + off * (dd - 0.45);
  }
  vec3 col = texture2D(uImg, p).rgb;
  float dd = texture2D(uDepth, p).r;
  // near parts catch a touch more light
  col *= 0.9 + 0.18 * dd;
  vec3 dep = mix(vec3(0.05, 0.02, 0.03), vec3(1.0, 0.82, 0.55), dd);
  col = mix(col, dep, uShowDepth);
  float v = smoothstep(0.85, 0.35, length((vUv - 0.5) * vec2(0.9, 0.8)));
  col *= mix(0.78, 1.0, v);
  gl_FragColor = vec4(col, 1.0);
}`;

export function initDepth(live: boolean): (() => void) | null {
  const root = document.querySelector<HTMLElement>('[data-depth]');
  if (!root) return null;
  const canvas = root.querySelector<HTMLCanvasElement>('.depth-canvas')!;
  const stage = root.querySelector<HTMLElement>('.depth-stage')!;
  let current = root.querySelector<HTMLElement>('[data-work-pane]:not([hidden])')!;
  const gl = live ? canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) : null;
  let raf = 0;
  let showDepth = 0, showTarget = 0;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let t = 0;
  let last = performance.now();
  let dragging = false;
  let userMoved = 0;

  root.querySelectorAll<HTMLButtonElement>('[data-work]').forEach((b) => {
    b.addEventListener('click', () => {
      root.querySelectorAll('[data-work]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      root.querySelectorAll<HTMLElement>('[data-work-pane]').forEach((p) => (p.hidden = p.dataset.workPane !== b.dataset.work));
      current = root.querySelector<HTMLElement>(`[data-work-pane="${b.dataset.work}"]`)!;
      if (gl) load();
    });
  });
  const viewBtn = root.querySelector<HTMLButtonElement>('[data-depth-view]')!;
  viewBtn.addEventListener('click', () => {
    showTarget = showTarget ? 0 : 1;
    viewBtn.setAttribute('aria-pressed', String(!!showTarget));
  });

  if (!gl) {
    stage.classList.add('is-flat');
    return null;
  }

  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uLook = u('uLook'), uShow = u('uShowDepth'), uTime = u('uTime');
  gl.uniform1i(u('uImg'), 0);
  gl.uniform1i(u('uDepth'), 1);
  const texImg = gl.createTexture(), texDepth = gl.createTexture();
  let ready = false;

  const upload = (tex: WebGLTexture | null, unit: number, img: HTMLImageElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  };
  const decoded = (img: HTMLImageElement) => (img.complete && img.naturalWidth ? Promise.resolve() : new Promise<void>((res) => { img.addEventListener('load', () => res(), { once: true }); }));

  function load() {
    ready = false;
    stage.classList.remove('is-live');
    const pane = current;
    const img = pane.querySelector<HTMLImageElement>('.depth-img')!;
    const map = pane.querySelector<HTMLImageElement>('.depth-map')!;
    map.loading = 'eager';
    Promise.all([decoded(img), decoded(map)]).then(() => {
      if (pane !== current) return;
      upload(texImg, 0, img);
      upload(texDepth, 1, map);
      ready = true;
      size();
      stage.classList.add('is-live');
    });
  }

  function size() {
    const r = current.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && !dragging) return;
    const r = stage.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    look.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    userMoved = 3;
  };
  const onDown = (e: PointerEvent) => { if (e.pointerType === 'touch') { dragging = true; onMove(e); } };
  const onUp = () => { dragging = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('resize', size, { passive: true });

  const tiltBtn = root.querySelector<HTMLButtonElement>('[data-depth-tilt]')!;
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    look.tx = Math.max(-1, Math.min(1, e.gamma / 25));
    look.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    userMoved = 3;
  };
  if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', async () => {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      try { if (DOE.requestPermission && (await DOE.requestPermission()) !== 'granted') return; } catch { return; }
      window.addEventListener('deviceorientation', onTilt, { passive: true });
      tiltBtn.setAttribute('aria-pressed', 'true');
    });
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    if (!ready) return;
    userMoved -= dt;
    // when nobody is moving it, the painting sways slowly on its own
    if (userMoved < 0) { look.tx = Math.sin(t * 0.5) * 0.7; look.ty = Math.sin(t * 0.37) * 0.35; }
    const k = 1 - Math.exp(-dt * 5);
    look.x += (look.tx - look.x) * k;
    look.y += (look.ty - look.y) * k;
    showDepth += (showTarget - showDepth) * (1 - Math.exp(-dt * 6));
    gl.uniform2f(uLook, look.x, look.y);
    gl.uniform1f(uShow, showDepth);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  load();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('resize', size);
    window.removeEventListener('deviceorientation', onTilt);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

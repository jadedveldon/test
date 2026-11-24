/**
 * Incense smoke cursor. The cursor becomes a lit incense stick, and its smoke
 * is a real (small) fluid simulation on the graphics card: the smoke rises,
 * curls and drifts with your movement, then thins away.
 *
 * Desktop only (it follows a mouse), and only on the Full and Ultra quality
 * levels. It sleeps when nothing is burning, so an idle page costs nothing.
 */

const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const head = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 o;
`;

const FS = {
  splat: head + `
uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color, 1.0);
}`,
  advect: head + `
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 simTexel; uniform float dt; uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * simTexel;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
}`,
  divergence: head + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: head + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: head + `
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform sampler2D uDye;
uniform float curl; uniform float dt; uniform float buoyancy;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C; force.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + force * dt;
  v.y += buoyancy * texture(uDye, vUv).r * dt; // warm smoke rises
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: head + `
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: head + `
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
  scale: head + `
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`,
  display: head + `
uniform sampler2D uDye; uniform vec3 tint; uniform vec3 ink; uniform float light; uniform float opacity;
void main() {
  float d = texture(uDye, vUv).r;
  float a = clamp(1.0 - exp(-d * 2.4), 0.0, 1.0) * opacity;
  vec3 col = mix(tint, ink, light);
  o = vec4(col * a, a);
}`,
};

type GL = WebGL2RenderingContext;
type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Double = { read: FBO; write: FBO; swap: () => void };

export class Incense {
  readonly ok: boolean;
  private gl!: GL;
  private progs = {} as Record<keyof typeof FS, Prog>;
  private vel!: Double;
  private dye!: Double;
  private pres!: Double;
  private div!: FBO;
  private curlF!: FBO;
  private simW = 0; private simH = 0; private dyeW = 0; private dyeH = 0;
  private fmt = { internal: 0, type: 0 };
  private x = -1; private y = -1; private px = -1; private py = -1;
  private burning = false;
  private awake = 0; // seconds of smoke left to draw after the incense stops
  private active = false;
  private tint = [0.92, 0.84, 0.72];
  private ink = [0.15, 0.1, 0.08];
  private light = 0;
  private quality = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) { this.ok = false; return; }
    this.gl = gl;
    this.fmt = { internal: gl.RGBA16F, type: gl.HALF_FLOAT };
    for (const k of Object.keys(FS) as (keyof typeof FS)[]) this.progs[k] = this.program(FS[k]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.active = false; });
    this.ok = true;
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  private program(fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    const u: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i)!.name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }

  private fbo(w: number, h: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.fmt.internal, w, h, 0, gl.RGBA, this.fmt.type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  }

  private double(w: number, h: number): Double {
    const d = { read: this.fbo(w, h), write: this.fbo(w, h), swap: () => { const t = d.read; d.read = d.write; d.write = t; } };
    return d;
  }

  private dims(min: number) {
    const a = innerWidth / Math.max(1, innerHeight);
    return a >= 1 ? [Math.round(min * a), min] : [min, Math.round(min / a)];
  }

  private free(f?: FBO) {
    if (!f) return;
    this.gl.deleteFramebuffer(f.fbo);
    this.gl.deleteTexture(f.tex);
  }

  resize() {
    if (!this.ok) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(innerWidth * dpr * 0.75);
    this.canvas.height = Math.round(innerHeight * dpr * 0.75);
    const [sw, sh] = this.dims(this.quality > 0.8 ? 128 : 96);
    const [dw, dh] = this.dims(this.quality > 0.8 ? 448 : 320);
    // the targets only change when their size does; the old ones are freed, so resizing never leaks
    if (this.vel && sw === this.simW && sh === this.simH && dw === this.dyeW && dh === this.dyeH) return;
    for (const f of [this.vel?.read, this.vel?.write, this.pres?.read, this.pres?.write, this.dye?.read, this.dye?.write, this.div, this.curlF]) this.free(f);
    [this.simW, this.simH, this.dyeW, this.dyeH] = [sw, sh, dw, dh];
    this.vel = this.double(this.simW, this.simH);
    this.pres = this.double(this.simW, this.simH);
    this.dye = this.double(this.dyeW, this.dyeH);
    this.div = this.fbo(this.simW, this.simH);
    this.curlF = this.fbo(this.simW, this.simH);
  }

  /** turn the incense on or off (off: the last smoke still drifts away) */
  setActive(on: boolean, quality = 1) {
    if (!this.ok) return;
    if (on && quality !== this.quality) { this.quality = quality; this.resize(); }
    this.active = on;
    this.canvas.classList.toggle('is-on', on || this.awake > 0);
    if (!on) this.burning = false;
  }

  setColors(tint: number[], ink: number[], light: number) {
    this.tint = tint;
    this.ink = ink;
    this.light = light;
  }

  /** the tip of the stick, in screen pixels */
  move(x: number, y: number) {
    if (!this.active) return;
    this.x = x; this.y = y;
    if (this.px < 0) { this.px = x; this.py = y; }
    this.burning = true;
    this.awake = 7;
    this.canvas.classList.add('is-on');
  }

  leave() {
    this.burning = false;
    this.px = -1;
  }

  private draw(prog: Prog, target: FBO | null, set: (u: Prog['u']) => void, texel: [number, number]) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    if (prog.u.texel) gl.uniform2f(prog.u.texel, texel[0], texel[1]);
    set(prog.u);
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private bind(unit: number, fbo: FBO) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
    return unit;
  }

  private splat(target: Double, x: number, y: number, color: number[], radius: number, texel: [number, number]) {
    const gl = this.gl;
    this.draw(this.progs.splat, target.write, (u) => {
      gl.uniform1i(u.uTarget, this.bind(0, target.read));
      gl.uniform1f(u.aspect, innerWidth / Math.max(1, innerHeight));
      gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, color[0], color[1], color[2]);
      gl.uniform1f(u.radius, radius);
    }, texel);
    target.swap();
  }

  update(dt: number) {
    if (!this.ok) return;
    if (!this.burning) this.awake -= dt;
    if (this.awake <= 0 && !this.burning) {
      if (this.awake > -1) { this.clear(); this.awake = -1; this.canvas.classList.remove('is-on'); }
      return;
    }
    if (document.hidden) return;
    const gl = this.gl;
    dt = Math.min(dt, 1 / 30);
    const simTexel: [number, number] = [1 / this.simW, 1 / this.simH];
    const dyeTexel: [number, number] = [1 / this.dyeW, 1 / this.dyeH];
    gl.disable(gl.BLEND);

    // the stick burns: a thin, steady thread of smoke from the tip, pushed by your movement
    if (this.burning && this.x >= 0) {
      const u = this.x / innerWidth, v = 1 - this.y / innerHeight;
      const vx = ((this.x - this.px) / Math.max(dt, 1e-3)) * (this.simW / innerWidth);
      const vy = (-(this.y - this.py) / Math.max(dt, 1e-3)) * (this.simH / innerHeight);
      const jitter = (Math.random() - 0.5) * 6;
      this.splat(this.vel, u, v, [vx * 0.3 + jitter, vy * 0.3 + 20, 0], 0.00012, simTexel);
      this.splat(this.dye, u, v, [dt * 60 * 0.2, 0, 0], 0.00004, dyeTexel);
      this.px = this.x; this.py = this.y;
    }

    this.draw(this.progs.curl, this.curlF, (u) => gl.uniform1i(u.uVelocity, this.bind(0, this.vel.read)), simTexel);
    this.draw(this.progs.vorticity, this.vel.write, (u) => {
      gl.uniform1i(u.uVelocity, this.bind(0, this.vel.read));
      gl.uniform1i(u.uCurl, this.bind(1, this.curlF));
      gl.uniform1i(u.uDye, this.bind(2, this.dye.read));
      gl.uniform1f(u.curl, 30);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.buoyancy, 40);
    }, simTexel);
    this.vel.swap();
    this.draw(this.progs.divergence, this.div, (u) => gl.uniform1i(u.uVelocity, this.bind(0, this.vel.read)), simTexel);
    this.draw(this.progs.scale, this.pres.write, (u) => { gl.uniform1i(u.uTexture, this.bind(0, this.pres.read)); gl.uniform1f(u.value, 0.8); }, simTexel);
    this.pres.swap();
    for (let i = 0; i < 14; i++) {
      this.draw(this.progs.pressure, this.pres.write, (u) => {
        gl.uniform1i(u.uPressure, this.bind(0, this.pres.read));
        gl.uniform1i(u.uDivergence, this.bind(1, this.div));
      }, simTexel);
      this.pres.swap();
    }
    this.draw(this.progs.gradient, this.vel.write, (u) => {
      gl.uniform1i(u.uPressure, this.bind(0, this.pres.read));
      gl.uniform1i(u.uVelocity, this.bind(1, this.vel.read));
    }, simTexel);
    this.vel.swap();
    this.draw(this.progs.advect, this.vel.write, (u) => {
      gl.uniform1i(u.uVelocity, this.bind(0, this.vel.read));
      gl.uniform1i(u.uSource, this.bind(0, this.vel.read));
      gl.uniform2f(u.simTexel, simTexel[0], simTexel[1]);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, 0.3);
    }, simTexel);
    this.vel.swap();
    this.draw(this.progs.advect, this.dye.write, (u) => {
      gl.uniform1i(u.uVelocity, this.bind(0, this.vel.read));
      gl.uniform1i(u.uSource, this.bind(1, this.dye.read));
      gl.uniform2f(u.simTexel, simTexel[0], simTexel[1]);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, 0.42);
    }, dyeTexel);
    this.dye.swap();

    this.draw(this.progs.display, null, (u) => {
      gl.uniform1i(u.uDye, this.bind(0, this.dye.read));
      gl.uniform3f(u.tint, this.tint[0], this.tint[1], this.tint[2]);
      gl.uniform3f(u.ink, this.ink[0], this.ink[1], this.ink[2]);
      gl.uniform1f(u.light, this.light);
      gl.uniform1f(u.opacity, 0.9);
    }, dyeTexel);
  }

  private clear() {
    const gl = this.gl;
    for (const f of [this.vel.read, this.vel.write, this.dye.read, this.dye.write, this.pres.read, this.pres.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
      gl.viewport(0, 0, f.w, f.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

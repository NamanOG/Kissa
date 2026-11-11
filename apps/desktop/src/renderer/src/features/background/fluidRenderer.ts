import { slotOf } from '@renderer/utils/frameBeat'
import { follow } from '@renderer/features/sound/levels'

/**
 * Moving light's renderer, kept apart from React so every lifecycle path (start, pause, cover
 * changes, failure, context loss, disposal) can be exercised with a fake WebGL context and a
 * fake clock in tests.
 *
 * The caller owns the canvas element; the renderer owns everything created on its context and
 * releases all of it in dispose(), including after a failure part-way through set-up.
 */

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

// Domain-warped flow: smooth noise pushes the sampling position around, so the cover's broad
// colour regions stretch and slide past each other.
//
// Seam fix (4.4.0): the animation clock never reaches the GPU. Earlier versions fed a growing
// time into the noise; once the lattice coordinates were large, the GPU's float maths made
// neighbouring noise cells disagree and the colour field split along straight cell edges (hard
// horizontal, vertical or diagonal lines that came and went). Now the CPU turns the clock into
// offsets wrapped to 289 (see flowUniforms), the hash only sees wrapped lattice cells, and the
// noise is exactly periodic over 289, so wrapping never shows. The warp is also gentle enough
// that it does not fold back on itself, which is what produced angular V-shaped creases.
export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uAspect;
uniform vec4 uQ;
uniform vec4 uR;
uniform vec2 uO[6];
// Music: a faint lift with the level (0 when the light does not follow the sound).
uniform float uGlow;
// Where the record is, in p space: the light gathers there.
uniform vec2 uSrc;
// (bloom amount, bloom size, warp, saturation). At rest (0, 0.42, 0.9, 1): no pool, the old
// warp, colours unchanged.
uniform vec4 uS;

float hash(vec2 i) {
  i = mod(i, 289.0);
  vec2 p = fract(i * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}
// Value noise with a quintic fade: continuous slope and curvature across cell edges.
float noise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = x - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// Two octaves at exactly double frequency, so fbm(x + 289) == fbm(x).
float fbm(vec2 x) { return (noise(x) * 2.0 + noise(x * 2.0 + vec2(17.0, 31.0))) / 3.0; }

// The palette texture (colourField.ts): one texel per album colour, rgb = the colour as the room
// shows it, alpha = its presence. Unused slots have alpha 0.
const float SLOTS = 8.0;
// How distinct the regions are: higher gives cleaner regions, lower a softer blend.
// How strongly a colour's share of the cover decides how much room it gets.
const float PRESENCE = 1.4;
const float SHARP = 11.0;

vec3 toLin(vec3 c) { return c * c; }
vec3 toGamma(vec3 c) { return sqrt(c); }

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  // A shared, slowly changing domain warp: it stretches and curls everything that flows through it.
  vec2 q = vec2(fbm(p * 0.8 + uQ.xy), fbm(p * 0.8 + uQ.zw));
  vec2 r = vec2(fbm(p + 2.2 * q + uR.xy), fbm(p + 2.2 * q + uR.zw));
  vec2 w = p + (r - 0.5) * uS.z;
  // Every colour has its own noise field, travelling its own way (uO, wrapped on the CPU). At each
  // point the colours compete by field strength plus their share of the cover, so a colour's regions
  // appear, stretch, merge and separate as the fields slide past each other, and no colour keeps a
  // fixed territory. Mixed in linear light so neighbouring colours stay clean, not muddy.
  vec3 acc = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 slot = vec2((float(i) + 0.5) / SLOTS, 0.5);
    vec4 c = mix(texture2D(uA, slot), texture2D(uB, slot), uMix);
    if (c.a < 0.004) continue;
    // Two lattices at different scales and orientations (swapped axes), so no grid direction shows.
    float n = 0.55 * fbm(w * 1.25 + uO[i]) + 0.45 * fbm(w.yx * 1.7 + uO[i].yx + 11.0);
    float e = exp(SHARP * (n - 1.0) + PRESENCE * log(c.a));
    acc += e * toLin(c.rgb);
    total += e;
  }
  vec3 col = total > 0.0 ? toGamma(acc / total) : vec3(0.08, 0.07, 0.06);
  // The song fills the colour a little in a chorus, and the light pools around the record,
  // breathing with the level and pushed by each kick. Never a whole-window flash.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uS.w);
  vec2 dv = p - uSrc;
  float g = exp(-dot(dv, dv) / (2.0 * uS.y * uS.y));
  col *= 1.0 + uGlow + uS.x * g;
  // Dithering happens in the second pass (SMOOTH_FRAG), at the window's own pixels.
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

/** Dither strength in 8-bit steps; the room's shades scale it down to about one step. */
export const DITHER_STEPS = 2.5

// Second pass: the small colour field, stretched to the window's own pixels, with a fine
// triangular dither. Without it a dark room showed the 8-bit steps of a slow gradient as wavy
// contour lines (stretched 2.5x, and made coarser by the shades laid over the room). Dithering in
// the small field itself would be stretched into visible grain; at one window pixel, and about
// one step after the room's shades, it is invisible and the steps disappear.
export const SMOOTH_FRAG = `
const float DITHER = ${(DITHER_STEPS / 255).toFixed(5)};
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uField;
float h(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec3 c = texture2D(uField, vUv).rgb;
  vec2 f = gl_FragCoord.xy;
  float n = h(f) + h(f + vec2(41.7, 113.3)) - 1.0;
  // The light's 95 % strength, baked in so the canvas stays opaque: a translucent full-window
  // canvas made the compositor draw and blend every layer beneath it on every frame (live,
  // 2026-11-10). Over the near-black room base the difference is under 0.2 % of a level.
  gl_FragColor = vec4(clamp((c + n * DITHER) * 0.95, 0.0, 1.0), 1.0);
}
`
const LATTICE = 289
const wrap = (x: number): number => ((x % LATTICE) + LATTICE) % LATTICE
/** How fast the shared warp changes. */
export const FLOW_SPEED = 2.2
/** How fast each colour's field travels, in noise units per second. */
export const COLOUR_FLOW = 0.09

/**
 * The animation clock as the shader sees it: small offsets wrapped to the noise's period (the
 * shared warp, q and r, and each colour's own field, o). Computed in double precision, so hours of
 * playback look the same as the first minute.
 */
export function flowUniforms(time: number): {
  q: [number, number, number, number]
  r: [number, number, number, number]
  o: number[]
} {
  const t = time * FLOW_SPEED
  // Each colour's field travels in its own direction at its own pace (in noise units). Different
  // directions are what make the colours interleave instead of moving as one sheet.
  const o: number[] = []
  for (let i = 0; i < 6; i++) {
    const a = 0.7 + i * 2.39996 // golden-angle spread of directions
    const v = COLOUR_FLOW * (0.75 + 0.1 * i)
    o.push(wrap(i * 37.1 + Math.cos(a) * v * time), wrap(i * 19.7 + Math.sin(a) * v * time))
  }
  return {
    q: [0, wrap(t * 0.11), wrap(5.2 - t * 0.09), 1.3],
    r: [wrap(1.7 + t * 0.13), wrap(9.2 + t * 0.13), wrap(8.3 - t * 0.12), wrap(2.8 - t * 0.12)],
    o
  }
}

export type CoverSource = TexImageSource

export interface SoundSignals {
  level: number
  swell: number
  bass: number
  kick: number
  pan: number
}

/** The sound-driven shader terms at rest (no sound, or sound follow off). */
export const REST = { bloomAmp: 0, bloomSigma: 0.42, warp: 0.9, sat: 1, glow: 0, speed: 1 } as const
/** The flow never runs faster than this many times its resting drift. */
export const MAX_SPEED = 3.2
/**
 * The strongest warp the bass may give. The resting warp (0.9) already turns over in a few tiny
 * spots (about 9 % of points, unseen under the field's softness); above 0.95 that grows by more
 * than one point (fluidSeam.test.ts), so the plan's 0.16 bass coefficient became 0.05, capped here.
 */
export const WARP_MAX = 0.95
/** The pool's brightest lift, even on Lively. */
export const BLOOM_MAX = 0.32
/**
 * Photosensitivity guard: the light's total lift (glow plus pool) changes by at most this much
 * between two drawn frames, so no single frame can jump.
 */
export const LIFT_SLEW = 0.06

const clamp01 = (x: number): number => (x > 0 ? (x < 1 ? x : 1) : 0)

/**
 * The light's response to the music for one frame. `a` is the motion amount times the coast
 * drive; with no sound every term is at rest, so the picture is exactly the old drift.
 */
export function soundTerms(s: SoundSignals | null, a: number, amount = 1): {
  bloomAmp: number
  bloomSigma: number
  warp: number
  sat: number
  glow: number
  speed: number
} {
  if (!s) return { ...REST }
  const level = clamp01(s.level)
  const swell = clamp01(s.swell)
  const bass = clamp01(s.bass)
  const kick = clamp01(s.kick)
  return {
    bloomAmp: Math.min(BLOOM_MAX, (0.04 + 0.1 * level + 0.14 * kick) * a),
    bloomSigma: 0.42 + 0.1 * swell,
    warp: Math.min(WARP_MAX, 0.9 + 0.05 * bass * a),
    sat: 1 + 0.12 * swell * a,
    glow: 0.03 * level * a,
    speed: Math.min(MAX_SPEED, 0.85 + 0.9 * swell + 0.5 * level + 1.6 * kick * amount)
  }
}

export interface FluidDeps {
  /** Reads a cover into something texImage2D accepts. */
  loadCover: (url: string) => Promise<CoverSource>
  now?: () => number
  requestFrame?: (cb: (t: number) => void) => number
  cancelFrame?: (id: number) => void
  /**
   * Sleeps between drawn frames (setTimeout by default when the display's own frames are used).
   * Tests that drive frames by hand leave it out and the loop asks for every refresh.
   */
  wait?: (ms: number, cb: () => void) => number
  cancelWait?: (id: number) => void
  /** Target time between drawn frames; rounded to a whole number of display refreshes. */
  frameMs?: number
  /**
   * The music, when the light follows it (features/sound/soundListener): level, swell, bass and
   * kick 0..1, pan -1..1. The swell and level speed the flow, a kick sends a soft surge through
   * it, and the light pools around the record. Null or absent: today's quiet drift.
   */
  sound?: () => SoundSignals | null
  /** How much the light moves with the music: 0.5 gentle, 1 balanced, 1.5 lively. */
  amount?: () => number
  /** Where the record is, as window fractions (y down). The pool glides there. */
  source?: () => [number, number]
  /** Development: count drawn frames. */
  onDraw?: () => void
}

export interface FluidCallbacks {
  /** Each cover load's outcome, for the current request only (stale results are dropped). */
  onCover?: (url: string, ok: boolean) => void
  /** The renderer cannot continue (context lost). The caller should dispose and fall back. */
  onFail?: (reason: string) => void
  /** Whether frames are being drawn continuously. */
  onRunning?: (running: boolean) => void
}

/** Pausing: the colour slows to a stop over this long. */
export const COAST_DOWN_S = 0.9
/** Playing again: the colour picks up over this long. */
export const COAST_UP_S = 0.6
/** The first light of a session wakes over this long (later plays use COAST_UP_S). */
export const FIRST_UP_S = 1.4
/** A new cover: a soft breath of light, rising over 250 ms and falling away over 1.1 s. */
export const COVER_PULSE_MS = 1350
export const COVER_PULSE_AMP = 0.1
/** The breath's shape for a time since the cover landed (0..1). */
export function coverPulse(ms: number): number {
  if (ms < 0 || ms >= COVER_PULSE_MS) return 0
  const p = ms / COVER_PULSE_MS
  if (p < 0.18) return p / 0.18
  const q = 1 - (p - 0.18) / 0.82
  return q * q
}
/** Track change: the new cover's colours blend in over this long, eased. */
export const FADE_MS = 1600

export interface FluidRenderer {
  setCover: (url: string) => void
  /**
   * Starts or stops the motion. With `coast`, stopping eases the colour to a stop (and keeps
   * drawing until it has); without it, the loop stops at once. Starting always eases in, and a
   * start during a coast reverses it from where it is.
   */
  setActive: (active: boolean, opts?: { coast?: boolean }) => void
  /**
   * width x height is the colour field (small); outWidth x outHeight the canvas, normally the
   * window's own pixels, where the field is stretched and dithered. Without an output size the
   * canvas is the field's size.
   */
  resize: (width: number, height: number, outWidth?: number, outHeight?: number) => void
  dispose: () => void
  readonly running: boolean
  readonly disposed: boolean
  /** The animation clock, in seconds of flow (for tests). */
  readonly time: number
}

type GL = WebGLRenderingContext

function compile(gl: GL, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s)
    return null
  }
  return s
}

/**
 * Sets up the shader on `canvas`. Returns null, having released everything it created, if the
 * context or shader is unavailable.
 */
export function createFluidRenderer(canvas: HTMLCanvasElement, deps: FluidDeps, cb: FluidCallbacks = {}): FluidRenderer | null {
  const now = deps.now ?? (() => performance.now())
  const requestFrame = deps.requestFrame ?? ((f) => requestAnimationFrame(f))
  const cancelFrame = deps.cancelFrame ?? ((id) => cancelAnimationFrame(id))
  const frameMs = deps.frameMs ?? 1000 / 30
  const wait = deps.wait ?? (deps.requestFrame ? null : (ms: number, cb: () => void) => window.setTimeout(cb, ms))
  const cancelWait = deps.cancelWait ?? (deps.requestFrame ? null : (id: number) => window.clearTimeout(id))

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power'
  }) as GL | null
  if (!gl) return null

  const release = (...items: Array<() => void>): void => {
    for (const r of items) {
      try {
        r()
      } catch {
        /* already gone */
      }
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  const link = (vs: WebGLShader, fs: WebGLShader): WebGLProgram | null => {
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    // Both programs read the quad from attribute 0, so one buffer set-up serves both.
    gl.bindAttribLocation(prog, 0, 'aPos')
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog)
      return null
    }
    return prog
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  const prog = vs && fs ? link(vs, fs) : null
  if (!vs || !fs || !prog) {
    release(() => vs && gl.deleteShader(vs), () => fs && gl.deleteShader(fs))
    return null
  }
  // The smoothing pass is optional: without it the field is drawn straight to the canvas.
  const smoothFs = compile(gl, gl.FRAGMENT_SHADER, SMOOTH_FRAG)
  const smoothProg = smoothFs ? link(vs, smoothFs) : null

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.useProgram(prog)
  const uMix = gl.getUniformLocation(prog, 'uMix')
  const uQ = gl.getUniformLocation(prog, 'uQ')
  const uR = gl.getUniformLocation(prog, 'uR')
  const uO = gl.getUniformLocation(prog, 'uO')
  const uAspect = gl.getUniformLocation(prog, 'uAspect')
  const uGlow = gl.getUniformLocation(prog, 'uGlow')
  const uSrc = gl.getUniformLocation(prog, 'uSrc')
  const uS = gl.getUniformLocation(prog, 'uS')
  gl.uniform1i(gl.getUniformLocation(prog, 'uA'), 0)
  gl.uniform1i(gl.getUniformLocation(prog, 'uB'), 1)
  if (smoothProg) {
    gl.useProgram(smoothProg)
    gl.uniform1i(gl.getUniformLocation(smoothProg, 'uField'), 2)
  }

  const makeTex = (): WebGLTexture | null => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 18, 16, 255]))
    return t
  }
  let texA = makeTex()
  let texB = makeTex()

  // The field's own small target, sampled with linear filtering by the smoothing pass.
  let fieldTex: WebGLTexture | null = null
  let fbo: WebGLFramebuffer | null = null
  let fieldW = canvas.width
  let fieldH = canvas.height
  let outW = canvas.width
  let outH = canvas.height
  // The size the field target was last allocated at.
  let targetW = 0
  let targetH = 0
  const smoothing = (): boolean => Boolean(smoothProg && fbo && (outW !== fieldW || outH !== fieldH))
  const setupTarget = (): void => {
    if (!smoothProg) return
    if (!fieldTex) fieldTex = makeTex()
    if (!fbo) fbo = gl.createFramebuffer()
    gl.bindTexture(gl.TEXTURE_2D, fieldTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fieldW, fieldH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (!ok) {
      gl.deleteFramebuffer(fbo)
      fbo = null
    }
  }

  let mix = 1
  let glow = 0
  let fadeFrom = 0
  let time = Math.random() * 40
  let frameId = 0
  let sleepId = 0
  let running = false
  let disposed = false
  let token = 0
  // Motion amount: 0 = still, 1 = full motion. It eases toward driveTarget, so a pause coasts to
  // a stop and a play picks up instead of the colour freezing or jumping.
  let drive = 0
  let driveTarget = 0
  // The first light of the session wakes more slowly than a later play.
  let firstStart = true
  // When the latest cover landed, for its breath of light (-1: none yet).
  let pulseFrom = -1
  // The sound's shader terms (REST when nothing is heard) and where the light pools, eased
  // toward the record so a page change glides the pool instead of jumping.
  let terms: { bloomAmp: number; bloomSigma: number; warp: number; sat: number } = { ...REST }
  const sourceNow = (): [number, number] => deps.source?.() ?? [0.62, 0.5]
  let src = sourceNow()
  let panShift = 0
  // The music's share of the pool, apart from a cover's breath (the slew limit applies to it alone).
  let soundBloom = 0

  const draw = (): void => {
    if (disposed || gl.isContextLost()) return
    deps.onDraw?.()
    const smooth = smoothing()
    gl.useProgram(prog)
    gl.bindFramebuffer(gl.FRAMEBUFFER, smooth ? fbo : null)
    gl.viewport(0, 0, smooth ? fieldW : outW, smooth ? fieldH : outH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texA)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texB)
    gl.uniform1f(uMix, mix)
    gl.uniform1f(uGlow, glow)
    const aspect = fieldW / Math.max(1, fieldH)
    gl.uniform2f(uSrc, (src[0] - 0.5) * aspect + panShift, 0.5 - src[1])
    gl.uniform4f(uS, terms.bloomAmp, terms.bloomSigma, terms.warp, terms.sat)
    const f = flowUniforms(time)
    gl.uniform4f(uQ, f.q[0], f.q[1], f.q[2], f.q[3])
    gl.uniform4f(uR, f.r[0], f.r[1], f.r[2], f.r[3])
    gl.uniform2fv(uO, f.o)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!smooth || !smoothProg) return
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, outW, outH)
    gl.useProgram(smoothProg)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, fieldTex)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // Frame pacing: the loop follows the display refresh and draws on the first refresh of each
  // frameMs slot of the clock. At 30 fps the slots are every other beat of the shared 60 Hz beat
  // (utils/frameBeat), so Moving light changes on the same frames as the record and the progress
  // bar instead of adding frames of its own: on a 144 Hz laptop the separate cadences together
  // had the window drawing on nearly every refresh. Each frame advances the colour by exactly
  // the time since the previous one, so the motion stays even when the gaps alternate between
  // four and five refreshes.
  let lastSlot = -1
  let lastDraw = -1
  const frame = (t: number): void => {
    frameId = 0
    if (disposed || !running) return
    const slot = slotOf(t, frameMs)
    if (slot !== lastSlot) {
      lastSlot = slot
      const dt = lastDraw >= 0 ? Math.min(0.1, (t - lastDraw) / 1000) : 0
      lastDraw = t
      if (drive < driveTarget) drive = Math.min(driveTarget, drive + dt / (firstStart ? FIRST_UP_S : COAST_UP_S))
      else if (drive > driveTarget) drive = Math.max(driveTarget, drive - dt / COAST_DOWN_S)
      if (drive >= 1) firstStart = false
      const d = drive * drive * (3 - 2 * drive)
      const s = deps.sound?.() ?? null
      const amount = Math.max(0, deps.amount?.() ?? 1)
      const k = soundTerms(s, amount * d, amount)
      // Slew limit on the total lift (see LIFT_SLEW).
      const lift = glow + soundBloom
      const want = k.glow + k.bloomAmp
      const next = lift + Math.max(-LIFT_SLEW, Math.min(LIFT_SLEW, want - lift))
      const scale = want > 0 ? next / want : 0
      // A new cover's breath of light (also with sound follow off), on top of the music's pool.
      const breath = pulseFrom >= 0 ? COVER_PULSE_AMP * coverPulse(now() - pulseFrom) * d : 0
      soundBloom = k.bloomAmp * scale
      terms = { ...k, bloomAmp: soundBloom + breath }
      glow = k.glow * scale
      panShift = s ? Math.max(-1, Math.min(1, s.pan)) * 0.06 : 0
      // The flow: a quiet drift, faster with the song's swell and level, surging on a kick.
      time += dt * k.speed * d
      const target = sourceNow()
      src = [follow(src[0], target[0], dt, 0.5), follow(src[1], target[1], dt, 0.5)]
      if (mix < 1) {
        const p = Math.min(1, (now() - fadeFrom) / FADE_MS)
        mix = p * p * (3 - 2 * p)
      }
      draw()
      if (driveTarget === 0 && drive === 0) {
        // The coast has settled: stop for real.
        setRunning(false)
        return
      }
      // Sleep until just before the next slot instead of asking for every refresh: a page that
      // asks for a frame on every refresh keeps the whole window producing frames at the display's
      // rate (144 Hz on Naman's laptop) even when nothing is drawn.
      if (wait) {
        const ms = Math.max(0, (slot + 1) * frameMs - 0.5 - t - 5)
        sleepId = wait(ms, () => {
          sleepId = 0
          if (!disposed && running) frameId = requestFrame(frame)
        })
        return
      }
    }
    frameId = requestFrame(frame)
  }
  const schedule = (): void => {
    if (disposed || !running) return
    lastSlot = -1
    lastDraw = -1
    frameId = requestFrame(frame)
  }
  const stopLoop = (): void => {
    if (frameId) cancelFrame(frameId)
    frameId = 0
    if (sleepId && cancelWait) cancelWait(sleepId)
    sleepId = 0
  }

  const setRunning = (on: boolean): void => {
    if (on === running) return
    running = on
    if (on) {
      schedule()
    } else {
      stopLoop()
      // Finish any crossfade so a still room shows the current cover, with no sound in it.
      mix = 1
      glow = 0
      terms = { ...REST }
      soundBloom = 0
      panShift = 0
      draw()
    }
    cb.onRunning?.(on)
  }

  const onLost = (e: Event): void => {
    e.preventDefault()
    setRunning(false)
    cb.onFail?.('context lost')
  }
  canvas.addEventListener('webglcontextlost', onLost)

  const renderer: FluidRenderer = {
    get running() {
      return running
    },
    get disposed() {
      return disposed
    },
    get time() {
      return time
    },
    setActive(on, opts) {
      if (disposed) return
      if (on) {
        // drive is kept, so a play during a coast reverses from where the colour is.
        driveTarget = 1
        setRunning(true)
      } else if (opts?.coast && running) {
        driveTarget = 0
      } else {
        drive = 0
        driveTarget = 0
        setRunning(false)
      }
    },
    resize(width, height, outWidth = width, outHeight = height) {
      if (disposed) return
      fieldW = width
      fieldH = height
      const wantSmooth = outWidth !== width || outHeight !== height
      if (wantSmooth && (targetW !== width || targetH !== height)) {
        setupTarget()
        targetW = width
        targetH = height
      }
      // Without the smoothing pass the field is drawn straight to a canvas of its own size: the
      // field shader is too costly to run at every window pixel.
      const smooth = wantSmooth && Boolean(smoothProg && fbo)
      outW = smooth ? outWidth : width
      outH = smooth ? outHeight : height
      if (canvas.width !== outW || canvas.height !== outH) {
        canvas.width = outW
        canvas.height = outH
      }
      gl.useProgram(prog)
      gl.uniform1f(uAspect, width / height)
      // Resizing clears the drawing buffer: draw again now, or a still room goes blank.
      draw()
    },
    setCover(url) {
      if (disposed) return
      const mine = ++token
      deps
        .loadCover(url)
        .then((img) => {
          if (disposed || mine !== token) return // a newer track won
          const spare = texA
          texA = texB
          texB = spare
          gl.bindTexture(gl.TEXTURE_2D, texB)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
          mix = 0
          fadeFrom = now()
          pulseFrom = fadeFrom
          if (!running) {
            mix = 1
            draw()
          }
          cb.onCover?.(url, true)
        })
        .catch(() => {
          if (disposed || mine !== token) return
          cb.onCover?.(url, false)
        })
    },
    dispose() {
      if (disposed) return
      stopLoop()
      running = false
      disposed = true
      canvas.removeEventListener('webglcontextlost', onLost)
      release(
        () => gl.deleteTexture(texA),
        () => gl.deleteTexture(texB),
        () => fieldTex && gl.deleteTexture(fieldTex),
        () => fbo && gl.deleteFramebuffer(fbo),
        () => gl.deleteBuffer(buf),
        () => gl.deleteProgram(prog),
        () => smoothProg && gl.deleteProgram(smoothProg),
        () => gl.deleteShader(vs),
        () => gl.deleteShader(fs),
        () => smoothFs && gl.deleteShader(smoothFs)
      )
      cb.onRunning?.(false)
    }
  }
  draw()
  return renderer
}

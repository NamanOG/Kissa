import type { StudyEnvironment } from './scenes'

/**
 * A quiet sound bed for each Study Room environment, generated (no audio files) and kept
 * well under the music:
 *
 * - rain: thousands of individual drops on leaves, stone and the eave, over a soft hiss,
 *   with the occasional heavier drip;
 * - snow: the hush of a snowy forest, close to silence, with now and then a soft fall of
 *   snow from a branch;
 * - forest: leaves rustling in gusts, and a bird calling now and then;
 * - night: crickets across the water and the faint lap of the lake.
 *
 * Each bed is rendered once into a loop several seconds long, so no two seconds sound
 * alike and nothing is computed while it plays. Plain filtered noise is avoided: on its
 * own it reads as wind.
 */

let ctx: AudioContext | null = null
let current: { env: StudyEnvironment; out: GainNode; stop: () => void } | null = null
const cache = new Map<StudyEnvironment, AudioBuffer>()

/** Overall level: a background you notice when the music stops, not over it. */
const LEVEL = 0.32

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** One-pole filters, applied in place, for shaping noise without an audio graph. */
function lowpass(data: Float32Array, cutoff: number, rate: number): void {
  const a = Math.exp((-2 * Math.PI * cutoff) / rate)
  let y = 0
  for (let i = 0; i < data.length; i++) data[i] = y = (1 - a) * data[i] + a * y
}
function highpass(data: Float32Array, cutoff: number, rate: number): void {
  const a = Math.exp((-2 * Math.PI * cutoff) / rate)
  let y = 0
  let x0 = 0
  for (let i = 0; i < data.length; i++) {
    const x = data[i]
    y = a * (y + x - x0)
    x0 = x
    data[i] = y
  }
}

/** A short burst: a drop, a click of a cricket, a rustle grain. */
function addBurst(
  out: Float32Array,
  at: number,
  length: number,
  amp: number,
  shape: (t: number) => number
): void {
  for (let i = 0; i < length && at + i < out.length; i++) {
    out[(at + i) % out.length] += amp * shape(i)
  }
}

/** Exported for tests and for auditioning the beds outside the app. */
export function renderAmbience(env: StudyEnvironment, rate: number): Float32Array[] {
  const seconds = env === 'forest' ? 14 : 10
  const n = Math.round(rate * seconds)
  const channels = [new Float32Array(n), new Float32Array(n)]

  for (const ch of channels) {
    if (env === 'rain') {
      // A soft bed of distant rain.
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * 0.05
      highpass(ch, 900, rate)
      lowpass(ch, 7000, rate)
      // Individual drops: tiny decaying ticks with a little pitch, most quiet, some close.
      const drops = Math.round(seconds * 900)
      for (let d = 0; d < drops; d++) {
        const close = Math.random() < 0.04
        const len = Math.round(rate * (close ? rand(0.012, 0.03) : rand(0.003, 0.01)))
        const freq = close ? rand(900, 2200) : rand(2500, 7000)
        const amp = close ? rand(0.12, 0.28) : rand(0.015, 0.07)
        addBurst(ch, Math.floor(Math.random() * n), len, amp, (i) => {
          const t = i / rate
          return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * (close ? 180 : 600)) * (Math.random() * 0.4 + 0.8)
        })
      }
    } else if (env === 'snow') {
      // The hush: very quiet low air, and a soft fall of snow from a branch now and then.
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * 0.03
      lowpass(ch, 350, rate)
      lowpass(ch, 350, rate)
      const falls = Math.round(seconds / 4)
      for (let k = 0; k < falls; k++) {
        const len = Math.round(rate * rand(0.4, 0.9))
        const amp = rand(0.04, 0.08)
        const grain = new Float32Array(len)
        for (let i = 0; i < len; i++) grain[i] = Math.random() * 2 - 1
        lowpass(grain, 900, rate)
        addBurst(ch, Math.floor(Math.random() * n), len, amp, (i) => grain[i] * Math.sin((Math.PI * i) / len) ** 2)
      }
    } else if (env === 'forest') {
      // Leaves: bright noise that swells and fades in gusts, never steady.
      const leaves = new Float32Array(n)
      for (let i = 0; i < n; i++) leaves[i] = Math.random() * 2 - 1
      highpass(leaves, 1800, rate)
      lowpass(leaves, 6500, rate)
      let gust = 0
      let target = 0
      for (let i = 0; i < n; i++) {
        if (i % Math.round(rate * 0.25) === 0) target = Math.random() < 0.35 ? rand(0.05, 0.14) : rand(0.005, 0.03)
        gust += (target - gust) * 0.00004
        ch[i] = leaves[i] * gust
      }
      // A bird: a short phrase of falling whistles, two or three times per loop.
      const calls = 2 + (Math.random() < 0.5 ? 1 : 0)
      for (let k = 0; k < calls; k++) {
        let at = Math.floor(rand(0, n - rate))
        const notes = 2 + Math.floor(Math.random() * 3)
        const base = rand(2600, 4200)
        for (let m = 0; m < notes; m++) {
          const len = Math.round(rate * rand(0.07, 0.16))
          const f0 = base * rand(0.9, 1.15)
          const f1 = f0 * rand(0.7, 0.9)
          let phase = 0
          addBurst(ch, at, len, rand(0.03, 0.06), (i) => {
            const p = i / len
            phase += (2 * Math.PI * (f0 + (f1 - f0) * p)) / rate
            return Math.sin(phase + Math.sin(i / 40) * 0.6) * Math.sin(Math.PI * p)
          })
          at += len + Math.round(rate * rand(0.04, 0.12))
        }
      }
    } else {
      // Night: faint water lapping at the shore, and crickets in slow pulses.
      const water = new Float32Array(n)
      for (let i = 0; i < n; i++) water[i] = Math.random() * 2 - 1
      lowpass(water, 500, rate)
      for (let i = 0; i < n; i++) ch[i] = water[i] * 0.05 * (0.5 + 0.5 * Math.sin((2 * Math.PI * i) / (rate * rand(2.8, 3.2))))
      const crickets = 3
      for (let c = 0; c < crickets; c++) {
        const freq = rand(4300, 5200)
        const amp = rand(0.008, 0.02)
        const period = rand(0.7, 1.2)
        let at = Math.floor(rand(0, rate))
        while (at < n) {
          // A chirp: three or four quick pulses.
          const pulses = 3 + Math.floor(Math.random() * 2)
          for (let p = 0; p < pulses; p++) {
            const len = Math.round(rate * 0.018)
            addBurst(ch, at + p * Math.round(rate * 0.03), len, amp, (i) => Math.sin((2 * Math.PI * freq * i) / rate) * Math.sin((Math.PI * i) / len))
          }
          at += Math.round(rate * period * rand(0.85, 1.2))
        }
      }
    }
  }

  // Even out loudness between environments: each bed peaks at a set, gentle level.
  const peakTarget = { rain: 0.5, snow: 0.28, forest: 0.45, night: 0.35 }[env]
  let peak = 0
  for (const ch of channels) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch[i]))
  if (peak > 0) for (const ch of channels) for (let i = 0; i < n; i++) ch[i] *= peakTarget / peak

  // Soften the loop point so it never clicks.
  const fade = Math.round(rate * 0.25)
  for (const ch of channels) {
    for (let i = 0; i < fade; i++) {
      const g = i / fade
      ch[i] *= g
      ch[n - 1 - i] *= g
    }
  }
  return channels
}

function bufferFor(context: AudioContext, env: StudyEnvironment): AudioBuffer {
  const cached = cache.get(env)
  if (cached) return cached
  const data = renderAmbience(env, context.sampleRate)
  const buffer = context.createBuffer(2, data[0].length, context.sampleRate)
  data.forEach((ch, i) => buffer.getChannelData(i).set(ch))
  cache.set(env, buffer)
  return buffer
}

export function setAmbience(env: StudyEnvironment | null): void {
  if (current && (!env || current.env !== env)) {
    const old = current
    current = null
    if (ctx) {
      old.out.gain.cancelScheduledValues(ctx.currentTime)
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.5)
    }
    window.setTimeout(old.stop, 2500)
  }
  if (!env || current) return
  try {
    if (!window.AudioContext) return
    ctx = ctx ?? new AudioContext()
    void ctx.resume()
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(ctx.destination)
    // Two copies offset in time, so the loop's own rhythm never becomes noticeable.
    const sources = [0, 0.37].map((offset) => {
      const src = ctx!.createBufferSource()
      src.buffer = bufferFor(ctx!, env)
      src.loop = true
      const g = ctx!.createGain()
      g.gain.value = 0.7
      src.connect(g).connect(out)
      src.start(0, src.buffer.duration * offset)
      return src
    })
    out.gain.setTargetAtTime(LEVEL, ctx.currentTime, 1.2)
    current = { env, out, stop: () => sources.forEach((s) => s.stop()) }
  } catch {
    current = null
  }
}

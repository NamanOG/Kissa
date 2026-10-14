import type { StudyEnvironment } from './scenes'

/**
 * A quiet sound bed for each Study Room environment, generated (no audio files): rain on
 * glass, winter wind, wind in the trees, a night with crickets. Off by default and kept
 * well under the music.
 */

let ctx: AudioContext | null = null
let current: { env: StudyEnvironment; out: GainNode; stop: () => void } | null = null

function noise(context: AudioContext, seconds: number, brownness: number): AudioBuffer {
  const buffer = context.createBuffer(2, Math.round(context.sampleRate * seconds), context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + brownness * white) / (1 + brownness)
      data[i] = last * 3.2 + white * 0.1
    }
  }
  return buffer
}

function bed(
  context: AudioContext,
  dest: AudioNode,
  opts: { lowpass: number; highpass: number; level: number; seconds: number; brownness?: number; sway?: number }
): () => void {
  const src = context.createBufferSource()
  src.buffer = noise(context, opts.seconds, opts.brownness ?? 0.04)
  src.loop = true
  const hp = context.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = opts.highpass
  const lp = context.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = opts.lowpass
  const g = context.createGain()
  g.gain.value = opts.level
  src.connect(hp).connect(lp).connect(g).connect(dest)
  let lfo: OscillatorNode | null = null
  if (opts.sway) {
    // Wind rises and falls.
    lfo = context.createOscillator()
    lfo.frequency.value = 0.07 + Math.random() * 0.05
    const depth = context.createGain()
    depth.gain.value = opts.level * opts.sway
    lfo.connect(depth).connect(g.gain)
    lfo.start()
  }
  src.start()
  return () => {
    src.stop()
    lfo?.stop()
  }
}

function crickets(context: AudioContext, dest: AudioNode): () => void {
  const timer = window.setInterval(() => {
    if (Math.random() > 0.55) return
    const t = context.currentTime + Math.random() * 0.4
    const freq = 4200 + Math.random() * 500
    for (let i = 0; i < 3; i++) {
      const osc = context.createOscillator()
      const g = context.createGain()
      osc.frequency.value = freq
      const start = t + i * 0.07
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.012, start + 0.01)
      g.gain.linearRampToValueAtTime(0, start + 0.045)
      osc.connect(g).connect(dest)
      osc.start(start)
      osc.stop(start + 0.06)
    }
  }, 700)
  return () => window.clearInterval(timer)
}

export function setAmbience(env: StudyEnvironment | null): void {
  if (current && (!env || current.env !== env)) {
    const old = current
    current = null
    if (ctx) {
      old.out.gain.cancelScheduledValues(ctx.currentTime)
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
    }
    window.setTimeout(old.stop, 2000)
  }
  if (!env || current) return
  try {
    if (!window.AudioContext) return
    ctx = ctx ?? new AudioContext()
    void ctx.resume()
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(ctx.destination)
    const stops: Array<() => void> = []
    if (env === 'rain') {
      stops.push(bed(ctx, out, { lowpass: 900, highpass: 120, level: 0.9, seconds: 4.3 }))
      stops.push(bed(ctx, out, { lowpass: 5200, highpass: 1800, level: 0.25, seconds: 3.1 }))
    } else if (env === 'snow') {
      stops.push(bed(ctx, out, { lowpass: 480, highpass: 50, level: 0.9, seconds: 5.1, brownness: 0.02, sway: 0.6 }))
    } else if (env === 'forest') {
      stops.push(bed(ctx, out, { lowpass: 700, highpass: 80, level: 0.7, seconds: 4.7, sway: 0.5 }))
      stops.push(bed(ctx, out, { lowpass: 4200, highpass: 1600, level: 0.12, seconds: 3.7, sway: 0.8 }))
    } else {
      stops.push(bed(ctx, out, { lowpass: 380, highpass: 40, level: 0.5, seconds: 5.3, brownness: 0.02, sway: 0.4 }))
      stops.push(crickets(ctx, out))
    }
    out.gain.setTargetAtTime(0.1, ctx.currentTime, 0.8)
    current = { env, out, stop: () => stops.forEach((s) => s()) }
  } catch {
    current = null
  }
}

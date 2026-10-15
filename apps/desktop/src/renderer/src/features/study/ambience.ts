import type { StudyEnvironment } from './scenes'
// Field recordings from Freesound, all released under CC0 (public domain). Credits are kept
// in media/study/sounds/CREDITS.md even though CC0 does not require them.
import rainSound from '@renderer/media/study/sounds/rain.mp3'
import snowSound from '@renderer/media/study/sounds/snow.mp3'
import forestSound from '@renderer/media/study/sounds/forest.mp3'
import nightSound from '@renderer/media/study/sounds/night.mp3'
import fireplaceSound from '@renderer/media/study/sounds/fireplace.mp3'

/**
 * The Study Room's room sound: a real recording for each environment, looped seamlessly
 * (the end is crossfaded into the start once, after decoding) and played well under the
 * music at a volume the person sets.
 */

const SOURCES: Record<StudyEnvironment, string> = {
  rain: rainSound,
  snow: snowSound,
  forest: forestSound,
  night: nightSound,
  fireplace: fireplaceSound
}

/** Seconds of the recording's end blended into its start, so the loop has no seam. */
const CROSSFADE = 3

let ctx: AudioContext | null = null
let current: { env: StudyEnvironment; out: GainNode; stop: () => void } | null = null
let volume = 0.5
const loops = new Map<StudyEnvironment, Promise<AudioBuffer>>()

/** Perceived loudness follows the square of the slider; the top is still under the music. */
function gainFor(v: number): number {
  return Math.max(0, Math.min(1, v)) ** 2
}

/** Recordings arrive at very different levels (rain about 27 dB quieter than night); each is evened to this. */
const TARGET_RMS = 10 ** (-30 / 20)

/** Folds the last CROSSFADE seconds into the first, equal-power, drops the tail, and evens the level. */
function seamless(context: AudioContext, source: AudioBuffer): AudioBuffer {
  const fade = Math.min(Math.floor(CROSSFADE * source.sampleRate), Math.floor(source.length / 4))
  const length = source.length - fade
  const out = context.createBuffer(source.numberOfChannels, length, source.sampleRate)
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const input = source.getChannelData(ch)
    const output = out.getChannelData(ch)
    output.set(input.subarray(0, length))
    for (let i = 0; i < fade; i++) {
      const t = i / fade
      output[i] = input[i] * Math.sin((t * Math.PI) / 2) + input[length + i] * Math.cos((t * Math.PI) / 2)
    }
  }
  let sum = 0
  let peak = 0
  let count = 0
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i]
      peak = Math.max(peak, Math.abs(data[i]))
    }
    count += data.length
  }
  const rms = Math.sqrt(sum / Math.max(1, count))
  // Never push a peak past 0.95, so a loud moment cannot clip.
  const scale = rms > 0 ? Math.min(TARGET_RMS / rms, peak > 0 ? 0.95 / peak : 1) : 1
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch)
    for (let i = 0; i < data.length; i++) data[i] *= scale
  }
  return out
}

function loopFor(context: AudioContext, env: StudyEnvironment): Promise<AudioBuffer> {
  let pending = loops.get(env)
  if (!pending) {
    pending = fetch(SOURCES[env])
      .then((res) => res.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => seamless(context, buffer))
    pending.catch(() => loops.delete(env))
    loops.set(env, pending)
  }
  return pending
}

export function setAmbienceVolume(v: number): void {
  volume = v
  if (current && ctx) current.out.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.15)
}

export function setAmbience(env: StudyEnvironment | null): void {
  if (current && (!env || current.env !== env)) {
    const old = current
    current = null
    if (ctx) {
      old.out.gain.cancelScheduledValues(ctx.currentTime)
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.6)
    }
    window.setTimeout(old.stop, 3000)
  }
  if (!env || current) return
  try {
    if (!window.AudioContext) return
    ctx = ctx ?? new AudioContext()
    const context = ctx
    void context.resume()
    const out = context.createGain()
    out.gain.value = 0
    out.connect(context.destination)
    let source: AudioBufferSourceNode | null = null
    let stopped = false
    current = {
      env,
      out,
      stop: () => {
        stopped = true
        source?.stop()
        out.disconnect()
      }
    }
    void loopFor(context, env).then((buffer) => {
      if (stopped) return
      source = context.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.connect(out)
      // Start somewhere in the recording, so each visit does not open the same way.
      source.start(0, Math.random() * buffer.duration)
      out.gain.setTargetAtTime(gainFor(volume), context.currentTime, 1.5)
    })
  } catch {
    current = null
  }
}

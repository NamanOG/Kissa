/**
 * Kissa Hi-Fi: the sound of a record, for albums Kissa plays from the listener's own files.
 *
 * Everything here is built from the browser's own Web Audio nodes; nothing is recorded or
 * downloaded. The pure parts (record wear, the surface of the record, the saturation curve) are
 * kept apart from the audio graph so they can be tested and measured offline.
 */

export type RecordWear = 'mint' | 'played' | 'loved'

export const WEARS: RecordWear[] = ['mint', 'played', 'loved']

export interface WearSound {
  /** Level of the steady hiss of the groove (linear, against a full-scale signal). */
  hiss: number
  /** Ticks and crackles per second. */
  crackles: number
  /** Louder pops per second. */
  pops: number
  /** Where the top end rolls off (Hz). */
  rollOff: number
  /** How far the platter's speed drifts: delay swing in seconds at the rotation rate. */
  wow: number
  /** How hard the signal leans into the warm saturation (0 = none). */
  drive: number
}

/** A new pressing, a record that has been played, and one that has been loved for years. */
export const WEAR_SOUND: Record<RecordWear, WearSound> = {
  mint: { hiss: 0.0011, crackles: 1.2, pops: 0.03, rollOff: 18000, wow: 0.00011, drive: 0.25 },
  played: { hiss: 0.0019, crackles: 4, pops: 0.12, rollOff: 15500, wow: 0.0002, drive: 0.45 },
  loved: { hiss: 0.0032, crackles: 9, pops: 0.35, rollOff: 12500, wow: 0.00026, drive: 0.7 }
}

/** 33⅓ turns a minute. */
export const ROTATION_HZ = 100 / 3 / 60
/** The surface loops every four turns, so the scratch that ticks once a turn stays in place. */
export const SURFACE_SECONDS = 4 / ROTATION_HZ

/** A small seeded random source, so a record's surface is the same each time it is made. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export interface Surface {
  left: Float32Array
  right: Float32Array
  /** How many crackles and pops were placed, for tests. */
  events: number
}

/**
 * The surface of the record: a soft pink hiss in each channel, crackles and pops scattered
 * through the loop, and for a worn record one scratch that ticks once a turn.
 */
export function makeSurface(sampleRate: number, wear: RecordWear, seed = 33): Surface {
  const w = WEAR_SOUND[wear]
  const length = Math.round(SURFACE_SECONDS * sampleRate)
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  const rand = seeded(seed)

  // Pink hiss (Paul Kellet's filter), separate in each channel like a real stereo groove.
  for (const ch of [left, right]) {
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < length; i++) {
      const white = rand() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      ch[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11 * w.hiss * 4
      b6 = white * 0.115926
    }
  }

  // One crackle: a tiny, sharp click that dies away in about a millisecond, a little louder on
  // one side than the other because dust sits on one wall of the groove.
  const click = (at: number, amp: number, ms: number): void => {
    const n = Math.max(8, Math.round((ms / 1000) * sampleRate))
    const side = rand() * 0.6 - 0.3
    const sign = rand() < 0.5 ? -1 : 1
    for (let k = 0; k < n; k++) {
      const i = (at + k) % length
      const env = Math.exp((-6 * k) / n)
      const v = sign * amp * env * (k === 0 ? 1 : rand() * 2 - 1)
      left[i] += v * (1 - side)
      right[i] += v * (1 + side)
    }
  }

  let events = 0
  const seconds = SURFACE_SECONDS
  const crackles = Math.round(w.crackles * seconds)
  for (let c = 0; c < crackles; c++) {
    // Mostly faint, now and then a clear one (a long-tailed spread, like real dust).
    const amp = 0.004 + 0.03 * Math.pow(rand(), 3)
    click(Math.floor(rand() * length), amp, 0.4 + rand() * 0.8)
    events++
  }
  const pops = Math.max(wear === 'mint' ? 0 : 1, Math.round(w.pops * seconds))
  for (let p = 0; p < pops; p++) {
    click(Math.floor(rand() * length), 0.04 + 0.05 * rand(), 1.5 + rand() * 1.5)
    events++
  }
  if (wear !== 'mint') {
    // A light scratch: the same soft tick on every turn.
    const at = Math.floor(rand() * (length / 4))
    const amp = wear === 'loved' ? 0.03 : 0.014
    for (let turn = 0; turn < 4; turn++) {
      click(at + Math.round((turn * length) / 4), amp, 1.2)
      events++
    }
  }
  return { left, right, events }
}

/**
 * The warm saturation of a valve stage: gentle, a touch asymmetric (which adds the even
 * harmonics people hear as warmth), and level-matched so quiet passages are not made louder.
 */
export function saturationCurve(drive: number, points = 2048): Float32Array {
  const curve = new Float32Array(points)
  const k = 1 + drive * 1.6
  const bias = 0.06 * drive
  const centre = Math.tanh(k * bias)
  const gainAtZero = k * (1 - centre * centre)
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1
    curve[i] = (Math.tanh(k * (x + bias)) - centre) / gainAtZero
  }
  return curve
}

/** The pieces of the graph that change with wear or with the switch. */
export interface VinylChain {
  input: AudioNode
  output: AudioNode
  /** Set how worn the record sounds. */
  setWear: (wear: RecordWear) => void
  /** Fade between the clean file (0) and the record (1). */
  setMix: (mix: number, seconds?: number) => void
  /** Fade the surface noise in while the music plays and out when it stops. */
  setSurface: (on: boolean, level?: number, seconds?: number) => void
  stop: () => void
}

/** The delay the record path adds, matched on the clean path so switching does not comb. */
const BASE_DELAY = 0.012

/**
 * Builds the record's sound on any audio context (a live one in the app, an offline one for
 * measuring): warmth in the low end, a softer top, a little saturation, the platter's slow
 * drift, and the surface of the record mixed underneath.
 */
export function buildVinylChain(ctx: BaseAudioContext, wear: RecordWear): VinylChain {
  const input = ctx.createGain()
  const output = ctx.createGain()

  // Clean path, delayed to line up with the record path.
  const dryDelay = ctx.createDelay(0.05)
  dryDelay.delayTime.value = BASE_DELAY
  const dry = ctx.createGain()
  input.connect(dryDelay).connect(dry).connect(output)

  // Record path.
  const warmth = ctx.createBiquadFilter()
  warmth.type = 'lowshelf'
  warmth.frequency.value = 140
  warmth.gain.value = 2.2
  const rumbleCut = ctx.createBiquadFilter()
  rumbleCut.type = 'highpass'
  rumbleCut.frequency.value = 22
  const presence = ctx.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3200
  presence.Q.value = 0.7
  presence.gain.value = -1.2
  const air = ctx.createBiquadFilter()
  air.type = 'highshelf'
  air.frequency.value = 9500
  air.gain.value = -1.5
  const rollOff = ctx.createBiquadFilter()
  rollOff.type = 'lowpass'
  rollOff.Q.value = 0.6
  const shaper = ctx.createWaveShaper()
  shaper.oversample = '2x'
  const drift = ctx.createDelay(0.05)
  drift.delayTime.value = BASE_DELAY
  const wet = ctx.createGain()

  input
    .connect(rumbleCut)
    .connect(warmth)
    .connect(presence)
    .connect(air)
    .connect(rollOff)
    .connect(shaper)
    .connect(drift)
    .connect(wet)
    .connect(output)

  // The platter: a slow wow once a turn and a faint flutter from the motor.
  const wow = ctx.createOscillator()
  wow.frequency.value = ROTATION_HZ
  const wowDepth = ctx.createGain()
  wow.connect(wowDepth).connect(drift.delayTime)
  const flutter = ctx.createOscillator()
  flutter.frequency.value = 6.3
  const flutterDepth = ctx.createGain()
  flutter.connect(flutterDepth).connect(drift.delayTime)
  wow.start()
  flutter.start()

  // The surface of the record.
  const surfaceGain = ctx.createGain()
  surfaceGain.gain.value = 0
  const surfaceTone = ctx.createBiquadFilter()
  surfaceTone.type = 'highpass'
  surfaceTone.frequency.value = 60
  surfaceTone.connect(surfaceGain).connect(output)
  let surface: AudioBufferSourceNode | null = null

  let mix = 1
  let surfaceOn = false
  let surfaceLevel = 1

  const ramp = (param: AudioParam, value: number, seconds: number): void => {
    const t = ctx.currentTime
    param.cancelScheduledValues(t)
    param.setValueAtTime(param.value, t)
    param.linearRampToValueAtTime(value, t + Math.max(0.005, seconds))
  }

  const applySurface = (seconds: number): void =>
    ramp(surfaceGain.gain, surfaceOn ? mix * surfaceLevel : 0, seconds)

  const setWear = (next: RecordWear): void => {
    const w = WEAR_SOUND[next]
    rollOff.frequency.value = w.rollOff
    shaper.curve = saturationCurve(w.drive) as Float32Array<ArrayBuffer>
    wowDepth.gain.value = w.wow
    flutterDepth.gain.value = w.wow * 0.12
    const s = makeSurface(ctx.sampleRate, next)
    const buffer = ctx.createBuffer(2, s.left.length, ctx.sampleRate)
    buffer.copyToChannel(s.left as Float32Array<ArrayBuffer>, 0)
    buffer.copyToChannel(s.right as Float32Array<ArrayBuffer>, 1)
    const old = surface
    surface = ctx.createBufferSource()
    surface.buffer = buffer
    surface.loop = true
    surface.connect(surfaceTone)
    surface.start()
    if (old) {
      try {
        old.stop()
      } catch {
        /* already stopped */
      }
      old.disconnect()
    }
  }

  const setMix = (value: number, seconds = 0.35): void => {
    mix = Math.max(0, Math.min(1, value))
    ramp(wet.gain, mix, seconds)
    ramp(dry.gain, 1 - mix, seconds)
    applySurface(seconds)
  }

  const setSurface = (on: boolean, level = 1, seconds = 0.6): void => {
    surfaceOn = on
    surfaceLevel = Math.max(0, Math.min(1, level))
    applySurface(seconds)
  }

  wet.gain.value = 1
  dry.gain.value = 0
  setWear(wear)

  const stop = (): void => {
    for (const node of [wow, flutter, surface]) {
      try {
        node?.stop()
      } catch {
        /* already stopped */
      }
    }
    input.disconnect()
    output.disconnect()
  }

  return { input, output, setWear, setMix, setSurface, stop }
}

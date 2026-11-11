import { afterOpening } from '@renderer/features/startup/openingGate'
import { beatOf, sleepUntilNextBeat } from '@renderer/utils/frameBeat'
import {
  bandLevel,
  bassPulse,
  energyStep,
  follow,
  followAR,
  kickRateScale,
  ONSET_START,
  onsetStep,
  RANGE_START,
  rangeStep,
  relativeLevel,
  rms,
  toDb,
  toVu,
  VU_MIN
} from './levels'

/**
 * Listens to what the PC is playing (Windows loopback, granted by the main process) and keeps
 * a few numbers up to date for the Moving light. Nothing is recorded or kept: each
 * block of sound is measured and dropped.
 *
 * Capture runs only while something needs it (reference counted through acquire) and stops a
 * few seconds after the last user lets go, so a pause does not keep Windows capturing.
 */
export interface SoundLevels {
  /** Needle readings in VU (VU_MIN at rest). */
  left: number
  right: number
  /** 0 to 1, for the light. */
  energy: number
  /** 0 to 1, a kick in the low end, fading. */
  pulse: number
  /** 0..1 inside the song's own loudness range. Fast: attack 0.09 s, release 0.45 s. */
  level: number
  /** 0..1, the same over about 2.5 s: verse against chorus. */
  swell: number
  /** 0..1 low band (30 to 150 Hz), smoothed 0.14 s, relative to its own 4 s average, 0.5 = average. */
  bass: number
  /** 0..1 kick envelope: attack 0.035 s, release 0.32 s. Already scaled by the rate limiter. */
  kick: number
  /** -1..1, right minus left, smoothed 0.5 s. 0 for mono. */
  pan: number
  /** 0..1 low mids (150 to 500 Hz) and mids (500 to 2000 Hz), each against its own 4 s average (0.5 = average), smoothed 0.05 s. For the now-playing bars. */
  lowMid: number
  mid: number
}

export type SoundStatus = 'off' | 'starting' | 'live' | 'waiting-for-click' | 'unavailable'

type Listener = (levels: SoundLevels, dt: number) => void

const RELEASE_MS = 4000

export class SoundListener {
  readonly levels: SoundLevels = { left: VU_MIN, right: VU_MIN, energy: 0, pulse: 0, level: 0, swell: 0, bass: 0, kick: 0, pan: 0, lowMid: 0, mid: 0 }
  status: SoundStatus = 'off'
  private users = 0
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private left: AnalyserNode | null = null
  private right: AnalyserNode | null = null
  private low: AnalyserNode | null = null
  private bufL = new Float32Array(2048)
  private bufR = new Float32Array(2048)
  private bins = new Uint8Array(64)
  private bassAvg = 0
  private range = RANGE_START
  private bassSlow = 0
  private onset = ONSET_START
  private kickTarget = 0
  private lowMidSlow = 0
  private midSlow = 0
  private frame = 0
  private sleep = 0
  private lastBeat = -1
  private last = 0
  private releaseTimer = 0
  private listeners = new Set<Listener>()
  private statusListeners = new Set<(s: SoundStatus) => void>()
  private gestureRetry: (() => void) | null = null
  private attempt = 0

  /** Start listening (if not already); call the returned function to let go. */
  acquire(): () => void {
    this.users++
    window.clearTimeout(this.releaseTimer)
    if (this.status === 'off' || this.status === 'unavailable') void this.start()
    let released = false
    return () => {
      if (released) return
      released = true
      this.users = Math.max(0, this.users - 1)
      if (this.users === 0) {
        window.clearTimeout(this.releaseTimer)
        this.releaseTimer = window.setTimeout(() => this.stop(), RELEASE_MS)
      }
    }
  }

  /** Called on every measured frame while live. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  onStatus(fn: (s: SoundStatus) => void): () => void {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  private setStatus(s: SoundStatus): void {
    this.status = s
    for (const fn of this.statusListeners) fn(s)
  }

  private async start(): Promise<void> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.setStatus('unavailable')
      return
    }
    const mine = ++this.attempt
    this.setStatus('starting')
    await afterOpening()
    if (mine !== this.attempt || this.users === 0) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
    } catch (e) {
      if (mine !== this.attempt) return
      // Chromium may want a click before it lets a page capture; try again on the next one.
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'InvalidStateError' || name === 'NotAllowedError') {
        this.setStatus('waiting-for-click')
        this.armGestureRetry()
      } else {
        this.setStatus('unavailable')
      }
      return
    }
    // The video is only there because Chromium asks for it; stop it straight away.
    stream.getVideoTracks().forEach((t) => t.stop())
    if (mine !== this.attempt || this.users === 0) {
      stream.getTracks().forEach((t) => t.stop())
      if (mine === this.attempt) this.setStatus('off')
      return
    }
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((t) => t.stop())
      this.setStatus('unavailable')
      return
    }
    try {
      const ctx = new AudioContext({ latencyHint: 'playback' })
      const src = ctx.createMediaStreamSource(stream)
      const split = ctx.createChannelSplitter(2)
      const left = ctx.createAnalyser()
      const right = ctx.createAnalyser()
      const low = ctx.createAnalyser()
      left.fftSize = right.fftSize = 2048
      low.fftSize = 2048
      // Short smoothing: the kick detector needs the attack (0.5 smeared it over about three beats).
      low.smoothingTimeConstant = 0.2
      src.connect(split)
      split.connect(left, 0)
      split.connect(right, 1)
      src.connect(low)
      // Analysers measure without being connected to the speakers, so nothing is played twice.
      this.stream = stream
      this.ctx = ctx
      this.left = left
      this.right = right
      this.low = low
      this.bufL = new Float32Array(left.fftSize)
      this.bufR = new Float32Array(right.fftSize)
      this.bins = new Uint8Array(low.frequencyBinCount)
      stream.getAudioTracks()[0].addEventListener('ended', () => this.stop())
      this.setStatus('live')
      this.last = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      this.setStatus('unavailable')
    }
  }

  private armGestureRetry(): void {
    if (this.gestureRetry) return
    const retry = (): void => {
      this.gestureRetry = null
      window.removeEventListener('pointerdown', retry, true)
      window.removeEventListener('keydown', retry, true)
      if (this.users > 0 && this.status === 'waiting-for-click') void this.start()
    }
    this.gestureRetry = retry
    window.addEventListener('pointerdown', retry, true)
    window.addEventListener('keydown', retry, true)
  }

  private tick = (now: number): void => {
    this.frame = 0
    if (!this.left || !this.right || !this.low || !this.ctx) return
    // Measured once per beat of the shared 60 Hz beat (utils/frameBeat), not on every refresh of
    // a 144 Hz display: nothing that reads the levels draws faster than that.
    const beat = beatOf(now)
    if (beat === this.lastBeat) {
      this.frame = requestAnimationFrame(this.tick)
      return
    }
    this.lastBeat = beat
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.left.getFloatTimeDomainData(this.bufL)
    this.right.getFloatTimeDomainData(this.bufR)
    const l = rms(this.bufL)
    const r = rms(this.bufR)
    const lv = this.levels
    lv.left = follow(lv.left, toVu(l), dt)
    lv.right = follow(lv.right, toVu(r), dt)
    lv.energy = energyStep(lv.energy, Math.max(l, r), dt)
    // Low end: the bins under about 150 Hz.
    this.low.getByteFrequencyData(this.bins)
    const hz = this.ctx.sampleRate / 2 / this.bins.length
    const top = Math.max(1, Math.round(150 / hz))
    let bass = 0
    for (let i = 1; i <= top; i++) bass += this.bins[i]
    bass /= top * 255
    const b = bassPulse(this.bassAvg, bass, dt)
    this.bassAvg = b.avg
    lv.pulse = Math.max(b.pulse, follow(lv.pulse, 0, dt, 0.25))
    // The light's signals, measured against the song itself so a quiet master or a low player
    // volume moves the light as much as a loud one.
    const db = toDb(Math.max(l, r))
    this.range = rangeStep(this.range, db, dt)
    const rel = relativeLevel(this.range, db)
    lv.level = followAR(lv.level, rel, dt, 0.09, 0.45)
    lv.swell = follow(lv.swell, rel, dt, 2.5)
    const bassNow = bandLevel(this.bins, hz, 30, 150)
    this.bassSlow = follow(this.bassSlow, bassNow, dt, 4)
    const bassRel = this.bassSlow > 0.02 ? Math.max(0, Math.min(1, (0.5 * bassNow) / this.bassSlow)) : 0
    lv.bass = follow(lv.bass, bassRel, dt, 0.14)
    const o = onsetStep(this.onset, bassNow, dt)
    this.onset = o.state
    if (o.strength > 0) this.kickTarget = o.strength * kickRateScale(this.onset.interval)
    lv.kick = followAR(lv.kick, this.kickTarget, dt, 0.035, 0.32)
    if (lv.kick > this.kickTarget * 0.9) this.kickTarget = 0 // peak reached: let it fall
    const bandRel = (now: number, slow: number): number => (slow > 0.02 ? Math.max(0, Math.min(1, (0.5 * now) / slow)) : 0)
    const lowMidNow = bandLevel(this.bins, hz, 150, 500)
    const midNow = bandLevel(this.bins, hz, 500, 2000)
    this.lowMidSlow = follow(this.lowMidSlow, lowMidNow, dt, 4)
    this.midSlow = follow(this.midSlow, midNow, dt, 4)
    lv.lowMid = follow(lv.lowMid, bandRel(lowMidNow, this.lowMidSlow), dt, 0.05)
    lv.mid = follow(lv.mid, bandRel(midNow, this.midSlow), dt, 0.05)
    const sum = l + r
    lv.pan = follow(lv.pan, sum > 1e-4 ? Math.max(-1, Math.min(1, (r - l) / sum)) : 0, dt, 0.5)
    for (const fn of this.listeners) fn(lv, dt)
    this.sleep = window.setTimeout(() => {
      this.sleep = 0
      if (this.ctx) this.frame = requestAnimationFrame(this.tick)
    }, sleepUntilNextBeat(now, beat))
  }

  stop(): void {
    this.attempt++
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
    if (this.sleep) window.clearTimeout(this.sleep)
    this.sleep = 0
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close().catch(() => undefined)
    this.stream = null
    this.ctx = null
    this.left = this.right = this.low = null
    if (this.gestureRetry) {
      window.removeEventListener('pointerdown', this.gestureRetry, true)
      window.removeEventListener('keydown', this.gestureRetry, true)
      this.gestureRetry = null
    }
    const lv = this.levels
    lv.left = lv.right = VU_MIN
    lv.energy = lv.pulse = 0
    lv.level = lv.swell = lv.bass = lv.kick = lv.pan = lv.lowMid = lv.mid = 0
    this.lowMidSlow = this.midSlow = 0
    this.bassAvg = 0
    this.range = RANGE_START
    this.bassSlow = 0
    this.onset = ONSET_START
    this.kickTarget = 0
    for (const fn of this.listeners) fn(lv, 0)
    if (this.status !== 'unavailable') this.setStatus('off')
  }
}

export const soundListener = new SoundListener()

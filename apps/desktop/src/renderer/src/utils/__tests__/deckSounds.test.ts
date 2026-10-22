import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { DECK_SOUND_URLS, playDeckSound, resetDeckSoundsForTest, type DeckSound } from '../deckSounds'

/*
 * The recordings themselves (files on disk) and how they are played. Whether they sound right
 * is a listening judgement; these checks keep the files technically sound and the playback
 * rules honest.
 */

const DIR = join(__dirname, '../../assets/sounds/turntable')
const FILES: Record<DeckSound, string> = {
  needleDrop: 'needle-drop.wav',
  needleLift: 'needle-lift.wav',
  power: 'power.wav',
  speed: 'speed.wav',
  button: 'start-stop.wav',
  buttonUp: 'key-release.wav',
  toggle: 'match-album.wav',
  tick: 'tick.wav'
}

function readWav(name: string): { rate: number; channels: number; bits: number; samples: Float32Array } {
  const b = readFileSync(join(DIR, name))
  expect(b.toString('ascii', 0, 4)).toBe('RIFF')
  expect(b.toString('ascii', 8, 12)).toBe('WAVE')
  const channels = b.readUInt16LE(22)
  const rate = b.readUInt32LE(24)
  const bits = b.readUInt16LE(34)
  const len = b.readUInt32LE(40) / 2
  const samples = new Float32Array(len)
  for (let i = 0; i < len; i++) samples[i] = b.readInt16LE(44 + i * 2) / 32768
  return { rate, channels, bits, samples }
}
const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-9))

describe('turntable recordings', () => {
  it.each(Object.entries(FILES))('%s: 48 kHz mono 16-bit, headroom, no clicks at either end', (sound, file) => {
    const { rate, channels, bits, samples } = readWav(file)
    expect([rate, channels, bits]).toEqual([48000, 1, 16])
    let peak = 0
    for (const v of samples) peak = Math.max(peak, Math.abs(v))
    expect(db(peak)).toBeLessThanOrEqual(-6) // headroom under the music
    expect(db(peak)).toBeGreaterThan(-40) // and actually audible
    expect(Math.abs(samples[0])).toBeLessThan(0.002) // faded in
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.002) // faded out
    const seconds = samples.length / rate
    if (sound === 'needleDrop') expect(seconds).toBeLessThan(1.5) // brief groove texture, not hiss
    else expect(seconds).toBeLessThan(0.35)
  })

  it('the needle contact starts within the first 40 ms of its sound, so it lands with the arm', () => {
    const { rate, samples } = readWav(FILES.needleDrop)
    let peak = 0
    for (const v of samples) peak = Math.max(peak, Math.abs(v))
    // The first touch (the stylus then settles with smaller bumps, which can be the loudest part)
    const onset = samples.findIndex((v) => Math.abs(v) > peak * 0.1)
    expect(onset / rate).toBeLessThan(0.04)
  })

  it('the groove texture after contact fades away rather than continuing as hiss', () => {
    const { rate, samples } = readWav(FILES.needleDrop)
    const rms = (from: number, to: number): number => {
      let e = 0
      for (let i = Math.floor(from * rate); i < Math.floor(to * rate); i++) e += samples[i] * samples[i]
      return db(Math.sqrt(e / ((to - from) * rate)))
    }
    const end = samples.length / rate
    expect(rms(end - 0.1, end)).toBeLessThan(rms(0.1, 0.2) - 10)
  })

  it('controls are restrained: release under press, routine ticks quietest, nothing as loud as the needle', () => {
    // Loudest 50 ms of each file, in dBFS
    const loudest = (sound: DeckSound): number => {
      const { rate, samples } = readWav(FILES[sound])
      const w = Math.round(0.05 * rate)
      let best = 0
      for (let s = 0; s + w <= Math.max(w, samples.length); s += Math.round(w / 4)) {
        let e = 0
        for (let i = s; i < s + w && i < samples.length; i++) e += samples[i] * samples[i]
        best = Math.max(best, e / w)
      }
      return 10 * Math.log10(best + 1e-12)
    }
    const controls: DeckSound[] = ['power', 'speed', 'button', 'buttonUp', 'toggle', 'tick']
    for (const c of controls) expect(loudest(c)).toBeLessThan(loudest('needleDrop') - 3)
    expect(loudest('buttonUp')).toBeLessThan(loudest('button') - 3)
    for (const c of controls.filter((c) => c !== 'tick')) expect(loudest('tick')).toBeLessThan(loudest(c))
    expect(loudest('tick')).toBeLessThan(-45)
  })

  it('every sound has a recording', () => {
    expect(Object.keys(DECK_SOUND_URLS).sort()).toEqual(Object.keys(FILES).sort())
  })
})

describe('playing turntable sounds', () => {
  let starts: number
  beforeEach(() => {
    starts = 0
    resetDeckSoundsForTest()
    class FakeContext {
      state = 'running'
      sampleRate = 48000
      destination = {}
      decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
      createBufferSource = () => ({ buffer: null, connect: () => {}, start: () => void starts++ })
      createGain = () => ({ gain: { value: 1 }, connect: () => {} })
      resume = async () => {}
    }
    ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeContext
    vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
    usePlayerStore.setState({ needleSound: true })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0))
  }

  it('plays once the recording is decoded, and straight away after that', async () => {
    playDeckSound('power')
    await settle()
    expect(starts).toBe(1)
    playDeckSound('power')
    expect(starts).toBe(2)
  })

  it('stays silent when Turntable sounds is off', async () => {
    usePlayerStore.setState({ needleSound: false })
    playDeckSound('needleDrop')
    playDeckSound('tick')
    await settle()
    expect(starts).toBe(0)
  })

  it('drops a sound whose recording arrives too late to line up with the gesture', async () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    let release: () => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => (release = () => r({ arrayBuffer: async () => new ArrayBuffer(8) })))))
    playDeckSound('needleLift')
    now = 500
    release()
    await settle()
    expect(starts).toBe(0)
  })

  it('a slider drag does not buzz: ticks at most every 35 ms', async () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    playDeckSound('tick')
    await settle()
    for (now = 1; now < 30; now += 5) playDeckSound('tick')
    expect(starts).toBe(1)
    now = 40
    playDeckSound('tick')
    expect(starts).toBe(2)
  })
})

describe('inlined recordings', () => {
  it('a tiny recording inlined as a data URL is decoded without fetch (the page policy blocks it)', async () => {
    resetDeckSoundsForTest()
    let decoded = 0
    class FakeContext {
      state = 'running'
      destination = {}
      decodeAudioData = async (b: ArrayBuffer) => (decoded = b.byteLength, { duration: 0.03 })
      createBufferSource = () => ({ buffer: null, connect: () => {}, start: () => {} })
      createGain = () => ({ gain: { value: 1 }, connect: () => {} })
      resume = async () => {}
    }
    ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeContext
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const original = DECK_SOUND_URLS.tick
    DECK_SOUND_URLS.tick = 'data:audio/wav;base64,' + Buffer.from('RIFFxxxxWAVE').toString('base64')
    usePlayerStore.setState({ needleSound: true })
    playDeckSound('tick')
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0))
    DECK_SOUND_URLS.tick = original
    vi.unstubAllGlobals()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(decoded).toBe(12)
  })
})

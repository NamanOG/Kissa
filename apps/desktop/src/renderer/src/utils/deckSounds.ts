/**
 * Kissa's turntable sounds: recordings of real equipment, cut to single events and
 * loudness-matched (sources, licences and edits: assets/sounds/turntable/SOURCES.md).
 *
 * - The needle: contact with the record and a brief stretch of lead-in groove that fades
 *   (needleDrop), and the stylus leaving the groove (needleLift). A lifted arm moving through
 *   the air makes no sound.
 * - The deck's controls: the power switch, the 33/45 key, the Start/Stop key and its release,
 *   the Match Album key, and a small tick for on-screen switches and sliders.
 *
 * One shared AudioContext, created on first use. Each recording is fetched and decoded once
 * and kept; playing one is a single buffer source and a gain node. All sounds honour one
 * preference, "Turntable sounds" (needleSound in the player store).
 */
import { usePlayerStore } from '@renderer/stores/playerStore'
import needleDropUrl from '@renderer/assets/sounds/turntable/needle-drop.wav'
import needleLiftUrl from '@renderer/assets/sounds/turntable/needle-lift.wav'
import powerUrl from '@renderer/assets/sounds/turntable/power.wav'
import speedUrl from '@renderer/assets/sounds/turntable/speed.wav'
import startStopUrl from '@renderer/assets/sounds/turntable/start-stop.wav'
import keyReleaseUrl from '@renderer/assets/sounds/turntable/key-release.wav'
import matchAlbumUrl from '@renderer/assets/sounds/turntable/match-album.wav'
import tickUrl from '@renderer/assets/sounds/turntable/tick.wav'

export type DeckSound =
  | 'power'
  | 'speed'
  | 'button'
  | 'buttonUp'
  | 'toggle'
  | 'tick'
  | 'needleDrop'
  | 'needleLift'

export const DECK_SOUND_URLS: Record<DeckSound, string> = {
  power: powerUrl,
  speed: speedUrl,
  button: startStopUrl,
  buttonUp: keyReleaseUrl,
  toggle: matchAlbumUrl,
  tick: tickUrl,
  needleDrop: needleDropUrl,
  needleLift: needleLiftUrl
}

/** Overall level under the music. The recordings themselves are already matched to each other. */
const MASTER_GAIN = 0.9
/**
 * A sound asked for before its recording is ready plays only if it can still start within this
 * long; later than that it would no longer line up with what the user did, so it is dropped.
 */
const MAX_LATE_MS = 120

let ctx: AudioContext | null = null
const buffers = new Map<DeckSound, AudioBuffer>()
const loading = new Map<DeckSound, Promise<AudioBuffer | null>>()
const lastPlayed = new Map<DeckSound, number>()

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC({ latencyHint: 'interactive' })
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

/**
 * The bundler inlines very small files (the tick) as data URLs. The page's security policy does
 * not let fetch() read data URLs, so those are decoded here instead.
 */
function readSound(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const base64 = url.slice(url.indexOf(',') + 1)
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return Promise.resolve(bytes.buffer)
  }
  return fetch(url).then((r) => r.arrayBuffer())
}

function load(ac: AudioContext, sound: DeckSound): Promise<AudioBuffer | null> {
  const ready = buffers.get(sound)
  if (ready) return Promise.resolve(ready)
  let pending = loading.get(sound)
  if (!pending) {
    pending = readSound(DECK_SOUND_URLS[sound])
      .then((data) => ac.decodeAudioData(data))
      .then((b) => {
        buffers.set(sound, b)
        return b
      })
      .catch(() => {
        loading.delete(sound) // try again next time
        return null
      })
    loading.set(sound, pending)
  }
  return pending
}

/** Decode every recording ahead of use (called on the first user gesture). */
export function preloadDeckSounds(): void {
  const ac = context()
  if (!ac) return
  for (const s of Object.keys(DECK_SOUND_URLS) as DeckSound[]) void load(ac, s)
}

function start(ac: AudioContext, b: AudioBuffer, volume: number): void {
  const src = ac.createBufferSource()
  src.buffer = b
  const gain = ac.createGain()
  gain.gain.value = Math.max(0, Math.min(1, volume * MASTER_GAIN))
  src.connect(gain)
  gain.connect(ac.destination)
  src.start()
}

/** Whether the user has turntable sounds on (Settings → Playback). */
export function deckSoundsEnabled(): boolean {
  return usePlayerStore.getState().needleSound
}

/** Play one sound now. Quietly does nothing when sounds are off or audio is unavailable. */
export function playDeckSound(sound: DeckSound, volume = 1): void {
  try {
    if (!deckSoundsEnabled()) return
    const ac = context()
    if (!ac) return
    // Ticks fired by dragging a slider would otherwise buzz: at most one every 35 ms.
    const nowMs = performance.now()
    if (sound === 'tick' && nowMs - (lastPlayed.get(sound) ?? -Infinity) < 35) return
    lastPlayed.set(sound, nowMs)
    const ready = buffers.get(sound)
    if (ready) {
      start(ac, ready, volume)
      return
    }
    void load(ac, sound).then((b) => {
      if (b && performance.now() - nowMs <= MAX_LATE_MS && deckSoundsEnabled()) start(ac, b, volume)
    })
  } catch {
    // Sound is a nicety; never let it break a control.
  }
}

/** Tests only: forget decoded recordings and the audio context. */
export function resetDeckSoundsForTest(): void {
  ctx = null
  buffers.clear()
  loading.clear()
  lastPlayed.clear()
}

// Decode the recordings on the first gesture, so the first press already sounds on time.
if (typeof window !== 'undefined') {
  const prime = (): void => {
    window.removeEventListener('pointerdown', prime, true)
    window.removeEventListener('keydown', prime, true)
    if (deckSoundsEnabled()) preloadDeckSounds()
  }
  window.addEventListener('pointerdown', prime, true)
  window.addEventListener('keydown', prime, true)
}

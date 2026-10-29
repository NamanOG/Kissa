import { buildVinylChain, type VinylChain } from './vinylSound'
import { useHifiStore } from './hifiStore'

/**
 * Puts Kissa's own audio element through the vinyl sound. The audio graph is made the first
 * time an album from the PC plays with the sound on; after that the element always plays
 * through it (a browser cannot take that back), and switching off simply fades to the clean
 * path. Audio from other apps is never touched: Kissa only follows those.
 */
class VinylEngine {
  private audio: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private chain: VinylChain | null = null
  private playing = false
  private unsubscribe: (() => void) | null = null

  attach(audio: HTMLAudioElement): void {
    this.audio = audio
    // Web Audio can only hear media that allows it; Kissa's album protocol does.
    audio.crossOrigin = 'anonymous'
    audio.addEventListener('playing', this.onPlaying)
    audio.addEventListener('pause', this.onStopped)
    audio.addEventListener('ended', this.onStopped)
    audio.addEventListener('volumechange', this.apply)
    this.unsubscribe = useHifiStore.subscribe((s, prev) => {
      if (s.wear !== prev.wear) this.chain?.setWear(s.wear)
      if (s.on !== prev.on || s.comparing !== prev.comparing) {
        if (s.on && this.playing) this.ensure()
        this.apply()
      }
    })
  }

  detach(): void {
    const audio = this.audio
    if (audio) {
      audio.removeEventListener('playing', this.onPlaying)
      audio.removeEventListener('pause', this.onStopped)
      audio.removeEventListener('ended', this.onStopped)
      audio.removeEventListener('volumechange', this.apply)
    }
    this.unsubscribe?.()
    this.unsubscribe = null
    this.chain?.stop()
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.chain = null
    this.audio = null
  }

  private ensure(): void {
    if (this.chain || !this.audio) return
    try {
      const ctx = new AudioContext({ latencyHint: 'playback' })
      const source = ctx.createMediaElementSource(this.audio)
      const chain = buildVinylChain(ctx, useHifiStore.getState().wear)
      source.connect(chain.input)
      chain.output.connect(ctx.destination)
      chain.setMix(0, 0.01)
      this.ctx = ctx
      this.chain = chain
      useHifiStore.getState().setStatus('live')
    } catch (err) {
      console.warn('[vinyl] could not route Kissa audio through the vinyl sound', err)
      useHifiStore.getState().setStatus('unavailable')
    }
  }

  private onPlaying = (): void => {
    this.playing = true
    if (useHifiStore.getState().on) this.ensure()
    if (this.ctx?.state === 'suspended') void this.ctx.resume()
    this.apply()
  }

  private onStopped = (): void => {
    this.playing = false
    // The surface goes quiet with the music, quicker than it came in.
    this.chain?.setSurface(false, 0, 0.25)
  }

  private apply = (): void => {
    const chain = this.chain
    if (!chain) return
    const { on, comparing } = useHifiStore.getState()
    const record = on && !comparing
    chain.setMix(record ? 1 : 0, comparing ? 0.12 : 0.6)
    // The element's volume already scales the music; the surface follows it the same way.
    const volume = this.audio && !this.audio.muted ? this.audio.volume : 0
    chain.setSurface(record && this.playing, volume, this.playing ? 0.8 : 0.25)
  }
}

export const vinylEngine = new VinylEngine()

/**
 * A lightweight, non-React singleton that serves as the single authoritative
 * source of truth for the current playback time.
 *
 * This prevents multiple competing requestAnimationFrame loops from fighting,
 * and allows high-frequency UI updates (Scrubber, Lyrics) to read time
 * without causing React re-renders.
 */
export class PlaybackClock {
  private static audioEl: HTMLAudioElement | null = null

  // SMTC (System Media Transport Controls) state for external media
  private static smtcTime: number = 0
  private static smtcAnchorTime: number = 0
  private static isSmtcPlaying: boolean = false
  private static useSmtc: boolean = false
  private static subscribers = new Set<{ callback: (time: number) => void }>()
  private static subscriberRafId: number | null = null
  private static lastMonotonicTime: number = 0

  /**
   * Subscribe to playback-time updates from the shared animation frame loop.
   * The returned unsubscribe function is safe to call more than once.
   */
  static subscribe(callback: (time: number) => void): () => void {
    const subscriber = { callback }
    this.subscribers.add(subscriber)
    this.ensureSubscriberLoop()

    let isSubscribed = true
    return () => {
      if (!isSubscribed) return
      isSubscribed = false
      this.subscribers.delete(subscriber)

      if (this.subscribers.size === 0) {
        this.stopSubscriberLoop()
      }
    }
  }

  /**
   * Bind the local HTMLAudioElement
   */
  static setAudioElement(el: HTMLAudioElement | null) {
    this.audioEl = el
  }

  /**
   * Switch the active playback mode.
   * true = System Media (Spotify, Apple Music, etc)
   * false = Internal Audio
   */
  static setMode(useSmtc: boolean) {
    this.useSmtc = useSmtc
    if (!useSmtc && this.audioEl) {
      // Sync internal audio time to prevent jumps
      this.smtcTime = this.audioEl.currentTime
      this.smtcAnchorTime = performance.now()
      this.lastMonotonicTime = this.audioEl.currentTime
    }
  }

  /**
   * Update the SMTC external media state
   */
  static setSmtcState(positionSeconds: number, isPlaying: boolean) {
    this.smtcTime = positionSeconds
    this.smtcAnchorTime = performance.now()
    this.isSmtcPlaying = isPlaying
    this.lastMonotonicTime = positionSeconds
  }

  /**
   * Handle user seeking visually (allows UI to update instantly)
   */
  static setSeekPosition(positionSeconds: number) {
    this.lastMonotonicTime = positionSeconds
    if (this.useSmtc) {
      this.smtcTime = positionSeconds
      this.smtcAnchorTime = performance.now()
    } else if (this.audioEl) {
      this.audioEl.currentTime = positionSeconds
    }

    // A paused clock has no advancing playback time to trigger visual updates.
    // Publish the explicit seek synchronously so scrubbers and lyrics do not lag.
    this.notifySubscribers(this.getCurrentTime())
  }

  /**
   * Get the current authoritative playback time in seconds.
   * This is safe to call at 60Hz from requestAnimationFrame.
   */
  static getCurrentTime(): number {
    if (!this.useSmtc && this.audioEl) {
      return this.audioEl.currentTime
    }

    if (this.useSmtc) {
      if (!this.isSmtcPlaying) return this.smtcTime
      const elapsedSeconds = (performance.now() - this.smtcAnchorTime) / 1000
      const current = this.smtcTime + elapsedSeconds
      if (current >= this.lastMonotonicTime) {
        this.lastMonotonicTime = current
        return current
      }
      return this.lastMonotonicTime
    }

    return 0
  }

  private static ensureSubscriberLoop(): void {
    if (this.subscriberRafId !== null || this.subscribers.size === 0) return
    this.subscriberRafId = requestAnimationFrame(this.onSubscriberFrame)
  }

  private static stopSubscriberLoop(): void {
    if (this.subscriberRafId === null) return
    cancelAnimationFrame(this.subscriberRafId)
    this.subscriberRafId = null
  }

  private static onSubscriberFrame = (): void => {
    this.subscriberRafId = null
    if (this.subscribers.size === 0) return

    const time = this.getCurrentTime()
    this.notifySubscribers(time)
    this.ensureSubscriberLoop()
  }

  private static notifySubscribers(time: number): void {
    for (const { callback } of this.subscribers) {
      try {
        callback(time)
      } catch (error) {
        console.error('[PlaybackClock] Subscriber callback failed', error)
      }
    }
  }
}

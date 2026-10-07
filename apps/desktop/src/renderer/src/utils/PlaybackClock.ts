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

  private static smtcTime: number = 0
  private static smtcAnchorTime: number = 0
  private static isSmtcPlaying: boolean = false
  private static useSmtc: boolean = false
  private static subscribers = new Set<{ callback: (time: number) => void }>()
  private static subscriberRafId: number | null = null
  private static lastMonotonicTime: number = 0
  private static driftSamples: Array<{ at: number; offset: number }> = []

  /** A reported position this far from our estimate is a seek or a restart: jump to it. */
  private static readonly HARD_SYNC_SECONDS = 1.6
  /** How much history a drift decision looks at, and the least it needs. */
  private static readonly DRIFT_WINDOW_MS = 1700
  private static readonly DRIFT_MIN_SPAN_MS = 1100
  /** Below this the estimate is as good as the report; leave it alone. */
  private static readonly DRIFT_TOLERANCE_SECONDS = 0.06
  /** Reports that spread this widely come from a source that counts in whole seconds. */
  private static readonly COARSE_SPREAD_SECONDS = 0.5
  /** A whole-second tick is noticed up to one fast poll (about 50ms) late; assume half of that. */
  private static readonly COARSE_LATENCY_SECONDS = 0.03

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
    this.driftSamples = []
  }

  /**
   * Start or stop the external clock where it currently stands. Used when playback
   * is toggled from inside Kissa, before the source app has reported the change.
   */
  static setSmtcPlaying(isPlaying: boolean): void {
    if (this.isSmtcPlaying === isPlaying) return
    const now = this.getCurrentTime()
    this.smtcTime = now
    this.smtcAnchorTime = performance.now()
    this.isSmtcPlaying = isPlaying
    this.lastMonotonicTime = now
    this.driftSamples = []
  }

  /**
   * Reconcile the clock with a position reported by the source app.
   *
   * Large disagreements (a seek, a loop, a new track) are taken at once.
   *
   * Otherwise the clock follows the furthest point the source has been shown to reach
   * over the last couple of seconds. Some players (Apple Music on Windows) report the
   * position in whole seconds, so their reports trail the music by anything up to a
   * second and are only right at the instant the number ticks over. Reports are never
   * ahead of the music, so the most advanced one in the window is the accurate one.
   * A player that reports precisely gives the same answer from every report.
   *
   * @returns 'hard' when the clock jumped, 'slew' when drift was corrected, else 'none'.
   */
  static syncSmtc(positionSeconds: number, sampleAgeMs: number = 0): 'hard' | 'slew' | 'none' {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return 'none'

    if (!this.isSmtcPlaying) {
      if (Math.abs(positionSeconds - this.smtcTime) <= 0.05) return 'none'
      this.setSmtcState(positionSeconds, false)
      return 'hard'
    }

    const now = performance.now()
    const age = Math.min(2000, Math.max(0, sampleAgeMs)) / 1000
    const reported = positionSeconds + age
    const estimate = this.smtcTime + (now - this.smtcAnchorTime) / 1000

    if (Math.abs(reported - estimate) > this.HARD_SYNC_SECONDS) {
      this.setSmtcState(reported, true)
      return 'hard'
    }

    // "Offset" is position minus wall-clock time: constant while a track plays steadily.
    const samples = this.driftSamples
    samples.push({ at: now, offset: reported - now / 1000 })
    while (samples.length > 0 && now - samples[0].at > this.DRIFT_WINDOW_MS) samples.shift()
    if (now - samples[0].at < this.DRIFT_MIN_SPAN_MS) return 'none'

    let furthest = -Infinity
    let nearest = Infinity
    for (const sample of samples) {
      if (sample.offset > furthest) furthest = sample.offset
      if (sample.offset < nearest) nearest = sample.offset
    }
    const coarse = furthest - nearest > this.COARSE_SPREAD_SECONDS
    const target = furthest + (coarse ? this.COARSE_LATENCY_SECONDS : 0)
    const current = this.smtcTime - this.smtcAnchorTime / 1000
    const correction = target - current
    // A coarse source's best report wobbles by a fraction of a poll; do not chase that.
    const tolerance = coarse ? 0.08 : this.DRIFT_TOLERANCE_SECONDS
    if (Math.abs(correction) < tolerance) return 'none'

    // Shift the anchor. A backwards correction is absorbed by the monotonic guard in
    // getCurrentTime(): the clock holds still for a moment instead of running backwards.
    this.smtcTime += correction
    return 'slew'
  }

  /**
   * Handle user seeking visually (allows UI to update instantly)
   */
  static setSeekPosition(positionSeconds: number) {
    this.lastMonotonicTime = positionSeconds
    if (this.useSmtc) {
      this.smtcTime = positionSeconds
      this.smtcAnchorTime = performance.now()
      this.driftSamples = []
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

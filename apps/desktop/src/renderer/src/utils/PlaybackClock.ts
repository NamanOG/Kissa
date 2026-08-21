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
    }
  }

  /**
   * Update the SMTC external media state
   */
  static setSmtcState(positionSeconds: number, isPlaying: boolean) {
    this.smtcTime = positionSeconds
    this.smtcAnchorTime = performance.now()
    this.isSmtcPlaying = isPlaying
  }

  /**
   * Handle user seeking visually (allows UI to update instantly)
   */
  static setSeekPosition(positionSeconds: number) {
    if (this.useSmtc) {
      this.smtcTime = positionSeconds
      this.smtcAnchorTime = performance.now()
    } else if (this.audioEl) {
      this.audioEl.currentTime = positionSeconds
    }
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
      return this.smtcTime + elapsedSeconds
    }
    
    return 0
  }
}

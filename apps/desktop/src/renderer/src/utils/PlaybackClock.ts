import { beatOf, sleepUntilNextBeat } from './frameBeat'

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
  private static driftSamples: Array<{ at: number; offset: number; whole: boolean }> = []
  /** A report far behind the clock, waiting for a second report to confirm it. */
  private static pendingBehind: { at: number; position: number } | null = null
  /**
   * Until this time (just after a track change) any far report is taken at once: a new track is a
   * known discontinuity, and the first report can still carry the previous song's position.
   */
  private static freshUntil = 0
  private static readonly FRESH_TRACK_MS = 6000
  private static readonly INTRO_SECONDS = 4
  /** The last position the source reported and when, for diagnostics. */
  static lastReport: { position: number; at: number } | null = null

  /**
   * How far the source's own timeline trails what can be heard, in seconds, added to every time
   * the clock hands out (the drift logic below works in the source's own reported terms).
   * Apple Music on Windows: its SMTC position is behind its audio. Lyricify, an established Windows
   * lyrics app, recommends a -400 to -500 ms session delay for it (docs.lyricify.app, Apple Music
   * FAQ). Kissa's own replay of four live captures (2026-11-06) shows the clock already sits on
   * the upper edge of Apple's reports within 30 ms, so this lead is the whole remaining gap.
   */
  private static sourceLead = 0

  /** A reported position this far from our estimate is a seek or a restart: jump to it. */
  private static readonly HARD_SYNC_SECONDS = 1.6
  /**
   * A report far BEHIND the clock is believed only when the next one, within this long, carries
   * on from it. Measured 2026-11-05 (Apple Music on Windows, live helper capture): around a song's
   * start the source reports 1.7 s, then 0.0, then 2.0 within 0.8 s, and its position stalls for
   * a second or more at a time. Each stale or stalled report used to be taken as a seek, so the
   * lyrics jumped back a line or more and stayed behind until the source next jumped forward. A
   * real seek back or restart keeps advancing from its new place and is confirmed at once by the
   * next report (about a second later); forward jumps are still taken immediately.
   */
  private static readonly BEHIND_CONFIRM_MS = 2500
  /** How closely the confirming report must follow on from the first. */
  private static readonly BEHIND_CONFIRM_TOLERANCE_SECONDS = 0.75
  /**
   * How much history a drift decision looks at, and the least it needs.
   *
   * Measured 2026-11-05 (Apple Music on Windows, helper log): the position is reported in
   * whole seconds from a timer that fires every ~1.03 s, so each report trails the music by a
   * lag that grows ~30 ms per report and resets about every 33 s (a skipped second). Only the
   * reports just after that reset are accurate. A 1.7 s window saw one or two reports and rode
   * the trailing edge (about 0.5 s late on average, nearly 1 s at worst); 40 s always holds a
   * reset. Seeks, pauses and track changes still clear the history at once.
   */
  private static readonly DRIFT_WINDOW_MS = 40_000
  private static readonly DRIFT_MIN_SPAN_MS = 1100
  /** Below this the estimate is as good as the report; leave it alone. */
  private static readonly DRIFT_TOLERANCE_SECONDS = 0.06
  /** The most one report may move the clock in the normal (not seek) case. */
  private static readonly MAX_SLEW_STEP_SECONDS = 0.15
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
  /**
   * How far the playing source's timeline trails its audio. Set on every media report; it does
   * not move the clock's own picture of the source, only the time handed out.
   */
  static setSourceProfile(profile: { leadSeconds: number }): void {
    this.sourceLead = Math.max(0, Math.min(1.5, profile.leadSeconds || 0))
  }

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
    this.pendingBehind = null
  }

  /**
   * A new track: the clock starts at its position at once, and for the next few seconds takes any
   * far report without waiting for confirmation. A position past the new track's length (the
   * previous song's place, reported a moment late) is read as its start.
   */
  static startTrack(positionSeconds: number, isPlaying: boolean, durationSeconds: number = 0): void {
    const valid = Number.isFinite(positionSeconds) && positionSeconds >= 0
    const position = !valid || (durationSeconds > 0 && positionSeconds > durationSeconds) ? 0 : positionSeconds
    this.setSmtcState(position, isPlaying)
    this.freshUntil = performance.now() + this.FRESH_TRACK_MS
  }

  /**
   * Start or stop the external clock where it currently stands. Used when playback
   * is toggled from inside Kissa, before the source app has reported the change.
   */
  static setSmtcPlaying(isPlaying: boolean): void {
    if (this.isSmtcPlaying === isPlaying) return
    const now = this.sourceTime()
    this.smtcTime = now
    this.smtcAnchorTime = performance.now()
    this.isSmtcPlaying = isPlaying
    this.lastMonotonicTime = now
    this.driftSamples = []
    this.pendingBehind = null
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
    this.lastReport = { position: reported, at: now }
    const estimate = this.smtcTime + (now - this.smtcAnchorTime) / 1000

    // Far away in either direction: a seek, a restart, or a stale or premature report. Believe
    // it once the next report carries on from it (see BEHIND_CONFIRM_MS), except just after a
    // track change, when the clock may still hold the previous song's place.
    if (Math.abs(reported - estimate) > this.HARD_SYNC_SECONDS && now < this.freshUntil) {
      const fresh = this.freshUntil
      this.setSmtcState(reported, true)
      this.freshUntil = fresh
      return 'hard'
    }
    if (Math.abs(reported - estimate) > this.HARD_SYNC_SECONDS) {
      const pending = this.pendingBehind
      if (pending && now - pending.at <= this.BEHIND_CONFIRM_MS) {
        const elapsed = (now - pending.at) / 1000
        // A second copy of the same report (players often send two per tick): keep waiting.
        if (elapsed < 0.4) return 'none'
        const advanced = reported - pending.position
        // Confirmed only if the source carried on from there; a stalled source does not count.
        if (
          advanced >= elapsed * 0.5 &&
          Math.abs(advanced - elapsed) <= this.BEHIND_CONFIRM_TOLERANCE_SECONDS
        ) {
          this.setSmtcState(reported, true)
          return 'hard'
        }
      }
      this.pendingBehind = { at: now, position: reported }
      return 'none'
    }
    // Back in agreement: whatever was waiting was a stale report, and a new track's start is settled.
    this.pendingBehind = null
    this.freshUntil = 0

    // A song's first seconds do not count towards the drift picture: Apple Music reports them up
    // to a second ahead of where the song settles, then jumps back (measured 2026-11-05).
    if (reported < this.INTRO_SECONDS) return 'none'

    // "Offset" is position minus wall-clock time: constant while a track plays steadily.
    const samples = this.driftSamples
    const whole = Math.abs(positionSeconds - Math.round(positionSeconds)) < 0.12
    samples.push({ at: now, offset: reported - now / 1000, whole })
    while (samples.length > 0 && now - samples[0].at > this.DRIFT_WINDOW_MS) samples.shift()
    if (now - samples[0].at < this.DRIFT_MIN_SPAN_MS) return 'none'

    // The furthest the music has been shown to reach, counting only reports that a later one
    // (at least 0.4 s on) agrees with: one premature report cannot pull the clock ahead.
    // Measured 2026-11-05 (Apple Music): at a song's start it reports ~1.4 s ahead and stalls.
    let furthest = -Infinity
    let nearest = Infinity
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]
      if (sample.offset < nearest) nearest = sample.offset
      let confirmed = false
      for (let j = i + 1; j < samples.length && !confirmed; j++) {
        confirmed = samples[j].at - sample.at >= 400 && samples[j].offset >= sample.offset - 0.15
      }
      if (confirmed && sample.offset > furthest) furthest = sample.offset
    }
    if (furthest === -Infinity) return 'none'

    // A source that counts in whole seconds (Apple Music on Windows) trails the music by an
    // unknown part of a second until it skips a second, which shows its true phase (the spread
    // of its reports reaches a full second). Before that, assume the expected lag rather than
    // none: the part is uniform on [0, 1), less what the reports so far have ruled out.
    const spread = furthest - nearest
    const coarse = spread > this.COARSE_SPREAD_SECONDS
    const wholeReports = samples.filter((s) => s.whole).length
    const wholeSecondSource = wholeReports >= 4 && wholeReports >= samples.length * 0.8
    let lead = 0
    if (coarse) lead = this.COARSE_LATENCY_SECONDS
    else if (wholeSecondSource) lead = Math.max(0, (1 - Math.min(0.9, spread)) / 2)
    const target = furthest + lead
    const current = this.smtcTime - this.smtcAnchorTime / 1000
    const correction = target - current
    // A coarse source's best report wobbles by a fraction of a poll; do not chase that.
    const tolerance = coarse || wholeSecondSource ? 0.08 : this.DRIFT_TOLERANCE_SECONDS
    if (Math.abs(correction) < tolerance) return 'none'

    // Glide, do not jump: each report (about a second apart) closes 40% of the error, or
    // MAX_SLEW_STEP_SECONDS if that is more, so a correction is spread over a few seconds and the
    // sung line never flicks ahead and back.
    // A backwards step is absorbed by the monotonic guard in getCurrentTime(): the clock runs
    // on a touch slower for a moment instead of running backwards.
    const limit = Math.max(this.MAX_SLEW_STEP_SECONDS, Math.abs(correction) * 0.4)
    const step = Math.max(-limit, Math.min(limit, correction))
    this.smtcTime += step
    return 'slew'
  }

  /**
   * Handle user seeking visually (allows UI to update instantly)
   */
  static setSeekPosition(positionSeconds: number) {
    this.pendingBehind = null
    if (this.useSmtc) {
      // The seek target is what will be heard; the source will report it a little behind.
      const reported = Math.max(0, positionSeconds - this.sourceLead)
      this.lastMonotonicTime = reported
      this.smtcTime = reported
      this.smtcAnchorTime = performance.now()
      this.driftSamples = []
    } else if (this.audioEl) {
      this.lastMonotonicTime = positionSeconds
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

    if (this.useSmtc) return this.sourceTime() + this.sourceLead

    return 0
  }

  /** The clock in the source's own terms (what it would report now), never running backwards. */
  private static sourceTime(): number {
    if (!this.isSmtcPlaying) return this.smtcTime
    const elapsedSeconds = (performance.now() - this.smtcAnchorTime) / 1000
    const current = this.smtcTime + elapsedSeconds
    if (current >= this.lastMonotonicTime) {
      this.lastMonotonicTime = current
      return current
    }
    return this.lastMonotonicTime
  }

  private static ensureSubscriberLoop(): void {
    if (this.subscriberRafId !== null || this.subscriberTimer !== null || this.subscribers.size === 0) return
    this.subscriberRafId = requestAnimationFrame(this.onSubscriberFrame)
  }

  private static stopSubscriberLoop(): void {
    this.lastBeat = -1
    if (this.subscriberTimer !== null) {
      clearTimeout(this.subscriberTimer)
      this.subscriberTimer = null
    }
    if (this.subscriberRafId === null) return
    cancelAnimationFrame(this.subscriberRafId)
    this.subscriberRafId = null
  }

  /**
   * At most 60 updates a second, on any display, on the shared beat (utils/frameBeat): lyrics
   * and progress bars change on the same frames as the record, so they do not add frames of
   * their own on 120 and 144 Hz screens.
   */
  private static subscriberTimer: ReturnType<typeof setTimeout> | null = null
  private static lastBeat = -1

  private static onSubscriberFrame = (t: number): void => {
    this.subscriberRafId = null
    if (this.subscribers.size === 0) return
    const b = beatOf(t)
    if (b === this.lastBeat) {
      // Woke a refresh early: the beat has not turned yet.
      this.subscriberRafId = requestAnimationFrame(this.onSubscriberFrame)
      return
    }
    this.lastBeat = b

    const time = this.getCurrentTime()
    this.notifySubscribers(time)
    this.subscriberTimer = setTimeout(() => {
      this.subscriberTimer = null
      this.ensureSubscriberLoop()
    }, sleepUntilNextBeat(t, b))
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

/** Apple Music for Windows: how far its timeline trails its audio (see PlaybackClock.sourceLead). */
export const APPLE_MUSIC_LEAD_SECONDS = 0.45

/** What is known about a player's timeline, from its SMTC app id. */
export function sourceProfile(sourceAppId: string | undefined): { leadSeconds: number } {
  return { leadSeconds: /applemusic/i.test(sourceAppId ?? '') ? APPLE_MUSIC_LEAD_SECONDS : 0 }
}
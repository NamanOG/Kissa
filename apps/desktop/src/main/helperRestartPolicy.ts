/**
 * When the media helper stops on its own, it is started again so playback detection
 * recovers without reopening Kissa. A helper that keeps failing is left stopped: a few
 * attempts within a window, with a growing delay, then no more until the app restarts.
 */
export interface HelperRestartPolicyOptions {
  maxRestarts?: number
  windowMs?: number
  baseDelayMs?: number
}

export class HelperRestartPolicy {
  private readonly maxRestarts: number
  private readonly windowMs: number
  private readonly baseDelayMs: number
  private restarts: number[] = []

  constructor(options: HelperRestartPolicyOptions = {}) {
    this.maxRestarts = options.maxRestarts ?? 3
    this.windowMs = options.windowMs ?? 10 * 60_000
    this.baseDelayMs = options.baseDelayMs ?? 2_000
  }

  /** The delay before the next start, or null when the helper should stay stopped. */
  nextDelay(now: number): number | null {
    this.restarts = this.restarts.filter((t) => now - t < this.windowMs)
    if (this.restarts.length >= this.maxRestarts) return null
    const delay = this.baseDelayMs * 2 ** this.restarts.length
    this.restarts.push(now)
    return delay
  }
}

import { describe, expect, it } from 'vitest'
import { HelperRestartPolicy } from '../helperRestartPolicy'

describe('HelperRestartPolicy', () => {
  it('restarts with a growing delay, then stops', () => {
    const policy = new HelperRestartPolicy({ maxRestarts: 3, windowMs: 60_000, baseDelayMs: 1_000 })
    expect(policy.nextDelay(0)).toBe(1_000)
    expect(policy.nextDelay(5_000)).toBe(2_000)
    expect(policy.nextDelay(10_000)).toBe(4_000)
    expect(policy.nextDelay(15_000)).toBeNull()
  })

  it('allows restarts again once earlier failures leave the window', () => {
    const policy = new HelperRestartPolicy({ maxRestarts: 2, windowMs: 60_000, baseDelayMs: 1_000 })
    policy.nextDelay(0)
    policy.nextDelay(1_000)
    expect(policy.nextDelay(2_000)).toBeNull()
    expect(policy.nextDelay(61_500)).toBe(1_000)
  })
})

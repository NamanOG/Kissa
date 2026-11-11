import { describe, expect, it, vi } from 'vitest'
import { BLOOM_MAX, coverPulse, createFluidRenderer, MAX_SPEED, soundTerms, WARP_MAX, type SoundSignals } from '../fluidRenderer'
import { controlledCovers, makeFakeGl } from './fakeGl'

/**
 * A manual display: animation frames fire only on refreshes the test asks for, every
 * refreshMs (a 144 Hz display unless a test says otherwise). stallWhen() drops refreshes, as a
 * busy page does.
 */
function manualClock(refreshMs = 1000 / 144) {
  let t = 0
  let id = 0
  const frames = new Map<number, (t: number) => void>()
  const drawnAt: number[] = []
  let stall = (_n: number): boolean => false
  let n = 0
  return {
    deps: {
      now: () => t,
      requestFrame: (cb: (t: number) => void) => (frames.set(++id, cb), id),
      cancelFrame: (i: number) => void frames.delete(i),
      frameMs: 1000 / 30,
      onDraw: () => void drawnAt.push(t)
    },
    drawnAt,
    stallWhen(f: (n: number) => boolean) {
      stall = f
    },
    advance(ms: number) {
      const end = t + ms
      while (t + refreshMs <= end + 1e-9) {
        t += refreshMs
        if (stall(++n)) continue
        const fs = [...frames.values()]
        frames.clear()
        for (const f of fs) f(t)
      }
      t = end
    },
    get pending() {
      return frames.size
    }
  }
}

function setup(opts: Parameters<typeof makeFakeGl>[0] = {}, refreshMs?: number, frameMs?: number) {
  const fake = makeFakeGl(opts)
  const canvas = document.createElement('canvas')
  canvas.getContext = vi.fn(() => fake.gl) as unknown as HTMLCanvasElement['getContext']
  const clock = manualClock(refreshMs)
  const covers = controlledCovers()
  const onCover = vi.fn()
  const onFail = vi.fn()
  const onRunning = vi.fn()
  const r = createFluidRenderer(canvas, { loadCover: covers.load, ...clock.deps, ...(frameMs ? { frameMs } : {}) }, { onCover, onFail, onRunning })
  return { fake, canvas, clock, covers, onCover, onFail, onRunning, r }
}

const flush = (): Promise<void> => new Promise((res) => setTimeout(res, 0))

describe('Moving light renderer lifecycle (fake WebGL, manual clock)', () => {
  it('draws only while active, and leaves nothing scheduled when stopped', () => {
    const { r, fake, clock } = setup()
    const start = fake.draws
    clock.advance(1000)
    expect(fake.draws).toBe(start) // not active: no loop
    r!.setActive(true)
    clock.advance(1000)
    const running = fake.draws - start
    expect(running).toBeGreaterThanOrEqual(27)
    expect(running).toBeLessThanOrEqual(31)
    r!.setActive(false)
    const stopped = fake.draws
    clock.advance(5000)
    expect(fake.draws).toBe(stopped)
    expect(clock.pending).toBe(0)
  })

  it('redraws after a resize while paused, so the room does not go blank', () => {
    const { r, fake, canvas } = setup()
    const before = fake.draws
    r!.resize(180, 134)
    expect(canvas.width).toBe(180)
    expect(fake.draws).toBe(before + 1)
  })

  it('stretches the small field to the window pixels in a second pass, and falls back to the field size', () => {
    const { r, fake, canvas } = setup()
    const before = fake.draws
    r!.resize(320, 200, 1920, 1200)
    expect(canvas.width).toBe(1920)
    expect(canvas.height).toBe(1200)
    expect(fake.draws).toBe(before + 1) // one frame shown, the field pass goes to its own target
    r!.dispose()
    expect(fake.live.size).toBe(0)

    const broken = setup()
    ;(broken.fake.gl as unknown as { checkFramebufferStatus: () => number }).checkFramebufferStatus = () => 0
    broken.r!.resize(320, 200, 1920, 1200)
    expect(broken.canvas.width).toBe(320) // the costly field shader never runs at window size
    broken.r!.dispose()
    expect(broken.fake.live.size).toBe(0)
  })

  it('releases every resource and the context on dispose, and ignores later calls', () => {
    const { r, fake, clock, onRunning } = setup()
    r!.setActive(true)
    r!.dispose()
    expect(fake.live.size).toBe(0)
    expect(fake.contextReleased).toBe(true)
    expect(clock.pending).toBe(0)
    expect(onRunning).toHaveBeenLastCalledWith(false)
    r!.setActive(true)
    r!.setCover('a')
    clock.advance(1000)
    expect(clock.pending).toBe(0)
  })

  it('cleans up after a shader that fails to compile', () => {
    const { r, fake } = setup({ failCompile: true })
    expect(r).toBeNull()
    expect(fake.live.size).toBe(0)
    expect(fake.contextReleased).toBe(true)
  })

  it('cleans up after a program that fails to link', () => {
    const { r, fake } = setup({ failLink: true })
    expect(r).toBeNull()
    expect(fake.live.size).toBe(0)
    expect(fake.contextReleased).toBe(true)
  })

  it('on a lost context it stops the loop and reports failure', () => {
    const { r, canvas, clock, onFail, fake } = setup()
    r!.setActive(true)
    clock.advance(500)
    fake.lost = true
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(onFail).toHaveBeenCalledWith('context lost')
    expect(r!.running).toBe(false)
    expect(clock.pending).toBe(0)
  })

  it('reports cover results; a stale result from a skipped track is ignored', async () => {
    const { r, covers, onCover } = setup()
    r!.setCover('A')
    r!.setCover('B')
    r!.setCover('C')
    covers.succeed('C')
    covers.fail('A') // out of order, from a skipped track
    covers.succeed('B') // also stale
    await flush()
    expect(onCover.mock.calls).toEqual([['C', true]])
  })

  it('a cover that failed loads normally when asked again', async () => {
    const { r, covers, onCover } = setup()
    r!.setCover('A')
    covers.fail('A')
    await flush()
    r!.setCover('B')
    covers.succeed('B')
    await flush()
    r!.setCover('A')
    covers.succeed('A')
    await flush()
    expect(onCover.mock.calls).toEqual([
      ['A', false],
      ['B', true],
      ['A', true]
    ])
  })
})

describe('Moving light frame pacing (manual display)', () => {
  const intervals = (at: number[]): number[] => at.slice(1).map((x, i) => +(x - at[i]).toFixed(3))

  for (const [hz, refreshes] of [[120, 4], [60, 2]] as const) {
    it(`draws on every ${refreshes}th refresh of a ${hz} Hz display, evenly`, () => {
      const { r, clock } = setup({}, 1000 / hz)
      r!.setActive(true)
      clock.advance(500)
      clock.drawnAt.length = 0
      clock.advance(1000)
      const gaps = intervals(clock.drawnAt)
      const expected = +((refreshes * 1000) / hz).toFixed(3)
      expect(new Set(gaps)).toEqual(new Set([expected]))
    })
  }

  it('on a 144 Hz display, draws 30 times a second on the shared 60 Hz beat', () => {
    const { r, clock } = setup({}, 1000 / 144)
    r!.setActive(true)
    clock.advance(500)
    clock.drawnAt.length = 0
    clock.advance(1000)
    expect(clock.drawnAt).toHaveLength(30)
    // Every draw is the first refresh of a 30 Hz slot, so it shares its frame with everything
    // else that steps on the beat (utils/frameBeat); the gaps are four or five refreshes.
    const slot = 1000 / 30
    for (const t of clock.drawnAt) expect((t + 0.5) % slot).toBeLessThan(1000 / 144 + 0.5)
    expect(new Set(intervals(clock.drawnAt))).toEqual(
      new Set([+((4 * 1000) / 144).toFixed(3), +((5 * 1000) / 144).toFixed(3)])
    )
  })

  it('at 24 fps on a 144 Hz display, draws on every 6th refresh, evenly', () => {
    const { r, clock } = setup({}, 1000 / 144, 1000 / 24)
    r!.setActive(true)
    clock.advance(500)
    clock.drawnAt.length = 0
    clock.advance(1000)
    expect(new Set(intervals(clock.drawnAt))).toEqual(new Set([+((6 * 1000) / 144).toFixed(3)]))
  })

  it('on a busy page that misses refreshes, keeps close to the cadence instead of bunching up', () => {
    const { r, clock } = setup({}, 1000 / 144)
    clock.stallWhen((n) => n % 4 === 0) // a quarter of refreshes missed, as measured in the app
    r!.setActive(true)
    clock.advance(500)
    clock.drawnAt.length = 0
    clock.advance(2000)
    const gaps = intervals(clock.drawnAt)
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1000 / 30 - 1000 / 144)
    // A frame whose refresh was missed lands one refresh late; nothing waits longer than that.
    expect(Math.max(...gaps)).toBeLessThanOrEqual((6 * 1000) / 144 + 1e-3)
  })
})

describe('Moving light coasting and crossfades (manual clock)', () => {
  const advances = (r: { time: number }, clock: { advance: (ms: number) => void; drawnAt: number[] }, ms: number): number[] => {
    const out: number[] = []
    let last = r.time
    const end = clock.drawnAt.length
    const step = 1000 / 144
    for (let i = 0; i < ms / step; i++) {
      clock.advance(step)
      if (clock.drawnAt.length > end + out.length) {
        // Flow speed: clock advance per second of display time (1 = full motion).
        const at = clock.drawnAt[clock.drawnAt.length - 1]
        const prev = clock.drawnAt[clock.drawnAt.length - 2]
        // The final still frame lands on the same refresh as the last moving one.
        out.push(prev === undefined || at === prev ? 0 : +((r.time - last) / ((at - prev) / 1000)).toFixed(9))
        last = r.time
      }
    }
    return out
  }

  it('a coasting pause slows the colour to a stop over about 0.9 s, then stops for real', () => {
    const { r, clock, onRunning } = setup()
    r!.setActive(true)
    clock.advance(2000) // fully up to speed
    onRunning.mockClear()
    r!.setActive(false, { coast: true })
    expect(r!.running).toBe(true)
    const steps = advances(r!, clock, 1200)
    // Frames keep drawing for the coast (~27 at 30 fps), and stop once it has settled.
    expect(steps.length).toBeGreaterThanOrEqual(25)
    expect(steps.length).toBeLessThanOrEqual(29)
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThanOrEqual(steps[i - 1] + 1e-9)
    expect(steps[steps.length - 1]).toBe(0)
    expect(r!.running).toBe(false)
    expect(onRunning.mock.calls).toEqual([[false]])
    expect(clock.pending).toBe(0)
  })

  it('playing again during a coast reverses it without stopping the loop', () => {
    const { r, clock, onRunning } = setup()
    r!.setActive(true)
    clock.advance(2000)
    onRunning.mockClear()
    r!.setActive(false, { coast: true })
    const down = advances(r!, clock, 300)
    r!.setActive(true)
    const up = advances(r!, clock, 600)
    expect(up[up.length - 1]).toBeGreaterThan(down[down.length - 1])
    expect(onRunning).not.toHaveBeenCalled()
    expect(r!.running).toBe(true)
  })

  it('stopping without a coast stops at once', () => {
    const { r, clock } = setup()
    r!.setActive(true)
    clock.advance(500)
    r!.setActive(false)
    expect(r!.running).toBe(false)
    expect(clock.pending).toBe(0)
  })

  it('a play eases in rather than starting at full speed', () => {
    const { r, clock } = setup()
    r!.setActive(true)
    const steps = advances(r!, clock, 1700) // the first light of a session wakes over 1.4 s
    expect(steps[1]).toBeLessThan(steps[steps.length - 1] * 0.2)
    expect(steps[steps.length - 1]).toBeCloseTo(1, 2)
  })

  it('a track change blends over 1.6 s on a smoothstep', async () => {
    const mixes: number[] = []
    const fake = makeFakeGl()
    ;(fake.gl as unknown as { uniform1f: (loc: { name?: string }, v: number) => void }).uniform1f = (loc, v) => {
      if (loc?.name === 'uMix') mixes.push(v)
    }
    ;(fake.gl as unknown as { getUniformLocation: (_p: unknown, name: string) => unknown }).getUniformLocation = (_p, name) => ({ name })
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => fake.gl) as unknown as HTMLCanvasElement['getContext']
    const clock = manualClock(1000 / 60)
    const covers = controlledCovers()
    const r = createFluidRenderer(canvas, { loadCover: covers.load, ...clock.deps })!
    r.setActive(true)
    clock.advance(200)
    r.setCover('B')
    covers.succeed('B')
    await flush()
    mixes.length = 0
    clock.advance(400)
    const at400 = mixes[mixes.length - 1]
    clock.advance(400)
    const at800 = mixes[mixes.length - 1]
    clock.advance(900)
    const end = mixes[mixes.length - 1]
    const smooth = (p: number): number => p * p * (3 - 2 * p)
    expect(at400).toBeCloseTo(smooth(400 / 1600), 1)
    expect(at800).toBeCloseTo(0.5, 1)
    expect(end).toBe(1)
  })
})

describe('The light moves with the music (uniforms, fake GL)', () => {
  const run = (sound: SoundSignals | null, opts: { source?: () => [number, number]; amount?: number } = {}) => {
    const fake = makeFakeGl()
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => fake.gl) as unknown as HTMLCanvasElement['getContext']
    const clock = manualClock(1000 / 60)
    const covers = controlledCovers()
    const r = createFluidRenderer(canvas, {
      loadCover: covers.load,
      ...clock.deps,
      sound: () => sound,
      source: opts.source,
      amount: opts.amount === undefined ? undefined : () => opts.amount!
    })!
    r.resize(320, 180)
    return { r, fake, clock }
  }

  it('with no sound, every term is at rest and time runs at the old drift', () => {
    const { r, fake, clock } = run(null)
    r.setActive(true)
    clock.advance(1500) // past the ease-in
    const t0 = r.time
    clock.advance(1000)
    expect(fake.uniforms.uS).toEqual([0, 0.42, 0.9, 1])
    expect(fake.uniforms.uGlow).toEqual([0])
    expect(r.time - t0).toBeCloseTo(1, 1)
  })

  it('with sound, the uniforms follow the formulas', () => {
    const s = { level: 0.5, swell: 0.4, bass: 0.6, kick: 0.25, pan: 0 }
    const { r, fake, clock } = run(s)
    r.setActive(true)
    clock.advance(1500)
    const k = soundTerms(s, 1, 1)
    const [amp, sigma, warp, sat] = fake.uniforms.uS
    expect(amp).toBeCloseTo(0.04 + 0.1 * 0.5 + 0.14 * 0.25, 5)
    expect(sigma).toBeCloseTo(0.42 + 0.1 * 0.4, 5)
    expect(warp).toBeCloseTo(Math.min(WARP_MAX, 0.9 + 0.05 * 0.6), 5)
    expect(sat).toBeCloseTo(1 + 0.12 * 0.4, 5)
    expect(fake.uniforms.uGlow[0]).toBeCloseTo(0.03 * 0.5, 5)
    expect(k.speed).toBeCloseTo(0.85 + 0.36 + 0.25 + 0.4, 5)
  })

  it('the flow never exceeds 3.2x and the warp never exceeds its limit', () => {
    const k = soundTerms({ level: 1, swell: 1, bass: 1, kick: 1, pan: 0 }, 1.5, 1.5)
    expect(k.speed).toBeLessThanOrEqual(MAX_SPEED)
    expect(k.warp).toBeLessThanOrEqual(WARP_MAX)
  })

  it('the pool glides toward a new source over about half a second', () => {
    let at: [number, number] = [0.5, 0.5]
    const { r, fake, clock } = run(null, { source: () => at })
    r.setActive(true)
    clock.advance(1500)
    const x0 = fake.uniforms.uSrc[0]
    at = [0.8, 0.5]
    clock.advance(500)
    const aspect = 320 / 180
    const target = (0.8 - 0.5) * aspect
    const mid = fake.uniforms.uSrc[0]
    expect(mid).toBeGreaterThan(x0 + (target - x0) * 0.5)
    expect(mid).toBeLessThan(target - 0.01)
    clock.advance(3000)
    expect(fake.uniforms.uSrc[0]).toBeCloseTo(target, 2)
    expect(fake.uniforms.uSrc[1]).toBeCloseTo(0, 5)
  })

  it('a still room (paused) is drawn with every sound term at rest', () => {
    const { r, fake, clock } = run({ level: 1, swell: 1, bass: 1, kick: 1, pan: 1 })
    r.setActive(true)
    clock.advance(1500)
    r.setActive(false)
    expect(fake.uniforms.uS).toEqual([0, 0.42, 0.9, 1])
    expect(fake.uniforms.uGlow).toEqual([0])
  })
})

describe('Light amount and safety', () => {
  it('the total lift changes by at most 0.06 between drawn frames, even on a sudden kick', () => {
    const fake = makeFakeGl()
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => fake.gl) as unknown as HTMLCanvasElement['getContext']
    const clock = manualClock(1000 / 60)
    let sound: SoundSignals = { level: 0, swell: 0, bass: 0, kick: 0, pan: 0 }
    const lifts: number[] = []
    const r = createFluidRenderer(canvas, {
      loadCover: controlledCovers().load,
      ...clock.deps,
      onDraw: () => lifts.push((fake.uniforms.uGlow?.[0] ?? 0) + (fake.uniforms.uS?.[0] ?? 0)),
      sound: () => sound,
      amount: () => 1.5
    })!
    r.setActive(true)
    clock.advance(1500)
    sound = { level: 1, swell: 1, bass: 1, kick: 1, pan: 0 }
    clock.advance(1000)
    for (let i = 1; i < lifts.length; i++) expect(Math.abs(lifts[i] - lifts[i - 1])).toBeLessThanOrEqual(0.06 + 1e-9)
    expect(fake.uniforms.uS[0]).toBeLessThanOrEqual(BLOOM_MAX + 1e-9)
  })

  it('Gentle moves less than Lively', () => {
    const s = { level: 0.7, swell: 0.6, bass: 0.6, kick: 0.8, pan: 0 }
    const gentle = soundTerms(s, 0.5, 0.5)
    const lively = soundTerms(s, 1.5, 1.5)
    expect(gentle.bloomAmp).toBeLessThan(lively.bloomAmp)
    expect(gentle.speed).toBeLessThan(lively.speed)
  })
})

describe('Small delights', () => {
  it('a new cover breathes: up over 250 ms, gone by 1.35 s', () => {
    expect(coverPulse(0)).toBe(0)
    expect(coverPulse(243)).toBeCloseTo(1, 2)
    expect(coverPulse(700)).toBeGreaterThan(0.2)
    expect(coverPulse(700)).toBeLessThan(0.8)
    expect(coverPulse(1350)).toBe(0)
    expect(coverPulse(-5)).toBe(0)
  })

  it('the first light of a session wakes over 1.4 s; a later play over 0.6 s', () => {
    const { r, clock } = setup()
    const speedAfter = (ms: number): number => {
      const t0 = r!.time
      clock.advance(ms)
      const t1 = r!.time
      clock.advance(100)
      return (r!.time - t1) / 0.1
    }
    r!.setActive(true)
    expect(speedAfter(700)).toBeLessThan(0.8) // still waking at 0.7 s
    clock.advance(1000)
    r!.setActive(false)
    r!.setActive(true)
    expect(speedAfter(700)).toBeGreaterThan(0.95) // a later play is up to speed by 0.7 s
  })
})

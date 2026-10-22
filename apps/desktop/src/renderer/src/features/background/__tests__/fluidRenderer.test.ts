import { describe, expect, it, vi } from 'vitest'
import { createFluidRenderer } from '../fluidRenderer'
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

  for (const [hz, refreshes] of [[144, 5], [120, 4], [60, 2]] as const) {
    it(`draws on every ${refreshes}th refresh of a ${hz} Hz display, evenly`, () => {
      const { r, clock } = setup({}, 1000 / hz)
      r!.setActive(true)
      clock.advance(500) // let it learn the refresh rate
      clock.drawnAt.length = 0
      clock.advance(1000)
      const gaps = intervals(clock.drawnAt)
      const expected = +((refreshes * 1000) / hz).toFixed(3)
      expect(new Set(gaps)).toEqual(new Set([expected]))
    })
  }

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

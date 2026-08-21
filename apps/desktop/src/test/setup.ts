import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Web Animations API
if (!Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockImplementation(() => ({
    pause: vi.fn(),
    play: vi.fn(),
    cancel: vi.fn(),
    finish: vi.fn(),
    onfinish: null,
    oncancel: null,
    currentTime: 0,
    playState: 'running'
  })) as any
}

// Mock Pointer Events
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn()
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn()
}

// Mock ResizeObserver
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
}

// Mock HTMLMediaElement
if (typeof window.HTMLMediaElement !== 'undefined') {
  window.HTMLMediaElement.prototype.play = vi.fn()
  window.HTMLMediaElement.prototype.pause = vi.fn()
  window.HTMLMediaElement.prototype.load = vi.fn()
}
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
}

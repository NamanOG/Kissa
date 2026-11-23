import { useEffect } from 'react'
import Lenis from 'lenis'

/** Shared with the story, which lets a transition that has started finish on its own. */
export const smoothScroll: { lenis: Lenis | null; gliding: 0 | 1 | -1 } = { lenis: null, gliding: 0 }

/* One wheel notch moves at most this share of a room, whatever the mouse reports. */
const MOST_OF_A_ROOM = 0.1
const WHEEL_IN_STORY = 0.55
const MOST_ELSEWHERE = 110

/**
 * Eases mouse-wheel steps so the scroll-driven rooms move calmly. Touch keeps the platform's own
 * scrolling, and reduced motion keeps the browser's.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const story = document.querySelector<HTMLElement>('[data-story]')
    const rooms = Number(story?.dataset.story) || 1

    const lenis = new Lenis({
      lerp: 0.075,
      anchors: true,
      autoRaf: true,
      virtualScroll: (data) => {
        if (data.event.type !== 'wheel') return true
        const direction = Math.sign(data.deltaY)
        if (smoothScroll.gliding && direction === smoothScroll.gliding) return false
        const span = story ? story.offsetHeight - window.innerHeight : 0
        const inStory = story !== null && lenis.scroll >= story.offsetTop - 1 && lenis.scroll < story.offsetTop + span - 1
        const limit = inStory ? (span / rooms) * MOST_OF_A_ROOM : MOST_ELSEWHERE
        const eased = inStory ? data.deltaY * WHEEL_IN_STORY : data.deltaY
        data.deltaY = Math.max(-limit, Math.min(limit, eased))
        return true
      }
    })
    smoothScroll.lenis = lenis
    return () => {
      smoothScroll.lenis = null
      smoothScroll.gliding = 0
      lenis.destroy()
    }
  }, [])
}

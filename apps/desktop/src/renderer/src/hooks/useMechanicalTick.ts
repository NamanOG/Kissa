import { useCallback, useRef, useEffect } from 'react'

// Use a single lazy AudioContext for the entire application to prevent exhaustion
// and abide by browser autoplay policies.
let sharedAudioCtx: AudioContext | null = null

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

export function useMechanicalTick() {
  const lastTickTimeRef = useRef<number>(0)

  // Cleanup shared context on window unload (optional, browser usually handles it)
  useEffect(() => {
    return () => {
      // We don't close the shared context on unmount since it's meant to be shared
      // across multiple components that might mount/unmount.
    }
  }, [])

  const playTick = useCallback(() => {
    const now = performance.now()
    // 35ms throttle ensures it sounds like a smooth dial rather than tearing/buzzing
    if (now - lastTickTimeRef.current < 35) return

    lastTickTimeRef.current = now

    try {
      const ctx = getAudioContext()
      
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()
      
      // Chain: Oscillator -> Lowpass Filter -> Gain -> Destination
      osc.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      const time = ctx.currentTime
      
      // Use a triangle wave for a softer mechanical thump
      osc.type = 'triangle'
      
      // Pitch drop to simulate the physical 'snick' of a detent
      osc.frequency.setValueAtTime(180, time)
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.015)
      
      // Filter out high harshness
      filterNode.type = 'lowpass'
      filterNode.frequency.value = 1000
      
      // Amplitude envelope (extremely quiet and short)
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(0.04, time + 0.002) // subtle attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.02) // quick decay
      
      osc.start(time)
      osc.stop(time + 0.02)
    } catch (err) {
      // Silently ignore if AudioContext fails (e.g., autoplay policies)
    }
  }, [])

  return playTick
}

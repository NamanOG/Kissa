import { useCallback } from 'react'
import { playDeckSound } from '@renderer/utils/deckSounds'

/**
 * The small, dry tick of an on-screen switch or dial. The sound itself is modelled and cached
 * in utils/deckSounds, which also limits it to one tick every 35 ms so a dragged slider never
 * buzzes.
 */
export function useMechanicalTick(): () => void {
  return useCallback(() => playDeckSound('tick'), [])
}

import { cn } from '@renderer/utils/cn'

/**
 * Base utility style for any circular layer inside the vinyl engine.
 * Ensures the layer is absolutely positioned in the center and is perfectly round.
 */
export const vinylLayerStyle = cn(
  'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full'
)

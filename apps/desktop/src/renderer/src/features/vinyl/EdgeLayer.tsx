import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { vinylLayerStyle } from './styles'

export const EdgeLayer = memo(({ className, style, size = '100%', ...props }: VinylLayerProps) => {
  return (
    <div
      className={cn(
        vinylLayerStyle,
        // Remove border, rely purely on shadows for the bevel and thickness
        'shadow-[inset_0_1px_3px_rgba(255,255,255,0.1),_inset_0_-2px_4px_rgba(0,0,0,0.9),_0_2px_4px_rgba(0,0,0,0.7)]',
        className
      )}
      style={{
        width: size,
        height: size,
        ...style
      }}
      {...props}
    />
  )
})

EdgeLayer.displayName = 'EdgeLayer'

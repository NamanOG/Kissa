import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { vinylLayerStyle } from './styles'

export const EdgeLayer = memo(({ className, style, size = '100%', ...props }: VinylLayerProps) => {
  return (
    <div
      className={cn(
        vinylLayerStyle,
        'shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.95),_0_2px_8px_rgba(0,0,0,0.85)]',
        'border border-white/10',
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

import React, { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
export const NoiseLayer = memo(() => {
  return (
    <BackgroundLayer
      className="opacity-[0.02] pointer-events-none transform-gpu"
      style={{
        backgroundImage:
          'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAFXSURBVGje7ZqxcYMwEEXf5c8U5B/K1ClSJU2UKZIm4w7sIjW88iXbCIn96HQ69950Ot096Ojo6Ojo6Ojo6PjXxBi/3nU5xhhj/PrV5Vhj9L53X4Y1Ru9752XwPnjfOy6F98H73nEpfB68712WwefB+95lGVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKVofvO8dl6L1wfvecSlaH7zvHZei9cH73nEpWh+87x2XovXB+95xKX4Ac+318QAAAEsAAAAASUVORK5CYII=")',
        backgroundRepeat: 'repeat'
      }}
    />
  )
})
NoiseLayer.displayName = 'NoiseLayer'

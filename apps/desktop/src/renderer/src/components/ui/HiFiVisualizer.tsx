import React, { memo, useEffect, useRef } from 'react'
import { cn } from '@renderer/utils/cn'

export interface HiFiVisualizerProps {
  isPlaying: boolean
  isLightTheme?: boolean
  barsCount?: number
  className?: string
  height?: number
  showPeaks?: boolean
}

interface BarState {
  currentHeight: number
  targetHeight: number
}

export const HiFiVisualizer = memo(
  ({
    isPlaying,
    barsCount = 7,
    className,
    height = 20,
    showPeaks = true
  }: HiFiVisualizerProps) => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([])
    const animFrameRef = useRef<number | null>(null)
    const timeRef = useRef(0)
    
    // Stable state for math
    const barsDataRef = useRef<BarState[]>([])

    useEffect(() => {
      if (barsDataRef.current.length !== barsCount) {
        barsDataRef.current = Array.from({ length: barsCount }, () => ({
          currentHeight: 0.1,
          targetHeight: 0.1
        }))
      }
      barsRef.current = barsRef.current.slice(0, barsCount)
    }, [barsCount])

    useEffect(() => {
      const barsData = barsDataRef.current
      
      const animate = () => {
        timeRef.current += 0.05
        const t = timeRef.current
        
        let allSettled = !isPlaying

        for (let i = 0; i < barsData.length; i++) {
          const bar = barsData[i]

          if (isPlaying) {
            allSettled = false
            const freqFactor = (i + 1) * 1.3
            const sine1 = Math.sin(t * 2.8 * (i === 0 || i === 1 ? 1.5 : 1.0) + i * 0.8)
            const sine2 = Math.cos(t * 1.9 * freqFactor + i * 1.4)
            const sine3 = Math.sin(t * 4.2 + i * 2.1)
            const noise = (Math.sin(t * 11.3 + i * 3.7) + 1) * 0.15

            let rawAmp = 0
            if (i === 0) rawAmp = (sine1 * 0.4 + sine2 * 0.4 + sine3 * 0.2)
            else if (i === 1) rawAmp = (sine1 * 0.6 + sine2 * 0.3 + sine3 * 0.1)
            else if (i === 2) rawAmp = (sine1 * 0.3 + sine2 * 0.6 + sine3 * 0.1)
            else rawAmp = (sine2 * 0.7 + sine3 * 0.3)
            
            rawAmp = Math.max(0, rawAmp * 0.8 + noise)
            
            // Map to [0.1, 1.0] to prevent disappearing entirely
            bar.targetHeight = 0.1 + (Math.min(1.0, rawAmp) * 0.9)
          } else {
            bar.targetHeight = 0.1
            if (Math.abs(bar.currentHeight - 0.1) > 0.01) {
              allSettled = false
            }
          }
          
          bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.25
          
          // Apply to DOM directly via scaleY for maximum performance
          const el = barsRef.current[i]
          if (el) {
            el.style.transform = `scaleY(${bar.currentHeight})`
          }
        }

        if (!allSettled) {
          animFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)

      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current)
        }
      }
    }, [isPlaying, barsCount])

    return (
      <div 
        className={cn(
          "flex items-end justify-center gap-[2.5px] select-none transition-opacity duration-500",
          isPlaying ? "opacity-100" : "opacity-60",
          className
        )}
        style={{ height: `${height}px` }}
        aria-label="Audio Spectrum Visualizer"
        role="img"
      >
        {Array.from({ length: barsCount }).map((_, i) => (
          <div
            key={i}
            className="relative w-[3px] min-[900px]:w-[3.5px] h-full rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            }}
          >
            <div
              ref={(el) => {
                barsRef.current[i] = el
              }}
              className="absolute bottom-0 left-0 w-full h-full rounded-full origin-bottom will-change-transform transform-gpu"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: showPeaks ? '0 0 6px 1px color-mix(in srgb, var(--accent) 60%, transparent)' : 'none',
                transform: 'scaleY(0.1)',
              }}
            />
          </div>
        ))}
      </div>
    )
  }
)

HiFiVisualizer.displayName = 'HiFiVisualizer'

import React, { memo, useEffect, useRef } from 'react'
import { cn } from '@renderer/utils/cn'
import { beatOf, sleepUntilNextBeat } from '@renderer/utils/frameBeat'
import { tl } from '@renderer/i18n'

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
      
      // A decorative meter: 30 updates a second look the same as 60 and halve its cost. It
      // updates on every other beat of the shared 60 Hz beat (utils/frameBeat), so it changes on
      // frames the window draws anyway, and sleeps between updates instead of waking the page
      // at the display's rate.
      let timer = 0
      let lastBeat = -1
      const schedule = (t: number, b: number): void => {
        timer = window.setTimeout(() => {
          animFrameRef.current = requestAnimationFrame(animate)
        }, sleepUntilNextBeat(t, b, 2))
      }
      const animate = (now: number): void => {
        const b = beatOf(now, 2)
        if (b === lastBeat) {
          animFrameRef.current = requestAnimationFrame(animate)
          return
        }
        lastBeat = b
        timeRef.current += 0.1
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
            
            bar.targetHeight = 0.1 + (Math.min(1.0, rawAmp) * 0.9)
          } else {
            bar.targetHeight = 0.1
            if (Math.abs(bar.currentHeight - 0.1) > 0.01) {
              allSettled = false
            }
          }
          
          bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.45
          
          const el = barsRef.current[i]
          if (el) {
            el.style.transform = `scaleY(${bar.currentHeight})`
          }
        }

        if (!allSettled) schedule(now, b)
      }

      animFrameRef.current = requestAnimationFrame(animate)

      return () => {
        window.clearTimeout(timer)
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
        aria-label={tl('a11y.spectrum')}
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

import React, { memo, useEffect, useRef, useState } from 'react'
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
  peak: number
  peakHoldTimer: number
}

export const HiFiVisualizer = memo(
  ({
    isPlaying,
    isLightTheme = false,
    barsCount = 7,
    className,
    height = 20,
    showPeaks = true
  }: HiFiVisualizerProps) => {
    const barsRef = useRef<BarState[]>(
      Array.from({ length: barsCount }, () => ({
        currentHeight: 15,
        targetHeight: 15,
        peak: 20,
        peakHoldTimer: 0
      }))
    )

    const barNodesRef = useRef<(HTMLSpanElement | null)[]>([])
    const peakNodesRef = useRef<(HTMLSpanElement | null)[]>([])
    const animFrameRef = useRef<number | null>(null)
    const timeRef = useRef(0)

    useEffect(() => {
      const bars = barsRef.current

      const animate = () => {
        timeRef.current += 0.05
        const t = timeRef.current

        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i]

          if (isPlaying) {
            const freqFactor = (i + 1) * 1.3
            const sine1 = Math.sin(t * 2.8 * (i === 0 || i === 1 ? 1.5 : 1.0) + i * 0.8)
            const sine2 = Math.cos(t * 1.9 * freqFactor + i * 1.4)
            const sine3 = Math.sin(t * 4.2 + i * 2.1)
            const noise = (Math.sin(t * 11.3 + i * 3.7) + 1) * 0.15

            let rawAmp = 0
            if (i <= 1) {
              const bassKick = Math.pow(Math.max(0, Math.sin(t * 3.2)), 3) * 0.45
              rawAmp = 0.35 + 0.35 * Math.abs(sine1) + bassKick + noise
            } else if (i <= 4) {
              rawAmp = 0.3 + 0.45 * Math.abs(sine1 * 0.6 + sine2 * 0.4) + noise
            } else {
              rawAmp = 0.25 + 0.5 * Math.abs(sine2 * 0.5 + sine3 * 0.5) + noise * 1.5
            }

            bar.targetHeight = Math.max(15, Math.min(98, rawAmp * 100))

            if (bar.targetHeight > bar.currentHeight) {
              bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.42
            } else {
              bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.16
            }

            if (bar.currentHeight >= bar.peak) {
              bar.peak = bar.currentHeight
              bar.peakHoldTimer = 18
            } else {
              if (bar.peakHoldTimer > 0) {
                bar.peakHoldTimer--
              } else {
                bar.peak = Math.max(bar.currentHeight, bar.peak - 1.8)
              }
            }
          } else {
            bar.currentHeight += (12 - bar.currentHeight) * 0.1
            bar.peak += (12 - bar.peak) * 0.1
          }

          // Direct hardware-accelerated DOM mutation (0 React re-renders)
          const barNode = barNodesRef.current[i]
          if (barNode) {
            const scaleRatio = Math.max(0.1, bar.currentHeight / 100)
            barNode.style.transform = `scaleY(${scaleRatio})`
          }

          const peakNode = peakNodesRef.current[i]
          if (peakNode) {
            const peakPercent = Math.min(96, Math.max(8, bar.peak))
            peakNode.style.bottom = `${peakPercent}%`
          }
        }

        animFrameRef.current = requestAnimationFrame(animate)
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
          'flex items-end justify-center gap-[2.5px] px-1 select-none transform-gpu',
          className
        )}
        style={{ height: `${height}px` }}
        aria-label="Audio Spectrum Visualizer"
        role="img"
      >
        {Array.from({ length: barsCount }).map((_, idx) => (
          <div
            key={idx}
            className="relative flex flex-col justify-end items-center h-full w-[2.5px]"
          >
            {/* Floating Peak Hold Dot/Cap */}
            {showPeaks && (
              <span
                ref={(el) => {
                  peakNodesRef.current[idx] = el
                }}
                className={cn(
                  'absolute w-[2.5px] h-[2px] rounded-full transition-opacity duration-300 transform-gpu will-change-transform',
                  isLightTheme
                    ? 'bg-[#b45309] shadow-[0_0_4px_rgba(180,83,9,0.5)]'
                    : 'bg-[#ffeed6] shadow-[0_0_5px_rgba(255,238,214,0.8)]',
                  isPlaying ? 'opacity-100' : 'opacity-30'
                )}
                style={{ bottom: '15%' }}
              />
            )}

            {/* Live Frequency Bar */}
            <span
              ref={(el) => {
                barNodesRef.current[idx] = el
              }}
              className={cn(
                'w-full h-full rounded-full origin-bottom transform-gpu will-change-transform',
                isLightTheme
                  ? 'bg-gradient-to-t from-[#78350f] via-[#b45309] to-[#d97706]'
                  : 'bg-gradient-to-t from-[#8c5a28] via-[#d7a76c] to-[#fed7aa]'
              )}
              style={{
                transform: 'scaleY(0.15)',
                boxShadow: isPlaying
                  ? isLightTheme
                    ? '0 0 6px rgba(180,83,9,0.3)'
                    : '0 0 8px rgba(215,167,108,0.45)'
                  : 'none'
              }}
            />
          </div>
        ))}
      </div>
    )
  }
)

HiFiVisualizer.displayName = 'HiFiVisualizer'

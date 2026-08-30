import React, { memo, useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useMechanicalTick } from '@renderer/hooks/useMechanicalTick'
import { cn } from '@renderer/utils/cn'
import { Sun } from 'lucide-react'

export const RoomDimmer = memo(() => {
  const illuminationLevel = usePlayerStore((s) => s.illuminationLevel)
  const setIlluminationLevel = usePlayerStore((s) => s.setIlluminationLevel)

  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const startValRef = useRef(0)
  const lastTickValRef = useRef(-1)
  const trackRectRef = useRef<DOMRect | null>(null)
  
  const illuminationRef = useRef(illuminationLevel)
  illuminationRef.current = illuminationLevel

  const playTick = useMechanicalTick()

  const applyIllumination = useCallback((level: number): number => {
    const clamped = Math.max(0, Math.min(100, level))
    const curved = Math.pow(clamped / 100, 1.5)
    const cssValue = curved.toString()
    document.documentElement.style.setProperty('--room-illumination', cssValue)
    return clamped
  }, [])

  // Sync initial and external changes (not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      const clamped = applyIllumination(illuminationLevel)
      if (thumbRef.current) {
        thumbRef.current.style.left = `${clamped}%`
      }
    }
  }, [illuminationLevel, applyIllumination])

  const calculateLevelFromX = useCallback((clientX: number) => {
    if (!trackRectRef.current) return startValRef.current
    const rect = trackRectRef.current
    // calculate percentage
    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    return percent * 100
  }, [])

  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return
    const newLevel = calculateLevelFromX(e.clientX)
    const clamped = applyIllumination(newLevel)
    if (thumbRef.current) {
      thumbRef.current.style.left = `${clamped}%`
    }
    
    const rounded = Math.round(clamped)
    if (rounded !== lastTickValRef.current) {
      lastTickValRef.current = rounded
      playTick()
    }
  }, [applyIllumination, calculateLevelFromX, playTick])

  const onWindowPointerUp = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const newLevel = calculateLevelFromX(e.clientX)
    const clamped = Math.max(0, Math.min(100, newLevel))
    setIlluminationLevel(Math.round(clamped))
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
  }, [onWindowPointerMove, setIlluminationLevel, calculateLevelFromX])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    if (trackRef.current) {
      trackRectRef.current = trackRef.current.getBoundingClientRect()
    }
    
    // Immediately calculate new position on click
    const newLevel = calculateLevelFromX(e.clientX)
    startValRef.current = newLevel
    
    const clamped = applyIllumination(newLevel)
    if (thumbRef.current) {
      thumbRef.current.style.left = `${clamped}%`
    }
    
    const rounded = Math.round(clamped)
    lastTickValRef.current = rounded
    playTick()
    
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
  }, [onWindowPointerMove, onWindowPointerUp, applyIllumination, calculateLevelFromX, playTick])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
    }
  }, [onWindowPointerMove, onWindowPointerUp])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -5 : 5
    const newLevel = Math.max(0, Math.min(100, illuminationRef.current + delta))
    if (newLevel !== illuminationRef.current) {
      playTick()
    }
    setIlluminationLevel(newLevel)
    applyIllumination(newLevel)
  }, [applyIllumination, setIlluminationLevel, playTick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const cur = illuminationRef.current
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight')   { e.preventDefault(); const v = Math.min(100, cur + 5);  if (v !== cur) playTick(); setIlluminationLevel(v); applyIllumination(v) }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); const v = Math.max(0, cur - 5);    if (v !== cur) playTick(); setIlluminationLevel(v); applyIllumination(v) }
    if (e.key === 'Home')      { e.preventDefault(); if (cur !== 0) playTick(); setIlluminationLevel(0);   applyIllumination(0) }
    if (e.key === 'End')       { e.preventDefault(); if (cur !== 100) playTick(); setIlluminationLevel(100); applyIllumination(100) }
  }, [applyIllumination, setIlluminationLevel, playTick])

  const handleDoubleClick = useCallback(() => {
    const cur = illuminationRef.current
    const target = cur > 50 ? 0 : 100
    playTick()
    setIlluminationLevel(target)
    applyIllumination(target)
  }, [applyIllumination, setIlluminationLevel, playTick])

  return (
    <div
      className="flex flex-1 items-center gap-2 min-[900px]:gap-3 shrink-0 group w-full"
      title="Room Illumination"
      aria-label="Room Illumination"
    >
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] font-bold select-none hidden min-[1000px]:block shrink-0">
        Room
      </span>
      
      {/* Rail Container */}
      <div
        ref={trackRef}
        className={cn(
          'relative flex-1 h-6 flex items-center cursor-pointer touch-none select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full'
        )}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={illuminationLevel}
        aria-label="Room illumination"
      >
        {/* Track Line */}
        <div 
          className="absolute left-0 right-0 h-[2.5px] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.08)] pointer-events-none"
          style={{ backgroundColor: '#111' }}
        >
          {/* Fill indicator */}
          <div 
            className="absolute top-0 left-0 bottom-0 rounded-full transition-opacity"
            style={{ 
              width: `${illuminationLevel}%`, 
              backgroundColor: 'var(--accent)',
              opacity: 0.15 + (illuminationLevel / 100) * 0.15 
            }}
          />
        </div>

        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute top-1/2 w-2.5 h-2.5 min-[900px]:w-3 min-[900px]:h-3 rounded-full pointer-events-none transition-transform"
          style={{
            left: `${illuminationLevel}%`,
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #444 0%, #1a1a1a 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.4)',
            border: '1px solid #111'
          }}
        />
      </div>

      <Sun 
        className="w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5 shrink-0 transition-opacity" 
        style={{ opacity: 0.3 + (illuminationLevel / 100) * 0.7, color: 'var(--on-surface)' }}
      />
    </div>
  )
})

RoomDimmer.displayName = 'RoomDimmer'

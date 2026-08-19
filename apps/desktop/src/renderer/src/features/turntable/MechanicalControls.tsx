import React, { memo, useCallback, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'

// ─── Acoustic Micro-Impulse Mechanical Sound Synthesis ────────────
let sharedAudioCtx: AudioContext | null = null

function playMechanicalSound(type: 'switch' | 'button' | 'radio'): void {
  try {
    if (!usePlayerStore.getState().needleSound) return

    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx?.state === 'suspended') {
      void sharedAudioCtx.resume()
    }
    if (!sharedAudioCtx) return

    const ctx = sharedAudioCtx
    const now = ctx.currentTime

    if (type === 'switch') {
      // Power switch: short tactile thunk
      const bufferSize = Math.floor(ctx.sampleRate * 0.015)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      const noiseGain = ctx.createGain()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(750, now)
      filter.Q.setValueAtTime(1.5, now)
      noiseGain.gain.setValueAtTime(0.22, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)

      const thud = ctx.createOscillator()
      const thudGain = ctx.createGain()
      thud.type = 'sine'
      thud.frequency.setValueAtTime(95, now)
      thud.frequency.exponentialRampToValueAtTime(30, now + 0.03)
      thudGain.gain.setValueAtTime(0.18, now)
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
      thud.connect(thudGain)
      thudGain.connect(ctx.destination)
      thud.start(now)
      thud.stop(now + 0.035)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start(now)
      noise.stop(now + 0.022)
    } else if (type === 'radio') {
      // Speed 33/45: crisp, light tactile detent clack (kept strictly unchanged)
      const bufferSize = Math.floor(ctx.sampleRate * 0.015)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      const noiseGain = ctx.createGain()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2200, now)
      filter.Q.setValueAtTime(2.2, now)
      noiseGain.gain.setValueAtTime(0.16, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start(now)
      noise.stop(now + 0.022)
    } else if (type === 'button') {
      // Start/Stop: Physical push-button mechanical contact (pure unpitched physical acoustics)
      // Layer 1: Sharp physical contact snap transient (5ms high-frequency friction burst)
      const snapLen = Math.floor(ctx.sampleRate * 0.005)
      const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate)
      const snapData = snapBuf.getChannelData(0)
      for (let i = 0; i < snapLen; i++) {
        snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapLen * 0.2))
      }
      const snapSource = ctx.createBufferSource()
      snapSource.buffer = snapBuf

      const snapFilter = ctx.createBiquadFilter()
      snapFilter.type = 'highpass'
      snapFilter.frequency.setValueAtTime(2800, now)

      const snapGain = ctx.createGain()
      snapGain.gain.setValueAtTime(0.24, now)
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006)

      snapSource.connect(snapFilter)
      snapFilter.connect(snapGain)
      snapGain.connect(ctx.destination)
      snapSource.start(now)
      snapSource.stop(now + 0.007)

      // Layer 2: Housing body impulse (shaped unpitched noise, 18ms, broad non-pitched resonance)
      const bodyLen = Math.floor(ctx.sampleRate * 0.02)
      const bodyBuf = ctx.createBuffer(1, bodyLen, ctx.sampleRate)
      const bodyData = bodyBuf.getChannelData(0)
      for (let i = 0; i < bodyLen; i++) {
        bodyData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bodyLen * 0.28))
      }
      const bodySource = ctx.createBufferSource()
      bodySource.buffer = bodyBuf

      const bodyFilter = ctx.createBiquadFilter()
      bodyFilter.type = 'bandpass'
      bodyFilter.frequency.setValueAtTime(950, now)
      bodyFilter.Q.setValueAtTime(0.9, now) // Wide Q = completely unpitched physical body

      const bodyGain = ctx.createGain()
      bodyGain.gain.setValueAtTime(0.16, now)
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018)

      bodySource.connect(bodyFilter)
      bodyFilter.connect(bodyGain)
      bodyGain.connect(ctx.destination)
      bodySource.start(now)
      bodySource.stop(now + 0.022)

      // Layer 3: Micro mechanical latch/settle tick (delayed 3.5ms, very short 3ms tick)
      const tickLen = Math.floor(ctx.sampleRate * 0.004)
      const tickBuf = ctx.createBuffer(1, tickLen, ctx.sampleRate)
      const tickData = tickBuf.getChannelData(0)
      for (let i = 0; i < tickLen; i++) {
        tickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (tickLen * 0.25))
      }
      const tickSource = ctx.createBufferSource()
      tickSource.buffer = tickBuf

      const tickFilter = ctx.createBiquadFilter()
      tickFilter.type = 'bandpass'
      tickFilter.frequency.setValueAtTime(4500, now)
      tickFilter.Q.setValueAtTime(1.5, now)

      const tickGain = ctx.createGain()
      tickGain.gain.setValueAtTime(0.08, now + 0.0035)
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.0075)

      tickSource.connect(tickFilter)
      tickFilter.connect(tickGain)
      tickGain.connect(ctx.destination)
      tickSource.start(now + 0.0035)
      tickSource.stop(now + 0.008)
    }
  } catch {
    // Ignore audio if unsupported
  }
}

// ─── 1. Power Control (Flush Rocker Switch) ───────────────────────────────────
export const PowerControl = memo(({ active, onClick }: { active: boolean; onClick: () => void }) => {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setIsPressed(true)
    playMechanicalSound('switch')
    onClick()
  }

  const handlePointerUp = () => setIsPressed(false)
  const handlePointerLeave = () => setIsPressed(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsPressed(true)
      playMechanicalSound('switch')
      onClick()
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') setIsPressed(false)
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-label="Power Toggle"
        className="relative w-5 h-5 rounded-full p-[1.5px] bg-[#110d0a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_rgba(255,255,255,0.05)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer"
      >
        <div
          className={cn(
            'w-full h-full rounded-full border border-black/85 flex items-center justify-center transition-all duration-75',
            'bg-gradient-to-b from-[#2b221d] via-[#1e1713] to-[#120d0a]',
            isPressed
              ? 'translate-y-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]'
              : active
                ? 'translate-y-[0.5px] shadow-[0_1px_2px_rgba(0,0,0,0.8),inset_0_0.5px_0.5px_rgba(255,255,255,0.06)]'
                : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.85),inset_0_0.6px_0.6px_rgba(255,255,255,0.08)]'
          )}
        >
          {/* Micro-Pinhole LED Status Indicator (No glow halo) */}
          <div
            className="w-1.5 h-1.5 rounded-full border border-black/90 transition-colors duration-150"
            style={{
              backgroundColor: active ? '#22c55e' : '#14100e'
            }}
          />
        </div>
      </button>

      {/* Silkscreened hardware marking on plinth surface */}
      <span className="font-mono text-[6.5px] font-bold tracking-[0.2em] text-[#635548] uppercase pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
        Power
      </span>
    </div>
  )
})
PowerControl.displayName = 'PowerControl'

// ─── 2. Speed Selector (33 / 45 Dual Interlocking Push Buttons) ───────────────
export const SpeedControl = memo(({ rpm, onClick }: { rpm: '33' | '45'; onClick: () => void }) => {
  const [pressedBtn, setPressedBtn] = useState<'33' | '45' | null>(null)

  const handlePointerDown = (targetRpm: '33' | '45') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setPressedBtn(targetRpm)

    if (rpm !== targetRpm) {
      playMechanicalSound('radio')
      onClick()
    }
  }

  const handlePointerUp = () => setPressedBtn(null)
  const handlePointerLeave = () => setPressedBtn(null)

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <div className="flex gap-[2px] p-[1.5px] rounded-[2.5px] bg-[#110d0a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_rgba(255,255,255,0.05)]">
        {/* 33 Button */}
        <button
          type="button"
          onPointerDown={handlePointerDown('33')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="33 RPM"
          className="relative w-5 h-4.5 rounded-[1.5px] border border-black/85 focus:outline-none flex items-center justify-center cursor-pointer transition-all duration-75 bg-gradient-to-b from-[#281f1a] to-[#140e0b]"
          style={{
            transform: pressedBtn === '33' ? 'translateY(1px)' : rpm === '33' ? 'translateY(0.5px)' : 'translateY(0)',
            boxShadow: pressedBtn === '33' || rpm === '33'
              ? 'inset 0 1px 2px rgba(0,0,0,0.85)'
              : '0 1px 2.5px rgba(0,0,0,0.85), inset 0 0.5px 0.5px rgba(255,255,255,0.05)'
          }}
        >
          <span
            className={cn(
              'font-mono text-[7px] font-bold tracking-wider transition-colors duration-150 pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]',
              rpm === '33' ? 'text-[#d7a76c]' : 'text-[#5a4d42]'
            )}
          >
            33
          </span>
        </button>

        {/* 45 Button */}
        <button
          type="button"
          onPointerDown={handlePointerDown('45')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="45 RPM"
          className="relative w-5 h-4.5 rounded-[1.5px] border border-black/85 focus:outline-none flex items-center justify-center cursor-pointer transition-all duration-75 bg-gradient-to-b from-[#281f1a] to-[#140e0b]"
          style={{
            transform: pressedBtn === '45' ? 'translateY(1px)' : rpm === '45' ? 'translateY(0.5px)' : 'translateY(0)',
            boxShadow: pressedBtn === '45' || rpm === '45'
              ? 'inset 0 1px 2px rgba(0,0,0,0.85)'
              : '0 1px 2.5px rgba(0,0,0,0.85), inset 0 0.5px 0.5px rgba(255,255,255,0.05)'
          }}
        >
          <span
            className={cn(
              'font-mono text-[7px] font-bold tracking-wider transition-colors duration-150 pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]',
              rpm === '45' ? 'text-[#d7a76c]' : 'text-[#5a4d42]'
            )}
          >
            45
          </span>
        </button>
      </div>

      {/* Silkscreened hardware marking on plinth surface */}
      <span className="font-mono text-[6.5px] font-bold tracking-[0.2em] text-[#635548] uppercase pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
        Speed
      </span>
    </div>
  )
})
SpeedControl.displayName = 'SpeedControl'

// ─── 3. Start / Stop Motor Control (Refined Tactile Push Button) ─────────────
export const StartStopControl = memo(({ isPlaying, onClick }: { isPlaying: boolean; onClick: () => void }) => {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setIsPressed(true)
    playMechanicalSound('button')
    onClick()
  }

  const handlePointerUp = () => setIsPressed(false)
  const handlePointerLeave = () => setIsPressed(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsPressed(true)
      playMechanicalSound('button')
      onClick()
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') setIsPressed(false)
  }

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto">
      {/* Refined recessed chassis well */}
      <div className="p-[1.5px] rounded-[2.5px] bg-[#110d0a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_rgba(255,255,255,0.05)]">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          aria-label={isPlaying ? 'Stop Motor' : 'Start Motor'}
          className="relative w-11 h-5.5 rounded-[1.5px] border border-black/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition-all duration-75 bg-gradient-to-b from-[#281f1a] to-[#140e0b]"
          style={{
            transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed
              ? 'inset 0 1px 2px rgba(0,0,0,0.9)'
              : '0 1.2px 2.5px rgba(0,0,0,0.85), inset 0 0.5px 0.5px rgba(255,255,255,0.06)'
          }}
        >
          {/* Dynamic hardware state label: START when stopped, STOP when playing */}
          <span className="font-mono text-[6.5px] font-bold tracking-[0.18em] text-[#8e8175] uppercase pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            {isPlaying ? 'STOP' : 'START'}
          </span>
        </button>
      </div>
    </div>
  )
})
StartStopControl.displayName = 'StartStopControl'

// ─── Main Control Cluster (Classic Turntable Hardware Architecture) ───────────
export interface MechanicalControlsProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Hi-Fi Turntable Physical Controls.
 * Authentic hardware hierarchy:
 * - Upper-Left Anchor: Power Switch (top: 7%, left: 4.5%)
 * - Lower-Left Upper: 33 / 45 Speed Selector (bottom: 16%, left: 4.5%)
 * - Lower-Left Bottom: Start / Stop Motor Switch (bottom: 9.5%, left: 4.5%)
 */
export const MechanicalControls = memo(({ className, style }: MechanicalControlsProps): React.JSX.Element => {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  const rpm = usePlayerStore((state) => state.rpm)

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause)
  const togglePower = usePlayerStore((state) => state.togglePower)
  const toggleRpm = usePlayerStore((state) => state.toggleRpm)

  const handlePower = useCallback(() => {
    togglePower()
    if (usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause && isPlaying) {
      window.__kissaMediaCommandCooldown?.()
      void window.electron.mediaPlayPause()
    }
  }, [togglePower, isPlaying])

  const handlePlayPause = useCallback(() => {
    togglePlayPause()
    if (usePlayerStore.getState().isPowered && usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
      window.__kissaMediaCommandCooldown?.()
      void window.electron.mediaPlayPause()
    }
  }, [togglePlayPause])

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none select-none z-50', className)}
      style={style}
    >
      {/* ── Top-Left Hardware Anchor: Power Switch ── */}
      <div className="absolute" style={{ left: '4.5%', top: '7%' }}>
        <PowerControl active={isPowered} onClick={handlePower} />
      </div>

      {/* ── Lower-Left Group: 33 / 45 Speed Selector ── */}
      <div className="absolute" style={{ left: '4.5%', bottom: '16%' }}>
        <SpeedControl rpm={rpm} onClick={toggleRpm} />
      </div>

      {/* ── Lower-Left Group: Start / Stop Motor Switch ── */}
      <div className="absolute" style={{ left: '4.5%', bottom: '9.5%' }}>
        <StartStopControl isPlaying={isPlaying} onClick={handlePlayPause} />
      </div>
    </div>
  )
})

MechanicalControls.displayName = 'MechanicalControls'

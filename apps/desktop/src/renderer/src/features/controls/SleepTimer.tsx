import React, { memo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Clock, X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export const SleepTimer = memo(({ className }: { className?: string }): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // in seconds
  const [targetMinutes, setTargetMinutes] = useState<number>(30)
  const popoverRef = useRef<HTMLDivElement>(null)
  const pause = usePlayerStore((s) => s.pause)
  const setIsPowered = usePlayerStore((s) => s.setIsPowered)

  // Click-outside and Escape dismiss
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Countdown effect
  useEffect(() => {
    if (timeLeft === null) return

    if (timeLeft <= 0) {
      pause()
      setIsPowered(false)
      setTimeLeft(null)
      // Attempt to stop OS media
      if (typeof window !== 'undefined' && window.electron?.mediaPlayPause) {
        void window.electron.mediaPlayPause()
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return (): void => clearInterval(timer)
  }, [timeLeft, pause, setIsPowered])

  const handleStart = (): void => {
    setTimeLeft(targetMinutes * 60)
    setIsOpen(false)
  }

  const handleCancel = (): void => {
    setTimeLeft(null)
    setIsOpen(false)
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-8 h-8 min-[900px]:w-9 min-[900px]:h-9 flex items-center justify-center rounded-full transition-colors relative cursor-pointer active:scale-95',
          timeLeft !== null 
            ? 'text-[var(--accent)] bg-[var(--accent)]/15' 
            : 'text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--on-surface)]/[0.08]'
        )}
        title="Sleep Timer"
      >
        <Timer className="w-4 h-4 min-[900px]:w-[18px] min-[900px]:h-[18px]" strokeWidth={1.75} />
        {timeLeft !== null && (
          <span className="absolute -bottom-1 -right-1 bg-black/90 text-[var(--accent)] text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--accent)]/40 shadow-md leading-none">
            {Math.ceil(timeLeft / 60)}m
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute bottom-[120%] right-0 w-64 rounded-2xl p-5 z-50 overflow-hidden bg-[#141216]/96 border border-white/[0.12] backdrop-blur-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.5} />
                <h3 className="font-serif text-sm font-medium">Sleep Timer</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {timeLeft === null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-2 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setTargetMinutes(Math.max(5, targetMinutes - 5))}
                    className="w-8 h-8 flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold rounded-lg transition-colors active:scale-95 cursor-pointer"
                  >
                    -
                  </button>
                  <div className="font-mono text-xl font-medium text-white">
                    {targetMinutes} <span className="text-xs text-zinc-400">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetMinutes(Math.min(120, targetMinutes + 5))}
                    className="w-8 h-8 flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold rounded-lg transition-colors active:scale-95 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMinutes(m)}
                      className={cn(
                        'py-1.5 text-xs font-mono rounded-lg transition-all active:scale-95 cursor-pointer border',
                        targetMinutes === m 
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/50 font-bold shadow-[0_0_8px_var(--accent)]/20' 
                          : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-2.5 bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-black font-bold text-sm rounded-xl transition-all cursor-pointer shadow-[0_4px_16px_var(--accent)] shadow-black/20"
                >
                  Start Timer
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="font-mono text-3xl text-[var(--accent)] font-light tracking-wider drop-shadow-md">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Remaining</p>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-semibold rounded-xl transition-colors border border-white/10 active:scale-95 cursor-pointer"
                >
                  Cancel Timer
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

SleepTimer.displayName = 'SleepTimer'

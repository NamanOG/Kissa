import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Clock, X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export const SleepTimer = memo(({ className }: { className?: string }): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // in seconds
  const [targetMinutes, setTargetMinutes] = useState<number>(30)
  const pause = usePlayerStore((s) => s.pause)
  const setIsPowered = usePlayerStore((s) => s.setIsPowered)

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
          timeLeft !== null ? 'text-[#d7a76c] bg-[#d7a76c]/10' : 'text-[#887b70] hover:text-[#f5efe6] hover:bg-white/5'
        )}
        title="Sleep Timer"
      >
        <Timer className="w-4 h-4 min-[900px]:w-[18px] min-[900px]:h-[18px]" strokeWidth={1.75} />
        {timeLeft !== null && (
          <span className="absolute -bottom-1 -right-1 bg-[#1a1513] text-[#d7a76c] text-[8px] font-mono font-bold px-1 rounded border border-[#d7a76c]/30 shadow-md">
            {Math.ceil(timeLeft / 60)}m
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute bottom-[120%] right-0 w-64 bg-[#1e1917] border border-[#3d342d] rounded-xl shadow-[0_24px_48px_rgba(0,0,0,0.8)] p-5 z-50 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d7a76c] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#f5efe6]">
                <Clock className="w-4 h-4 text-[#d7a76c]" strokeWidth={1.5} />
                <h3 className="font-serif text-sm">Sleep Timer</h3>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-[#887b70] hover:text-[#f5efe6] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {timeLeft === null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#151110] border border-[#2d2621] rounded-lg p-2 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setTargetMinutes(Math.max(5, targetMinutes - 5))}
                    className="w-8 h-8 flex items-center justify-center bg-[#251f1c] hover:bg-[#2d2621] text-[#b7a99b] rounded-md transition-colors active:scale-95"
                  >
                    -
                  </button>
                  <div className="font-mono text-xl text-[#f5efe6]">{targetMinutes} <span className="text-xs text-[#887b70]">min</span></div>
                  <button
                    type="button"
                    onClick={() => setTargetMinutes(Math.min(120, targetMinutes + 5))}
                    className="w-8 h-8 flex items-center justify-center bg-[#251f1c] hover:bg-[#2d2621] text-[#b7a99b] rounded-md transition-colors active:scale-95"
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
                        'py-1.5 text-xs font-mono rounded transition-all active:scale-95',
                        targetMinutes === m ? 'bg-[#d7a76c]/20 text-[#d7a76c] border border-[#d7a76c]/40' : 'bg-[#251f1c] text-[#887b70] border border-transparent hover:border-[#3d342d]'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-2 bg-[#d7a76c] hover:bg-[#e4b57b] active:bg-[#c69a63] text-[#1e1917] font-bold text-sm rounded-lg transition-colors shadow-lg active:translate-y-px"
                >
                  Start Timer
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="font-mono text-3xl text-[#d7a76c] font-light tracking-wider drop-shadow-md">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-xs text-[#887b70] uppercase tracking-widest font-mono">Remaining</p>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2 bg-[#251f1c] hover:bg-[#2d2621] text-[#f5efe6] text-sm rounded-lg transition-colors border border-[#3d342d] active:scale-95"
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

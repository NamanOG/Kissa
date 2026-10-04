import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import styles from './VideoShowcase.module.css'
import { asset } from '../lib/asset'
import { RevealHeading, FadeIn } from './ui/Reveal'

const VIDEO_SRC = asset('product/kissa-demo.mp4')

function formatTime(s: number) {
  if (!isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`
}

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [failed, setFailed] = useState(false)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2600)
  }, [])

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      setStarted(true)
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else videoRef.current?.parentElement?.requestFullscreen()
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <section id="demo" className={styles.section} aria-labelledby="demo-heading">
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className="label">In motion</span>
            <RevealHeading
              id="demo-heading"
              className="section-title"
              lines={['Four minutes', '*at the deck.*']}
            />
          </div>
          <p className="lead">
            Platter inertia, tonearm tracking and synced lyrics, following live playback on Windows 11.
          </p>
        </div>

        <FadeIn className={styles.player} y={30}>
          <div
            className={`${styles.frame} ${started && isPlaying && !controlsVisible ? styles.hideCursor : ''}`}
            onMouseMove={started ? showControls : undefined}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
          >
            {failed ? (
              <img
                src={asset('media/product-main-window.webp')}
                alt="Kissa running on the Windows desktop"
                className={styles.video}
                width={1920}
                height={1080}
              />
            ) : (
              <video
                ref={videoRef}
                src={`${VIDEO_SRC}#t=1.5`}
                className={styles.video}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onPlay={() => {
                  setIsPlaying(true)
                  showControls()
                }}
                onPause={() => {
                  setIsPlaying(false)
                  setControlsVisible(true)
                }}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                onError={() => setFailed(true)}
                aria-label="Screen recording of Kissa running on Windows"
              />
            )}

            <AnimatePresence>
              {!started && !failed && (
                <motion.button
                  type="button"
                  className={styles.poster}
                  onClick={togglePlay}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  aria-label="Play the Kissa demo video"
                >
                  <span className={styles.playDisc} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5.5v13L19 12z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className={styles.posterMeta}>
                    <span className={styles.posterTitle}>Play the demo</span>
                    <span className="label">{duration ? formatTime(duration) : '4:22'} · with sound</span>
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {started && (
              <div className={`${styles.controls} ${controlsVisible ? styles.controlsOn : ''}`}>
                <button type="button" className={styles.iconBtn} onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13L19 12z" /></svg>
                  )}
                </button>
                <span className={styles.time}>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  className={styles.seek}
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value)
                  }}
                  aria-label="Seek"
                  style={{ '--progress': `${progress}%` } as React.CSSProperties}
                />
                <span className={styles.time}>{formatTime(duration)}</span>
                <button type="button" className={styles.iconBtn} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
                  )}
                </button>
                <button type="button" className={styles.iconBtn} onClick={toggleFullscreen} aria-label="Toggle fullscreen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                </button>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

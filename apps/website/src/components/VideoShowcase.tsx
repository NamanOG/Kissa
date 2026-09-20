import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './VideoShowcase.module.css'

const VIDEO_PATH = '/product/kissa-demo.mp4'
const POSTER_PATH = '/product/kissa-demo-poster.jpg'

function formatTime(s: number) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLInputElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [videoFound, setVideoFound] = useState<boolean>(false)
  const [hasPoster, setHasPoster] = useState<boolean>(false)

  useEffect(() => {
    fetch(VIDEO_PATH, { method: 'HEAD' })
      .then((res) => {
        const ct = res.headers.get('content-type') || ''
        setVideoFound(res.ok && (ct.includes('video') || ct.includes('octet-stream')))
      })
      .catch(() => setVideoFound(false))

    fetch(POSTER_PATH, { method: 'HEAD' })
      .then((res) => {
        const ct = res.headers.get('content-type') || ''
        setHasPoster(res.ok && ct.startsWith('image/'))
      })
      .catch(() => setHasPoster(false))
  }, [])

  // Auto-hide controls after 3s of no mouse movement
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false)
    }, 3000)
  }, [isPlaying])

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  const handleTogglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleToggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    videoRef.current.muted = next
    setIsMuted(next)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const val = parseFloat(e.target.value)
    videoRef.current.volume = val
    videoRef.current.muted = val === 0
    setVolume(val)
    setIsMuted(val === 0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = parseFloat(e.target.value)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleFullscreen = () => {
    if (!videoRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <section id="demo" className={styles.section} aria-labelledby="demo-heading">
      <div className="container-wide">
        <div className={styles.header}>
          <span className={styles.eyebrow}>IN MOTION</span>
          <h2 id="demo-heading" className={styles.title}>
            See how Kissa feels while it is running.
          </h2>
          <p className={styles.lead}>
            Real-time vinyl platter inertia, precision tonearm tracking, and synchronized lyrics following active
            playback on your Windows desktop.
          </p>
        </div>

        <div
          className={styles.playerWrap}
          onMouseMove={showControls}
          onMouseLeave={() => isPlaying && setControlsVisible(false)}
        >
          <div className={styles.ambientBacklight} aria-hidden="true" />

          <div className={styles.playerFrame}>
            {videoFound ? (
              <video
                ref={videoRef}
                src={VIDEO_PATH}
                poster={hasPoster ? POSTER_PATH : undefined}
                className={styles.video}
                playsInline
                muted={isMuted}
                loop
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                onError={() => setVideoFound(false)}
                aria-label="Kissa desktop application screen recording"
              />
            ) : (
              <div className={styles.staticFrame}>
                {hasPoster ? (
                  <img
                    src={POSTER_PATH}
                    alt="Kissa vinyl turntable player interface"
                    className={styles.staticPoster}
                    width={1920}
                    height={1080}
                  />
                ) : (
                  <div className={styles.placeholderStage} aria-hidden="true">
                    <svg
                      className={styles.schematicSvg}
                      viewBox="0 0 800 450"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="40" y="30" width="720" height="390" rx="8" stroke="rgba(247,246,242,0.08)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="160" stroke="rgba(224,142,69,0.2)" strokeWidth="2" />
                      <circle cx="340" cy="225" r="152" stroke="rgba(247,246,242,0.05)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="130" stroke="rgba(247,246,242,0.04)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="110" stroke="rgba(247,246,242,0.04)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="90"  stroke="rgba(247,246,242,0.04)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="70"  stroke="rgba(247,246,242,0.05)" strokeWidth="1" />
                      <circle cx="340" cy="225" r="46"  fill="rgba(21,21,24,0.8)" stroke="rgba(224,142,69,0.3)" strokeWidth="1.5" />
                      <circle cx="340" cy="225" r="6"   fill="var(--color-accent)" />
                      <circle cx="590" cy="120" r="24"  stroke="rgba(224,142,69,0.25)" strokeWidth="1.5" fill="rgba(21,21,24,0.6)" />
                      <circle cx="590" cy="120" r="5"   fill="var(--color-accent)" />
                      <path d="M590 120 C570 190,510 240,430 265 L405 272" stroke="rgba(224,142,69,0.4)" strokeWidth="2" strokeLinecap="round" />
                      <polygon points="405,272 390,277 393,286 408,281" fill="rgba(224,142,69,0.4)" stroke="rgba(224,142,69,0.6)" strokeWidth="1" />
                    </svg>
                  </div>
                )}
                <div className={styles.staticOverlay} />
                <div className={styles.videoSlotNotice}>
                  <span className={styles.slotTag}>DEMONSTRATION</span>
                  <h3 className={styles.slotTitle}>Screen Capture in Progress</h3>
                  <p className={styles.slotText}>
                    A real desktop recording of Kissa running live on Windows 11 with Spotify &amp; Apple Music will appear here.
                  </p>
                </div>
              </div>
            )}

            {videoFound && (
              <div className={`${styles.controlsBar} ${controlsVisible ? styles.controlsVisible : ''}`}>
                <div className={styles.progressRow}>
                  <input
                    ref={progressRef}
                    type="range"
                    className={styles.seekBar}
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Seek video"
                    style={{ '--progress': `${progress}%` } as React.CSSProperties}
                  />
                </div>

                <div className={styles.controlsRow}>
                  <div className={styles.controlsLeft}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleTogglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>

                    <span className={styles.timeDisplay}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className={styles.controlsRight}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleToggleMute}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      )}
                    </button>

                    <input
                      type="range"
                      className={styles.volumeBar}
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      style={{ '--progress': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
                    />

                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleFullscreen}
                      aria-label="Toggle fullscreen"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

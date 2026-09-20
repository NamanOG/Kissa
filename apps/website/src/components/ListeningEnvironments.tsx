import { useState, useEffect } from 'react'
import styles from './ListeningEnvironments.module.css'
import { HorizontalGallery } from './ui/HorizontalGallery'
import { ThemeConfig, LISTENING_ROOMS } from '../data/rooms'

export function ListeningEnvironments() {
  const [activeRoom, setActiveRoom] = useState<ThemeConfig>(LISTENING_ROOMS[0])
  const [isThemeApplied, setIsThemeApplied] = useState(false)

  // Dynamically apply subtle ambient tinting while preserving graphite baseline
  useEffect(() => {
    if (!isThemeApplied) return
    const root = document.documentElement
    root.style.setProperty('--color-accent', activeRoom.accentColor)
    root.style.setProperty('--color-accent-muted', activeRoom.accentMuted)
    root.style.setProperty('--color-bg', activeRoom.bgColor)
    root.style.setProperty('--color-bg-raised', activeRoom.surfaceColor)
    root.style.setProperty('--color-border', activeRoom.borderColor)
  }, [activeRoom, isThemeApplied])

  const handleSelectRoom = (room: ThemeConfig) => {
    setActiveRoom(room)
    setIsThemeApplied(true)
  }

  const handleResetTheme = () => {
    setIsThemeApplied(false)
    const root = document.documentElement
    root.style.removeProperty('--color-accent')
    root.style.removeProperty('--color-accent-muted')
    root.style.removeProperty('--color-bg')
    root.style.removeProperty('--color-bg-raised')
    root.style.removeProperty('--color-border')
    setActiveRoom(LISTENING_ROOMS[0])
  }

  return (
    <section id="environments" className={styles.section} aria-labelledby="env-heading">
      <div className={styles.headerWrap}>
        <div className="container">
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <span className={styles.eyebrow}>ATMOSPHERE</span>
              <h2 id="env-heading" className={styles.title}>
                Eight curated listening rooms.
              </h2>
              <p className={styles.lead}>
                In Kissa, listening environments subtly tint the turntable atmosphere to match your mood, focus, or
                time of day. Select any room to preview its color grade.
              </p>
            </div>

            {isThemeApplied && (
              <div className={styles.appliedPill}>
                <span className={styles.appliedDot} style={{ backgroundColor: activeRoom.accentColor }} />
                <span>Ambient Tint: {activeRoom.name}</span>
                <button
                  type="button"
                  onClick={handleResetTheme}
                  className={styles.resetBtn}
                  aria-label="Reset website color palette to default graphite baseline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <HorizontalGallery
        rooms={LISTENING_ROOMS}
        activeRoom={activeRoom}
        onSelectRoom={handleSelectRoom}
      />
    </section>
  )
}

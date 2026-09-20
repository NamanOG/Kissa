import { useRef, useState, useEffect } from 'react'
import styles from './HorizontalGallery.module.css'
import { ThemeConfig } from '../../data/rooms'

export interface HorizontalGalleryProps {
  rooms: ThemeConfig[]
  activeRoom: ThemeConfig
  onSelectRoom: (room: ThemeConfig) => void
  className?: string
}

export function HorizontalGallery({
  rooms,
  activeRoom,
  onSelectRoom,
  className = ''
}: HorizontalGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true })
      window.addEventListener('resize', checkScroll)
      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [])

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' && index < rooms.length - 1) {
      e.preventDefault()
      onSelectRoom(rooms[index + 1])
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      onSelectRoom(rooms[index - 1])
    }
  }

  return (
    <div className={`${styles.galleryWrapper} ${className}`}>
      {/* Controls Bar */}
      <div className={styles.controls}>
        <div className={styles.meta}>
          <span className={styles.activeTag}>ROOM {activeRoom.number} OF 08</span>
          <span className={styles.activeMood}>{activeRoom.lightingMood}</span>
        </div>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scrollByAmount('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll rooms left"
          >
            ←
          </button>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scrollByAmount('right')}
            disabled={!canScrollRight}
            aria-label="Scroll rooms right"
          >
            →
          </button>
        </div>
      </div>

      {/* Horizontal Reel */}
      <div
        ref={scrollRef}
        className={styles.reel}
        role="region"
        aria-label="Listening rooms horizontal gallery"
        tabIndex={0}
      >
        {rooms.map((room, index) => {
          const isSelected = activeRoom.id === room.id
          return (
            <div
              key={room.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${room.name} (${room.lightingMood})`}
              className={`${styles.card}${isSelected ? ` ${styles.isSelected}` : ''}`}
              onClick={() => onSelectRoom(room)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                '--room-accent': room.accentColor
              } as React.CSSProperties}
            >
              <div className={styles.imageFrame}>
                <img
                  src={room.image}
                  alt={room.name}
                  className={styles.image}
                  loading="lazy"
                  width={640}
                  height={360}
                />
                <div className={styles.imageOverlay} />
                <div className={styles.cardHeader}>
                  <span className={styles.roomNum}>{room.number}</span>
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: room.accentColor }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.roomName}>{room.name}</h3>
                <p className={styles.roomDesc}>{room.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useT, type Translate } from '@renderer/i18n'
import type { TallyEntry } from '@renderer/features/session/tally'
import type { Recap } from './recap'
import { canExport, cardText, drawPressedCard } from './cardCanvas'
import { formatTime } from './format'

type Covers = (e: TallyEntry) => string | undefined

/**
 * Drawing the card takes a large part of a second, so each card is drawn once and kept. The
 * story starts drawing it while an early scene is resting, and the card scene only shows it.
 */
const images = new Map<string, Promise<string | null>>()

function cardKey(recap: Recap, title: string): string {
  return [recap.period.kind, recap.period.start, recap.seconds, recap.plays, title].join('|')
}

export function cardImage(recap: Recap, covers: Covers, title: string, t: Translate): Promise<string | null> {
  const key = cardKey(recap, title)
  let image = images.get(key)
  if (!image) {
    const text = cardText(recap, title, t, formatTime(recap.seconds, t))
    image = drawPressedCard(recap, covers, text)
      .then((canvas) => (canExport(canvas) ? canvas : drawPressedCard(recap, () => undefined, text)))
      .then(
        (canvas) =>
          new Promise<string | null>((resolve) => {
            // toBlob encodes off the main thread, unlike toDataURL.
            try {
              canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/jpeg', 0.9)
            } catch {
              resolve(null)
            }
          })
      )
      .catch(() => null)
    images.set(key, image)
    // Keep only the last few cards.
    while (images.size > 4) {
      const [oldKey, old] = images.entries().next().value as [string, Promise<string | null>]
      images.delete(oldKey)
      void old.then((url) => url && URL.revokeObjectURL(url))
    }
  }
  return image
}

/** The share card, drawn on a canvas and shown as an image: the same pixels that are saved. */
export function PressedCard({
  recap,
  covers,
  title
}: {
  recap: Recap
  covers: Covers
  title: string
  scale?: 'fit'
}): React.JSX.Element {
  const t = useT()
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void cardImage(recap, covers, title, t).then((url) => live && setSrc(url))
    return () => {
      live = false
    }
  }, [recap, covers, title, t])
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#0d0907] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9),0_16px_34px_-16px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      {src && <img src={src} alt={title} className="h-full w-full object-cover" draggable={false} />}
    </div>
  )
}

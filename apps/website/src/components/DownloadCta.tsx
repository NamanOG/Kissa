import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { roomArt } from '@reserve'
import styles from './DownloadCta.module.css'
import { Ambient } from './Ambient'
import { RevealHeading } from './ui/Reveal'
import { DownloadButton } from './ui/DownloadButton'
import { Vinyl } from './ui/Vinyl'
import { asset } from '../lib/asset'
import { supportIsConfigured } from '../data/support'

/** The last thing on the page: one big record, rising into the room and turning with the scroll. */
export function DownloadCta() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['34%', '0%'])
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1])
  const rotate = useTransform(scrollYProgress, [0, 1], [-160, 0])
  const art = roomArt.cta

  /* The last view holds this room and the footer together, so the room leaves the footer's height. */
  useEffect(() => {
    const section = ref.current
    const footer = document.querySelector('footer')
    if (!section || !footer) return
    const measure = () => section.style.setProperty('--footer', `${footer.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} id="download" className={styles.section} aria-labelledby="download-heading">
      {art && (
        <div className={styles.art} aria-hidden="true">
          <img src={art} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
          <Ambient kind="rain" />
        </div>
      )}

      <motion.div className={styles.record} style={reduced ? undefined : { y, scale, rotate }} aria-hidden="true">
        <Vinyl spinning platter />
      </motion.div>

      <div className={styles.card}>
        <RevealHeading id="download-heading" className={styles.title} lines={['Put a', 'record on.']} />
        <p className={styles.lead}>
          Free, for Windows 10 &amp; 11. Install it from the Microsoft Store, press play in your music app, and let it
          spin.
        </p>
        <DownloadButton showMeta />
        <ul className={styles.alt} role="list">
          {supportIsConfigured() && (
            <li>
              <a href={asset('support/')}>Support Kissa</a>
            </li>
          )}
          <li>
            <a href={asset('whats-new/')}>What&rsquo;s new in 5.2</a>
          </li>
        </ul>
      </div>
    </section>
  )
}

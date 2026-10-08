import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import styles from './DownloadCta.module.css'
import { RevealHeading } from './ui/Reveal'
import { DownloadButton } from './ui/DownloadButton'
import { Vinyl } from './ui/Vinyl'
import { ArrowOut } from './ui/Marks'
import { GITHUB_URL } from '../lib/links'

export function DownloadCta() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['34%', '0%'])

  return (
    <section ref={ref} id="download" className={styles.section} aria-labelledby="download-heading">
      <motion.div className={styles.record} style={reduced ? undefined : { y }}>
        <Vinyl spinning platter />
      </motion.div>

      <div className={`container ${styles.content}`}>
        <span className="label">Get Kissa</span>
        <RevealHeading id="download-heading" className={styles.title} lines={['Put a record on.']} />
        <p className={styles.lead}>
          Free, for Windows 10 &amp; 11. Install it from the Microsoft Store, press play in your music app, and let
          it spin.
        </p>

        <DownloadButton showMeta className={styles.button} />

        <ul className={styles.alt} role="list">
          <li>
            <a href={`${GITHUB_URL}#version-history`} target="_blank" rel="noopener noreferrer">
              What&rsquo;s new
              <ArrowOut />
            </a>
          </li>
          <li>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              Source code
              <ArrowOut />
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}

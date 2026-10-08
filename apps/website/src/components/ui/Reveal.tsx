import React from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

interface RevealHeadingProps {
  /**
   * Lines of the heading. Wrap a word in *asterisks* to set it in italic
   * (rendered as <em>, coloured by the section's heading styles).
   */
  lines: string[]
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  id?: string
  /** 'mount' animates immediately (hero); 'view' waits until scrolled into view. */
  trigger?: 'mount' | 'view'
  delay?: number
}

const lineVariants: Variants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.9, ease: EASE } }
}

function renderLine(line: string) {
  return line.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part
  )
}

/**
 * RevealHeading - line-by-line masked rise, adapted from
 * UI-Reference-System/components/typography/vertical-cut-reveal.
 * Lines (not words) are masked so the heading keeps its typographic shape
 * while animating, and the full text stays readable to screen readers.
 */
export function RevealHeading({
  lines,
  as: Tag = 'h2',
  className,
  id,
  trigger = 'view',
  delay = 0
}: RevealHeadingProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[Tag]

  if (reduced) {
    return (
      <Tag className={className} id={id}>
        {lines.map((line, i) => (
          <span key={i} style={{ display: 'block' }}>
            {renderLine(line)}
          </span>
        ))}
      </Tag>
    )
  }

  const play = trigger === 'mount' ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, amount: 0.2 } }

  return (
    <MotionTag
      className={className}
      id={id}
      initial="hidden"
      {...play}
      transition={{ staggerChildren: 0.09, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' }}>
          <motion.span variants={lineVariants} style={{ display: 'block' }}>
            {renderLine(line)}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  as?: 'div' | 'section' | 'li' | 'p'
}

/** Single, section-level entrance. Deliberately not used on every element. */
export function FadeIn({ children, className, delay = 0, y = 18, as = 'div' }: FadeInProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as]
  return (
    <MotionTag
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  )
}

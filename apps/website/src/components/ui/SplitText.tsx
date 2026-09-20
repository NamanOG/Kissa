import React from 'react'
import { motion, type Variants } from 'motion/react'

export interface SplitTextProps {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  duration?: number
  stagger?: number
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  id?: string
}

export function SplitText({
  text,
  className = '',
  wordClassName = '',
  delay = 0.05,
  duration = 0.5,
  stagger = 0.04,
  as: Tag = 'span',
  id
}: SplitTextProps) {
  const words = text.split(' ')

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay
      }
    }
  }

  const childVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 12,
      filter: 'blur(6px)'
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1] as const
      }
    }
  }

  return (
    <Tag className={className} id={id}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        style={{ display: 'inline' }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={childVariants}
            className={wordClassName}
            style={{ display: 'inline-block', marginRight: '0.26em' }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  )
}

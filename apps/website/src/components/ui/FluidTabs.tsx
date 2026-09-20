import React, { useRef } from 'react'
import { motion } from 'motion/react'
import styles from './FluidTabs.module.css'

export interface TabItem {
  id: string
  label: string
  eyebrow?: string
  description?: string
  icon?: React.ReactNode
}

export interface FluidTabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
  pillClassName?: string
  tabClassName?: string
  activeTabClassName?: string
  layoutId?: string
}

export function FluidTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  pillClassName = '',
  tabClassName = '',
  activeTabClassName = '',
  layoutId = 'fluid-tabs-active-pill'
}: FluidTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }
    e.preventDefault()
    onChange(tabs[nextIndex].id)
    const nextBtn = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]
    nextBtn?.focus()
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`${styles.container} ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`${styles.tab} ${tabClassName} ${isActive ? `${styles.activeTab} ${activeTabClassName}` : ''}`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className={`${styles.activePill} ${pillClassName}`}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 40,
                  mass: 0.9
                }}
              />
            )}
            <span className={styles.tabContent}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

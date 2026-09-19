import React, { useEffect } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'

export interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppLayout = React.forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ className, children, ...props }, ref) => {
    const theme = usePlayerStore(s => s.theme)
    
    useEffect(() => {
      const activeThemeObj = LISTENING_ENVIRONMENTS.find((t) => t.id === theme) || LISTENING_ENVIRONMENTS[0]
      const root = document.documentElement
      
      if (theme === 'adaptive') {
        root.style.setProperty('--accent', 'var(--adaptive-accent, #e0a868)')
        root.style.setProperty('--surface', activeThemeObj.surfaceColor)
        root.style.setProperty('--on-surface', 'var(--adaptive-on-surface, #faf3ea)')
        root.style.setProperty('--muted', 'var(--adaptive-muted, #a89f91)')
        
        root.style.setProperty('--panel-bg', 'var(--adaptive-panel-bg, rgba(24, 20, 18, 0.75))')
        root.style.setProperty('--panel-border', activeThemeObj.ui.panelBorder)
        root.style.setProperty('--panel-shadow', activeThemeObj.ui.panelShadow)
        
        root.style.setProperty('--dock-bg', 'var(--adaptive-panel-bg, rgba(28, 24, 22, 0.8))')
        root.style.setProperty('--dock-border', activeThemeObj.ui.dockBorder)
        root.style.setProperty('--dock-shadow', activeThemeObj.ui.dockShadow)
        
        root.style.setProperty('--deck-bg', 'var(--adaptive-deck-bg, rgba(18, 14, 12, 0.85))')
        root.style.setProperty('--deck-border', activeThemeObj.ui.deckBorder)
        root.style.setProperty('--deck-shadow', activeThemeObj.ui.deckShadow)
        
        root.style.setProperty('--typography-glow', activeThemeObj.ui.typographyGlow)
        root.setAttribute('data-vinyl-mood', activeThemeObj.ui.vinylMood)
      } else {
        root.style.setProperty('--accent', activeThemeObj.accentColor)
        root.style.setProperty('--surface', activeThemeObj.surfaceColor)
        root.style.setProperty('--on-surface', activeThemeObj.onSurfaceColor)
        root.style.setProperty('--muted', activeThemeObj.mutedColor)
        
        root.style.setProperty('--panel-bg', activeThemeObj.ui.panelBg)
        root.style.setProperty('--panel-border', activeThemeObj.ui.panelBorder)
        root.style.setProperty('--panel-shadow', activeThemeObj.ui.panelShadow)
        
        root.style.setProperty('--dock-bg', activeThemeObj.ui.dockBg)
        root.style.setProperty('--dock-border', activeThemeObj.ui.dockBorder)
        root.style.setProperty('--dock-shadow', activeThemeObj.ui.dockShadow)
        
        root.style.setProperty('--deck-bg', activeThemeObj.ui.deckBg)
        root.style.setProperty('--deck-border', activeThemeObj.ui.deckBorder)
        root.style.setProperty('--deck-shadow', activeThemeObj.ui.deckShadow)
        
        root.style.setProperty('--typography-glow', activeThemeObj.ui.typographyGlow)
        root.setAttribute('data-vinyl-mood', activeThemeObj.ui.vinylMood)
      }
    }, [theme])

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-full w-full min-w-0 overflow-hidden bg-transparent text-foreground select-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppLayout.displayName = 'AppLayout'

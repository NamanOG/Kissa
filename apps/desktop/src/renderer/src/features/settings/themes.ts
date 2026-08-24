import { AppTheme } from '@renderer/stores/playerStore'
import env01 from '@renderer/media/environments/01_quiet_room.jpg'
import env02 from '@renderer/media/environments/02_dusty_record.jpg'
import env03 from '@renderer/media/environments/03_jazz_bar.jpg'
import env04 from '@renderer/media/environments/04_midnight_apartment.jpg'
import env05 from '@renderer/media/environments/05_rainy_window.jpg'
import env06 from '@renderer/media/environments/06_hifi_library.jpg'
import env07 from '@renderer/media/environments/07_concrete_vinyl.jpg'
import env08 from '@renderer/media/environments/08_sunday_morning.jpg'

export interface ThemeDefinition {
  id: AppTheme
  number: string
  name: string
  description: string
  image: string
  /** Dominant accent colour: scrubber fill, LEDs, active lyric glow, button highlights */
  accentColor: string
  /** Panel / card surface colour */
  surfaceColor: string
  /** Primary text colour on surfaces */
  onSurfaceColor: string
  /** Secondary / muted text */
  mutedColor: string
  
  // Advanced UI overrides for distinct environments
  ui: {
    panelBg: string
    panelBorder: string
    panelShadow: string
    dockBg: string
    dockBorder: string
    dockShadow: string
    deckBg: string // Frosted/opaque faceplate background for modals and main deck
    deckBorder: string
    deckShadow: string
    vinylMood: 'dark' | 'light' | 'warm' | 'cool'
    typographyGlow: string
  }
  
  ambient: {
    bgColor: string
    gradient: string
  }
}

export const LISTENING_ENVIRONMENTS: ThemeDefinition[] = [
  // ── 01 WARM WALNUT STUDIO (Amber lamplight, walnut grain)
  {
    id: 'quiet-room',
    number: '01',
    name: 'Warm Walnut Studio',
    description: 'Amber lamplight, walnut grain, late-night warmth',
    image: env01,
    accentColor: '#e08e45',
    surfaceColor: '#16100c',
    onSurfaceColor: '#faf3ea',
    mutedColor: '#a6866b',
    ui: {
      panelBg: 'rgba(32, 22, 17, 0.82)',
      panelBorder: 'rgba(224, 142, 69, 0.14)',
      panelShadow: '0 18px 46px rgba(10, 6, 4, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      dockBg: 'rgba(38, 27, 21, 0.86)',
      dockBorder: 'rgba(224, 142, 69, 0.2)',
      dockShadow: '0 20px 48px rgba(10, 6, 4, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      deckBg: 'rgba(24, 17, 13, 0.96)',
      deckBorder: 'rgba(224, 142, 69, 0.18)',
      deckShadow: '0 24px 64px rgba(10, 6, 4, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      vinylMood: 'warm',
      typographyGlow: '0 0 14px rgba(224, 142, 69, 0.25)',
    },
    ambient: {
      bgColor: '#0f0b07',
      gradient: [
        'radial-gradient(ellipse 75% 60% at 85% 15%, rgba(225, 145, 60, 0.22) 0%, rgba(200, 110, 40, 0.08) 45%, transparent 70%)',
        'radial-gradient(circle 550px at 60% 50%, rgba(240, 160, 75, 0.09) 0%, transparent 65%)',
        'radial-gradient(ellipse 60% 50% at 15% 90%, rgba(140, 75, 25, 0.14) 0%, transparent 60%)',
        'radial-gradient(ellipse 40% 40% at 10% 10%, rgba(180, 100, 40, 0.06) 0%, transparent 55%)',
        'linear-gradient(155deg, #1f140c 0%, #130d08 45%, #0b0704 100%)'
      ].join(', ')
    }
  },
  
  // ── 02 VINTAGE AMBER (Sepia photographs, faded gold)
  {
    id: 'dusty-record',
    number: '02',
    name: 'Vintage Amber',
    description: 'Sepia photographs, aged cardboard, faded gold sleeves',
    image: env02,
    accentColor: '#e5a93c',
    surfaceColor: '#18140c',
    onSurfaceColor: '#fbf5e6',
    mutedColor: '#9e8862',
    ui: {
      panelBg: 'rgba(32, 26, 16, 0.84)',
      panelBorder: 'rgba(229, 169, 60, 0.16)',
      panelShadow: '0 16px 40px rgba(8, 6, 3, 0.5), inset 0 1px 0 rgba(229, 169, 60, 0.08)',
      dockBg: 'rgba(40, 32, 20, 0.88)',
      dockBorder: 'rgba(229, 169, 60, 0.22)',
      dockShadow: '0 20px 48px rgba(8, 6, 3, 0.55)',
      deckBg: 'rgba(26, 21, 13, 0.96)',
      deckBorder: 'rgba(229, 169, 60, 0.2)',
      deckShadow: '0 24px 64px rgba(8, 6, 3, 0.75), inset 0 1px 0 rgba(229, 169, 60, 0.1)',
      vinylMood: 'warm',
      typographyGlow: '0 0 12px rgba(229, 169, 60, 0.2)',
    },
    ambient: {
      bgColor: '#121008',
      gradient: [
        'radial-gradient(ellipse 70% 50% at 50% 10%, rgba(235, 175, 60, 0.20) 0%, rgba(180, 120, 35, 0.07) 50%, transparent 72%)',
        'radial-gradient(circle 500px at 65% 52%, rgba(240, 190, 80, 0.10) 0%, transparent 65%)',
        'radial-gradient(ellipse 45% 70% at 5% 55%, rgba(160, 110, 35, 0.12) 0%, transparent 60%)',
        'radial-gradient(ellipse 45% 70% at 95% 65%, rgba(140, 95, 28, 0.10) 0%, transparent 60%)',
        'linear-gradient(175deg, #20190e 0%, #141009 50%, #0c0905 100%)'
      ].join(', ')
    }
  },

  // ── 03 INDIGO JAZZ CLUB (Neon signs, velvet booths)
  {
    id: 'jazz-bar',
    number: '03',
    name: 'Indigo Jazz Club',
    description: 'Neon signs, velvet booths, smoky violet haze',
    image: env03,
    accentColor: '#c084fc',
    surfaceColor: '#0d0b1a',
    onSurfaceColor: '#f3efff',
    mutedColor: '#8b7eb8',
    ui: {
      panelBg: 'rgba(22, 18, 42, 0.82)',
      panelBorder: 'rgba(192, 132, 252, 0.2)',
      panelShadow: '0 24px 48px rgba(4, 2, 10, 0.6), inset 0 0 20px rgba(192, 132, 252, 0.05)',
      dockBg: 'rgba(28, 22, 54, 0.85)',
      dockBorder: 'rgba(192, 132, 252, 0.3)',
      dockShadow: '0 0 30px rgba(192, 132, 252, 0.12), 0 24px 48px rgba(4, 2, 10, 0.7)',
      deckBg: 'rgba(16, 13, 30, 0.96)',
      deckBorder: 'rgba(192, 132, 252, 0.25)',
      deckShadow: '0 24px 64px rgba(4, 2, 10, 0.8), 0 0 35px rgba(192, 132, 252, 0.08)',
      vinylMood: 'dark',
      typographyGlow: '0 0 14px rgba(192, 132, 252, 0.45)',
    },
    ambient: {
      bgColor: '#07060e',
      gradient: [
        'radial-gradient(ellipse 65% 55% at 75% 12%, rgba(168, 85, 247, 0.28) 0%, rgba(217, 70, 239, 0.12) 38%, transparent 68%)',
        'radial-gradient(ellipse 45% 45% at 10% 88%, rgba(234, 115, 30, 0.14) 0%, transparent 58%)',
        'radial-gradient(ellipse 55% 45% at 30% 20%, rgba(99, 102, 241, 0.18) 0%, transparent 62%)',
        'radial-gradient(circle 480px at 62% 52%, rgba(192, 132, 252, 0.12) 0%, transparent 65%)',
        'linear-gradient(155deg, #15112a 0%, #0c0919 50%, #05040a 100%)'
      ].join(', ')
    }
  },

  // ── 04 COLD MIDNIGHT (Insomnia blue, graphite walls)
  {
    id: 'midnight-apartment',
    number: '04',
    name: 'Cold Midnight',
    description: 'Insomnia blue, graphite walls, city glow from a window',
    image: env04,
    accentColor: '#38bdf8',
    surfaceColor: '#0a0e18',
    onSurfaceColor: '#e6f0fa',
    mutedColor: '#5b7294',
    ui: {
      panelBg: 'rgba(16, 23, 38, 0.86)',
      panelBorder: 'rgba(56, 189, 248, 0.14)',
      panelShadow: '0 16px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      dockBg: 'rgba(20, 29, 48, 0.90)',
      dockBorder: 'rgba(56, 189, 248, 0.22)',
      dockShadow: '0 20px 48px rgba(0, 0, 0, 0.75)',
      deckBg: 'rgba(12, 17, 28, 0.96)',
      deckBorder: 'rgba(56, 189, 248, 0.2)',
      deckShadow: '0 24px 64px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      vinylMood: 'cool',
      typographyGlow: '0 0 12px rgba(56, 189, 248, 0.25)',
    },
    ambient: {
      bgColor: '#060810',
      gradient: [
        'radial-gradient(ellipse 70% 55% at 90% 8%, rgba(56, 189, 248, 0.22) 0%, rgba(37, 99, 235, 0.12) 40%, transparent 68%)',
        'radial-gradient(ellipse 85% 40% at 50% 100%, rgba(30, 58, 138, 0.45) 0%, rgba(14, 165, 233, 0.10) 45%, transparent 75%)',
        'radial-gradient(ellipse 40% 65% at 0% 45%, rgba(59, 130, 246, 0.14) 0%, transparent 60%)',
        'radial-gradient(circle 520px at 62% 48%, rgba(56, 189, 248, 0.09) 0%, transparent 65%)',
        'linear-gradient(165deg, #0e1524 0%, #080c15 50%, #030509 100%)'
      ].join(', ')
    }
  },

  // ── 05 PETRICHOR (Rain on glass, slate sky)
  {
    id: 'rainy-window',
    number: '05',
    name: 'Petrichor',
    description: 'Rain on glass, slate sky, warm indoor refuge',
    image: env05,
    accentColor: '#7dd3fc',
    surfaceColor: '#101520',
    onSurfaceColor: '#eaf0f8',
    mutedColor: '#64748b',
    ui: {
      panelBg: 'rgba(22, 29, 44, 0.82)',
      panelBorder: 'rgba(125, 211, 252, 0.14)',
      panelShadow: '0 18px 42px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      dockBg: 'rgba(28, 37, 56, 0.86)',
      dockBorder: 'rgba(125, 211, 252, 0.22)',
      dockShadow: '0 20px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      deckBg: 'rgba(18, 23, 34, 0.96)',
      deckBorder: 'rgba(125, 211, 252, 0.18)',
      deckShadow: '0 24px 64px rgba(2, 4, 8, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      vinylMood: 'cool',
      typographyGlow: '0 0 10px rgba(125, 211, 252, 0.2)',
    },
    ambient: {
      bgColor: '#0c0f14',
      gradient: [
        'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(96, 165, 250, 0.18) 0%, rgba(56, 189, 248, 0.08) 45%, transparent 70%)',
        'radial-gradient(ellipse 50% 45% at 88% 85%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)',
        'radial-gradient(ellipse 45% 65% at 5% 40%, rgba(14, 165, 233, 0.12) 0%, transparent 58%)',
        'radial-gradient(circle 500px at 60% 50%, rgba(125, 211, 252, 0.08) 0%, transparent 62%)',
        'linear-gradient(175deg, #161c2b 0%, #0e131d 50%, #07090f 100%)'
      ].join(', ')
    }
  },

  // ── 06 HI-FI LIBRARY (Hunter green walls, mahogany shelves)
  {
    id: 'hifi-library',
    number: '06',
    name: 'Hi-Fi Library',
    description: 'Hunter green walls, mahogany shelves, polished brass',
    image: env06,
    accentColor: '#34d399',
    surfaceColor: '#08140c',
    onSurfaceColor: '#e8f8f0',
    mutedColor: '#4d7c62',
    ui: {
      panelBg: 'rgba(14, 30, 20, 0.84)',
      panelBorder: 'rgba(52, 211, 153, 0.16)',
      panelShadow: '0 18px 36px rgba(2, 6, 2, 0.6), inset 0 1px 0 rgba(52, 211, 153, 0.1)',
      dockBg: 'rgba(18, 38, 25, 0.88)',
      dockBorder: 'rgba(52, 211, 153, 0.25)',
      dockShadow: '0 20px 48px rgba(2, 6, 2, 0.65)',
      deckBg: 'rgba(11, 24, 15, 0.96)',
      deckBorder: 'rgba(52, 211, 153, 0.22)',
      deckShadow: '0 24px 64px rgba(2, 6, 3, 0.8), 0 0 30px rgba(52, 211, 153, 0.06)',
      vinylMood: 'dark',
      typographyGlow: '0 0 12px rgba(52, 211, 153, 0.25)',
    },
    ambient: {
      bgColor: '#060d06',
      gradient: [
        'radial-gradient(ellipse 70% 60% at 25% 15%, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.09) 45%, transparent 68%)',
        'radial-gradient(ellipse 50% 55% at 88% 70%, rgba(217, 140, 35, 0.16) 0%, transparent 58%)',
        'radial-gradient(ellipse 80% 40% at 50% 100%, rgba(15, 45, 25, 0.5) 0%, transparent 70%)',
        'radial-gradient(circle 500px at 62% 50%, rgba(52, 211, 153, 0.10) 0%, transparent 65%)',
        'linear-gradient(160deg, #0e2214 0%, #08150d 50%, #030805 100%)'
      ].join(', ')
    }
  },

  // ── 07 CONCRETE LOFT (Raw concrete, warm terracotta)
  {
    id: 'concrete-vinyl',
    number: '07',
    name: 'Concrete Loft',
    description: 'Raw concrete, warm terracotta, sunlit industrial windows',
    image: env07,
    accentColor: '#c87056',
    surfaceColor: '#e0e2e5',
    onSurfaceColor: '#2b2e33',
    mutedColor: '#7a818c',
    ui: {
      panelBg: 'rgba(230, 232, 235, 0.82)',
      panelBorder: 'rgba(0, 0, 0, 0.08)',
      panelShadow: '0 12px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      dockBg: 'rgba(240, 242, 245, 0.90)',
      dockBorder: 'rgba(0, 0, 0, 0.1)',
      dockShadow: '0 18px 46px rgba(0, 0, 0, 0.09)',
      deckBg: 'rgba(235, 237, 240, 0.97)',
      deckBorder: 'rgba(0, 0, 0, 0.12)',
      deckShadow: '0 24px 64px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      vinylMood: 'light',
      typographyGlow: 'none',
    },
    ambient: {
      bgColor: '#d4d6db',
      gradient: [
        'radial-gradient(ellipse 75% 65% at 20% 15%, rgba(255,250,240,0.85) 0%, transparent 70%)',
        'radial-gradient(ellipse 55% 45% at 90% 90%, rgba(200,112,86,0.18) 0%, transparent 60%)',
        'linear-gradient(155deg, #ebedef 0%, #d8dadf 50%, #c4c7cc 100%)'
      ].join(', ')
    }
  },

  // ── 08 SUNDAY MORNING (Linen sheets, warm cream light)
  {
    id: 'sunday-morning',
    number: '08',
    name: 'Sunday Morning',
    description: 'Linen sheets, warm cream light, slow coffee mornings',
    image: env08,
    accentColor: '#b45309',
    surfaceColor: '#f0e8d8',
    onSurfaceColor: '#3d2a14',
    mutedColor: '#8a6840',
    ui: {
      panelBg: 'rgba(240, 232, 216, 0.85)',
      panelBorder: 'rgba(0, 0, 0, 0.06)',
      panelShadow: '0 16px 42px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      dockBg: 'rgba(245, 238, 225, 0.92)',
      dockBorder: 'rgba(180, 83, 9, 0.12)',
      dockShadow: '0 20px 48px rgba(0, 0, 0, 0.08)',
      deckBg: 'rgba(244, 238, 226, 0.97)',
      deckBorder: 'rgba(180, 83, 9, 0.14)',
      deckShadow: '0 24px 64px rgba(80, 50, 20, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      vinylMood: 'light',
      typographyGlow: '0 0 12px rgba(180, 83, 9, 0.05)',
    },
    ambient: {
      bgColor: '#eee5d5',
      gradient: [
        'radial-gradient(ellipse 80% 60% at 18% 0%, rgba(255,248,228,0.92) 0%, transparent 70%)',
        'radial-gradient(ellipse 60% 48% at 88% 100%, rgba(182,198,168,0.35) 0%, transparent 65%)',
        'linear-gradient(168deg, #f2e8d2 0%, #e9dfc9 50%, #e1d5ba 100%)'
      ].join(', ')
    }
  },
  
  // ── 09 ADAPTIVE (Artwork matched)
  {
    id: 'adaptive',
    number: '09',
    name: 'Adaptive Atmosphere',
    description: 'Dynamic room lighting that color-matches the current album artwork',
    image: env01, // We will use a placeholder or one of the existing ones
    accentColor: 'var(--adaptive-accent, #737373)',
    surfaceColor: '#121212',
    onSurfaceColor: '#ffffff',
    mutedColor: '#888888',
    ui: {
      panelBg: 'rgba(18, 18, 18, 0.7)',
      panelBorder: 'rgba(255, 255, 255, 0.1)',
      panelShadow: '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      dockBg: 'rgba(24, 24, 24, 0.75)',
      dockBorder: 'rgba(255, 255, 255, 0.12)',
      dockShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
      deckBg: 'rgba(12, 12, 12, 0.8)',
      deckBorder: 'rgba(255, 255, 255, 0.1)',
      deckShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
      vinylMood: 'dark',
      typographyGlow: 'none',
    },
    ambient: {
      bgColor: '#000000',
      gradient: 'var(--adaptive-bg-gradient, linear-gradient(to bottom, #111, #000))'
    }
  }
]

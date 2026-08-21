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
    vinylMood: 'dark' | 'light' | 'warm' | 'cool' // Used to adjust vinyl rendering contrast
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
    accentColor: '#d4884a',
    surfaceColor: '#1e1510',
    onSurfaceColor: '#f5ece0',
    mutedColor: '#9c7b60',
    ui: {
      panelBg: 'rgba(30, 21, 16, 0.75)',
      panelBorder: 'rgba(255, 255, 255, 0.06)',
      panelShadow: '0 18px 46px rgba(14, 9, 7, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      dockBg: 'rgba(42, 33, 29, 0.65)',
      dockBorder: 'rgba(255, 255, 255, 0.09)',
      dockShadow: '0 18px 46px rgba(14, 9, 7, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      vinylMood: 'warm',
      typographyGlow: '0 0 12px rgba(212, 136, 74, 0.2)',
    },
    ambient: {
      bgColor: '#0f0b07',
      gradient: [
        'radial-gradient(ellipse 70% 55% at 88% 12%, rgba(220,145,60,0.15) 0%, transparent 65%)',
        'radial-gradient(ellipse 50% 60% at 8% 92%, rgba(130,75,30,0.10) 0%, transparent 60%)',
        'linear-gradient(158deg, #1a1109 0%, #0f0c08 50%, #0b0906 100%)'
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
    accentColor: '#c9a255',
    surfaceColor: '#1c1810',
    onSurfaceColor: '#ede0c4',
    mutedColor: '#937f58',
    ui: {
      panelBg: 'rgba(28, 24, 16, 0.85)',
      panelBorder: 'rgba(201, 162, 85, 0.15)',
      panelShadow: '0 12px 32px rgba(10, 8, 4, 0.4), inset 0 0 0 1px rgba(201, 162, 85, 0.05)',
      dockBg: 'rgba(38, 32, 22, 0.85)',
      dockBorder: 'rgba(201, 162, 85, 0.2)',
      dockShadow: '0 16px 40px rgba(10, 8, 4, 0.45)',
      vinylMood: 'warm',
      typographyGlow: 'none',
    },
    ambient: {
      bgColor: '#121008',
      gradient: [
        'radial-gradient(ellipse 80% 50% at 50% 15%, rgba(200,150,60,0.13) 0%, transparent 65%)',
        'radial-gradient(ellipse 35% 80% at 3% 65%, rgba(105,82,28,0.09) 0%, transparent 55%)',
        'radial-gradient(ellipse 35% 80% at 97% 65%, rgba(105,82,28,0.07) 0%, transparent 55%)',
        'linear-gradient(180deg, #1a1508 0%, #100e07 60%, #0d0b06 100%)'
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
    accentColor: '#a78bfa',
    surfaceColor: '#0f0d1a',
    onSurfaceColor: '#e8e4ff',
    mutedColor: '#7066a8',
    ui: {
      panelBg: 'rgba(15, 13, 26, 0.7)',
      panelBorder: 'rgba(167, 139, 250, 0.15)',
      panelShadow: '0 24px 48px rgba(5, 4, 10, 0.5), inset 0 0 20px rgba(167, 139, 250, 0.05)',
      dockBg: 'rgba(20, 18, 36, 0.6)',
      dockBorder: 'rgba(167, 139, 250, 0.25)',
      dockShadow: '0 0 30px rgba(167, 139, 250, 0.1), 0 24px 48px rgba(5, 4, 10, 0.6)',
      vinylMood: 'dark',
      typographyGlow: '0 0 10px rgba(167, 139, 250, 0.4)',
    },
    ambient: {
      bgColor: '#07060e',
      gradient: [
        'radial-gradient(ellipse 65% 50% at 62% 8%, rgba(105,65,210,0.22) 0%, transparent 65%)',
        'radial-gradient(ellipse 45% 45% at 12% 88%, rgba(205,120,45,0.09) 0%, transparent 55%)',
        'radial-gradient(ellipse 28% 28% at 4% 6%, rgba(210,35,80,0.08) 0%, transparent 50%)',
        'linear-gradient(155deg, #0d0c1c 0%, #070710 55%, #040508 100%)'
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
    accentColor: '#60a5fa',
    surfaceColor: '#0b0e16',
    onSurfaceColor: '#cdd8f0',
    mutedColor: '#4a6080',
    ui: {
      panelBg: 'rgba(11, 14, 22, 0.95)',
      panelBorder: 'rgba(255, 255, 255, 0.04)',
      panelShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
      dockBg: 'rgba(15, 20, 30, 0.9)',
      dockBorder: 'rgba(255, 255, 255, 0.05)',
      dockShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
      vinylMood: 'cool',
      typographyGlow: 'none',
    },
    ambient: {
      bgColor: '#060810',
      gradient: [
        'radial-gradient(ellipse 60% 50% at 92% 5%, rgba(70,130,220,0.18) 0%, transparent 65%)',
        'radial-gradient(ellipse 80% 30% at 50% 100%, rgba(15,25,55,0.55) 0%, transparent 70%)',
        'radial-gradient(ellipse 35% 60% at 0% 50%, rgba(35,70,145,0.08) 0%, transparent 60%)',
        'linear-gradient(168deg, #090d18 0%, #060810 55%, #040608 100%)'
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
    accentColor: '#94a3b8',
    surfaceColor: '#10131a',
    onSurfaceColor: '#dce4f0',
    mutedColor: '#556070',
    ui: {
      panelBg: 'rgba(16, 19, 26, 0.6)',
      panelBorder: 'rgba(255, 255, 255, 0.03)',
      panelShadow: '0 16px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      dockBg: 'rgba(22, 26, 36, 0.5)',
      dockBorder: 'rgba(255, 255, 255, 0.04)',
      dockShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      vinylMood: 'cool',
      typographyGlow: '0 0 8px rgba(148, 163, 184, 0.1)',
    },
    ambient: {
      bgColor: '#0c0f14',
      gradient: [
        'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(80,102,135,0.16) 0%, transparent 70%)',
        'radial-gradient(ellipse 50% 40% at 50% 100%, rgba(195,148,92,0.07) 0%, transparent 60%)',
        'linear-gradient(178deg, #141820 0%, #0d1018 55%, #09090e 100%)'
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
    accentColor: '#6ee7b7',
    surfaceColor: '#091209',
    onSurfaceColor: '#d2f0e0',
    mutedColor: '#3d6050',
    ui: {
      panelBg: 'rgba(9, 18, 9, 0.8)',
      panelBorder: 'rgba(110, 231, 183, 0.12)',
      panelShadow: '0 16px 32px rgba(2, 6, 2, 0.5), inset 0 1px 0 rgba(110, 231, 183, 0.08)',
      dockBg: 'rgba(13, 26, 13, 0.75)',
      dockBorder: 'rgba(110, 231, 183, 0.18)',
      dockShadow: '0 20px 40px rgba(2, 6, 2, 0.6)',
      vinylMood: 'dark',
      typographyGlow: 'none',
    },
    ambient: {
      bgColor: '#060d06',
      gradient: [
        'radial-gradient(ellipse 72% 58% at 28% 18%, rgba(18,80,38,0.24) 0%, transparent 65%)',
        'radial-gradient(ellipse 38% 52% at 92% 72%, rgba(185,135,45,0.11) 0%, transparent 55%)',
        'radial-gradient(ellipse 85% 38% at 50% 100%, rgba(8,26,12,0.65) 0%, transparent 70%)',
        'linear-gradient(158deg, #0c1609 0%, #080e07 55%, #050805 100%)'
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
      panelBg: 'rgba(230, 232, 235, 0.7)',
      panelBorder: 'rgba(0, 0, 0, 0.06)',
      panelShadow: '0 12px 36px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      dockBg: 'rgba(240, 242, 245, 0.8)',
      dockBorder: 'rgba(0, 0, 0, 0.08)',
      dockShadow: '0 18px 46px rgba(0, 0, 0, 0.08)',
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
      panelBg: 'rgba(240, 232, 216, 0.75)',
      panelBorder: 'rgba(0, 0, 0, 0.05)',
      panelShadow: '0 16px 42px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      dockBg: 'rgba(245, 238, 225, 0.85)',
      dockBorder: 'rgba(180, 83, 9, 0.1)',
      dockShadow: '0 20px 48px rgba(0, 0, 0, 0.07)',
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
  }
]

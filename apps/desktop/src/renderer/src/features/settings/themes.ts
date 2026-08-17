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
  ambient: {
    bgColor: string
    gradient: string
  }
}

export const LISTENING_ENVIRONMENTS: ThemeDefinition[] = [
  {
    id: 'quiet-room',
    number: '01',
    name: 'Quiet Listening Room',
    description: 'Walnut, warm paper, late-night lamp glow',
    image: env01,
    ambient: {
      bgColor: '#120f0d',
      gradient:
        'radial-gradient(ellipse 65% 55% at 80% 30%, rgba(215, 167, 108, 0.055) 0%, transparent 70%), radial-gradient(ellipse 50% 45% at 20% 80%, rgba(140, 105, 70, 0.035) 0%, transparent 65%), linear-gradient(180deg, #15110e 0%, #0d0a09 100%)'
    }
  },
  {
    id: 'dusty-record',
    number: '02',
    name: 'Dusty Record Store',
    description: 'Faded sleeves, cardboard, muted olive',
    image: env02,
    ambient: {
      bgColor: '#131210',
      gradient:
        'radial-gradient(ellipse 60% 50% at 25% 35%, rgba(142, 130, 96, 0.05) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 75% 75%, rgba(120, 75, 70, 0.035) 0%, transparent 60%), linear-gradient(180deg, #161512 0%, #0f0e0c 100%)'
    }
  },
  {
    id: 'jazz-bar',
    number: '03',
    name: 'Japanese Jazz Bar',
    description: 'Charcoal, indigo, warm wood, dim light',
    image: env03,
    ambient: {
      bgColor: '#0c0d12',
      gradient:
        'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(45, 60, 105, 0.12) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 80% 70%, rgba(215, 155, 90, 0.05) 0%, transparent 65%), linear-gradient(180deg, #101117 0%, #090a0d 100%)'
    }
  },
  {
    id: 'midnight-apartment',
    number: '04',
    name: 'Midnight Apartment',
    description: 'Smoky blue, graphite, midnight quiet',
    image: env04,
    ambient: {
      bgColor: '#090b0f',
      gradient:
        'radial-gradient(ellipse 65% 55% at 75% 30%, rgba(50, 80, 125, 0.1) 0%, transparent 70%), radial-gradient(ellipse 45% 40% at 25% 75%, rgba(30, 45, 70, 0.08) 0%, transparent 65%), linear-gradient(180deg, #0d1015 0%, #07080b 100%)'
    }
  },
  {
    id: 'rainy-window',
    number: '05',
    name: 'Rainy Window',
    description: 'Grey skies, soft reflections, warm indoor light',
    image: env05,
    ambient: {
      bgColor: '#0f1215',
      gradient:
        'radial-gradient(ellipse 65% 50% at 70% 30%, rgba(70, 95, 115, 0.1) 0%, transparent 65%), radial-gradient(ellipse 50% 45% at 25% 75%, rgba(185, 145, 100, 0.04) 0%, transparent 65%), linear-gradient(180deg, #13171b 0%, #0b0d0f 100%)'
    }
  },
  {
    id: 'hifi-library',
    number: '06',
    name: 'Hi-Fi Library',
    description: 'Dark wood, parchment, aged brass',
    image: env06,
    ambient: {
      bgColor: '#110d0b',
      gradient:
        'radial-gradient(ellipse 60% 55% at 75% 35%, rgba(195, 145, 80, 0.06) 0%, transparent 70%), radial-gradient(ellipse 50% 45% at 20% 75%, rgba(130, 80, 45, 0.04) 0%, transparent 65%), linear-gradient(180deg, #15100d 0%, #0c0908 100%)'
    }
  },
  {
    id: 'concrete-vinyl',
    number: '07',
    name: 'Concrete & Vinyl',
    description: 'Soft concrete, terracotta, matte black',
    image: env07,
    ambient: {
      bgColor: '#121214',
      gradient:
        'radial-gradient(ellipse 60% 50% at 80% 30%, rgba(180, 95, 75, 0.06) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 25% 75%, rgba(140, 140, 150, 0.035) 0%, transparent 65%), linear-gradient(180deg, #161619 0%, #0e0e10 100%)'
    }
  },
  {
    id: 'sunday-morning',
    number: '08',
    name: 'Sunday Morning',
    description: 'Warm linen, pale wood, faded sage',
    image: env08,
    ambient: {
      bgColor: '#e6dfd5',
      gradient:
        'radial-gradient(ellipse 65% 55% at 30% 25%, rgba(255, 255, 255, 0.8) 0%, transparent 70%), radial-gradient(ellipse 55% 50% at 75% 70%, rgba(195, 205, 185, 0.35) 0%, transparent 65%), linear-gradient(180deg, #ece6dd 0%, #ded7cc 100%)'
    }
  }
]

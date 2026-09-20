export interface ThemeConfig {
  id: string
  number: string
  name: string
  description: string
  accentColor: string
  accentMuted: string
  surfaceColor: string
  bgColor: string
  borderColor: string
  image: string
  lightingMood: string
}

export const LISTENING_ROOMS: ThemeConfig[] = [
  {
    id: 'quiet-room',
    number: '01',
    name: 'Warm Walnut Studio',
    description: 'Amber lamplight, walnut grain, and late-night warmth.',
    accentColor: '#e08e45',
    accentMuted: 'rgba(224, 142, 69, 0.15)',
    surfaceColor: '#18181b',
    bgColor: '#111113',
    borderColor: 'rgba(224, 142, 69, 0.18)',
    image: '/environments/01_quiet_room.jpg',
    lightingMood: 'Amber & Deep Walnut'
  },
  {
    id: 'dusty-record',
    number: '02',
    name: 'Vintage Amber',
    description: 'Sepia photographs, aged cardboard, and faded gold sleeves.',
    accentColor: '#e5a93c',
    accentMuted: 'rgba(229, 169, 60, 0.15)',
    surfaceColor: '#191816',
    bgColor: '#121110',
    borderColor: 'rgba(229, 169, 60, 0.18)',
    image: '/environments/02_dusty_record.jpg',
    lightingMood: 'Sepia & Faded Gold'
  },
  {
    id: 'jazz-bar',
    number: '03',
    name: 'Indigo Jazz Club',
    description: 'Neon signs, velvet booths, and smoky violet haze.',
    accentColor: '#c084fc',
    accentMuted: 'rgba(192, 132, 252, 0.15)',
    surfaceColor: '#17151e',
    bgColor: '#111015',
    borderColor: 'rgba(192, 132, 252, 0.18)',
    image: '/environments/03_jazz_bar.jpg',
    lightingMood: 'Violet & Midnight Haze'
  },
  {
    id: 'midnight-apartment',
    number: '04',
    name: 'Cold Midnight',
    description: 'Insomnia blue, graphite walls, and distant city glow from a window.',
    accentColor: '#38bdf8',
    accentMuted: 'rgba(56, 189, 248, 0.15)',
    surfaceColor: '#15181e',
    bgColor: '#101216',
    borderColor: 'rgba(56, 189, 248, 0.18)',
    image: '/environments/04_midnight_apartment.jpg',
    lightingMood: 'Insomnia Blue & Graphite'
  },
  {
    id: 'rainy-window',
    number: '05',
    name: 'Petrichor',
    description: 'Rain on glass, slate sky, and warm indoor refuge.',
    accentColor: '#7dd3fc',
    accentMuted: 'rgba(125, 211, 252, 0.15)',
    surfaceColor: '#15191c',
    bgColor: '#101315',
    borderColor: 'rgba(125, 211, 252, 0.18)',
    image: '/environments/05_rainy_window.jpg',
    lightingMood: 'Slate Sky & Raindrops'
  },
  {
    id: 'hifi-library',
    number: '06',
    name: 'Hi-Fi Library',
    description: 'Hunter green walls, mahogany shelves, and polished brass audio components.',
    accentColor: '#34d399',
    accentMuted: 'rgba(52, 211, 153, 0.15)',
    surfaceColor: '#151a17',
    bgColor: '#101412',
    borderColor: 'rgba(52, 211, 153, 0.18)',
    image: '/environments/06_hifi_library.jpg',
    lightingMood: 'Hunter Green & Polished Brass'
  },
  {
    id: 'concrete-vinyl',
    number: '07',
    name: 'Concrete Loft',
    description: 'Raw concrete, warm terracotta, and sunlit industrial windows.',
    accentColor: '#c87056',
    accentMuted: 'rgba(200, 112, 86, 0.15)',
    surfaceColor: '#1a1715',
    bgColor: '#131110',
    borderColor: 'rgba(200, 112, 86, 0.18)',
    image: '/environments/07_concrete_vinyl.jpg',
    lightingMood: 'Raw Concrete & Terracotta'
  },
  {
    id: 'sunday-morning',
    number: '08',
    name: 'Sunday Morning',
    description: 'Linen sheets, warm cream light, and slow morning coffee listening.',
    accentColor: '#d97706',
    accentMuted: 'rgba(217, 119, 6, 0.15)',
    surfaceColor: '#1a1714',
    bgColor: '#13110e',
    borderColor: 'rgba(217, 119, 6, 0.18)',
    image: '/environments/08_sunday_morning.jpg',
    lightingMood: 'Warm Honey & Cream'
  }
]

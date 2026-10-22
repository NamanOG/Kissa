/**
 * Kissa Editions: the deck's finish and the record's pressing, and named setups that
 * bring a finish, a pressing and a room back together.
 *
 * A setup owns only how the player looks: finish, pressing and room. It never changes
 * playback, volume, Discord or Study settings. Everything stays on this PC.
 */
import type { AppTheme, VinylColor } from '@renderer/stores/playerStore'

export type DeckFinish = 'original' | 'porcelain' | 'silver'
export const DECK_FINISHES: DeckFinish[] = ['original', 'porcelain', 'silver']

export interface FinishPalette {
  name: string
  description: string
  /** Plinth top, light to dark along the diagonal (5 stops). */
  top: [string, string, string, string, string]
  /** Front edge, top to bottom (4 stops). */
  front: [string, string, string, string]
  feet: [string, string, string, string]
  /** The recessed well the platter sits in: centre, middle, rim. */
  well: [string, string, string]
  /** Hairline around the top face, and the bright seam where top meets front. */
  rim: string
  seam: [string, string, string]
  /** Engraved control labels (POWER, SPEED) and their pressed-in shadow. */
  engrave: string
  engraveShadow: string
  /** Fine horizontal brushing across the top (brushed metal only). */
  brushed: boolean
  /**
   * Machined detail, only where the material has it: a bright cut chamfer round the top
   * (lit edge, shaded edge), a visible lip where the platter sits in its recess, and the soft
   * band of light that brushed metal reflects across its grain.
   */
  machining?: { chamfer: [string, string]; recess: boolean; reflection: boolean; sheen?: boolean }
  /** Corner radius of the top plate in drawing units (default 18, soft lacquer). */
  radius?: number
  /** The control housings and keys set into the plinth; left out, they stay dark walnut. */
  controls?: { housing: string; keyTop: string; keyBottom: string; bezel: string }
  /** The model nameplate engraved on the front edge. */
  plate: { text: string; shadow: string }
  /** A small sample for the editor. */
  swatch: string
}


export const FINISH_PALETTES: Record<DeckFinish, FinishPalette> = {
  original: {
    name: 'Original',
    description: 'Dark walnut lacquer',
    top: ['#3c332e', '#2a231f', '#1c1715', '#14100f', '#0d0a09'],
    front: ['#382e29', '#251e1b', '#171210', '#0a0807'],
    feet: ['#302824', '#1c1614', '#100c0b', '#060504'],
    well: ['#08080a', '#050506', '#151210'],
    rim: 'rgba(255,255,255,0.08)',
    seam: ['rgba(255,245,225,0.25)', 'rgba(215,167,108,0.2)', 'rgba(255,245,225,0.05)'],
    engrave: '#635548',
    engraveShadow: 'rgba(0,0,0,0.9)',
    brushed: false,
    plate: { text: '#5f5146', shadow: 'rgba(0,0,0,0.85)' },
    swatch: 'linear-gradient(135deg, #3c332e 0%, #1c1715 55%, #0d0a09 100%)'
  },
  porcelain: {
    name: 'Porcelain',
    description: 'Ivory satin lacquer, graphite controls',
    // Lacquer, not plastic: kept below white so it sits in a dim room, almost even across the
    // plate, with one broad soft highlight (sheen) instead of a falling diagonal gradient.
    top: ['#ddd3c1', '#d7ccb9', '#cfc3ae', '#c6b9a3', '#bcae96'],
    front: ['#c4b7a1', '#ab9e88', '#8c806d', '#655b4c'],
    feet: ['#2e2a27', '#221f1d', '#161413', '#0b0a09'],
    well: ['#0b0b0d', '#08080a', '#2a2622'],
    rim: 'rgba(90,70,45,0.25)',
    seam: ['rgba(255,252,245,0.75)', 'rgba(170,150,120,0.35)', 'rgba(255,255,255,0.2)'],
    engrave: '#5a5146',
    engraveShadow: 'rgba(255,255,255,0.5)',
    brushed: false,
    // A moulded, lacquered plate: softer corners than machined metal.
    radius: 14,
    machining: {
      chamfer: ['rgba(255,253,248,0.85)', 'rgba(255,255,255,0.12)'],
      recess: true,
      reflection: false,
      sheen: true
    },
    controls: { housing: '#1f1c19', keyTop: '#3b3631', keyBottom: '#25211d', bezel: 'rgba(255,255,255,0.65)' },
    plate: { text: '#4e463c', shadow: 'rgba(255,255,255,0.45)' },
    swatch: 'linear-gradient(135deg, #ddd3c1 0%, #cfc3ae 55%, #bcae96 100%)'
  },
  silver: {
    name: 'Studio Silver',
    description: 'Brushed aluminium, black anodised controls',
    // Satin aluminium under the room's light: nearly even across the plate, a little darker at
    // the front, and well below white, so it sits in a dim room instead of glowing.
    top: ['#b4b8bc', '#adb1b5', '#a5a9ae', '#9ca0a5', '#92979c'],
    // The front is the same metal turned away from the light: darker, bead-blasted.
    front: ['#8d9196', '#6d7176', '#53575b', '#36393c'],
    feet: ['#1d1e20', '#151618', '#0e0f10', '#060607'],
    well: ['#0a0b0c', '#070808', '#25272a'],
    rim: 'rgba(0,0,0,0.35)',
    seam: ['rgba(255,255,255,0.85)', 'rgba(220,226,232,0.55)', 'rgba(255,255,255,0.25)'],
    engrave: '#3c4045',
    engraveShadow: 'rgba(255,255,255,0.45)',
    brushed: true,
    // Machined plate: tight corners, as cut from a slab, not a moulded tray.
    radius: 7,
    machining: {
      chamfer: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.18)'],
      recess: true,
      reflection: true
    },
    controls: { housing: '#08090a', keyTop: '#2a2c2f', keyBottom: '#141517', bezel: 'rgba(255,255,255,0.75)' },
    plate: { text: '#c9cdd1', shadow: 'rgba(0,0,0,0.6)' },
    swatch: 'linear-gradient(135deg, #b4b8bc 0%, #a5a9ae 55%, #92979c 100%)'
  }
}

export interface Edition {
  id: string
  name: string
  finish: DeckFinish
  pressing: VinylColor
  theme: AppTheme
}

export const EDITIONS_KEY = 'kissa_editions_v1'
export const MAX_EDITIONS = 12
export const MAX_EDITION_NAME = 32

/**
 * Keeps only well-formed setups, so an edited or older preferences file can never break the
 * deck: unknown finishes, pressings or rooms drop the setup, names are trimmed and capped.
 */
export function sanitizeEditions(
  raw: unknown,
  valid: { pressings: readonly string[]; themes: readonly string[] }
): Edition[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Edition[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    const name = typeof e.name === 'string' ? e.name.replace(/\s+/g, ' ').trim().slice(0, MAX_EDITION_NAME) : ''
    const id = typeof e.id === 'string' && e.id.length <= 64 ? e.id : ''
    if (!name || !id || seen.has(id)) continue
    if (!DECK_FINISHES.includes(e.finish as DeckFinish)) continue
    if (!valid.pressings.includes(e.pressing as string)) continue
    if (!valid.themes.includes(e.theme as string)) continue
    seen.add(id)
    out.push({ id, name, finish: e.finish as DeckFinish, pressing: e.pressing as VinylColor, theme: e.theme as AppTheme })
    if (out.length >= MAX_EDITIONS) break
  }
  return out
}

export function newEditionId(): string {
  return `ed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

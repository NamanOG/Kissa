import type { ComponentType } from 'react'
import type { DeckFinish } from '../components/Deck'
import type { AmbientKind, SceneId } from '../data/scenes'

export interface HeroScene {
  art: string
  name: string
  finish: DeckFinish
  ambient: AmbientKind
}

export const ReserveSection: ComponentType | null = null
export const heroScenes: HeroScene[] = []
export const roomArt: Partial<Record<SceneId, string>> = {}

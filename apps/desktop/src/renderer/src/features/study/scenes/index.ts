import type { StudyScene } from './SceneBase'
import { RainScene } from './RainScene'
import { SnowScene } from './SnowScene'
import { ForestScene } from './ForestScene'
import { NightScene } from './NightScene'
// Photographs generated for Kissa with Figma AI (owned by GlyphCode); the weather is drawn on top.
import rainPhoto from '@renderer/media/study/rain.jpg'
import snowPhoto from '@renderer/media/study/snow.jpg'
import forestPhoto from '@renderer/media/study/forest.jpg'
import nightPhoto from '@renderer/media/study/night.jpg'

export type StudyEnvironment = 'rain' | 'snow' | 'forest' | 'night'

export interface EnvironmentInfo {
  id: StudyEnvironment
  label: string
  /** What the scene does as a block runs, said plainly for the picker's tooltip. */
  keepsTime: string
  /** A photograph behind the weather (bundled asset URL). Without one the scene draws its own view. */
  photo?: string
  /** The lamp's colour against this scene. */
  lamp: string
  create: (canvas: HTMLCanvasElement, reducedMotion: boolean) => StudyScene
}

export const ENVIRONMENTS: EnvironmentInfo[] = [
  {
    id: 'rain',
    label: 'Rain',
    keepsTime: 'The glass mists over as you focus; a break wipes it clear.',
    photo: rainPhoto,
    lamp: '255, 176, 96',
    create: (c, r) => new RainScene(c, r)
  },
  {
    id: 'snow',
    label: 'Snow',
    keepsTime: 'Frost gathers at the edges as you focus; a break clears it.',
    photo: snowPhoto,
    lamp: '255, 186, 120',
    create: (c, r) => new SnowScene(c, r)
  },
  {
    id: 'forest',
    label: 'Forest',
    keepsTime: 'Morning light warms towards midday as you focus; a break returns to morning.',
    photo: forestPhoto,
    lamp: '255, 200, 140',
    create: (c, r) => new ForestScene(c, r)
  },
  {
    id: 'night',
    label: 'Night',
    keepsTime: 'The stars come out as you focus; a break leaves only the brightest.',
    photo: nightPhoto,
    lamp: '255, 170, 100',
    create: (c, r) => new NightScene(c, r)
  }
]

export function environmentInfo(id: StudyEnvironment | undefined): EnvironmentInfo {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0]
}

export type { StudyScene }

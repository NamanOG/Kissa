import type { StudyScene } from './SceneBase'
import { RainScene } from './RainScene'
import { SnowScene } from './SnowScene'
import { ForestScene } from './ForestScene'
import { NightScene } from './NightScene'
import { FireplaceScene } from './FireplaceScene'
// Photographs generated for Kissa with Figma AI; Fireplace sharpened with OpenAI ImageGen.
// The weather is drawn on top. See media/study/CREDITS.md for provenance.
import rainPhoto from '@renderer/media/study/rain.jpg'
import snowPhoto from '@renderer/media/study/snow.jpg'
import forestPhoto from '@renderer/media/study/forest.jpg'
import nightPhoto from '@renderer/media/study/night.jpg'
import fireplacePhoto from '@renderer/media/study/fireplace.jpg'
import { tl } from '@renderer/i18n'

export type StudyEnvironment = 'rain' | 'snow' | 'forest' | 'night' | 'fireplace'

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
    get label() {
      return tl('scene.rain')
    },
    get keepsTime() {
      return tl('scene.rain.time')
    },
    photo: rainPhoto,
    lamp: '255, 176, 96',
    create: (c, r) => new RainScene(c, r)
  },
  {
    id: 'snow',
    get label() {
      return tl('scene.snow')
    },
    get keepsTime() {
      return tl('scene.snow.time')
    },
    photo: snowPhoto,
    lamp: '255, 186, 120',
    create: (c, r) => new SnowScene(c, r)
  },
  {
    id: 'forest',
    get label() {
      return tl('scene.forest')
    },
    get keepsTime() {
      return tl('scene.forest.time')
    },
    photo: forestPhoto,
    lamp: '255, 200, 140',
    create: (c, r) => new ForestScene(c, r)
  },
  {
    id: 'night',
    get label() {
      return tl('scene.night')
    },
    get keepsTime() {
      return tl('scene.night.time')
    },
    photo: nightPhoto,
    lamp: '255, 170, 100',
    create: (c, r) => new NightScene(c, r)
  },
  {
    id: 'fireplace',
    get label() {
      return tl('scene.fireplace')
    },
    get keepsTime() {
      return tl('scene.fireplace.time')
    },
    photo: fireplacePhoto,
    lamp: '255, 160, 80',
    create: (c, r) => new FireplaceScene(c, r)
  }
]

export function environmentInfo(id: StudyEnvironment | undefined): EnvironmentInfo {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0]
}

export type { StudyScene }

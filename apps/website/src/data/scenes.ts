export type AmbientKind = 'rain' | 'fireflies' | 'stars' | 'motes' | 'bubbles'
export type SceneId = 'listen' | 'modes' | 'rooms' | 'deck' | 'study' | 'faq' | 'cta'

/** Each room's floor and ceiling colours, so one room hands over to the next without a seam. */
export const SCENE_TONES: Record<SceneId, { floor: string; top: string; ambient: AmbientKind }> = {
  listen: { floor: '#5a5437', top: '#1c1912', ambient: 'motes' },
  modes: { floor: '#2a3c2f', top: '#223429', ambient: 'stars' },
  rooms: { floor: '#361629', top: '#290c1a', ambient: 'rain' },
  deck: { floor: '#374a43', top: '#253a39', ambient: 'fireflies' },
  study: { floor: '#24191c', top: '#101d44', ambient: 'stars' },
  faq: { floor: '#2d3532', top: '#607586', ambient: 'motes' },
  cta: { floor: '#492724', top: '#3c2e33', ambient: 'rain' }
}

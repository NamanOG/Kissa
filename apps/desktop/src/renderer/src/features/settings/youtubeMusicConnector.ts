/**
 * Where people get "Kissa for YouTube Music", the browser add-on Kissa needs for YouTube
 * Music (Windows cannot tell it apart from other browser tabs on its own).
 *
 * Fill these in once each store listing is live. While neither is set, the YouTube Music
 * option stays hidden in public builds, because nobody could complete the setup. A
 * development build can show it anyway with RENDERER_VITE_YTM_CONNECTOR=1.
 */
export interface ConnectorStoreLinks {
  chrome: string | null
  edge: string | null
}

export const CONNECTOR_STORE_LINKS: ConnectorStoreLinks = {
  chrome: null,
  edge: null
}

export function connectorIsAvailable(links: ConnectorStoreLinks, devOverride?: string): boolean {
  if (devOverride === '1') return true
  return [links.chrome, links.edge].some((url) => typeof url === 'string' && url.startsWith('https://'))
}

export const YOUTUBE_MUSIC_AVAILABLE = connectorIsAvailable(
  CONNECTOR_STORE_LINKS,
  import.meta.env.RENDERER_VITE_YTM_CONNECTOR as string | undefined
)

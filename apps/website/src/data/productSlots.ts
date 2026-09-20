export interface ProductSlotConfig {
  filename: string
  title: string
  expectedState: string
  dimensions: string
  aspectRatio: string
}

export const PRODUCT_SLOTS: Record<string, ProductSlotConfig> = {
  'product-main-window.png': {
    filename: 'product-main-window.png',
    title: 'Normal Window Player',
    expectedState: 'Windowed desktop view with revolving vinyl platter, synchronized lyrics, and track metadata.',
    dimensions: '1920 × 1200',
    aspectRatio: '16 / 10'
  },
  'product-fullscreen.png': {
    filename: 'product-fullscreen.png',
    title: 'Fullscreen Listening Room',
    expectedState: 'Fullscreen ambient view with centered illuminated vinyl platter, atmospheric glow, and quiet desk clock.',
    dimensions: '1920 × 1080',
    aspectRatio: '16 / 9'
  },
  'product-fullscreen-lyrics.png': {
    filename: 'product-fullscreen-lyrics.png',
    title: 'Fullscreen with Synchronized Lyrics',
    expectedState: 'Fullscreen lyrics view with real-time typography highlighting the active verse with click-to-seek navigation.',
    dimensions: '1920 × 1080',
    aspectRatio: '16 / 9'
  },
  'product-screensaver.png': {
    filename: 'product-screensaver.png',
    title: 'Windows Screensaver Mode',
    expectedState: 'Ambient screensaver display keeping the record revolving and lyrics moving when the desk goes quiet.',
    dimensions: '1920 × 1080',
    aspectRatio: '16 / 9'
  },
  'product-screensaver-lyrics.png': {
    filename: 'product-screensaver-lyrics.png',
    title: 'Screensaver with Lyrics',
    expectedState: 'Screensaver mode with synchronized lyrics displayed alongside the rotating record.',
    dimensions: '1920 × 1080',
    aspectRatio: '16 / 9'
  },
  'product-record-shelf.png': {
    filename: 'product-record-shelf.png',
    title: 'Record Shelf Crate Browser',
    expectedState: 'Archival collection view: browse listening history as a physical crate of vinyl records with jacket artwork.',
    dimensions: '1920 × 1080',
    aspectRatio: '16 / 9'
  },
  'product-mini-player.png': {
    filename: 'product-mini-player.png',
    title: 'Compact Mini Player',
    expectedState: 'Desktop floating companion with miniature spinning vinyl and instant playback controls.',
    dimensions: '1200 × 900',
    aspectRatio: '4 / 3'
  }
}

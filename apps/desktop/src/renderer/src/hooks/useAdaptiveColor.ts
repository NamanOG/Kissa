import { useEffect, useState } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'

export interface AdaptivePalette {
  accent: string
  panelBg: string
  deckBg: string
  onSurface: string
  muted: string
  baseTemp: string
  ambientPrimary: string
  ambientSecondary: string
  ambientHighlight: string
  spatialPrimaryX: string
  spatialPrimaryY: string
  spatialSecondaryX: string
  spatialSecondaryY: string
  spatialHighlightX: string
  spatialHighlightY: string
}

const colorCache = new Map<string, AdaptivePalette>()

// Helper to convert RGB to HSL for easier manipulation
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}

// Helper to convert HSL back to RGB string
function hslToRgbString(h: number, s: number, l: number, alpha: number = 1): string {
  if (alpha < 1) {
    return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${alpha})`
  }
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`
}

// Distance in 3D RGB space
function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

/**
 * Pure function to extract an AdaptivePalette from an image URL.
 * Safe to call outside of React lifecycle. Returns cached result if available.
 */
export function extractColorsFromImage(artworkUrl: string): Promise<AdaptivePalette> {
  return new Promise((resolve, reject) => {
    if (colorCache.has(artworkUrl)) {
      return resolve(colorCache.get(artworkUrl)!)
    }

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = artworkUrl
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return reject(new Error('Canvas context not available'))

        canvas.width = 64
        canvas.height = 64
        ctx.drawImage(img, 0, 0, 64, 64)

        const imageData = ctx.getImageData(0, 0, 64, 64).data
        
        // Lightweight distance-based clustering
        const clusters: { r: number, g: number, b: number, count: number, weight: number, sumX: number, sumY: number }[] = []
        const DIST_THRESH = 35
        
        let totalLuminance = 0
        let validPixels = 0

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i]
          const g = imageData[i + 1]
          const b = imageData[i + 2]
          const a = imageData[i + 3]
          
          if (a < 128) continue

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const l = (max + min) / 2
          const s = max === 0 ? 0 : (max - min) / max
          
          totalLuminance += l
          validPixels++
          
          if (l < 15 || l > 240) continue
          
          const x = (i / 4) % 64
          const y = Math.floor((i / 4) / 64)

          const chromaWeight = Math.pow(s, 2) * 5.0
          const luminanceWeight = Math.sin((l / 255) * Math.PI) * 1.5
          const pixelSalience = chromaWeight + luminanceWeight

          let found = false
          for (const c of clusters) {
            if (colorDist(c.r, c.g, c.b, r, g, b) < DIST_THRESH) {
              c.r = (c.r * c.count + r) / (c.count + 1)
              c.g = (c.g * c.count + g) / (c.count + 1)
              c.b = (c.b * c.count + b) / (c.count + 1)
              c.sumX += x
              c.sumY += y
              c.count++
              c.weight += pixelSalience
              found = true
              break
            }
          }
          
          if (!found) {
            clusters.push({ r, g, b, count: 1, weight: pixelSalience, sumX: x, sumY: y })
          }
        }

        clusters.sort((a, b) => b.weight - a.weight)
        
        const avgLuminance = validPixels > 0 ? (totalLuminance / validPixels) / 2.55 : 0

        let primary = { h: 0, s: 0, l: 0, x: 50, y: 50 }
        let secondary = { h: 0, s: 0, l: 0, x: 50, y: 50 }
        let highlight = { h: 0, s: 0, l: 0, x: 50, y: 50 }

        if (clusters.length > 0) {
          const pC = clusters[0]
          const [ph, ps, pl] = rgbToHsl(pC.r, pC.g, pC.b)
          const mapPos = (val: number, max: number) => {
            const pct = (val / max) * 100
            return Math.max(0, Math.min(100, pct < 50 ? pct * 0.8 : 50 + (pct - 50) * 1.2))
          }
          primary = { h: ph, s: ps, l: pl, x: mapPos(pC.sumX / pC.count, 64), y: mapPos(pC.sumY / pC.count, 64) }
          
          let foundSec = false
          let foundHi = false
          
          for (let i = 1; i < clusters.length; i++) {
            const [ch, cs, cl] = rgbToHsl(clusters[i].r, clusters[i].g, clusters[i].b)
            
            let hDiff = Math.abs(primary.h - ch)
            if (hDiff > 180) hDiff = 360 - hDiff
            
            if (!foundSec && hDiff > 45 && clusters[i].weight > pC.weight * 0.1) {
              secondary = { h: ch, s: cs, l: cl, x: mapPos(clusters[i].sumX / clusters[i].count, 64), y: mapPos(clusters[i].sumY / clusters[i].count, 64) }
              foundSec = true
              continue
            }
            
            if (!foundHi && cs > 50 && clusters[i].weight > pC.weight * 0.05) {
              highlight = { h: ch, s: cs, l: cl, x: mapPos(clusters[i].sumX / clusters[i].count, 64), y: mapPos(clusters[i].sumY / clusters[i].count, 64) }
              foundHi = true
              continue
            }
          }
          
          if (!foundSec) secondary = { ...primary, h: (primary.h + 30) % 360, x: 100 - primary.x, y: 100 - primary.y }
          if (!foundHi) highlight = { ...secondary, s: Math.min(secondary.s * 1.2, 100), x: 50, y: 50 }
        } else {
          primary = { h: 0, s: 0, l: avgLuminance, x: 50, y: 50 }
          secondary = { h: 0, s: 0, l: avgLuminance, x: 50, y: 50 }
          highlight = { h: 0, s: 0, l: avgLuminance, x: 50, y: 50 }
        }

        const getHueDist = (h1: number, h2: number) => {
          const diff = Math.abs(h1 - h2)
          return Math.min(diff, 360 - diff)
        }
        
        const maxHueSpread = Math.max(getHueDist(primary.h, secondary.h), getHueDist(primary.h, highlight.h), getHueDist(secondary.h, highlight.h))
        const hueVariance = maxHueSpread / 180
        const avgSat = (primary.s + secondary.s + highlight.s) / 300
        const avgLum = (primary.l + secondary.l + highlight.l) / 300
        const richness = Math.min(1, (hueVariance * 0.4) + (avgSat * 0.4) + (avgLum * 0.2))

        const baseIntensity = 0.15
        const intensityRange = 0.27
        const primaryIntensity = baseIntensity + (richness * intensityRange)
        const secondaryIntensity = primaryIntensity * 0.7
        const highlightIntensity = primaryIntensity * 0.5

        const baseL = 3 + (avgLuminance / 100) * 5
        const baseTemp = hslToRgbString(primary.h, Math.min(primary.s, 15), baseL)

        const primaryPool = hslToRgbString(primary.h, Math.min(primary.s, 70), Math.min(primary.l, 50), primaryIntensity)
        const secondaryPool = hslToRgbString(secondary.h, Math.min(secondary.s, 75), Math.min(secondary.l, 55), secondaryIntensity)
        const highlightPool = hslToRgbString(highlight.h, Math.min(highlight.s, 85), Math.min(Math.max(highlight.l, 50), 70), highlightIntensity)

        const mixRgb = (h1: number, s1: number, l1: number, h2: number, s2: number, l2: number, ratio: number) => {
          const hslToRgb = (h: number, s: number, l: number) => {
             s /= 100; l /= 100;
             const k = (n: number) => (n + h / 30) % 12;
             const a = s * Math.min(l, 1 - l);
             const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
             return [255 * f(0), 255 * f(8), 255 * f(4)];
          }
          const [r1, g1, b1] = hslToRgb(h1, s1, l1)
          const [r2, g2, b2] = hslToRgb(h2, s2, l2)
          return [r1 * (1 - ratio) + r2 * ratio, g1 * (1 - ratio) + g2 * ratio, b1 * (1 - ratio) + b2 * ratio]
        }
        
        const [deckR, deckG, deckB] = mixRgb(primary.h, 15, baseL + 1, secondary.h, 15, baseL + 1, 0.3)
        const deckBg = `rgb(${deckR.toFixed(0)}, ${deckG.toFixed(0)}, ${deckB.toFixed(0)})`
        
        const [panelR, panelG, panelB] = mixRgb(primary.h, 15, baseL + 3, secondary.h, 15, baseL + 3, 0.3)
        const panelBg = `rgb(${panelR.toFixed(0)}, ${panelG.toFixed(0)}, ${panelB.toFixed(0)})`
        
        const accent = hslToRgbString(highlight.h, highlight.s, Math.max(highlight.l, 55))
        const onSurface = hslToRgbString(primary.h, 10, 92)
        const muted = hslToRgbString(primary.h, 10, Math.min(65, baseL + 40))

        const newColors: AdaptivePalette = {
          accent,
          panelBg,
          deckBg,
          onSurface,
          muted,
          baseTemp,
          ambientPrimary: primaryPool,
          ambientSecondary: secondaryPool,
          ambientHighlight: highlightPool,
          spatialPrimaryX: `${primary.x.toFixed(1)}%`,
          spatialPrimaryY: `${primary.y.toFixed(1)}%`,
          spatialSecondaryX: `${secondary.x.toFixed(1)}%`,
          spatialSecondaryY: `${secondary.y.toFixed(1)}%`,
          spatialHighlightX: `${highlight.x.toFixed(1)}%`,
          spatialHighlightY: `${highlight.y.toFixed(1)}%`,
        }
        
        colorCache.set(artworkUrl, newColors)
        resolve(newColors)
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = reject
  })
}

export function useAdaptiveColor() {
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const theme = usePlayerStore((s) => s.theme)
  const [colors, setColors] = useState<AdaptivePalette | null>(null)

  useEffect(() => {
    if (theme !== 'adaptive' || !artworkUrl) {
      setColors(null)
      return
    }

    let isMounted = true

    extractColorsFromImage(artworkUrl)
      .then((palette) => {
        if (isMounted) setColors(palette)
      })
      .catch((err) => {
        console.warn('Could not extract color from artwork', err)
      })

    return () => {
      isMounted = false
    }
  }, [artworkUrl, theme])

  useEffect(() => {
    if (theme === 'adaptive' && colors) {
      document.documentElement.style.setProperty('--adaptive-accent', colors.accent)
      document.documentElement.style.setProperty('--adaptive-panel-bg', colors.panelBg)
      document.documentElement.style.setProperty('--adaptive-deck-bg', colors.deckBg)
      document.documentElement.style.setProperty('--adaptive-on-surface', colors.onSurface)
      document.documentElement.style.setProperty('--adaptive-muted', colors.muted)
      document.documentElement.style.setProperty('--adaptive-base-temp', colors.baseTemp)
      document.documentElement.style.setProperty('--adaptive-ambient-primary', colors.ambientPrimary)
      document.documentElement.style.setProperty('--adaptive-ambient-secondary', colors.ambientSecondary)
      document.documentElement.style.setProperty('--adaptive-ambient-highlight', colors.ambientHighlight)
      document.documentElement.style.setProperty('--adaptive-primary-x', colors.spatialPrimaryX)
      document.documentElement.style.setProperty('--adaptive-primary-y', colors.spatialPrimaryY)
      document.documentElement.style.setProperty('--adaptive-secondary-x', colors.spatialSecondaryX)
      document.documentElement.style.setProperty('--adaptive-secondary-y', colors.spatialSecondaryY)
      document.documentElement.style.setProperty('--adaptive-highlight-x', colors.spatialHighlightX)
      document.documentElement.style.setProperty('--adaptive-highlight-y', colors.spatialHighlightY)
    } else {
      document.documentElement.style.removeProperty('--adaptive-accent')
      document.documentElement.style.removeProperty('--adaptive-panel-bg')
      document.documentElement.style.removeProperty('--adaptive-deck-bg')
      document.documentElement.style.removeProperty('--adaptive-on-surface')
      document.documentElement.style.removeProperty('--adaptive-muted')
      document.documentElement.style.removeProperty('--adaptive-base-temp')
      document.documentElement.style.removeProperty('--adaptive-ambient-primary')
      document.documentElement.style.removeProperty('--adaptive-ambient-secondary')
      document.documentElement.style.removeProperty('--adaptive-ambient-highlight')
      document.documentElement.style.removeProperty('--adaptive-primary-x')
      document.documentElement.style.removeProperty('--adaptive-primary-y')
      document.documentElement.style.removeProperty('--adaptive-secondary-x')
      document.documentElement.style.removeProperty('--adaptive-secondary-y')
      document.documentElement.style.removeProperty('--adaptive-highlight-x')
      document.documentElement.style.removeProperty('--adaptive-highlight-y')
    }
  }, [colors, theme])
}

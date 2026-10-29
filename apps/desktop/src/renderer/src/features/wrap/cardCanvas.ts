import type { Translate } from '@renderer/i18n'
import type { TallyEntry } from '@renderer/features/session/tally'
import type { Recap } from './recap'

/**
 * The Pressed card, drawn once on a 1080 x 1920 canvas (a phone story). The same drawing is
 * shown on the last page and saved as the image, so what you see is what you share.
 */

export const CARD_W = 1080
export const CARD_H = 1920

const SERIF = '"Newsreader Variable", Georgia, serif'
const SANS = '"Archivo Variable", "Segoe UI Variable", "Segoe UI", sans-serif'

function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Draws an image to cover a box, cropped from the centre. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / s
  const sh = h / s
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Writes text on up to `lines` lines, shrinking nothing: long words are cut with an ellipsis. */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, lines: number): number {
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= maxW || !line) line = next
    else {
      out.push(line)
      line = w
    }
  }
  if (line) out.push(line)
  const shown = out.slice(0, lines)
  if (out.length > lines) shown[lines - 1] = fit(ctx, `${shown[lines - 1]}…`, maxW)
  shown.forEach((l, i) => ctx.fillText(fit(ctx, l, maxW), x, y + i * lh))
  return shown.length
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

export interface CardText {
  title: string
  brand: string
  stats: [string, string][]
  listTitle: string
  footer: string
}

export function cardText(recap: Recap, title: string, t: Translate, time: string): CardText {
  const n = recap.albumCount
  return {
    title,
    brand: t('pressed.card.brand'),
    stats: [
      [time.split(' ')[0], time.split(' ').slice(1).join(' ')],
      [String(n), t(n === 1 ? 'pressed.unit.record' : 'pressed.unit.records')],
      [String(recap.days), t(recap.days === 1 ? 'pressed.unit.day' : 'pressed.unit.days')]
    ],
    listTitle: t('pressed.records.title'),
    footer: 'kissa.glyphcode.studio'
  }
}

export async function drawPressedCard(
  recap: Recap,
  covers: (e: TallyEntry) => string | undefined,
  text: CardText
): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`500 96px ${SERIF}`), document.fonts.load(`600 32px ${SANS}`)])
  } catch {
    // Falls back to the system fonts.
  }
  const accent = cssVar('--accent', '#e08e45')
  const top = recap.albums.slice(0, 3)
  const imgs = await Promise.all(top.map((a) => loadImage(covers(a))))
  const hero = imgs[0]

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Ground: warm dark, the top cover blurred into it, a lift of the room's accent.
  ctx.fillStyle = '#0d0907'
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  if (hero) {
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.filter = 'blur(90px) saturate(1.25)'
    cover(ctx, hero, -200, -200, CARD_W + 400, CARD_H * 0.75)
    ctx.restore()
  }
  let g = ctx.createRadialGradient(CARD_W * 0.2, 0, 0, CARD_W * 0.2, 0, CARD_W)
  g.addColorStop(0, accent)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.restore()
  g = ctx.createLinearGradient(0, 0, 0, CARD_H)
  g.addColorStop(0, 'rgba(10,7,5,0.15)')
  g.addColorStop(0.45, 'rgba(10,7,5,0.55)')
  g.addColorStop(1, 'rgba(10,7,5,0.96)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const pad = 96
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = accent
  ctx.font = `600 34px ${SANS}`
  ctx.fillText(text.brand, pad, 150)
  ctx.fillStyle = '#f7efe6'
  ctx.font = `500 98px ${SERIF}`
  const titleLines = wrap(ctx, text.title, pad, 262, CARD_W - pad * 2, 104, 2)

  // The record: grooves, a sheen and the cover as its label, on a soft raised plinth.
  const cy = 262 + titleLines * 104 + 300
  const cx = CARD_W / 2
  const R = 270
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.7)'
  ctx.shadowBlur = 80
  ctx.shadowOffsetY = 40
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = '#141211'
  ctx.fill()
  ctx.restore()
  ctx.lineWidth = 1.2
  for (let r = R - 10; r > R * 0.38; r -= 4.5) {
    ctx.strokeStyle = r % 9 < 4.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  const sheen = ctx.createConicGradient(-0.9, cx, cy)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.1, 'rgba(255,255,255,0.08)')
  sheen.addColorStop(0.22, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.6, 'rgba(255,255,255,0.06)')
  sheen.addColorStop(0.72, 'rgba(255,255,255,0)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  const L = R * 0.36
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, L, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#2a201a'
  ctx.fillRect(cx - L, cy - L, L * 2, L * 2)
  if (hero) cover(ctx, hero, cx - L, cy - L, L * 2, L * 2)
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.fillStyle = '#0b0806'
  ctx.fill()

  // Three numbers, each on a soft raised tile.
  const ty = cy + R + 70
  const gap = 24
  const tw = (CARD_W - pad * 2 - gap * 2) / 3
  text.stats.forEach(([n, unit], i) => {
    const x = pad + i * (tw + gap)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 18
    roundRect(ctx, x, ty, tw, 190, 36)
    const tg = ctx.createLinearGradient(x, ty, x + tw, ty + 190)
    tg.addColorStop(0, 'rgba(255,245,235,0.085)')
    tg.addColorStop(1, 'rgba(255,245,235,0.03)')
    ctx.fillStyle = tg
    ctx.fill()
    ctx.restore()
    roundRect(ctx, x + 0.5, ty + 0.5, tw - 1, 189, 36)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#f7efe6'
    ctx.font = `500 84px ${SERIF}`
    ctx.fillText(fit(ctx, n, tw - 56), x + 32, ty + 110)
    ctx.fillStyle = 'rgba(247,239,230,0.6)'
    ctx.font = `500 28px ${SANS}`
    ctx.fillText(fit(ctx, unit, tw - 56), x + 32, ty + 155)
  })

  // The top three records.
  let ly = ty + 190 + 80
  ctx.fillStyle = 'rgba(247,239,230,0.85)'
  ctx.font = `600 30px ${SANS}`
  ctx.fillText(text.listTitle, pad, ly)
  ly += 34
  top.forEach((a, i) => {
    const y = ly + i * 120
    const img = imgs[i]
    ctx.save()
    roundRect(ctx, pad, y, 104, 104, 12)
    ctx.clip()
    ctx.fillStyle = '#2a201a'
    ctx.fillRect(pad, y, 104, 104)
    if (img) cover(ctx, img, pad, y, 104, 104)
    ctx.restore()
    ctx.fillStyle = accent
    ctx.font = `600 30px ${SANS}`
    ctx.fillText(String(i + 1), pad + 136, y + 46)
    ctx.fillStyle = '#f7efe6'
    ctx.font = `600 34px ${SANS}`
    ctx.fillText(fit(ctx, a.a, CARD_W - pad * 2 - 190), pad + 180, y + 46)
    ctx.fillStyle = 'rgba(247,239,230,0.58)'
    ctx.font = `400 28px ${SANS}`
    ctx.fillText(fit(ctx, a.b ?? '', CARD_W - pad * 2 - 190), pad + 180, y + 86)
  })

  ctx.fillStyle = 'rgba(247,239,230,0.4)'
  ctx.font = `500 26px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(text.footer, CARD_W / 2, CARD_H - 80)
  return canvas
}

/** True when the canvas can be read back (covers from the web can block it). */
export function canExport(canvas: HTMLCanvasElement): boolean {
  try {
    canvas.getContext('2d')?.getImageData(0, 0, 1, 1)
    return true
  } catch {
    return false
  }
}

export interface LyricToken {
  text: string
  startTime: number
  endTime: number
  isWhitespace?: boolean
}

export interface LyricLine {
  id: string
  time: number
  text: string
  tokens?: LyricToken[]
  endTime?: number
  timingType?: 'estimated' | 'real'
}

/** Enhanced LRC word tag: <mm:ss.xx> before each word. */
const WORD_TAG = /<(\d{1,2}):(\d{1,2}(?:\.\d+)?)>/g
/** Word fill runs this far ahead of the clock, so a word lights as it is heard, not after. */
export const WORD_LEAD_SECONDS = 0.15

/**
 * Tokens from an enhanced LRC body ("<00:12.10>Hello <00:12.60>world"). Each tag starts the
 * text after it; a word ends where the next tag starts, the last at `lineEnd`. Returns null
 * when the body has no word tags.
 */
export function parseWordTags(body: string, offsetSeconds: number, lineEnd: number): { text: string; tokens: LyricToken[] } | null {
  const tags = Array.from(body.matchAll(WORD_TAG))
  if (tags.length === 0) return null
  const marks = tags.map((m) => ({
    index: m.index ?? 0,
    length: m[0].length,
    time: Math.max(0, Number(m[1]) * 60 + Number(m[2]) + offsetSeconds)
  }))
  const tokens: LyricToken[] = []
  const lead = body.slice(0, marks[0].index)
  if (lead.trim()) tokens.push({ text: lead, startTime: marks[0].time, endTime: marks[0].time })
  for (let i = 0; i < marks.length; i++) {
    const from = marks[i].index + marks[i].length
    const to = i + 1 < marks.length ? marks[i + 1].index : body.length
    const chunk = body.slice(from, to)
    if (!chunk) continue
    const startTime = marks[i].time
    const endTime = Math.max(startTime, i + 1 < marks.length ? marks[i + 1].time : lineEnd)
    // A chunk may carry its trailing space ("Hello "): split it off as its own token.
    for (const piece of chunk.match(/(\S+|\s+)/g) || []) {
      const space = !piece.trim()
      tokens.push({ text: piece, startTime: space ? endTime : startTime, endTime, isWhitespace: space })
    }
  }
  const text = tokens.map((t) => t.text).join('').replace(/\s+/g, ' ').trim()
  return text ? { text, tokens } : null
}

export function parseLrc(source: string, userOffsetSeconds: number = 0): LyricLine[] {
  const lines: Array<LyricLine & { body: string }> = []
  const timestampRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g
  // The file's own [offset:+/-ms] tag (LRC convention: positive shows the words earlier), plus the
  // listener's manual nudge.
  const tag = /^\s*\[offset:\s*([+-]?\d+)\s*\]/im.exec(source)
  const offsetSeconds = userOffsetSeconds - (tag ? Number(tag[1]) / 1000 : 0)

  for (const rawRow of source.split('\n')) {
    const row = rawRow.trim()
    if (!row) continue
    const body = row.replace(timestampRegex, '').trim()
    const text = body.replace(WORD_TAG, '').replace(/\s+/g, ' ').trim()
    if (!text) continue

    const matches = Array.from(row.matchAll(timestampRegex))
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const mins = Number(match[1])
      const secs = Number(match[2])
      // Calibrated offset (neutral by default, adjusted via user preference)
      const time = Math.max(0, mins * 60 + secs + offsetSeconds)
      lines.push({
        id: `${time}-${i}-${text.slice(0, 8)}`,
        time,
        text,
        body,
        timingType: 'estimated'
      })
    }
  }

  lines.sort((a, b) => a.time - b.time)

  const out: LyricLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const { body, ...line } = lines[i]
    const nextLine = lines[i + 1]

    let lineDuration = nextLine ? nextLine.time - line.time : 6
    if (lineDuration > 8) lineDuration = 8
    line.endTime = line.time + lineDuration

    const tagged = parseWordTags(body, offsetSeconds, line.endTime)
    if (tagged) {
      line.text = tagged.text
      line.tokens = tagged.tokens
      line.timingType = 'real'
    }
    // Without real word timing (plain LRC: one timestamp per line, as LRCLIB has) there are no
    // word tokens: the whole line lights at its timestamp. Estimated word timings ran ahead of
    // the singing and made correctly timed lines look wrong.
    out.push(line)
  }

  return out
}

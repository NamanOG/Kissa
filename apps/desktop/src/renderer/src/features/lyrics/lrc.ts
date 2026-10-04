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

export function parseLrc(source: string, offsetSeconds: number = 0): LyricLine[] {
  const lines: LyricLine[] = []
  const timestampRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g

  for (const rawRow of source.split('\n')) {
    const row = rawRow.trim()
    if (!row) continue
    const text = row.replace(timestampRegex, '').trim()
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
        timingType: 'estimated'
      })
    }
  }

  lines.sort((a, b) => a.time - b.time)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    let lineDuration = nextLine ? nextLine.time - line.time : 6
    if (lineDuration > 8) lineDuration = 8

    line.endTime = line.time + lineDuration

    const wordsAndSpaces = line.text.match(/(\S+|\s+)/g) || []

    let totalWeight = 0
    wordsAndSpaces.forEach(w => {
      totalWeight += Math.max(1, w.trim().length)
    })

    const tokens: LyricToken[] = []
    let currentTokenTime = line.time

    for (const w of wordsAndSpaces) {
      const isWhitespace = !w.trim()
      const weight = Math.max(1, w.trim().length)
      const tokenDuration = (weight / totalWeight) * lineDuration

      tokens.push({
        text: w,
        startTime: currentTokenTime,
        endTime: currentTokenTime + tokenDuration,
        isWhitespace
      })
      currentTokenTime += tokenDuration
    }

    line.tokens = tokens
  }

  return lines
}

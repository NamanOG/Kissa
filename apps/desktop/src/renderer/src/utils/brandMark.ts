/**
 * The small Kissa mark (the app icon's small-size version), exported by build/generate_store_assets.py
 * at each device-pixel size the sidebar needs, so it is never rescaled. Use with `sizes` set to the
 * CSS size it is shown at (26 or 30 px); the browser picks the file for the display's density.
 */
import m26 from '@renderer/assets/brand/kissa-mark-26.png'
import m30 from '@renderer/assets/brand/kissa-mark-30.png'
import m33 from '@renderer/assets/brand/kissa-mark-33.png'
import m38 from '@renderer/assets/brand/kissa-mark-38.png'
import m39 from '@renderer/assets/brand/kissa-mark-39.png'
import m45 from '@renderer/assets/brand/kissa-mark-45.png'
import m52 from '@renderer/assets/brand/kissa-mark-52.png'
import m60 from '@renderer/assets/brand/kissa-mark-60.png'
import m78 from '@renderer/assets/brand/kissa-mark-78.png'
import m90 from '@renderer/assets/brand/kissa-mark-90.png'

const MARKS: Array<[string, number]> = [
  [m26, 26], [m30, 30], [m33, 33], [m38, 38], [m39, 39], [m45, 45], [m52, 52], [m60, 60], [m78, 78], [m90, 90]
]

export const brandMarkSrc = m30
export const brandMarkSrcSet = MARKS.map(([url, px]) => `${url} ${px}w`).join(', ')

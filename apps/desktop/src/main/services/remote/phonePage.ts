import html from './phone/index.html?raw'
import js from './phone/app.js?raw'
import css from './phone/app.css?raw'
import icon from './phone/icon.svg?raw'
import manifest from './phone/manifest.webmanifest?raw'
import icon180 from './phone/icon-180.png.b64?raw'
import icon192 from './phone/icon-192.png.b64?raw'
import icon512 from './phone/icon-512.png.b64?raw'

/** The phone page, served as fixed files (see PhoneRemoteService). */
export const PHONE_PAGE_HTML: string = html
export const PHONE_PAGE_JS: string = js
export const PHONE_PAGE_CSS: string = css
export const PHONE_PAGE_ICON: string = icon
export const PHONE_MANIFEST: string = manifest
/** Generated from resources/icon.png; embedded so packaged builds need no loose asset paths. */
export const PHONE_ICONS: Record<string, Buffer> = {
  '/icon-180.png': Buffer.from(icon180, 'base64'),
  '/icon-192.png': Buffer.from(icon192, 'base64'),
  '/icon-512.png': Buffer.from(icon512, 'base64')
}

/**
 * The app's own typefaces, so the phone page reads like Kissa. They are the same files the
 * window uses, from the font packages Kissa ships with.
 */
export const PHONE_FONT_FILES: Record<string, string> = {
  'sans.woff2': '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
  'serif.woff2': '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2'
}

/**
 * Global type declarations for the website.
 *
 * CSS modules - tells TypeScript that importing *.module.css
 * returns a record of class name strings.
 */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

/**
 * Side-effect CSS imports - used in main.tsx for global styles.
 */
declare module '*.css' {
  const styles: undefined
  export default styles
}

/**
 * Image asset imports - Vite resolves these to URLs.
 */
declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}


/**
 * The parts of Vite's import.meta.env this site uses.
 */
interface ImportMetaEnv {
  /** The base path the site is served from, e.g. "/" or "/Kissa/". */
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

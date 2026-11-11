/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_DISCORD_APPLICATION_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Inline assets under 4kb, externalize larger ones
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Stable chunk naming for long-term caching
        manualChunks: undefined
      }
    }
  },
  // Development server
  server: {
    port: 5174,
    open: false,
    watch: {
      // Ignore large/locked media files in public/product (e.g. mp4 being played)
      ignored: ['**/public/product/**']
    }
  }
})

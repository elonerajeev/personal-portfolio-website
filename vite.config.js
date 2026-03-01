import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['mixed-decls'],
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'bootstrap': ['bootstrap', 'react-bootstrap'],
          'scroll-lib': ['smooth-scrollbar'],
          'swiper-lib': ['swiper']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})

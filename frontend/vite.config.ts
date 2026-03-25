import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Metrik Delta',
        short_name: 'Metrik Delta',
        description: 'Real-time F1 analytics & Live Timing',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Ne cacher que HTML, CSS, images, fonts — PAS les JS chunks
        globPatterns: ['**/*.{html,css,ico,png,svg,woff2}'],
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'chart-vendor': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser'
  },
  server: {
    port: 5173
  }
})
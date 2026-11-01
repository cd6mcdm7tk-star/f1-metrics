import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sitemap, withHead, withPreloads } from './src/seo/html'
import { NOT_FOUND, sitePages, type PageSeo } from './src/seo/pages'

/** Each page's head written into its own HTML file, a 404 page and the
 * sitemap: crawlers and link previews that don't run JavaScript read them */
function seoPages(): Plugin {
  let outDir = 'dist'
  // Fetched with the main script instead of after it: the body font on every
  // page, and the home page's own scripts (its route is loaded lazily)
  let font: string[] = []
  let home: string[] = []
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    generateBundle(_, bundle) {
      const files = Object.values(bundle)
      font = files.filter(f => f.type === 'asset' && /rajdhani-latin-400-normal-[^/]+\.woff2$/.test(f.fileName)).map(f => f.fileName)
      const landing = files.find(f => f.type === 'chunk' && f.facadeModuleId?.endsWith('/pages/LandingPage.tsx'))
      home = landing?.type === 'chunk' ? [landing.fileName, ...landing.imports] : []
    },
    closeBundle() {
      const shell = readFileSync(resolve(outDir, 'index.html'), 'utf8')
      const pages = sitePages(new Date().getFullYear())
      const files: [string, PageSeo][] = [
        ['index.html', pages.home],
        ['app/index.html', pages.telemetry],
        ['stats/index.html', pages.statistics],
        ['methodology/index.html', pages.methodology],
        ['legal/index.html', pages.legal],
        ['404.html', NOT_FOUND],
      ]
      for (const [file, page] of files) {
        const path = resolve(outDir, file)
        mkdirSync(dirname(path), { recursive: true })
        // Scripts the shell already loads aren't preloaded twice
        const early = [...font, ...(file === 'index.html' ? home : [])].filter(f => !shell.includes(f))
        writeFileSync(path, withPreloads(withHead(shell, page), early))
      }
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap(Object.values(pages), new Date().toISOString().slice(0, 10)))
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    seoPages(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer', // don't block first render on the SW registration script
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Metrik Delta',
        short_name: 'Metrik Delta',
        description: 'F1 telemetry comparison and driver statistics',
        theme_color: '#5e1018',
        background_color: '#5e1018',
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
        globPatterns: ['**/*.{css,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
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
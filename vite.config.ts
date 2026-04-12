import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallbackAllowlist: [/^index.html$/]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,wav,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'auris-assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /.*\.(?:wav|mp3|flac)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'auris-audio-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          }
        ]
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
      manifest: {
        id: '/',
        name: 'Auris Audio',
        short_name: 'Auris',
        description: 'Immersive Spatial Audio and Room Simulation',
        theme_color: '#090B10',
        background_color: '#090B10',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        start_url: '/',
        orientation: 'portrait',
        categories: ['music', 'productivity', 'utilities'],
        dir: 'ltr',
        prefer_related_applications: false,
        launch_handler: {
          client_mode: ['navigate-existing', 'auto']
        },
        shortcuts: [
          {
            name: 'Start Experience',
            short_name: 'Start',
            description: 'Jump straight into the spatial audio engine',
            url: '/?start=true',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-mobile.png',
            sizes: '540x1170',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Auris Mobile Dashboard'
          },
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Auris Desktop Dashboard'
          }
        ]
      }
    }),
    react(), 
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['react-native-fs', 'fs', 'buffer']
    }
  },
  assetsInclude: ['**/*.wav', '**/*.mp3', '**/*.flac'],
})

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
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'Auris Audio',
        short_name: 'Auris',
        description: 'Immersive Spatial Audio and Room Simulation',
        theme_color: '#090B10',
        background_color: '#090B10',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
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

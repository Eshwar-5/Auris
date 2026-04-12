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
        name: 'Auris Audio',
        short_name: 'Auris',
        description: 'Immersive Spatial Audio and Room Simulation',
        theme_color: '#090B10',
        background_color: '#090B10',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'pwa-512x512.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'pwa-512x512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
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

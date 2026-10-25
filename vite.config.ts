import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The actual repository is moganthev/lottogeneration (lowercase).
const base = process.env.VITE_BASE_PATH ?? '/lottogeneration/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'LottoGeneration',
        short_name: 'LottoGen',
        description: '번호 분포를 살펴보고 균형 잡힌 5게임을 골라보세요.',
        lang: 'ko',
        theme_color: '#983e2c',
        background_color: '#f6f2e8',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['refresh-view.js'],
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});

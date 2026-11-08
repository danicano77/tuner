import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages publica el lloc a https://<usuari>.github.io/<repo>/.
// Quan compila GitHub Actions, GITHUB_REPOSITORY conté "usuari/repo".
// En local (o en un domini propi) la base és l'arrel.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isUserSite = repoName.toLowerCase().endsWith('.github.io');
const base =
  process.env.GITHUB_ACTIONS === 'true' && repoName && !isUserSite ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Afinador Cromàtic',
        short_name: 'Afinador',
        description: 'Afinador cromàtic amb micròfon. Funciona offline.',
        lang: 'ca',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        orientation: 'any',
        categories: ['music', 'utilities'],
        // start_url i scope els calcula vite-plugin-pwa a partir de `base`.
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'Viralata - Adoção Responsável',
          short_name: 'Viralata',
          description: 'Plataforma de adoção responsável de pets.',
          theme_color: '#f97316',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            const normalizedId = id.replace(/\\/g, '/');
            // Libs do card de compartilhamento (flag share_cards): isoladas em um
            // chunk próprio para só carregarem sob demanda ao abrir o card.
            if (
              normalizedId.includes('/html-to-image/')
              || normalizedId.includes('/qrcode/')
              || normalizedId.includes('/dijkstrajs/')
              || normalizedId.includes('/encode-utf8/')
              || normalizedId.includes('/pngjs/')
            ) return 'vendor-sharing';
            if (normalizedId.includes('@firebase/firestore') || normalizedId.includes('/firebase/firestore')) return 'vendor-firebase-firestore';
            if (normalizedId.includes('@firebase/auth') || normalizedId.includes('/firebase/auth')) return 'vendor-firebase-auth';
            if (normalizedId.includes('@firebase/functions') || normalizedId.includes('/firebase/functions')) return 'vendor-firebase-functions';
            if (normalizedId.includes('@firebase') || normalizedId.includes('/firebase/')) return 'vendor-firebase-core';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@core': path.resolve(__dirname, './src/core'),
        '@modules': path.resolve(__dirname, './src/modules'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    },
  };
});
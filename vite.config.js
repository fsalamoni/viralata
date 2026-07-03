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
          // Padrões separados — evita o glob composto que causa warning/erro no Workbox
          globPatterns: [
            '**/*.js',
            '**/*.css',
            '**/*.html',
            '**/*.ico',
            '**/*.png',
            '**/*.svg',
            '**/*.webp',
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            const n = id.replace(/\\/g, '/');
            // Libs de geração de imagem/compartilhamento — carregadas sob demanda
            if (
              n.includes('/html-to-image/') ||
              n.includes('/jspdf/') ||
              n.includes('/qrcode/') ||
              n.includes('/dijkstrajs/') ||
              n.includes('/encode-utf8/') ||
              n.includes('/pngjs/')
            ) return 'vendor-sharing';
            // SheetJS — só é importado dinamicamente na importação/exportação de
            // planilhas de animais (aba Animais do painel de organização), nunca
            // no carregamento inicial.
            if (n.includes('/xlsx/')) return 'vendor-spreadsheet';
            // Firebase — dividido por serviço para melhor cache
            if (n.includes('@firebase/firestore') || n.includes('/firebase/firestore')) return 'vendor-firebase-firestore';
            if (n.includes('@firebase/auth')      || n.includes('/firebase/auth'))      return 'vendor-firebase-auth';
            if (n.includes('@firebase/storage')   || n.includes('/firebase/storage'))   return 'vendor-firebase-storage';
            if (n.includes('@firebase/functions') || n.includes('/firebase/functions')) return 'vendor-firebase-functions';
            if (n.includes('@firebase')           || n.includes('/firebase/'))          return 'vendor-firebase-core';
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

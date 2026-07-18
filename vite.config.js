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
        injectRegister: 'auto',
        // skipWaiting + clientsClaim: novo Service Worker assume controle
        // IMEDIATAMENTE ao ser instalado (em vez de esperar todas as abas
        // fecharem). Resolve o problema clássico de "deploy novo mas o
        // usuário ainda vê o bundle velho cacheado pelo SW antigo".
        skipWaiting: true,
        clientsClaim: true,
        // Bumping filename invalida o SW antigo forçadamente — usuário
        // recebe o novo na próxima visita. Solução para o problema
        // 'user reportou versão antiga mesmo após deploy' (2026-07-16).
        //
        // v7 → v8 (2026-07-17): segundo hotfix porque o user ainda vê
        // 'getQueryCache().get is not a function' mesmo com sw-v7.
        // Causa: o SW custom `public/sw.js` (v5) tem cache v5 imutável
        // + ainda assume controle via skipWaiting. sw-v8 + update no
        // public/sw.js (v6) garante que:
        //  - qualquer cache 'viralata-v*' é deletado no activate
        //  - o SW custom v5 deixa de controlar e dá lugar ao workbox
        //    atualizado que delega para a network.
        filename: 'sw-v39.js',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'scrum.html'],
        manifest: {
          name: 'Viralata - Adoção Responsável',
          short_name: 'Viralata',
          description: 'Plataforma de adoção responsável de pets.',
          theme_color: '#c1522a',  // DS primary — synced with public/manifest.webmanifest
          background_color: '#fdf6ec',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // CleanupOutdatedCaches: limpa caches de SWs antigos ao ativar.
          // Combina com skipWaiting:true para forçar o SW novo imediatamente.
          cleanupOutdatedCaches: true,
          // Padrões separados — evita o glob composto que causa warning/erro no Workbox.
          // `.ico`/`.webp` ficaram de fora de propósito: o projeto não gera nenhum
          // arquivo desses tipos (ícone é `favicon.svg`) — mantê-los no padrão só
          // produz o aviso "glob pattern doesn't match any files" no build.
          globPatterns: [
            '**/*.js',
            '**/*.css',
            '**/*.html',
            '**/*.png',
            '**/*.svg',
          ],
          // navigateFallbackDenylist: rotas de API/SW continuam via Firebase
          // Hosting, não caem no fallback do Workbox.
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/sw\.js$/,
            /^\/scrum/, // Painel scrum (servido direto do Firebase Hosting, não pelo SW)
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
      setupFiles: ['./vitest.setup.js'],
      include: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'tests/security/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      exclude: [
        '**/node_modules/**',
        '**/.git/**',
        'tests/e2e/**',
        'functions/**',
      ],
    },
  };
});

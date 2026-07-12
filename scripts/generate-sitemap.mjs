#!/usr/bin/env node
/**
 * Gera public/sitemap.xml com as rotas públicas estáticas (TASK-183).
 *
 * Roda automaticamente no `prebuild`. Rotas dinâmicas (/pet/:id etc.)
 * ficam de fora — exigiriam acesso ao Firestore em build-time; quando
 * o Smart Search (Fase 18) entrar, um cron no server pode gerar o
 * sitemap completo e publicar no Hosting.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.SITEMAP_BASE_URL || 'https://viralata.app';

const PUBLIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/feed', priority: '0.9', changefreq: 'hourly' },
  { path: '/organizacoes', priority: '0.8', changefreq: 'daily' },
  { path: '/comunidades', priority: '0.7', changefreq: 'daily' },
  { path: '/voluntarios', priority: '0.7', changefreq: 'weekly' },
  { path: '/voluntarios/termo', priority: '0.4', changefreq: 'monthly' },
  { path: '/politica-privacidade', priority: '0.3', changefreq: 'monthly' },
  { path: '/termos', priority: '0.3', changefreq: 'monthly' },
  { path: '/legislacao', priority: '0.3', changefreq: 'monthly' },
  // Páginas legais integrais (/legal/:slug) — manter em sync com
  // src/modules/shelter/domain/legal/index.js (LEGAL_PAGES).
  ...[
    'termos-de-uso', 'politica-de-privacidade', 'avisos-legais',
    'codigo-de-conduta', 'termo-de-adocao', 'politica-de-doacoes',
    'cookies', 'legislacao-animal', 'termo-voluntariado',
    'termo-lar-temporario', 'termo-adesao-abrigos',
  ].map((slug) => ({ path: `/legal/${slug}`, priority: '0.3', changefreq: 'monthly' })),
];

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map((r) => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sitemap.xml');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, xml);
console.log(`✓ sitemap.xml gerado com ${PUBLIC_ROUTES.length} rotas em ${out}`);

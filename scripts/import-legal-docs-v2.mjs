#!/usr/bin/env node
/**
 * Converte os 13 documentos legais v2 (.md) extraídos do
 * `Viralata_Documentos_Legais_Completos_v2.zip` em arquivos
 * JS (template string) no formato usado pelo módulo
 * `src/modules/shelter/domain/legal/texts/`.
 *
 * Cada arquivo gerado exporta `<NOME>_VERSION` e `<NOME>_TEXT`.
 *
 * Mapeamento .md → .js:
 *   01_Termos_de_Uso.md              → termosDeUso.v2.js
 *   02_Politica_de_Privacidade.md    → politicaDePrivacidade.v2.js
 *   03_Avisos_Legais.md              → avisosLegais.v2.js
 *   04_Codigo_Conduta.md             → codigoDeConduta.v2.js
 *   06_Politica_Doacoes.md           → doacoes.v1.js (NOVO)
 *   08_Termos_Voluntariado_LT.md     → voluntariado.v3.js (substitui)
 *   09_Cookies_e_Legislacao.md       → cookies.v2.js (substitui)
 *   10_Guia_Legislacao_Animal.md     → legislacaoAnimal.v2.js
 *   11_Termo_Lar_Temporario.md       → larTemporario.v1.js (NOVO)
 *   12_Termo_Adesao_Abrigos_ONG.md   → adesaoAbrigosOng.v1.js (NOVO)
 *
 * O script é destrutivo no destino: sobrescreve. Não toca nos
 * arquivos existentes que já tenham sido editados manualmente
 * (ex: shelterOnboardingTerms.v1.js, adoptionTerms.v1.js,
 * volunteerTerms.v2.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', '.tmp-legal-docs');
const DST_DIR = path.join(__dirname, '..', 'src', 'modules', 'shelter', 'domain', 'legal', 'texts');

const VERSION = '2026-07-10';
const HEADER = `/**
 * @fileoverview Texto integral — [TITLE] (Documento v2).
 *
 * Texto exibido em /legal/[SLUG]. Gerado a partir do arquivo
 * '[SRC_FILE]' do pacote
 * \`Viralata_Documentos_Legais_Completos_v2.zip\`
 * (10/07/2026) e convertido em template string pelo script
 * \`scripts/import-legal-docs-v2.mjs\`.
 *
 * IMPORTANTE: este texto é a base operacional da plataforma.
 * A versão definitiva deve passar por revisão jurídica humana
 * (vide SCRUM_TASKS.json — TASK-006/007/008). O texto v2 é
 * o que vai para produção hoje; correções jurídicas serão
 * aplicadas em v3 com changelog.
 *
 * Marco legal: Marco Civil da Internet (Lei 12.965/2014), LGPD
 * (Lei 13.709/2018), Lei 14.063/2020 (assinatura eletrônica),
 * Decreto 24.645/34, Lei 9.605/98 (crimes ambientais), Lei
 * 14.064/2020 (Lei Sansão), Resolução CFMV 1.236/2018 e
 * 1.465/2022, ANPD Resolução CD/ANPD 15/2024 e 32/2026.
 */
`;

const MAPPING = [
  {
    src: '01_Termos_de_Uso.md',
    dst: 'termosDeUso.v2.js',
    constName: 'TERMS_OF_USE',
    slug: 'termos-de-uso',
    title: 'Termos de Uso da Plataforma Viralata',
  },
  {
    src: '02_Politica_de_Privacidade.md',
    dst: 'politicaDePrivacidade.v2.js',
    constName: 'PRIVACY_POLICY',
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade e Proteção de Dados (LGPD)',
  },
  {
    src: '03_Avisos_Legais.md',
    dst: 'avisosLegais.v2.js',
    constName: 'LEGAL_NOTICES',
    slug: 'avisos-legais',
    title: 'Avisos Legais e Isenção de Responsabilidade',
  },
  {
    src: '04_Codigo_Conduta.md',
    dst: 'codigoDeConduta.v2.js',
    constName: 'CODE_OF_CONDUCT',
    slug: 'codigo-de-conduta',
    title: 'Código de Conduta e Política de Denúncias',
  },
  {
    src: '06_Politica_Doacoes.md',
    dst: 'doacoes.v1.js',
    constName: 'DONATION_POLICY',
    slug: 'politica-doacoes',
    title: 'Política de Doações Financeiras (Crowdfunding Social)',
  },
  {
    src: '08_Termos_Voluntariado_LT.md',
    dst: 'voluntariado.v3.js',
    constName: 'VOLUNTEER_AND_FOSTER',
    slug: 'termos-voluntariado-lar-temporario',
    title: 'Termo de Adesão ao Trabalho Voluntário e Lar Temporário',
  },
  {
    src: '09_Cookies_e_Legislacao.md',
    dst: 'cookies.v2.js',
    constName: 'COOKIE_POLICY',
    slug: 'cookies',
    title: 'Política de Cookies',
  },
  {
    src: '10_Guia_Legislacao_Animal.md',
    dst: 'legislacaoAnimal.v2.js',
    constName: 'ANIMAL_LEGISLATION',
    slug: 'legislacao-animal',
    title: 'Guia de Legislação e Bem-Estar Animal',
  },
  {
    src: '11_Termo_Lar_Temporario.md',
    dst: 'larTemporario.v1.js',
    constName: 'FOSTER_TERMS',
    slug: 'termo-lar-temporario',
    title: 'Termo de Responsabilidade de Lar Temporário (LT)',
  },
  {
    src: '12_Termo_Adesao_Abrigos_ONG.md',
    dst: 'adesaoAbrigosOng.v1.js',
    constName: 'SHELTER_ADHESION',
    slug: 'termo-adesao-abrigos-ong',
    title: 'Termo de Adesão para Abrigos e ONGs (inclui DPA)',
  },
];

/**
 * Escapa o conteúdo markdown para virar uma template string JS.
 * - Backticks → \`
 * - ${ → \${
 * - CRLF → \n
 * - Trim trailing whitespace por linha
 */
function escapeForTemplateLiteral(md) {
  return md
    .replace(/\\/g, '\\\\')   // escape backslash primeiro
    .replace(/`/g, '\\`')     // backtick
    .replace(/\$\{/g, '\\${') // template expression
    .replace(/\r\n/g, '\n')   // CRLF
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '\n');   // remove trailing newlines extras
}

function buildFile(mapping) {
  const srcPath = path.join(SRC_DIR, mapping.src);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file not found: ${srcPath}`);
  }
  const md = fs.readFileSync(srcPath, 'utf8');
  const escaped = escapeForTemplateLiteral(md);
  const header = HEADER
    .replace('[TITLE]', mapping.title)
    .replace('[SLUG]', mapping.slug)
    .replace('[SRC_FILE]', mapping.src);

  return `${header}

export const ${mapping.constName}_VERSION = '${VERSION}';

export const ${mapping.constName}_TEXT = \`${escaped}\`;
`;
}

function main() {
  if (!fs.existsSync(DST_DIR)) {
    fs.mkdirSync(DST_DIR, { recursive: true });
  }
  let count = 0;
  for (const m of MAPPING) {
    const out = buildFile(m);
    const outPath = path.join(DST_DIR, m.dst);
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`  wrote ${m.dst} (${out.length} bytes)`);
    count += 1;
  }
  console.log(`OK · ${count} files written to ${DST_DIR}`);
}

main();

#!/usr/bin/env node
/**
 * Gera docs/FEATURE_FLAGS.md a partir do código (TASK-947).
 *
 * Fonte: src/core/featureFlags.js + src/modules/shelter/domain/constants.js
 * (extração compartilhada com scripts/audit-feature-flags.cjs).
 *
 * Uso: node scripts/generate-feature-flags-doc.cjs   (depois: node scripts/audit-feature-flags.cjs)
 */
const fs = require('fs');
const path = require('path');
const { extractFlags, findReferences } = require('./audit-feature-flags.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/FEATURE_FLAGS.md');
const today = new Date().toISOString().slice(0, 10);

// Flags do spread SHELTER_* sem override explícito têm defaultValue undefined → OFF.
const flags = extractFlags()
  .map((f) => ({ ...f, on: f.defaultValue === true, refs: findReferences(f.key).length }))
  .sort((a, b) => a.name.localeCompare(b.name));

const on = flags.filter((f) => f.on);
const off = flags.filter((f) => !f.on);

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const row = (f) => `| \`${f.name}\` | \`${f.key}\` | ${f.on ? '**ON**' : 'OFF'} | ${cell(f.label) || '—'} | ${cell(f.description) || '—'} | ${f.refs} |`;
const header = '| Flag | Key | Default | Label | Descrição | Arquivos que leem |\n|---|---|---|---|---|---|';

const md = `# Feature Flags — Viralata

> **Gerado automaticamente** por \`scripts/generate-feature-flags-doc.cjs\` em ${today}.
> Não edite à mão: rode o script e commite. Validação: \`node scripts/audit-feature-flags.cjs\`.
>
> Fonte de verdade: \`DEFAULT_FEATURE_FLAGS\` em \`src/core/featureFlags.js\` e
> \`SHELTER_FEATURE_FLAG\` em \`src/modules/shelter/domain/constants.js\`.
> Valor persistido em \`platform_settings/global.feature_flags\` (editável em \`/admin/flags\`)
> vence o default. Mudança de default exige critério em
> \`FeatureFlagsContext.migration.js\` + bump de \`FLAGS_MIGRATION_VERSION\` (CORE-DIRECTIVES §3).

## Como usar

\`\`\`jsx
import { useFeatureFlag, FEATURE_FLAG } from '@/core/lib/FeatureFlagsContext';

const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_KANBAN);
\`\`\`

## Resumo

| Total | ON por default | OFF por default |
|---|---|---|
| ${flags.length} | ${on.length} | ${off.length} |

Marcos: cutover V3 + abrigo em 2026-08-30 (PR #253) ligou as 19 \`v3_page_*\` e
as flags \`SHELTER_*\` de produto. \`shelter_cutover\` (chave de migração),
\`V4_PERSONA_*\`, \`PLATFORM_MARKETPLACE_V1\`, \`A11Y_IMPROVEMENTS_V1\`,
\`HOME_STATS_V1\` e as flags de layout seguem OFF — rollout em
\`docs/AI_GUIDE/29-PROJETO-CONTINUIDADE-2026-Q4.md\` (E4, E7, E8).

## Flags OFF por default (${off.length})

${header}
${off.map(row).join('\n')}

## Flags ON por default (${on.length})

${header}
${on.map(row).join('\n')}
`;

fs.writeFileSync(out, md);
console.log(`docs/FEATURE_FLAGS.md: ${flags.length} flags (${on.length} ON, ${off.length} OFF)`);

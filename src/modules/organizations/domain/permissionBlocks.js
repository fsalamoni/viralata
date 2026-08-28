/**
 * Blocos de permissão por ESCOPO da equipe do abrigo (Fase 1 — SHELTER_TEAM_V2).
 *
 * O modelo de permissões (deny-by-default; owner sempre total) vive em
 * `domain/permissions.js`. Este módulo apenas ORGANIZA as permissões
 * granulares (`CLUB_PERMISSION`) em blocos nomeados, com rótulos e descrições,
 * para a UI da Equipe v2 exibir os "blocos de permissão por escopo" de forma
 * explícita e autoexplicativa.
 *
 * É um módulo puro (sem React/Firebase), testável, e não altera o
 * comportamento de segurança — é somente apresentação/curadoria.
 */

import {
  CLUB_PERMISSION,
  CLUB_PERMISSION_KEYS,
  CLUB_PERMISSION_LABELS,
} from './constants.js';

/**
 * Descrição curta de cada permissão granular. Cobre TODAS as chaves de
 * `CLUB_PERMISSION` (inclusive as sub-permissões de voluntários), para que a
 * UI nunca mostre um toggle sem explicação.
 */
export const CLUB_PERMISSION_DESCRIPTIONS = Object.freeze({
  [CLUB_PERMISSION.ANIMALS]: 'Importar, editar e remover pets, prontuário e planilha de animais.',
  [CLUB_PERMISSION.FINANCE]: 'Criar e remover lançamentos, gerenciar categorias e prestação de contas.',
  [CLUB_PERMISSION.DONATIONS]: 'Criar, editar e excluir chamados de doação; registrar valores e analisar comprovantes.',
  [CLUB_PERMISSION.FEED]: 'Publicar, editar e remover posts do mural do abrigo.',
  [CLUB_PERMISSION.TEAM]: 'Admitir e remover membros, convidar, promover a admin e atribuir permissões.',
  [CLUB_PERMISSION.VOLUNTEERS]: 'Acesso geral ao painel de voluntários (ver e gerenciar).',
  [CLUB_PERMISSION.VOLUNTEERS_READ]: 'Apenas visualizar a lista de voluntários (sem editar).',
  [CLUB_PERMISSION.VOLUNTEERS_MANAGE_STATUS]: 'Pausar, retomar ou bloquear voluntários.',
  [CLUB_PERMISSION.VOLUNTEERS_BG_CHECK]: 'Aprovar ou rejeitar a verificação de antecedentes (background check).',
  [CLUB_PERMISSION.VOLUNTEERS_BULK]: 'Importar/exportar voluntários em massa (CSV).',
  [CLUB_PERMISSION.VOLUNTEERS_DELETE]: 'Remover voluntários definitivamente.',
});

/**
 * Blocos por escopo. Cada bloco agrupa permissões relacionadas para exibição.
 * `permissions[0]` de cada bloco é a permissão "principal" (raiz do escopo).
 */
export const CLUB_PERMISSION_BLOCKS = Object.freeze([
  Object.freeze({
    key: 'animals',
    label: 'Animais & Operação',
    description: 'Cadastro, prontuário e manejo dos animais do abrigo.',
    permissions: Object.freeze([CLUB_PERMISSION.ANIMALS]),
  }),
  Object.freeze({
    key: 'finance',
    label: 'Financeiro & Doações',
    description: 'Prestação de contas e chamados de doação.',
    permissions: Object.freeze([CLUB_PERMISSION.FINANCE, CLUB_PERMISSION.DONATIONS]),
  }),
  Object.freeze({
    key: 'communication',
    label: 'Comunicação',
    description: 'Mural e interação com o público.',
    permissions: Object.freeze([CLUB_PERMISSION.FEED]),
  }),
  Object.freeze({
    key: 'team',
    label: 'Pessoas & Equipe',
    description: 'Gestão de membros, convites e atribuições.',
    permissions: Object.freeze([CLUB_PERMISSION.TEAM]),
  }),
  Object.freeze({
    key: 'volunteers',
    label: 'Voluntários',
    description: 'Acesso e gestão da lista de voluntários (inclui sub-permissões).',
    permissions: Object.freeze([
      CLUB_PERMISSION.VOLUNTEERS,
      CLUB_PERMISSION.VOLUNTEERS_READ,
      CLUB_PERMISSION.VOLUNTEERS_MANAGE_STATUS,
      CLUB_PERMISSION.VOLUNTEERS_BG_CHECK,
      CLUB_PERMISSION.VOLUNTEERS_BULK,
      CLUB_PERMISSION.VOLUNTEERS_DELETE,
    ]),
  }),
]);

/** Todas as chaves de permissão referenciadas pelos blocos (para validação). */
export function blockPermissionKeys() {
  return CLUB_PERMISSION_BLOCKS.flatMap((b) => b.permissions);
}

/**
 * Rótulo curto do NÍVEL/ESCOPO de acesso de um membro, derivado do seu papel e
 * permissões efetivas. Usado nas tabelas de Pessoas (Equipe/Voluntários/Lares).
 *
 * @param {{ owner?: boolean, isAdmin?: boolean, permissions?: Record<string, boolean> }} args
 * @returns {{ label: string, tone: 'owner'|'admin'|'scoped'|'none' }}
 */
export function accessLevelSummary({ owner, isAdmin, permissions } = {}) {
  if (owner) return { label: 'Proprietário — acesso total', tone: 'owner' };
  if (isAdmin) return { label: 'Administrador', tone: 'admin' };
  const granted = Object.entries(permissions || {}).filter(([, v]) => v === true).map(([k]) => k);
  if (granted.length === 0) return { label: 'Sem atribuições', tone: 'none' };
  // Conta apenas as permissões "principais" (uma por bloco) para não inflar a
  // contagem com as sub-permissões de voluntários.
  const primary = CLUB_PERMISSION_BLOCKS
    .map((b) => b.permissions[0])
    .filter((key) => granted.includes(key));
  const count = primary.length || granted.length;
  const labels = primary.map((key) => CLUB_PERMISSION_LABELS[key]).filter(Boolean);
  return {
    label: labels.length ? labels.join(' · ') : `${count} atribuição(ões)`,
    tone: 'scoped',
  };
}

/** Sanity helper: os blocos cobrem exatamente as chaves de CLUB_PERMISSION. */
export function blocksCoverAllPermissions() {
  const fromBlocks = new Set(blockPermissionKeys());
  const all = new Set(CLUB_PERMISSION_KEYS);
  if (fromBlocks.size !== all.size) return false;
  for (const k of all) if (!fromBlocks.has(k)) return false;
  return true;
}

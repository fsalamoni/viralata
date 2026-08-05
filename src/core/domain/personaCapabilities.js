/**
 * @fileoverview personaCapabilities — FONTE ÚNICA da segmentação de
 * navegação por persona (§5 de docs/PERSONA_CAPABILITIES.md).
 *
 * Define, por tipo de persona: a navegação do topbar (desktop), os CTAs do
 * header, e a barra inferior (mobile). Topbar (Layout), barra inferior
 * (PersonaBottomTabBar) e — futuramente — os gates de rota derivam DAQUI,
 * em vez de listas hardcoded espalhadas.
 *
 * Personas com escopo (abrigo/comunidade/voluntário) são funções(scopeId)
 * porque a navegação depende do id do abrigo/comunidade ativo.
 *
 * Contém apenas referências a ícones (lucide) + rotas — é config de UI, não
 * lógica de domínio pura. Nenhuma decisão de SEGURANÇA depende disto (a
 * segurança está nas Firestore rules; persona é UX).
 */
import {
  PawPrint, User, Plus, MessageCircle, Building2, Users, Home,
  ClipboardList, Calendar, Shield, Stethoscope, Search,
} from 'lucide-react';
import { PERSONA_TYPE, parsePersonaKey } from '@/core/domain/personas';

// Capacidades vazias — usadas por personas escopadas SEM escopo definido
// (ex.: shelter_staff antes de o usuário entrar em um abrigo).
const EMPTY_CAPS = { topbarNav: [], headerCTAs: [], bottomNav: [] };

const CAPABILITIES = {
  // ── Adotante: o Feed é EXCLUSIVO desta persona (D-PERSONA-FEED-EXCLUSIVE) ──
  [PERSONA_TYPE.ADOPTER]: {
    topbarNav: [
      { label: 'Feed', to: '/feed', icon: PawPrint },
      { label: 'Abrigos', to: '/organizacoes', icon: Building2 },
      { label: 'Comunidades', to: '/comunidade', icon: Users },
      { label: 'Chat', to: '/chat', icon: MessageCircle },
    ],
    headerCTAs: [],
    bottomNav: [
      { label: 'Feed', icon: PawPrint, to: '/feed' },
      { label: 'ONGs', icon: Building2, to: '/organizacoes' },
      { label: 'Comunidade', icon: Users, to: '/comunidade' },
      { label: 'Buscar', icon: Search, to: '/busca', center: true },
      { label: 'Chat', icon: MessageCircle, to: '/chat' },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  },

  // ── Doador: gerencia SEUS pets. Sem Feed/Radar. ──
  [PERSONA_TYPE.DONOR]: {
    topbarNav: [
      { label: 'Meus pets', to: '/meus-pets', icon: PawPrint },
      { label: 'Chat', to: '/chat', icon: MessageCircle },
    ],
    headerCTAs: [{ label: 'Cadastrar pet', to: '/pets/new', icon: Plus }],
    bottomNav: [
      { label: 'Meus pets', icon: PawPrint, to: '/meus-pets' },
      { label: 'Cadastrar', icon: Plus, to: '/pets/new', center: true },
      { label: 'Chat', icon: MessageCircle, to: '/chat' },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  },

  // ── Abrigo (escopo = clubId): visão administrativa. ──
  // Sem scopeId (usuário ainda não entrou em um abrigo — ex.: /entrar/abrigo),
  // não há navegação escopada: evita links quebrados (/organizacoes/undefined).
  [PERSONA_TYPE.SHELTER_STAFF]: (scopeId) => (!scopeId ? EMPTY_CAPS : {
    // Topbar SEM navegação escopada: dentro do abrigo o usuário navega pelas
    // abas do próprio painel — Painel/Pets/Mural na topbar são redundantes.
    // A navegação primária no mobile fica na barra inferior (bottomNav).
    topbarNav: [],
    headerCTAs: [],
    bottomNav: [
      { label: 'Painel', icon: Home, to: `/organizacoes/${scopeId}/admin` },
      { label: 'Mural', icon: MessageCircle, to: `/organizacoes/${scopeId}?tab=feed` },
      { label: 'Pets', icon: PawPrint, to: `/organizacoes/${scopeId}/admin?tab=pets` },
      { label: 'Candidatos', icon: ClipboardList, to: `/organizacoes/${scopeId}/admin?tab=applications` },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  }),

  // ── Comunidade (escopo = communityId): sem pets/doações/finanças. ──
  // Sem scopeId (ainda não entrou em uma comunidade), sem navegação escopada.
  [PERSONA_TYPE.COMMUNITY_STAFF]: (scopeId) => (!scopeId ? EMPTY_CAPS : {
    topbarNav: [
      { label: 'Painel', to: `/comunidade/${scopeId}/admin`, icon: Home },
      { label: 'Mural', to: `/comunidade/${scopeId}?tab=feed`, icon: MessageCircle },
      { label: 'Eventos', to: `/comunidade/${scopeId}?tab=events`, icon: Calendar },
    ],
    headerCTAs: [],
    bottomNav: [
      { label: 'Painel', icon: Home, to: `/comunidade/${scopeId}/admin` },
      { label: 'Mural', icon: MessageCircle, to: `/comunidade/${scopeId}?tab=feed` },
      { label: 'Eventos', icon: Calendar, to: `/comunidade/${scopeId}?tab=events` },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  }),

  // ── Voluntário (escopo = clubId do roster ativo): ferramentas limitadas. ──
  [PERSONA_TYPE.VOLUNTEER]: (scopeId) => ({
    topbarNav: [
      { label: 'Início', to: '/perfil/voluntario', icon: Home },
      { label: 'Escalas', to: '/perfil/voluntario#shifts', icon: Calendar },
      { label: 'Tarefas', to: '/perfil/voluntario#tasks', icon: ClipboardList },
    ],
    headerCTAs: [],
    bottomNav: [
      { label: 'Início', icon: Home, to: '/perfil/voluntario' },
      { label: 'Escalas', icon: Calendar, to: '/perfil/voluntario#shifts' },
      { label: 'Tarefas', icon: ClipboardList, to: '/perfil/voluntario#tasks' },
      { label: 'Mural', icon: MessageCircle, to: scopeId ? `/organizacoes/${scopeId}?tab=feed` : '/feed' },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  }),

  // ── Admin master: override, vê tudo. ──
  [PERSONA_TYPE.PLATFORM_ADMIN]: {
    topbarNav: [
      { label: 'Admin', to: '/admin', icon: Shield },
      { label: 'Feed', to: '/feed', icon: PawPrint },
      { label: 'Abrigos', to: '/organizacoes', icon: Building2 },
      { label: 'Comunidades', to: '/comunidade', icon: Users },
    ],
    headerCTAs: [],
    bottomNav: [
      { label: 'Admin', icon: Shield, to: '/admin' },
      { label: 'Feed', icon: PawPrint, to: '/feed' },
      { label: 'ONGs', icon: Building2, to: '/organizacoes' },
      { label: 'Comunidades', icon: Users, to: '/comunidade' },
      { label: 'Saúde', icon: Stethoscope, to: '/admin/saude', center: true },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ],
  },
};

/**
 * Resolve o descritor de capacidades da persona (aceita objeto persona ou
 * PersonaKey string). Personas escopadas são resolvidas com o scopeId.
 * Fallback seguro: adotante.
 * @param {{ type: string, scopeId?: string|null }|string} persona
 * @returns {{ topbarNav: Array, headerCTAs: Array, bottomNav: Array }}
 */
export function getPersonaCapabilities(persona) {
  const p = typeof persona === 'string' ? parsePersonaKey(persona) : (persona || {});
  const entry = CAPABILITIES[p.type] || CAPABILITIES[PERSONA_TYPE.ADOPTER];
  return typeof entry === 'function' ? entry(p.scopeId) : entry;
}

export { CAPABILITIES as PERSONA_CAPABILITIES };
export default getPersonaCapabilities;

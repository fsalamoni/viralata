/**
 * @fileoverview Constantes compartilhadas do Sistema de Gestão do Abrigo.
 *
 * Cada feature nova do shelter tem sua própria flag `SHELTER_*` (default
 * OFF). Quando o admin liga uma flag, as constantes, services e UI
 * correspondentes passam a ser usados.
 *
 * Convênção de nomenclatura:
 *  - Enums em SNAKE_UPPER (compatível com Firestore)
 *  - Labels em pt-BR, com versão curta (badge) e longa (form/dropdown)
 *
 * Estado atual: Fase 0 (preparação) — só as constantes "guarda-chuva"
 * dos shelters e feature flags vazias. Cada fase subsequente adiciona
 * seus próprios enums aqui.
 */

import { FEATURE_FLAG as FF } from '@/core/featureFlags';

/**
 * Feature flags do Sistema de Gestão do Abrigo.
 *
 * Adicionadas em Fase 0 (preparação), todas default OFF. Cada fase do
 * roadmap liga a sua flag correspondente e adiciona a UI / services /
 * Firestore rules / testes. Ver `docs/SHELTER_MGMT_ROADMAP.md` para o
 * mapeamento flag ↔ fase.
 */
export const SHELTER_FEATURE_FLAG = Object.freeze({
  // Fase 0 — Preparação (renomeação + skeleton + docs)
  SHELTER_FOUNDATION: 'shelter_foundation',
  // Fase 1 — Cadastro Único do Animal
  SHELTER_ANIMAL_UNIFIED_PROFILE: 'shelter_animal_unified_profile',
  // Fase 2 — Linha do Tempo do Animal
  SHELTER_PET_TIMELINE: 'shelter_pet_timeline',
  // Fase 3 — Adoção (workflow completo)
  SHELTER_ADOPTION_WORKFLOW: 'shelter_adoption_workflow',
  // Fase 4 — Cadastro expandido de Adotante
  SHELTER_ADOPTER_FULL_PROFILE: 'shelter_adopter_full_profile',
  // Fase 5 — Acompanhamento Pós-Adoção
  SHELTER_POST_ADOPTION_FOLLOWUP: 'shelter_post_adoption_followup',
  // Fase 6 — Lares Temporários
  SHELTER_FOSTER: 'shelter_foster',
  // Fase 7 — Gestão de Saúde
  SHELTER_HEALTH_RECORDS: 'shelter_health_records',
  // Fase 8 — Gestão de Medicamentos
  SHELTER_MEDICATION: 'shelter_medication',
  // Fase 9 — Galeria de Fotos
  SHELTER_GALLERY: 'shelter_gallery',
  // Fase 10 — Vitrines
  SHELTER_EXHIBITIONS: 'shelter_exhibitions',
  // Fase 11 — Escalas + Confirmação de Presença (Vitrines)
  SHELTER_EXHIBITION_RSVPS: 'shelter_exhibition_rsvps',
  // Fase 11 (no projeto) — Vitrines / Eventos (workflow completo:
  // vitrines + shifts + post_event_log). Convive com
  // `shelter_exhibitions` e `shelter_exhibition_rsvps` sem colisão de
  // string. Liga a UI/service deste PR. (Fase 11 entrega os 3 numa só.)
  SHELTER_EXHIBITION_WORKFLOW_V1: 'shelter_exhibition_workflow_v1',
  // Fase 12 — Gestão de Voluntários (placeholder guarda-chuva da fase)
  SHELTER_VOLUNTEERS: 'shelter_volunteers',
  // Fase 13 (no projeto) — Gestão de Voluntários v1 (perfil + roster + participation)
  // Convive com `shelter_volunteers` (placeholder guarda-chuva) sem colisão
  // de string. Liga a UI/service deste PR.
  SHELTER_VOLUNTEER_PROFILE_V1: 'shelter_volunteer_profile_v1',
  // Fase 13 — Dashboard do Abrigo
  SHELTER_DASHBOARD: 'shelter_dashboard',
  // Fase 14 — Kanban de Tarefas
  SHELTER_KANBAN: 'shelter_kanban',
  // Fase 15 — Relatórios
  SHELTER_REPORTS: 'shelter_reports',
  // Fase 16 — Indicadores (vitrines + voluntários)
  SHELTER_INDICATORS: 'shelter_indicators',
  // Fase 17 — Busca Inteligente
  SHELTER_SMART_SEARCH: 'shelter_smart_search',
  // Fase 18 — Termos e Políticas completos (guarda-chuva)
  SHELTER_LEGAL_TERMS: 'shelter_legal_terms',
  // Fase 19 (no projeto) — Termos e Políticas Legais v1
  // Convive com `shelter_legal_terms` (placeholder guarda-chuva) sem
  // colisão de string. Liga a UI/service deste PR:
  //  - Termo de Voluntariado v2 (texto integral)
  //  - Termo de Adoção (aceite no submit da application)
  //  - Termo de Adesão (DPA) para o abrigo
  //  - Banner de Cookies (LGPD)
  //  - 5 páginas legais estáticas (/legal/*)
  SHELTER_LEGAL_TERMS_V1: 'shelter_legal_terms_v1',
  // Fase 19 — Segurança Avançada
  SHELTER_SECURITY_HARDENING: 'shelter_security_hardening',
  // Fase 20 — Painel de Saúde da Plataforma
  SHELTER_PLATFORM_HEALTH: 'shelter_platform_health',
  // Fase 21 — Migração Final + Cutover
  SHELTER_CUTOVER: 'shelter_cutover',
});

/**
 * Labels das flags para o painel `/admin/flags`.
 * Usado pelo `featureFlags.js` (FEATURE_FLAG_META) — centralizado aqui
 * pra evitar drift entre o doc e o código.
 */
export const SHELTER_FEATURE_FLAG_META = Object.freeze({
  [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: {
    label: 'Abrigos · fundação',
    description:
      'Renomeia "Organizações" para "Abrigos" e prepara o módulo shelter/. '
      + 'Habilita a estrutura-base para as próximas 21 fases do Sistema de '
      + 'Gestão do Abrigo. Sem isso, as outras flags SHELTER_* não têm '
      + 'onde rodar.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_ANIMAL_UNIFIED_PROFILE]: {
    label: 'Abrigos · cadastro único do animal',
    description:
      'Adiciona campos profissionais ao doc pet (nome no resgate, data, '
      + 'responsável, local, microchip, Asilomar, tipo de intake, etc.). '
      + 'Habilita nova aba "Cadastro" no PetDetail.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_PET_TIMELINE]: {
    label: 'Abrigos · linha do tempo do animal',
    description:
      'Histórico cronológico completo de cada animal (resgate, intake, '
      + 'vacinas, adoções, devoluções, etc.). Auto-preenchido pelas '
      + 'features do abrigo.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTION_WORKFLOW]: {
    label: 'Abrigos · workflow de adoção',
    description:
      'Pipeline formal de adoção: aplicação → review → entrevista → '
      + 'home check → aprovação → trial → finalização. Com devolução '
      + 'rastreável. Substitui adoption_interests (convive via alias).',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_FULL_PROFILE]: {
    label: 'Abrigos · perfil completo do adotante',
    description:
      'Adiciona CPF, RG, Instagram, questionário, avaliação, observações '
      + 'ao perfil do adotante. Obrigatório para chat/adoção. Integração '
      + 'com Google Forms via webhook.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_POST_ADOPTION_FOLLOWUP]: {
    label: 'Abrigos · acompanhamento pós-adoção',
    description:
      'Tarefas automáticas em 3 sem, 3 meses, 1, 2 e 3 anos após cada '
      + 'adoção. Dashboard mostra pendentes. Notificações ao responsável.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER]: {
    label: 'Abrigos · lares temporários',
    description:
      'Cadastro de LTs com histórico de animais. Indicador de adoção '
      + 'direta pelo LT sem passar pelo workflow completo.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS]: {
    label: 'Abrigos · prontuário de saúde',
    description:
      'Registros médicos por animal: consultas, cirurgias, internações, '
      + 'exames, vacinas, vermifugos, antipulgas, tratamentos. '
      + 'Vinculado a eventos da timeline.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_MEDICATION]: {
    label: 'Abrigos · controle de medicamentos',
    description:
      'Prescrição individual com doses administradas (cada dose tem '
      + 'check). Notificações 30min antes. Dashboard mostra pendentes.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_GALLERY]: {
    label: 'Abrigos · galeria de fotos',
    description:
      'Galeria categorizada por fase (resgate, perfil, saúde, LT, '
      + 'adoção, pós-adoção, vitrines, outros). Soft delete com lixeira '
      + 'e restauração pelo owner/admin.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS]: {
    label: 'Abrigos · vitrines e eventos',
    description:
      'Eventos de exposição onde abrigos levam animais. Coalizão entre '
      + 'múltiplos abrigos + pets externos. Registro do destino de cada '
      + 'animal pós-evento.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_RSVPS]: {
    label: 'Abrigos · escalas e RSVP de vitrines',
    description:
      'Convocação de voluntários por evento (sim/não/talvez). '
      + 'Disponibilidade, observações, escalas por turno.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_WORKFLOW_V1]: {
    label: 'Abrigos · vitrines e eventos (workflow completo)',
    description:
      'Workflow completo de vitrines / eventos da Fase 11: cadastro '
      + 'da vitrine (título, local, janela), coalizão entre abrigos '
      + '(co-organizadores + pets externos), escalas de trabalho por '
      + 'turno/role, e log do destino de cada animal pós-evento '
      + '(voltou/adotado/transferido/óbito). State machine com '
      + 'scheduled → active → completed e cancel como estado terminal. '
      + 'Habilita a UI no painel do abrigo.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS]: {
    label: 'Abrigos · gestão de voluntários (guarda-chuva)',
    description:
      'Placeholder guarda-chuva da fase de voluntários. NÃO liga a '
      + 'nada por si só. Use `shelter_volunteer_profile_v1` (ou a flag '
      + 'específica do sub-PR) para ligar a UI/service de cada '
      + 'incremento desta fase.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1]: {
    label: 'Abrigos · voluntários v1 (perfil + roster + participation)',
    description:
      'Liga a Gestão de Voluntários v1: perfil global do voluntário '
      + '(skills, availability, radius, transporte) em '
      + '`users/{uid}/volunteer_profile/main`; rostagem per-shelter em '
      + '`clubs/{clubId}/volunteers/{uid}` com background check '
      + 'per-shelter; e participations (turnos em eventos) em '
      + '`clubs/{clubId}/volunteer_participations/{id}` com '
      + 'check-in/out. Inclui aceite do termo de voluntariado (LGPD, '
      + 'snapshot versionado). `exhibition_id` na participation é FK '
      + 'opcional para a Fase 11 (vitrines).',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: {
    label: 'Abrigos · dashboard em tempo real',
    description:
      'Tela inicial do painel do abrigo com cards clicáveis: cães/gatos '
      + 'no abrigo, em LT, resgates/adoções do mês, castrações '
      + 'pendentes, medicações, pós-adoção, processos. Métricas '
      + 'customizáveis.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_KANBAN]: {
    label: 'Abrigos · kanban de tarefas',
    description:
      'Painel kanban com colunas customizáveis, drag-and-drop, '
      + 'atribuição por membro/voluntário. Tipos: medicação, castração, '
      + 'vacina, contato pós-adoção, processo, outros. Log de cada '
      + 'movimentação.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_REPORTS]: {
    label: 'Abrigos · relatórios',
    description:
      'Relatórios automáticos com gráficos: resgates/adoções por '
      + 'mês/ano, comparativos, saldo mensal, devoluções, tempo médio '
      + 'até adoção, castrados/não. Export CSV/PDF.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_INDICATORS]: {
    label: 'Abrigos · indicadores de vitrines e voluntários',
    description:
      'Taxa de adoção por evento, número de participantes, '
      + 'transportes, frequência de voluntários, horas totais.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH]: {
    label: 'Abrigos · busca inteligente',
    description:
      'Busca global multi-filtro em todas as entidades (animais, '
      + 'adotantes, abrigos, lares temporários, vitrines). Filtros '
      + 'combinados, por período, por responsável, por LT. CommandPalette '
      + 'Cmd+K. Backend Meilisearch self-hosted.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS]: {
    label: 'Abrigos · termos e políticas completos (guarda-chuva)',
    description:
      'Placeholder guarda-chuva da fase de termos e políticas. NÃO liga '
      + 'a nada por si só. Use `shelter_legal_terms_v1` (ou a flag '
      + 'específica do sub-PR) para ligar a UI/service de cada '
      + 'incremento desta fase.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1]: {
    label: 'Abrigos · termos e políticas legais v1',
    description:
      'Liga a entrega da Fase 19 (Legal Terms v1): termo de voluntariado '
      + 'integral v2 com LGPD e Lei 14.063/2020; termo de adoção com '
      + 'aceite + signature_text no submit da application; termo de '
      + 'adesão (DPA, operadora=Viralata / controlador=Abrigo) aceito '
      + 'no cadastro do abrigo e gravado em '
      + '`clubs/{clubId}/onboarding/terms_accepted`; banner de cookies '
      + 'com persistência em localStorage (consent_version=2026-07-10); '
      + '5 páginas legais estáticas em /legal/* (termos-de-uso, '
      + 'politica-de-privacidade, avisos-legais, codigo-de-conduta, '
      + 'legislacao-animal). Todos os aceites registram '
      + '`terms_accepted_at` + `terms_version` para auditoria LGPD.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_SECURITY_HARDENING]: {
    label: 'Abrigos · segurança avançada',
    description:
      'Firebase App Check, rate limiting, regras reforçadas, alertas '
      + 'de segurança no admin panel, audit log expandido.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_PLATFORM_HEALTH]: {
    label: 'Abrigos · saúde da plataforma',
    description:
      'Dashboard admin master: saúde, custos Firebase, capacidade, '
      + 'movimentação, gerenciamento de admins, alertas.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_CUTOVER]: {
    label: 'Abrigos · cutover final',
    description:
      'Migração final: clubs → shelters, remoção de feature flags, '
      + 'validação completa em produção. Liga só no final, depois de '
      + 'todas as outras fases validadas.',
  },
});

/** Defaults: tudo OFF. O admin liga quando quiser. */
export const DEFAULT_SHELTER_FLAGS = Object.freeze(
  Object.fromEntries(
    Object.values(SHELTER_FEATURE_FLAG).map((k) => [k, false]),
  ),
);

/**
 * Tipo canônico de "Abrigo" (organization) — Fase 0. Os tipos legados
 * em `modules/organizations/domain/constants.js` (CLUB_*, ORG_*) seguem
 * sendo a fonte de verdade durante a cutover. Aqui ficam apenas
 * aliases/atalhos.
 */
export const SHELTER_TYPE = Object.freeze({
  // Aliases para o nome novo (não duplica tipos legados)
//  ABRIGO: 'abrigo',  // (removido TASK-088 — era label, não flag)
});

/** Re-exporta FF para componentes que querem apenas o SHELTER_FEATURE_FLAG */
export { FF };

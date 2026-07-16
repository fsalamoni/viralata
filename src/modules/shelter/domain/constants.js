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
  // UX — Onboarding wizard 5 passos do abrigo (TASK-309)
  SHELTER_ONBOARDING_WIZARD: 'shelter_onboarding_wizard',
  // UX — Scoring de compatibilidade nas applications (TASK-310)
  SHELTER_APPLICATION_SCORING: 'shelter_application_scoring',
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
  // UI devolução + pausa pós-adoção (TASK-308)
  SHELTER_POST_ADOPTION_RETURN: 'shelter_post_adoption_return',
  // Fase 6 — Lares Temporários
  SHELTER_FOSTER: 'shelter_foster',
  // Fase 6 — Histórico público do LT (vitrine + histórico de pets)
  SHELTER_FOSTER_PUBLIC_HISTORY_V1: 'shelter_foster_public_history_v1',
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
  // Fase 22 — Painel do Adotante + Comunidades + Eventos
  // Dashboard unificado do adotante: aplicações, eventos, pets favoritados
  SHELTER_ADOPTER_DASHBOARD_V1: 'shelter_adopter_dashboard_v1',
  // Eventos ampliados: tipos diversos (vacinação, palestra, fundraising, pet day)
  // com vínculo pet↔evento e vínculo voluntário↔evento
  SHELTER_EVENTS_V1: 'shelter_events_v1',
  // Perfil expandido do adotante: preferências de busca, gate legal, questionário
  SHELTER_ADOPTER_PROFILE_V1: 'shelter_adopter_profile_v1',
  // Comunidade apoiada pelo abrigo (membros, posts, chat admin, certificados)
  SHELTER_SPONSORED_COMMUNITY_V1: 'shelter_sponsored_community_v1',
  // Eventos enriquecidos da comunidade: RSVP, chat, pinned posts, busca global
  SHELTER_COMMUNITY_RICH_EVENTS_V1: 'shelter_community_rich_events_v1',
  // Chat admin de comunidade (canal onde admin fala com membros)
  SHELTER_COMMUNITY_CHAT_V1: 'shelter_community_chat_v1',
  // FCM push notifications: service worker + token registration + sendPush onCall
  SHELTER_FCM_PUSH_V1: 'shelter_fcm_push_v1',
  // Fase 19 — Segurança Avançada
  SHELTER_SECURITY_HARDENING: 'shelter_security_hardening',
  // Fase 20 — Painel de Saúde da Plataforma
  SHELTER_PLATFORM_HEALTH: 'shelter_platform_health',
  // Fase 21 — Migração Final + Cutover
  SHELTER_CUTOVER: 'shelter_cutover',
  // ---- Comunidade / adotante / eventos ----
  // TASK-338: painel unificado do adotante (/meu-painel)
  SHELTER_ADOPTER_DASHBOARD_V1: 'shelter_adopter_dashboard_v1',
  // TASK-338: eventos da Fase 10 (ampliados, vinculados a pets e voluntários)
  SHELTER_EVENTS_V1: 'shelter_events_v1',
  // TASK-338: perfil expandido do adotante (preferências, pets interessados, histórico)
  SHELTER_ADOPTER_PROFILE_V1: 'shelter_adopter_profile_v1',
  // TASK-338: comunidade patrocinada pelo abrigo (tipo Substack/Open Collective)
  SHELTER_SPONSORED_COMMUNITY_V1: 'shelter_sponsored_community_v1',
  // TASK-338: eventos ricos (pet_ids, volunteer_ids, certificados, RSVP pago)
  SHELTER_COMMUNITY_RICH_EVENTS_V1: 'shelter_community_rich_events_v1',
  // TASK-338: chat admin↔membros na comunidade
  SHELTER_COMMUNITY_CHAT_V1: 'shelter_community_chat_v1',
  // TASK-338: push notifications FCM via Cloud Functions (não só in-app)
  SHELTER_FCM_PUSH_V1: 'shelter_fcm_push_v1',
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
  [SHELTER_FEATURE_FLAG.SHELTER_POST_ADOPTION_RETURN]: {
    label: 'Abrigos · UI devolução + pausa pós-adoção',
    description:
      'Dialog para adotante devolver animal ou pausar acompanhamento. '
      + 'Lista de devolvidos no dashboard do abrigo com timeline.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER]: {
    label: 'Abrigos · lares temporários',
    description:
      'Cadastro de LTs com histórico de animais. Indicador de adoção '
      + 'direta pelo LT sem passar pelo workflow completo.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER_PUBLIC_HISTORY_V1]: {
    label: 'Abrigos · histórico público do LT',
    description:
      'Página pública /lares-temporarios/:uid/historico com pets que '
      + 'passaram pelo LT (consent_to_show_history=true). '
      + 'Exibe foto + nome + status final de cada pet.',
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
  [SHELTER_FEATURE_FLAG.SHELTER_ONBOARDING_WIZARD]: {
    label: 'Abrigos · onboarding wizard 5 passos',
    description:
      'Wizard de onboarding do abrigo (5 passos: logo+capa, endereço, '
      + 'equipe, termos DPA, primeiro pet). Salva progresso em '
      + 'clubs/{clubId}/onboarding_progress. Ativado após DPA em '
      + 'CreateClub.',
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
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_DASHBOARD_V1]: {
    label: 'Abrigos · painel do adotante',
    description:
      'Dashboard unificado do adotante em /meu-painel com: '
      + 'aplicações em andamento (pipeline visual), eventos criados/participados, '
      + 'pets favoritados, e notifications. Filtros por status + busca. '
      + 'Inclui CTA "Encontrar pet" para vazio. '
      + 'Feature flag que protege toda a rota /meu-painel e sub-rotas.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_EVENTS_V1]: {
    label: 'Abrigos · eventos ampliados',
    description:
      'Tipos de evento diversos (vacinação, palestra, fundraising, pet day). '
      + 'Vínculo pet↔evento (pet_ids: string[]) com UI de seleção. '
      + 'Vínculo voluntário↔evento (interface com Agente A). '
      + 'Certificados de evento (storage + download PDF). '
      + 'RSVP, disponibilidade, escalas por turno/role.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_PROFILE_V1]: {
    label: 'Abrigos · perfil expandido do adotante',
    description:
      'Feed preferences (porte, espécie, idade, energia), gate legal '
      + '(aceite LGPD Art. 14 para 16-18 anos com responsável), '
      + 'questionnaire versionado, e analytics de funil. '
      + 'Habilita preferências na busca e no matching de pets.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_SPONSORED_COMMUNITY_V1]: {
    label: 'Abrigos · comunidade apoiada',
    description:
      'Comunidade pertencente ao abrigo: membros, posts com '
      + 'likes/comments, pinned posts, forum threads, '
      + 'eventos (RSVP + reminder 24h), '
      + 'convite de membros (search + invite + pending/accepted/declined), '
      + 'e certificados de participação em PDF. '
      + 'Inclui auditoria de post_liked, post_commented, event_rsvp, event_created, event_deleted.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_COMMUNITY_RICH_EVENTS_V1]: {
    label: 'Abrigos · eventos enriquecidos de comunidade',
    description:
      'Eventos internos da comunidade com: chat admin (admin fala com membros), '
      + 'busca global de comunidades (text + city + state), '
      + 'convite de membros, e cloud functions para '
      + 'notificações (post_created, post_liked, post_commented, event_created) '
      + 'e reminder 24h antes do evento.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_COMMUNITY_CHAT_V1]: {
    label: 'Abrigos · chat admin de comunidade',
    description:
      'Canal onde admin de comunidade fala diretamente com membros. '
      + 'Sub-coleção messages em community com thread opcional. '
      + 'Notificação push ao membro quando admin envia mensagem.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_FCM_PUSH_V1]: {
    label: 'Abrigos · push notifications (FCM)',
    description:
      'Firebase Cloud Messaging: service worker registra FCM token em '
      + 'users/{uid}.fcm_tokens[]. onCall sendPush(notifType, uid, payload). '
      + 'Triggers: onCreate adoption_workflow (notifica abrigo), '
      + 'onUpdate adoption_workflow.status (notifica adotante), '
      + 'onCreate kanban_tasks (notifica adotante), '
      + 'onCreate community_post (notifica membros). '
      + 'Permission UX: pede após 1ª ação relevante (não no signup). '
      + 'Respeita opt-out. Flag-gated SHELTER_FCM_PUSH_V1.',
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
  // ---- Comunidade / adotante / eventos (TASK-338) ----
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_DASHBOARD_V1]: {
    label: 'Abrigos · painel do adotante',
    description:
      'Dashboard unificado /meu-painel com status de aplicações, '
      + 'pets favoritos, eventos inscritos e histórico de interações. '
      + 'Habilita a visão adotante completa (Fase 4 expandida).',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_EVENTS_V1]: {
    label: 'Abrigos · eventos ampliados',
    description:
      'Tipos de evento ampliados: vacinação, palestra, fundraising, pet day. '
      + 'Vínculo evento↔pet (pet_ids) e evento↔voluntário. '
      + 'Habilita a agenda pública + busca de eventos.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_PROFILE_V1]: {
    label: 'Abrigos · perfil expandido do adotante',
    description:
      'Perfil completo do adotante: preferências de espécie/porte/energia, '
      + 'pets interessados, histórico de aplicações, avaliações. '
      + 'Gatilho de matching visual com pets disponíveis.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_SPONSORED_COMMUNITY_V1]: {
    label: 'Abrigos · comunidade patrocinada',
    description:
      'Comunidade vinculada ao abrigo com suporte a posts, fóruns, '
      + 'eventos e-chat. Tipo Substack/Open Collective: abrigo publica '
      + 'conteúdo, membros acompanham e podem contribuir financeiramente.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_COMMUNITY_RICH_EVENTS_V1]: {
    label: 'Abrigos · eventos ricos na comunidade',
    description:
      'Eventos com pet_ids, volunteer_ids, certificados PDF gerados via '
      + 'storage, e RSVP pago (Pix). Integração com Google Calendar '
      + 'e Jitsi Meet para vídeo-entrevistas.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_COMMUNITY_CHAT_V1]: {
    label: 'Abrigos · chat admin↔membros na comunidade',
    description:
      'Canal de chat onde admins do abrigo/enviolezadores '
      + 'conversam diretamente com membros da comunidade. '
      + 'Notificações push para membros quando admin envia mensagem.',
  },
  [SHELTER_FEATURE_FLAG.SHELTER_FCM_PUSH_V1]: {
    label: 'Abrigos · push notifications via FCM',
    description:
      'Firebase Cloud Messaging para push notifications nativas (não '
      + 'só in-app). Welcome, shift reminder, BG check, milestone, '
      + 'event reminder, e community notifications via Cloud Functions.',
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

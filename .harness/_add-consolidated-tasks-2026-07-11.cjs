// .harness/_add-consolidated-tasks-2026-07-11.cjs
// Adiciona 98 tasks consolidadas (TASK-263 a TASK-360) ao SCRUM_TASKS.json do worktree
// 3 frentes: Voluntários (A) · Abrigos/Foster/Adoção (B) · Comunidade/Adotante/Eventos (C)
// Renumeradas pra evitar conflito com main (TASK-254) e wt-volunteer-critical (TASK-204-248)
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const TODAY = '2026-07-11';
const NOW_ISO = '2026-07-11T21:47:00-03:00';
const AGENT_A = 'A'; // Voluntários
const AGENT_B = 'B'; // Abrigos/Foster/Adoção
const AGENT_C = 'C'; // Comunidade/Adotante/Eventos
const SESSION = 'mvs_311d078987d0414a90f57ef28b789b18';

// Helpers
const mk = (id, title, type, category, priority, eixo, subFrente, blockedBy, tags, description) => ({
  id,
  title,
  type,
  category,
  status: 'ready',
  priority,
  owner: 'unassigned',
  branch: null,
  worktree: null,
  tags,
  blockedBy,
  eixo,
  subFrente,
  description,
  createdAt: TODAY,
  updatedAt: TODAY,
});

const tasks = [];

// === AGENTE A — VOLUNTÁRIOS (TASK-263 a TASK-287, 25 tasks) ===
const A = 'voluntarios';
const Cvol = 'shelter';
tasks.push(
  mk('TASK-263', 'CTA "Quero ser voluntário" na página pública do abrigo', 'feature', Cvol, 'critical', '1-ux', A, [], ['regra-A', A, 'publico', 'cta', 'eixo-1'],
    'Adicionar tab "Voluntários" pública em src/modules/organizations/pages/ClubDetail.jsx + botão no cover. Mostrar contagem de voluntários ativos, chamada "Precisamos de voluntários para X/Y/Z" configurável pelo abrigo, botão CTA que abre modal de signup (gated por isAuthenticated). Se não autenticado, redireciona a /login?next=... Mobile + a11y (focus trap, aria-live). Empty state: "Seja o primeiro voluntário!". Loading: skeleton.'),
  mk('TASK-264', 'Modal de inscrição de voluntário (JoinVolunteerModal)', 'feature', Cvol, 'critical', '1-ux', A, ['TASK-263'], ['regra-A', A, 'modal', 'signup', 'eixo-1'],
    'Criar src/modules/shelter/components/JoinVolunteerModal.jsx. Usa useJoinShelterAsVolunteer (já existe em useVolunteerProfile.js:81). Mostra: aceite do termo (botão "Li e aceito" com link para /legal/termo-voluntariado), campos de skills, availability, radius. Se user já tem users/{uid}/volunteer_profile/main, pré-popula. Se NÃO tem, passo 1 (termo) → passo 2 (perfil) → passo 3 (confirmar). On success, toast + invalida useShelterVolunteers.'),
  mk('TASK-265', 'Seção "Voluntário" em Profile.jsx', 'feature', Cvol, 'critical', '1-ux', A, [], ['regra-A', A, 'perfil', 'eixo-1'],
    'Adicionar nova Card em src/pages/Profile.jsx com: badge "Sou voluntário" se users/{uid}/volunteer_profile/main existe, link "Tornar-me voluntário" se NÃO, e <VolunteerProfileForm uid={user.uid} actor={user} onSaved={refreshProfile} /> se já é. Empty state: "Você ainda não é voluntário — descubra como ajudar abrigos próximos." Aceita o termo se versão mudou (banner amarelo).'),
  mk('TASK-266', 'Rota /perfil/voluntario dedicada', 'feature', Cvol, 'critical', '1-ux', A, ['TASK-265'], ['regra-A', A, 'rota', 'perfil-dedicado', 'eixo-1'],
    'Criar src/pages/VolunteerProfile.jsx (lazy em App.jsx) com rota /perfil/voluntario. Mostra: VolunteerProfileForm, lista de abrigos onde é voluntário (useMyShelterMembershipsAsVolunteer — hook novo), histórico de participations (cards por abrigo com totais de horas), botão "Sair do abrigo" por abrigo.'),
  mk('TASK-267', 'Permissão granular volunteers:read/apply/manage_status/bg_check/bulk/delete', 'refactor', Cvol, 'critical', '2-roles', A, [], ['regra-A', A, 'permissoes', 'granular', 'eixo-2'],
    '(a) Adicionar chaves em src/modules/organizations/domain/constants.js: CLUB_PERMISSION.VOLUNTEERS = "volunteers". (b) Atualizar hasClubPermission para reconhecer. (c) Atualizar PERMISSION_DESCRIPTIONS em ClubTeamTab.jsx + renderizar nova toggle na grade. (d) Atualizar firestore.rules para usar hasClubPermission(clubId, "volunteers") em vez de "animals". (e) Testar: owner pode, member com volunteers:true pode, sem permissão é bloqueado.'),
  mk('TASK-268', 'Cloud Function onVolunteerJoinedShelter (FCM admin + email boas-vindas)', 'feature', Cvol, 'critical', '4-int', A, [], ['regra-A', A, 'cloud-function', 'fcm', 'email', 'eixo-4'],
    'Trigger Firestore onCreate em clubs/{clubId}/volunteers/{uid}. (a) FCM para todos admins do abrigo (topic shelter-{clubId}-admins). (b) Email via SendGrid/Resend template volunteer-welcome-v1. (c) Grava notifications/{auto} para o admin. (d) Audit log. (e) Idempotente. (f) Flag-gated por SHELTER_VOLUNTEER_NOTIFY_V1 default OFF.'),
  mk('TASK-269', 'Cloud Function onVolunteerParticipationCreated (FCM ao voluntário)', 'feature', Cvol, 'critical', '4-int', A, [], ['regra-A', A, 'cloud-function', 'fcm', 'participation', 'eixo-4'],
    'Trigger onCreate em clubs/{clubId}/volunteer_participations/{id}. (a) FCM para volunteer_uid com payload {title, event_label, event_date, role, url}. (b) Adiciona ao calendar (escrita em volunteer_uid/calendar/{id} subcollection ou via Google Calendar API). (c) Email template volunteer-shift-confirmed-v1. (d) Audit log.'),
  mk('TASK-270', 'Cloud Function onBgCheckApproved (FCM ao voluntário)', 'feature', Cvol, 'critical', '4-int', A, [], ['regra-A', A, 'cloud-function', 'fcm', 'bg-check', 'eixo-4'],
    'Trigger onUpdate em clubs/{clubId}/volunteers/{uid} quando background_check_status muda para approved. FCM para volunteer_uid: "BG check aprovado! Você já pode participar de eventos." Email template bg-check-approved-v1. Audit log.'),
  mk('TASK-271', 'Storage: upload de documentos de voluntário (RG, CPF, atestado)', 'feature', Cvol, 'critical', '4-int', A, [], ['regra-A', A, 'storage', 'lgpd', 'documentos', 'eixo-4'],
    '(a) Schema: clubs/{clubId}/volunteers/{uid}/documents/{docId} com {type, file_url, file_name, mime_type, uploaded_at, expires_at}. (b) Service: uploadVolunteerDocument valida mime (image/jpeg,png,pdf), tamanho (max 10MB), tipo (["rg", "cpf", "medical_cert", "address_proof", "other"]). (c) Rule: read = próprio + abrigo com volunteers:read; create = próprio; update = abrigo com volunteers:manage; delete = próprio + platform_admin. (d) UI: tab "Documentos" no admin + upload widget no perfil. (e) LGPD: retention 5 anos pós-sai.'),
  mk('TASK-272', 'Soft-delete voluntário + anonimização LGPD (art. 18)', 'feature', Cvol, 'critical', '3-regras', A, [], ['regra-A', A, 'lgpd', 'soft-delete', 'anonimizacao', 'eixo-3'],
    '(a) Adicionar campo deleted_at, anonymized_at, pseudonym_uid em clubs/{clubId}/volunteers/{uid}. (b) Função softDeleteVolunteer (Cloud Function, Admin SDK): marca deleted_at, anonimiza PII (name → "Voluntário #{shortId}", email/phone → null, signature_text → null, mantém FKs para histórico). (c) Função eraseMyVolunteerData (Cloud Function): apaga users/{uid}/volunteer_profile/main + todas as rostagens + participations + documents. (d) API: DELETE /api/volunteer/me (autenticado). (e) Audit log da anonimização. (f) Regra do Firestore: read em roster com deleted_at → 403 exceto platform_admin.'),
  mk('TASK-273', 'Smart Search: adicionar entidade volunteer', 'feature', Cvol, 'high', '4-int', A, [], ['regra-A', A, 'search', 'smart-search', 'eixo-4'],
    'Em src/modules/shelter/domain/search/search.js: adicionar volunteer: { collection: "volunteers", pathType: "subcollection", parentCollection: "clubs", isPublic: false, searchableFields: ["volunteer_name", "volunteer_email", "notes"], filterableFields: { status: {type: "string"}, shelter_club_id: {type: "string", required: true} }, titleField: "volunteer_name", subtitleField: "volunteer_email", urlPattern: "/admin/volunteers/{id}" }. Atualizar SEARCH_ENTITIES + testes. Index composto volunteers(shelter_club_id, status, volunteer_name) em firestore.indexes.json.'),
  mk('TASK-274', 'Atribuições finas (capability matrix) por voluntário', 'feature', Cvol, 'high', '1-ux', A, ['TASK-267'], ['regra-A', A, 'atribuicoes', 'capability', 'eixo-1'],
    '(a) Schema: clubs/{clubId}/volunteer_assignments/{assignmentId} com {volunteer_uid, capability: enum, scope: enum, starts_at, ends_at, assigned_by_uid, assigned_at, notes}. Capability enum: mesma de VOLUNTEER_PARTICIPATION_ROLES + general_help, photography, foster_support. Scope: shelter, pet, event_type, task_id. (b) Service CRUD + Zod + audit. (c) UI: matriz (voluntário × capability) no admin, com toggles e badges de "atribuído até DD/MM". (d) Regra: só abrigo com volunteers:manage escreve; próprio voluntário lê os seus.'),
  mk('TASK-275', 'Integração Exhibition ↔ volunteer_participations (vincular participação à vitrine)', 'feature', Cvol, 'high', '1-ux', A, [], ['regra-A', A, 'exhibition', 'participation', 'vinculacao', 'eixo-1'],
    'Em ExhibitionDetails.jsx: nova seção "Voluntários" abaixo de Escalas. (a) Lista de participations filtrada por event_type=exhibition, exhibition_id={id}. (b) Botão "+ Adicionar voluntário" abre dropdown com useShelterVolunteers({status:"active", background_check_status:["approved","not_required"]}). (c) Ao selecionar, chama useCreateParticipation com event_type="exhibition", exhibition_id={id}, shelter_club_id={clubId}, volunteer_uid, volunteer_name, event_label={exhibition.title}, event_date={exhibition.datetime_start}, role. (d) Mostra canVolunteerParticipate em badge. (e) Empty state: "Nenhum voluntário escalado para esta vitrine."'),
  mk('TASK-276', 'Cloud Function dailyDigest para voluntários do abrigo', 'feature', Cvol, 'high', '4-int', A, ['TASK-268'], ['regra-A', A, 'cloud-function', 'daily-digest', 'cron', 'eixo-4'],
    'Cron diário (Fase 14 já tem padrão de cron jobs). Para cada abrigo, agrega: novos voluntários últimos 7d, BG checks pendentes, participations próximas 7d, total de horas do mês. Email template volunteer-digest-daily-v1 para cada admin (com permissão volunteers:read). Audit log. Flag-gated SHELTER_VOLUNTEER_DIGEST_V1.'),
  mk('TASK-277', 'Rate limit em joinShelterAsVolunteer e acceptVolunteerTerms', 'security', Cvol, 'high', '3-regras', A, [], ['regra-A', A, 'rate-limit', 'security', 'eixo-3'],
    '(a) functions/middleware/rateLimit.js (já existe padrão): 5 tentativas/min por uid, 20/shelter/dia. (b) Throws functions/logger.error + cria platform_security_alerts com type: "rate_limit_exceeded". (c) Audit log. (d) Regra Firestore NÃO pode fazer rate limit sozinha. (e) Teste: 6 calls em 1min → 6ª throws.'),
  mk('TASK-278', 'volunteer_profiles collectionGroup index (bug) — remover ou corrigir', 'bug', Cvol, 'high', '3-regras', A, [], ['regra-A', A, 'bug', 'index', 'firestore', 'eixo-3'],
    'firestore.indexes.json:188-193 tem index volunteer_profiles(shelter_club_id, display_name). Mas a coleção real é users/{uid}/volunteer_profile/main (subcoleção, não collectionGroup com esse nome). Ação: remover o índice órfão. Se a intenção era indexar a subcoleção, o nome correto é volunteer_profile (sem "s"). Validar no emulador.'),
  mk('TASK-279', 'acceptVolunteerTerms migrar para terms_acceptances (imutabilidade legal)', 'refactor', Cvol, 'high', '3-regras', A, ['TASK-272'], ['regra-A', A, 'refactor', 'terms-acceptance', 'imutabilidade', 'eixo-3'],
    'Hoje: users/{uid}/volunteer_profile/main tem campos terms_accepted_at, terms_version (mutáveis). Migração: criar doc em users/{uid}/terms_acceptances/{acceptanceId} (já tem rule imutável em firestore.rules:205-210) com {terms_type: "volunteer_v1", terms_version, signature_text_hash, accepted_at, ip, user_agent}. Service acceptVolunteerTerms chama addDoc em terms_acceptances. Profile global mantém referência (last_terms_acceptance_id) mas NÃO é o storage primário. Migration script para usuários que aceitaram antes.'),
  mk('TASK-280', 'UI helper canManageVolunteers(club, membership, uid) + smoke cross-role', 'feature', Cvol, 'high', '2-roles', A, ['TASK-267'], ['regra-A', A, 'helper', 'smoke', 'cross-role', 'eixo-2'],
    '(a) Em src/modules/organizations/domain/permissions.js: canManageVolunteers(club, membership, uid) = hasClubPermission(club, membership, "volunteers", uid). (b) Smoke test em tests/e2e/volunteer-flow.spec.ts (Playwright): (1) volunteer_signs_up_to_shelter, (2) admin_approves_application, (3) admin_assigns_to_event, (4) volunteer_checks_in, (5) shelter_receives_digest, (6) volunteer_erases_data. (c) Gating em toda UI de voluntários (substituir canAbriho boolean).'),
  mk('TASK-281', 'Smoke test scripts/smoke-volunteer.mjs end-to-end', 'docs', Cvol, 'medium', '5-deploy', A, ['TASK-263', 'TASK-264', 'TASK-265', 'TASK-268'], ['regra-A', A, 'smoke', 'e2e', 'eixo-5'],
    'Script Node que: (1) cria user de teste via Admin SDK, (2) cria abrigo de teste, (3) chama joinShelterAsVolunteer, (4) verifica audit_log, (5) verifica email enfileirado (mock), (6) admin faz BG check approve, (7) verifica FCM mock, (8) cria participation, (9) check-in, (10) verifica total de horas. Roda contra emulador + prod canário.'),
  mk('TASK-282', 'Analytics: funil de voluntário', 'feature', Cvol, 'medium', '4-int', A, [], ['regra-A', A, 'analytics', 'funil', 'eixo-4'],
    'Em src/core/services/observabilityService.js: novos eventos volunteer_signup_started, volunteer_terms_accepted, volunteer_joined_shelter, volunteer_first_participation. Cada um com propriedades: source: "public_page" | "profile" | "admin_invite", shelter_id, user_uid. Dashboard em /admin/metricas com funil.'),
  mk('TASK-283', 'Sentry: tag domain:volunteer em erros', 'docs', Cvol, 'medium', '4-int', A, [], ['regra-A', A, 'sentry', 'observability', 'eixo-4'],
    'Onde der throw em volunteer*Service.js, anexar Sentry.setTag("domain", "volunteer") no contexto. Alerta no Sentry: "errors em volunteer > 5/dia" → page on-call.'),
  mk('TASK-284', 'Empty/loading/error states em VolunteerProfileForm + MyVolunteerList', 'feature', Cvol, 'medium', '1-ux', A, ['TASK-265'], ['regra-A', A, 'empty-state', 'loading', 'error', 'eixo-1'],
    '(a) VolunteerProfileForm já tem loading OK; falta error state explícito (atualmente é só toast). (b) Criar MyVolunteerList.jsx com empty ("Você não está em nenhum abrigo ainda") + skeleton + error. (c) Componente EmptyState (shadcn) já existe em src/components/ui/empty-state.jsx — usar consistentemente.'),
  mk('TASK-285', 'Geração de PDF do termo assinado (Lei 14.063/2020)', 'feature', Cvol, 'medium', '4-int', A, ['TASK-279'], ['regra-A', A, 'pdf', 'lei-14063', 'assinatura', 'eixo-4'],
    'Cloud Function generateVolunteerTermsPDF: ao aceitar o termo, gera PDF (pdf-lib) com signature_text_hash, terms_version, accepted_at, user_uid. Upload em users/{uid}/volunteer_terms_pdfs/{acceptanceId}.pdf (Storage). Email com link de download.'),
  mk('TASK-286', 'Atualizar docs/SHELTER_MGMT_ROADMAP.md § Fase 13 com checklist dos gaps', 'docs', Cvol, 'low', '5-deploy', A, [], ['regra-A', A, 'docs', 'roadmap', 'eixo-5'],
    'Documentar o que foi implementado na Fase 13 e o que ficou como Fase 13.1 (público + perfil + atribuições + integrações). Marcar Fase 13 como "80% done".'),
  mk('TASK-287', 'DPO review nota em docs/AGENTS_LGPD.md para voluntários', 'docs', Cvol, 'low', '5-deploy', A, [], ['regra-A', A, 'dpo', 'lgpd', 'docs', 'eixo-5'],
    'Nota assinada por DPO confirmando que: (a) termo v2 atende LGPD, (b) snapshot do aceite é minimização (hash em vez de nome em claro no audit), (c) soft-delete + anonimização estão planejados (TASK-272). Sem essa nota, feature não pode ir pra prod mesmo com flag OFF em abrigo canário.'),
);

// === AGENTE B — ABRIGOS + FOSTER + ADOÇÃO (TASK-288 a TASK-328, 41 tasks) ===
const B = 'abrigos-foster-adocao';
tasks.push(
  mk('TASK-288', '[CONTRACT-001] Criar coleção contracts/{contractId} dedicada com Storage de PDF assinado', 'feature', 'shelter', 'critical', '3-regras', B, [], ['regra-A', B, 'contract', 'storage', 'lei-14063', 'blocker'],
    'Hoje o aceite do termo é embed em adoption_workflow/{appId}. Criar coleção dedicada em clubs/{clubId}/contracts/{contractId} com: hash SHA-256 do documento, IP, user-agent, signature_text adotante, signature_text abrigo (representante), timestamp, PDF em Storage. Migrar docs legados. UI: rota /contracts no abrigo (search + export) e /profile/contracts pro adotante (download). Firestore rules com return explícito. Zod schema novo. Multi-tenant. Audit log.'),
  mk('TASK-289', '[POSTADOPT-001] UI do dashboard pessoal do adotante pós-adoção', 'feature', 'shelter', 'critical', '1-ux', B, [], ['regra-A', B, 'post-adoption', 'dashboard', 'blocker'],
    'Rota /adoptions (ou /my-adoptions) com lista de adoções concluídas + tasks pendentes materializadas (kanban_tasks filtradas por adopter_uid == auth.uid). UI pro adotante completar task (upload foto, responder check-in). Cloud Function scheduled adicional (1x/dia 9h BRT) que notifica via FCM/email tasks devidas. Componente PostAdoptionDashboard.jsx + hook useMyAdoptions + service postAdoptionService.completeTask.'),
  mk('TASK-290', '[INTERVIEW-001] Implementar fluxo de entrevista dedicado (scheduling + checklist + record)', 'feature', 'shelter', 'critical', '1-ux', B, [], ['regra-A', B, 'interview', 'scheduling', 'checklist', 'blocker'],
    'Criar clubs/{clubId}/interviews/{interviewId} collection. Schema: application_id, scheduled_at, mode (presencial|video|telefone), checklist[] (tópicos), completed_at, completed_by_uid, notes, evaluation_stars, evaluation_notes. Service interviewService.js (propose, schedule, complete, evaluate). UI: InterviewTab no painel do abrigo, InterviewCard no ApplicationsList, MyInterviewCard no perfil do adotante. Status no adoption workflow: interview_scheduled → interview_done (já existe em VALID_TRANSITIONS mas sem materialização).'),
  mk('TASK-291', '[EMAIL-001] Integrar SendGrid ou Resend pra email transacional (LGPD)', 'feature', 'shelter', 'critical', '4-int', B, [], ['regra-A', B, 'email', 'sendgrid', 'resend', 'lgpd', 'decisao-D-04'],
    'Cloud Function sendEmail (onCall) com templates versionados: application_received, interview_scheduled, match_approved, contract_ready, milestone_due, milestone_overdue, post_adoption_returned. Templates em src/core/services/emailTemplates.js com versioning. Respeitar opt-out (campo users/{uid}.email_opt_out). Audit log de cada envio (sem PII no details, só uid + template). LGPD: consentimento explícito no onboarding, link de unsubscribe em cada email. Painel admin pro platform_admin ver taxa de abertura. Feature flag: SHELTER_EMAIL_V1 default OFF.'),
  mk('TASK-292', '[FCM-001] Integrar Firebase Cloud Messaging pra push notifications', 'feature', 'shelter', 'critical', '4-int', B, ['TASK-291'], ['regra-A', B, 'fcm', 'push', 'notificacoes'],
    'Service worker registra FCM token em users/{uid}.fcm_tokens[]. Cloud Function sendPush (onCall) com notification type + link. Triggers: onCreate adoption_workflow (notifica abrigo), onUpdate adoption_workflow.status (notifica adotante), onCreate kanban_tasks (notifica adotante). Permission request na UX: pedir permissão após 1ª ação relevante (não no signup). Feature flag: SHELTER_FCM_V1 default OFF. Respeitar opt-out.'),
  mk('TASK-293', '[SMOKE-001] Criar script scripts/smoke-prod.mjs com smoke test cross-role', 'feature', 'shelter', 'critical', '5-pós', B, [], ['regra-A', B, 'smoke', 'cross-role', 'gate-release'],
    'Script Playwright que: (1) login como applicant, submete application; (2) login como abrigo admin, aprova; (3) login como abrigo admin, gera contrato; (4) login como adotante, assina; (5) login como abrigo, vê pós-adoção criado. Roda contra staging. Verifica cada flag SHELTER_* ON. CI gate: bloqueia merge se falhar. Adicionar a npm run smoke:prod.'),
  mk('TASK-294', '[LGPD-EXPORT-001] dataExportService.js: garantir export completo de PII (LGPD art. 18 V)', 'security', 'shelter', 'critical', '3-regras', B, [], ['regra-A', B, 'lgpd', 'export', 'art-18-V'],
    'Auditar dataExportService.js. Garantir export de: pets do usuário, applications (submitted + received), mensagens, donations, terms_acceptances, audit_logs pessoais (actor_id == uid). Formato JSON ZIP. Botão "Baixar meus dados" no /profile (não gated). Audit log do próprio export. DPO assina.'),
  mk('TASK-295', '[LGPD-DELETE-001] deleteAccountService.js: garantir anonimização LGPD art. 18 VI', 'security', 'shelter', 'critical', '3-regras', B, [], ['regra-A', B, 'lgpd', 'delete', 'anonimizacao', 'art-18-VI'],
    'Auditar deleteAccountService.js. Soft delete + purge em 30 dias. Anonimizar: users/{uid}.displayName → "Usuário removido", email → "[removido]", cpf → null, foto → deletada. Manter audit_logs agregados (6 meses — Marco Civil). Confirmação dupla (email + senha).'),
  mk('TASK-296', '[INTEL-001] Hardening de CreatePet.jsx: step de Cadastro de Resgate', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'intake', 'create-pet', 'resgate'],
    'Adicionar step "Resgate" no wizard (STEPS = ["Fotos", "Sobre", "Resgate", "Saúde", "Revisão"]). Campos: rescue_name, rescue_date, rescue_by_uid, rescue_location (address+city+state+lat+lng), microchip_id, intake_type (5 valores), asilomar_status (5 valores). Componente RescueStep.jsx. Microcopy explicando o que é Asilomar Status.'),
  mk('TASK-297', '[CONTRACT-002] Hash SHA-256 do documento no aceite', 'feature', 'shelter', 'high', '3-regras', B, ['TASK-288'], ['regra-A', B, 'contract', 'hash', 'sha256'],
    'SingleAcceptanceDialog calcula hash do ADOPTION_TERMS_TEXT + version. Persiste no contracts/{id}.document_hash. Audit log inclui o hash. Adicionar validação no firestore.rules que o hash bate com adoptionTerms.js versão.'),
  mk('TASK-298', '[CONTRACT-003] IP + user-agent no aceite do termo', 'security', 'shelter', 'high', '3-regras', B, ['TASK-288'], ['regra-A', B, 'contract', 'ip', 'user-agent', 'lei-14063'],
    'createAcceptance captura __CF_CONNECTING_IP (header) e navigator.userAgent no momento do aceite. Persiste em contracts/{id}.signature_ip, .signature_user_agent. Audit log redundante. Lei 14.063/2020 art. 6º.'),
  mk('TASK-299', '[SEC-001] Rate limit em mutations client-side sensíveis', 'security', 'shelter', 'high', '3-regras', B, [], ['regra-A', B, 'rate-limit', 'security', 'mutations'],
    'Adicionar throttle em: submit application (max 5/min/user), accept foster (max 3/min/user), decide application (max 10/min/abrigo), update pet (max 30/min/user). Implementar via Firestore rules usando request.time + counter collection, OU client-side debounce com toast warning.'),
  mk('TASK-300', '[MULTI-001] adoptionService.decideApplication: checar isClubOwnerOrAdmin no service', 'security', 'shelter', 'high', '3-regras', B, [], ['regra-A', B, 'multi-tenant', 'defense-in-depth', 'adoption'],
    'Hoje adoptionService.js:267-273 assume "se não é applicant, é abrigo". Adicionar checagem explícita if (!isApplicant && !isClubOwnerOrAdmin(shelterClubId)) throw new Error(...). Importar helper de permissions.js. Firestore rules compensam mas defense-in-depth.'),
  mk('TASK-301', '[PERM-001] Validar termo version aceito contra ADOPTION_TERMS_VERSION atual', 'security', 'shelter', 'high', '3-regras', B, ['TASK-288'], ['regra-A', B, 'termo', 'version', 'validation'],
    'submitAdoptionApplication rejeita se terms_version !== ADOPTION_TERMS_VERSION (constante importada). Mensagem clara: "Termo desatualizado, recarregue a página". Previne aceitação de versão antiga em cache.'),
  mk('TASK-302', '[MOBILE-001] Auditoria mobile (a11y + touch targets) em todas as páginas do fluxo', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'mobile', 'a11y', 'auditoria'],
    'Auditar com DevTools mobile + axe-core. Garantir: touch targets >= 44px, contraste WCAG AA, keyboard nav em todos os dialogs, ARIA labels em forms, swipe em galleries, bottom-sheet em mobile (não modal centralizado). Páginas: CreatePet, PetDetail, AdoptionFormFill, ApplicationsList, FostersList, Dashboard, Kanban (drag alternative). Teste em viewport 375x667 (iPhone SE) e 412x915 (Pixel 7).'),
  mk('TASK-303', '[UX-ABRIGO-001] Página pública /abrigos/:id rica com 3 CTAs (Adotar/Voluntário/LT)', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'abrigo', 'publico', 'cta-3-jornadas'],
    'Componente ShelterPublicPage.jsx com capa + chips + tabs (Sobre, Pets, Vitrines, Equipe, Contato). 3 CTAs integrados: "Quero adotar" (link feed filtrado), "Quero ser voluntário" (modal/signup), "Quero ser lar temporário" (modal/signup). Mobile-first. Open Graph meta. ClubDetail é a base; refatorar.'),
  mk('TASK-304', '[UX-APP-001] Página "Minha Application" pro adotante', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'application', 'adotante', 'dashboard'],
    'Rota /meus-pedidos (separado de /meus-interesses legacy). Lista applications do adoption_workflow com timeline do status (submited → under_review → interview_scheduled → approved → contract_signed). Filtros: status, pet, abrigo. Detalhe com decisão do abrigo visível.'),
  mk('TASK-305', '[UX-FOSTER-001] Página pública /lares-temporarios/novo + perfil público do LT', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'foster', 'publico', 'perfil-lt'],
    'Cadastro público de LT (gated por feature flag). Perfil público /lares-temporarios/:uid (consentido) com foto, capacidade, região, histórico de adoções do LT. CTA "Quero ser LT" na home e em cada pet elegível.'),
  mk('TASK-306', '[UX-FOSTER-002] Dashboard pessoal do LT + UI devolução/avaliação', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'foster', 'dashboard', 'devolucao'],
    'Rota /lares-temporarios/dashboard (gated). Cards: "Pets sob minha guarda agora", "Próximos fins de placement (7d)", "Histórico de adoções do LT". UI dedicada pra markAsReturned, endFosterPlacement (rating + feedback).'),
  mk('TASK-307', '[UX-CONTRACT-001] UI dedicada de contratos no abrigo + download PDF', 'feature', 'shelter', 'high', '1-ux', B, ['TASK-288'], ['regra-A', B, 'contract', 'ui-dedicada', 'pdf'],
    'Rota /abrigos/:id/contracts. Lista todos os contracts do abrigo. Filtros: pet, adotante, data, status. Botão "Baixar PDF" (jspdf). Botão "Ver detalhes" (modal com hash, IP, user-agent, signature).'),
  mk('TASK-308', '[UX-POSTADOPT-001] UI de devolução + pause', 'feature', 'shelter', 'high', '1-ux', B, ['TASK-289'], ['regra-A', B, 'post-adoption', 'devolucao', 'pause'],
    'Componente PostAdoptionReturnDialog.jsx (chamado pelo adotante). Componente PostAdoptionPauseDialog.jsx. UI no abrigo pra ver "devolvidos" (status returned) com timeline.'),
  mk('TASK-309', '[UX-ABRIGO-002] Onboarding wizard do abrigo (5 passos)', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'abrigo', 'onboarding', 'wizard'],
    'Componente ShelterOnboardingWizard.jsx com 5 steps: 1) Logo + capa, 2) Endereço, 3) Equipe (convidar primeiro admin), 4) Termos (DPA + aceite), 5) Primeiro pet. Salva progress em clubs/{clubId}/onboarding/wizard_state. Smoke test: novo abrigo é criado com 80%+ perfil completo.'),
  mk('TASK-310', '[UX-MATCH-001] Scoring de compatibilidade visível no ApplicationsList', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'match', 'scoring', 'compatibilidade'],
    'Reusar pets/domain/matching.js (lógica de compatibilidade). Adicionar score 0-100% no card da application. Badge "Match alto/medio/baixo". Permitir ordenar por score. Requer applicant_snapshot completo (já existe).'),
  mk('TASK-311', '[UX-ABRIGO-003] Dashboard pessoal do admin do abrigo', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'abrigo', 'dashboard-pessoal', 'admin'],
    'Cards filtrados por uid: "Minhas tasks pendentes" (kanban onde sou assignee), "Applications que me atribuíram", "Pets que cadastrei". Diferente do DashboardPage (que é do abrigo inteiro).'),
  mk('TASK-312', '[INT-SEARCH-001] Sync ativo do search index (Cloud Function onWrite)', 'feature', 'shelter', 'high', '4-int', B, [], ['regra-A', B, 'search', 'sync-ativo', 'cloud-function'],
    'Cloud Function onPetWrite que atualiza coleção search_pets/{petId} com campos normalizados (nome_lower, breed_tokens, location). Mesma estratégia pra users, clubs, fosters. Hooks useSmartSearch consomem o índice. Permitir "starts with" e combinações booleanas.'),
  mk('TASK-313', '[INT-IMPORT-001] UI de review/edit de pets importados via Google Forms', 'feature', 'shelter', 'high', '4-int', B, [], ['regra-A', B, 'import', 'google-forms', 'review'],
    'Componente ImportReview.jsx. Após webhook Google Forms criar pets com status="pending_review", listar no painel do abrigo pra revisar (faltam fotos? nome correto? castrado?). Bulk approve/reject. Caminho esperado: rota /abrigos/:id/imports.'),
  mk('TASK-314', '[INT-STORAGE-001] Storage dedicado para documentos veterinários + contracts', 'feature', 'shelter', 'high', '4-int', B, ['TASK-288'], ['regra-A', B, 'storage', 'documentos', 'contracts'],
    'Caminho pets/{pet_id}/medical/{record_id}/documents/{file} com rules de tipo (pdf, jpg, png) e tamanho (max 20MB). Caminho clubs/{clubId}/contracts/{contractId}/{file}. Storage rules com return explícito. Audit log de upload/delete.'),
  mk('TASK-315', '[UX-A11Y-001] Acessibilidade: keyboard nav, ARIA, contraste WCAG AA em todos os dialogs', 'feature', 'shelter', 'high', '1-ux', B, [], ['regra-A', B, 'a11y', 'keyboard', 'aria', 'wcag'],
    'Auditar axe-core em todas as páginas do fluxo. Corrigir: foco trap em dialogs, Escape fecha, tabIndex em forms, aria-label em botões de ícone, role em custom widgets (kanban, slider), contraste de badges, alt text em fotos. Lighthouse a11y >= 90.'),
  mk('TASK-316', '[UX-MOBILE-001] Bottom sheet em mobile (substituir modals)', 'feature', 'shelter', 'high', '1-ux', B, ['TASK-302'], ['regra-A', B, 'mobile', 'bottom-sheet', 'modal'],
    'Onde há modal centralizado hoje (DecisionModal em ApplicationsList, foster accept, etc), usar Dialog shadcn mas com sm:bottom-0 sm:rounded-b-none em viewport < 640px. Bottom sheet nativo em iOS, drawer em Android. Testar touch dismiss.'),
  mk('TASK-317', '[INT-CALENDAR-001] Integração com Google Calendar pra agendar entrevista + home check', 'feature', 'shelter', 'high', '4-int', B, ['TASK-290'], ['regra-A', B, 'calendar', 'google-calendar', 'oauth'],
    'OAuth2 Google Calendar. Botão "Agendar" no InterviewTab gera evento com attendees (abrigo + adotante). Sync bidirecional. Fallback se recusar. Cuidar LGPD: consentimento explícito pra compartilhar email.'),
  mk('TASK-318', '[UX-CONTRACT-002] Disclaimers destacados de vícios redibitórios (parvovirose etc)', 'feature', 'shelter', 'medium', '1-ux', B, ['TASK-288'], ['regra-A', B, 'contract', 'disclaimers', 'vicios'],
    'Texto destacado em <aside className="bg-amber-50 p-4 rounded"> dentro do aceite, exigindo checkbox separado "Estou ciente dos riscos de X, Y, Z" antes de prosseguir. Cobre juridicamente o abrigo.'),
  mk('TASK-319', '[UX-CONTRACT-003] "Aceito por procuração" (representante legal)', 'feature', 'shelter', 'medium', '1-ux', B, ['TASK-288'], ['regra-A', B, 'contract', 'procuracao', 'representante'],
    'Checkbox "Represento outra pessoa" → form extra (nome completo, CPF do representado, parentesco, upload da procuração). Validação server-side.'),
  mk('TASK-320', '[INT-VIDEO-001] Integração Jitsi Meet pra vídeo-entrevista', 'feature', 'shelter', 'medium', '4-int', B, ['TASK-290'], ['regra-A', B, 'video', 'jitsi', 'entrevista'],
    'Botão "Iniciar vídeo" gera sala Jitsi efêmera (nome random + expira em 1h). LGPD: não gravar sem consent. Link compartilhado com entrevistado.'),
  mk('TASK-321', '[INT-CPF-001] Validação CPF na entrada (API Receita ou algoritmo)', 'feature', 'shelter', 'medium', '3-regras', B, [], ['regra-A', B, 'cpf', 'validacao', 'decisao-D-09'],
    'Server-side: validar dígitos verificadores. Opcional: chamar API pública (não há oficial gratuita; alternativa: validar formato + algoritmo). Audit log se usou API externa.'),
  mk('TASK-322', '[INT-WHATSAPP-001] Integração WhatsApp Business pra validação de telefone', 'feature', 'shelter', 'medium', '4-int', B, [], ['regra-A', B, 'whatsapp', 'telefone', 'validacao'],
    'Deep link https://wa.me/55... no perfil. Validação por OTP via API oficial (Twilio + WhatsApp Business). LGPD: consent explícito.'),
  mk('TASK-323', '[UX-VITRINE-001] Lightbox acessível na galeria do pet', 'feature', 'shelter', 'medium', '1-ux', B, ['TASK-315'], ['regra-A', B, 'vitrine', 'lightbox', 'a11y'],
    'Componente <Lightbox> com keyboard nav (←, →, Esc), swipe em mobile, ARIA dialog, fullscreen.'),
  mk('TASK-324', '[UX-SIMILAR-001] "Pets similares" no PetDetail', 'feature', 'shelter', 'medium', '1-ux', B, [], ['regra-A', B, 'vitrine', 'similares', 'recomendacao'],
    'Query "same species + same size + available + not this pet" ordenado por rescue_date. Mostrar 4 cards.'),
  mk('TASK-325', '[UX-MILESTONE-001] Foto/video upload pro adotante completar milestone', 'feature', 'shelter', 'medium', '1-ux', B, ['TASK-289'], ['regra-A', B, 'post-adoption', 'milestone', 'upload'],
    'Componente MilestoneCompleteDialog.jsx. Upload direto pra Storage (kanban_tasks/{taskId}/proof/{file}). Mostra foto no card do milestone. Comemoração visual (confetti leve).'),
  mk('TASK-326', '[UX-FOSTER-003] Vitrine do LT (histórico público de pets que passaram)', 'feature', 'shelter', 'medium', '1-ux', B, ['TASK-305'], ['regra-A', B, 'foster', 'vitrine', 'historico'],
    '/lares-temporarios/:uid/historico — lista pets que passaram pelo LT com consent (filtro consent_to_show_history == true). Foto + nome + status final.'),
  mk('TASK-327', '[DEP-CUTOVER-001] Cutover plan detalhado por fase + dry-run script', 'feature', 'shelter', 'medium', '5-pós', B, ['TASK-293', 'TASK-302'], ['regra-A', B, 'cutover', 'plan', 'dry-run'],
    'Documento docs/CUTOVER_PLAN.md com: ordem de ligar flags, smoke por flag, rollback procedure por flag, métricas de sucesso. Script scripts/dry-run-cutover.mjs que valida sem aplicar.'),
  mk('TASK-328', '[REFACTOR-001] Substituir window.prompt em FostersList.jsx por modal shadcn', 'refactor', 'shelter', 'low', '1-ux', B, [], ['regra-A', B, 'refactor', 'modal', 'window-prompt'],
    'handleExtend e handleEnd usam window.prompt — não é UX aceitável. Substituir por Dialog shadcn com form.'),
);

// === AGENTE C — COMUNIDADE + ADOTANTE + EVENTOS (TASK-329 a TASK-360, 32 tasks) ===
const Csub = 'comunidade-adotante-eventos';
tasks.push(
  mk('TASK-329', '[SEC-CRITICAL] Tighten firestore.rules em community_events, community_posts/comments, community_forum_* (multi-tenant + ownership)', 'security', 'communities', 'critical', '3-regras', Csub, [], ['regra-A', Csub, 'security', 'multi-tenant', 'rules', 'blocker', 'CRITICAL'],
    'CRITICAL: Aplicar correções em firestore.rules:1324-1327 (community_events), :1318-1322 (community_post_comments), :1351-1371 (community_forum_messages), :1329-1338 (community_forum_threads): validação de community_id + created_by + affectedKeys().hasOnly([...]) em update. Fechar brecha de cross-tenant + vandalismo. Sem isso, plataforma tem furo de segurança ativo.'),
  mk('TASK-330', '[SEC-HIGH] Fechar audit_logs create: if isAuth() → if false (client não escreve; só Admin SDK)', 'security', 'core', 'high', '3-regras', Csub, ['TASK-329'], ['regra-A', Csub, 'security', 'audit-log', 'admin-sdk', 'HIGH'],
    'Mover createAuditLog em core/services/auditService.js para Cloud Function (Admin SDK). Client chama onCall("createAuditLog", {...}) ao invés de escrever direto. Fechar poluição de audit log. Severity: HIGH.'),
  mk('TASK-331', '[LGPD-EXPORT] Estender dataExportService.exportMyData: incluir community_posts, community_forum_messages, community_memberships, community_post_comments, club_chat_messages', 'feature', 'core', 'critical', '3-regras', Csub, [], ['regra-A', Csub, 'lgpd', 'export', 'art-18-V'],
    'Estender dataExportService.exportMyData para incluir dados de comunidade + chat. Conformidade Art. 18 V LGPD. Lista atual: users/, pets/, adoption_interests, club_members, notifications, abuse_reports, adoption_ratings, conversations. Falta: dados de comunidade, eventos, mensagens de chat, comentários, likes.'),
  mk('TASK-332', '[LGPD-DELETE] Estender deleteAccountService.deleteMyAccount: purgar community_memberships, community_posts, community_forum_messages, club_chat_messages, community_post_likes', 'feature', 'core', 'critical', '3-regras', Csub, [], ['regra-A', Csub, 'lgpd', 'delete', 'art-18-VI'],
    'Estender deleteAccountService.deleteMyAccount para soft-delete + job de purga. Conformidade Art. 18 VI LGPD. Provavelmente só desativa users/ — verificar e cobrir comunidade.'),
  mk('TASK-333', 'Zod schemas para communityService (createPost, createCommunityEvent, createForumThread, addThreadMessage)', 'refactor', 'communities', 'high', '3-regras', Csub, ['TASK-329'], ['regra-A', Csub, 'zod', 'defense-in-depth'],
    'Criar domain/schemas.js em src/modules/communities/domain/. Aplicar safeParse em todos os writes. communityService.createPost sem Zod (text sem max 4000). createCommunityEvent sem Zod. createForumThread sem Zod (title max, text max, attachments max). addThreadMessage sem Zod. Defense-in-depth.'),
  mk('TASK-334', 'Página pública de evento individual + RSVP em comunidade (/comunidade/:id/evento/:eventId)', 'feature', 'communities', 'high', '1-ux', Csub, ['TASK-329'], ['regra-A', Csub, 'evento', 'publico', 'rsvp'],
    'Espelhar EventDetail.jsx (ONG) para comunidade. Criar src/modules/communities/pages/CommunityEventDetail.jsx + EventParticipantsPanel.jsx (community version) com going/maybe/not_going.'),
  mk('TASK-335', 'Smart Search: adicionar entity event (community + club) e community', 'feature', 'communities', 'high', '4-int', Csub, [], ['regra-A', Csub, 'search', 'smart-search', 'entity-nova'],
    'Estender search.js:42-121 com SEARCH_ENTITIES.event (filterable: club_id, community_id, type, starts_at, city) e SEARCH_ENTITIES.community (filterable: city, state, name).'),
  mk('TASK-336', 'Cloud Functions para notificações de comunidade (post_created, post_liked, post_commented, event_created)', 'feature', 'communities', 'high', '4-int', Csub, [], ['regra-A', Csub, 'cloud-function', 'notificacoes', 'comunidade'],
    'Adicionar functions/communityNotifications.js com triggers onCreate community_posts, onCreate community_post_likes, onCreate community_post_comments, onCreate community_events. Chamar notificationService.notifyUser.'),
  mk('TASK-337', 'Cloud Function scheduled para reminder de evento (24h antes)', 'feature', 'communities', 'high', '4-int', Csub, [], ['regra-A', Csub, 'cloud-function', 'cron', 'reminder'],
    'Adicionar functions/eventReminderCron.js com schedule diário. Varre community_events + club_events com starts_at entre now e now+25h, dispara EVENT_REMINDER.'),
  mk('TASK-338', 'Feature flags novas: SHELTER_ADOPTER_DASHBOARD_V1, SHELTER_EVENTS_V1, SHELTER_ADOPTER_PROFILE_V1, SHELTER_SPONSORED_COMMUNITY_V1, SHELTER_COMMUNITY_RICH_EVENTS_V1, SHELTER_COMMUNITY_CHAT_V1, SHELTER_FCM_PUSH_V1', 'feature', 'core', 'high', '5-pos', Csub, [], ['regra-A', Csub, 'feature-flags', 'novas-flags'],
    'Adicionar 7 novas flags em src/core/featureFlags.js, todas default OFF. Painel admin /admin/flags lista automaticamente.'),
  mk('TASK-339', 'Dashboard unificado do Adotante (/meu-painel)', 'feature', 'adopter', 'high', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'adotante', 'dashboard', 'centralizado'],
    'Criar src/modules/adopter/pages/AdopterDashboard.jsx. Cards: "X adoções finalizadas, Y em processo, Z pets favoritos, perfil completo %, próximas milestones de pós-adoção, notificações não lidas".'),
  mk('TASK-340', 'Tipos de evento amplos (vacinação, palestra, fundraising, pet day)', 'feature', 'organizations', 'high', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'evento', 'tipos-amplos'],
    'Adicionar VACCINATION, LECTURE, FUNDRAISING, PET_DAY em CLUB_EVENT_TYPE (organizations/domain/constants.js:132-137). Atualizar labels e UI em EventFormDialog.jsx.'),
  mk('TASK-341', 'Vínculo evento ↔ pet (pet_ids: []) + UI de seleção', 'feature', 'organizations', 'high', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'evento', 'pet', 'vinculacao'],
    'Adicionar pet_ids: string[] em club_events. Multi-select no EventFormDialog.jsx (populado de pets do abrigo). Mostrar pets vinculados no EventDetail.jsx.'),
  mk('TASK-342', 'Vínculo evento ↔ voluntário (interface com Agente A) [INT-CA-01]', 'feature', 'organizations', 'high', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'evento', 'voluntario', 'interface-agente-A', 'INT-CA-01'],
    'Adicionar volunteer_ids: string[] + volunteer_shifts: [{date, role, slots}] em club_events. Multi-select no EventFormDialog.jsx (populado de clubs/{clubId}/volunteers). Mostrar escalas no EventDetail.jsx. Bloqueado pela entrega do Agente A (TASK-267/280).'),
  mk('TASK-343', 'Certificados de evento (storage + download PDF)', 'feature', 'organizations', 'medium', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'evento', 'certificado', 'pdf'],
    'Criar event_certificates/{userId_eventId} em Storage. Job pós-evento gera PDF (via Cloud Function com pdf-lib ou similar) e atualiza club_events.certificates. UI no MyEvents com botão "Baixar certificado".'),
  mk('TASK-344', 'Export .ics (Google Calendar + iCal)', 'feature', 'organizations', 'medium', '1-ux', Csub, [], ['regra-A', Csub, 'evento', 'ics', 'google-calendar'],
    'Adicionar botão "Adicionar ao Google Calendar" no EventDetail.jsx. Gera URL https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=.... Botão "Baixar .ics" chama Cloud Function que retorna text/calendar.'),
  mk('TASK-345', 'Notificações FCM push (não in-app)', 'feature', 'core', 'medium', '4-int', Csub, ['TASK-336', 'TASK-338'], ['regra-A', Csub, 'fcm', 'push', 'real-time'],
    'Integrar Firebase Cloud Messaging. notificationService.notifyUser envia in-app (sino) + push se token FCM existir em users/{uid}.fcm_tokens. Adicionar useFCMToken hook.'),
  mk('TASK-346', 'Página "Meus eventos" (/meus-eventos) com 3 tabs (Criei, Participo, Fui convidado)', 'feature', 'events', 'medium', '1-ux', Csub, ['TASK-334'], ['regra-A', Csub, 'evento', 'meus-eventos'],
    'Criar src/modules/events/pages/MyEvents.jsx. Query club_event_rsvps filtrando por user_id. Tabs: going/maybe/not_going. Cards com link pro EventDetail.'),
  mk('TASK-347', 'Busca global de comunidades (text + city + state)', 'feature', 'communities', 'medium', '1-ux', Csub, ['TASK-335'], ['regra-A', Csub, 'comunidade', 'busca', 'descoberta'],
    'Estender CommunitiesDirectory.jsx com campo de busca. Wire-up com searchService.search({entity: "community", query, filters}).'),
  mk('TASK-348', 'Convite de membros para comunidade (search user + invite + status pending/accepted/declined)', 'feature', 'communities', 'medium', '1-ux', Csub, [], ['regra-A', Csub, 'comunidade', 'convite', 'membro'],
    'Espelhar MEMBER_INVITE_STATUS da ONG. Adicionar community_invites/ collection. UI em CommunityTeamTab.jsx com "Convidar membro" + lista de pendentes. Rules em firestore.rules.'),
  mk('TASK-349', 'Chat admin de comunidade (canal onde admin fala com membros)', 'feature', 'communities', 'medium', '1-ux', Csub, ['TASK-338'], ['regra-A', Csub, 'comunidade', 'chat', 'admin'],
    'Espelhar club_chat_threads para community_chat_threads. UI em CommunityAdminPanel.jsx (aba nova) + sino de mensagens.'),
  mk('TASK-350', 'Auditoria: cobrir community_post_liked, community_post_commented, community_event_rsvp, community_event_created, community_event_deleted, community_forum_thread_created', 'feature', 'core', 'medium', '3-regras', Csub, ['TASK-330'], ['regra-A', Csub, 'auditoria', 'audit-log', 'acoes-faltando'],
    'Adicionar constantes em AUDIT_ACTION_LABELS (auditService.js:5-76). Chamar createAuditLog em cada service.'),
  mk('TASK-351', 'Auditoria: adicionar target_user_id e correlation_id em audit_logs', 'refactor', 'core', 'medium', '3-regras', Csub, ['TASK-330'], ['regra-A', Csub, 'auditoria', 'audit-log', 'schema'],
    'Estender schema de audit_logs. Atualizar todas as createAuditLog calls com target_user_id quando aplicável. Migration path.'),
  mk('TASK-352', 'Posts fixados / destaque (campo pinned em community_posts)', 'feature', 'communities', 'medium', '1-ux', Csub, [], ['regra-A', Csub, 'comunidade', 'post-fixado', 'destaque'],
    'Adicionar pinned: boolean + pinned_at. UI no MuralTab.jsx com carrossel/banner no topo. Permissão: admin/owner.'),
  mk('TASK-353', 'Empty states ricos em CommunityDetail (404 comunidade)', 'refactor', 'communities', 'low', '1-ux', Csub, [], ['regra-A', Csub, 'empty-state', '404'],
    'Substituir <div>Comunidade não encontrada</div> (CommunityDetail.jsx:107) por <EmptyState icon={Building2} title="..." description="..." action={<Button>Voltar</Button>} />.'),
  mk('TASK-354', 'Onboarding contextual (primeiro Acesso) na comunidade', 'feature', 'communities', 'low', '1-ux', Csub, [], ['regra-A', Csub, 'comunidade', 'onboarding', 'tooltip'],
    'Tooltips em CommunityDetail.jsx na primeira visita: "Como participar", "Como postar", "Como abrir tópico". Usar localStorage para flag "visto".'),
  mk('TASK-355', 'Adimplência: is_paid, price_cents, currency em club_events + flow de pagamento Pix', 'feature', 'organizations', 'low', '3-regras', Csub, [], ['regra-A', Csub, 'evento', 'pagamento', 'adimplencia', 'decisao-D-05'],
    'Adicionar campos. Bloqueado pela TASK-340 (tipos). Integrar com Mercado Pago ou similar. Decisão de arquitetura: pricing/payment é blocker? Decisão humana + DPO + jurídico.'),
  mk('TASK-356', 'Smart Search entity adopter_profile (housing, budget, has_children, etc.)', 'feature', 'core', 'low', '4-int', Csub, [], ['regra-A', Csub, 'search', 'adopter', 'smart-search'],
    'Adicionar entity que lê users/{uid}/adopter_profile/. Filtrar por shelter_club_id para multi-tenant.'),
  mk('TASK-357', 'Audit log retention policy (purga > 5 anos via Cloud Function scheduled)', 'feature', 'core', 'low', '5-pos', Csub, ['TASK-330'], ['regra-A', Csub, 'auditoria', 'audit-log', 'retention', 'purga'],
    'Job diário que deleta audit_logs com created_at_ms < now - 5*365*86400*1000.'),
  mk('TASK-358', 'Smoke tests Playwright: Comunidade + Eventos + Adotante (cross-role)', 'test', 'core', 'medium', '5-pos', Csub, ['TASK-338'], ['regra-A', Csub, 'smoke', 'playwright', 'e2e'],
    'Criar tests/e2e/community.spec.mjs, tests/e2e/events.spec.mjs, tests/e2e/adopter.spec.mjs. Validar anonymous → adopter → admin em cada fluxo.'),
  mk('TASK-359', 'Smoke test em produção pra Comunidade + Eventos + Adotante', 'chore', 'core', 'medium', '5-pos', Csub, ['TASK-338', 'TASK-358'], ['regra-A', Csub, 'smoke', 'producao'],
    'scripts/smoke-comunidade.mjs, scripts/smoke-eventos.mjs, scripts/smoke-adotante.mjs. Rodar com flag OFF primeiro, depois ON.'),
  mk('TASK-360', 'Analytics: funil de adoção + funil de evento + funil de feed', 'feature', 'core', 'low', '5-pos', Csub, ['TASK-338'], ['regra-A', Csub, 'analytics', 'funil'],
    'Adicionar logEvent Firebase Analytics em pontos chave: adotante_clicou_interesse, application_enviada, match, adocao_finalizada, evento_visto, rsvp_confirmado, evento_compareceu, feed_visto, post_curtido, post_comentado.'),
);

// === ADICIONAR ===
let added = 0, skipped = 0;
for (const t of tasks) {
  const exists = data.tasks.find(x => x.id === t.id);
  if (exists) { skipped++; continue; }
  data.tasks.push(t);
  added++;
}

data.generatedAt = NOW_ISO;
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`OK: added=${added} skipped=${skipped} total=${data.tasks.length}`);
console.log(`Range: TASK-263 a TASK-${263 + added - 1}`);
console.log(`Por agente:`);
console.log(`  A (Voluntários): TASK-263 a TASK-287 (25)`);
console.log(`  B (Abrigos/Foster/Adoção): TASK-288 a TASK-328 (41)`);
console.log(`  C (Comunidade/Adotante/Eventos): TASK-329 a TASK-360 (32)`);
console.log(`Total: 98 tasks consolidadas.`);

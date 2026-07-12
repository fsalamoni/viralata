// .harness/_add-decisions-2026-07-11.cjs
// Adiciona 11 tasks de decisão humana pendente + decisão .tmp-legal-docs
// TASK-361 (.tmp-legal-docs) + TASK-362..371 (D-01..D-10)
// Baseado em .harness/_consolidation-2026-07-11.md §1.4
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const TODAY = '2026-07-11';
const NOW_ISO = '2026-07-11T21:55:00-03:00';

const mk = (id, title, type, category, priority, status, owner, blockedBy, tags, description) => ({
  id,
  title,
  type,
  category,
  status,
  priority,
  owner,
  branch: null,
  worktree: null,
  tags,
  blockedBy,
  description,
  createdAt: TODAY,
  updatedAt: TODAY,
});

const tasks = [];

// TASK-361: .tmp-legal-docs/ destino
tasks.push(mk(
  'TASK-361',
  'Decisão: destino de .tmp-legal-docs/ (13 files, 71KB, untracked)',
  'chore', 'docs', 'high', 'ready', 'human', [],
  ['hold', 'tmp-legal-docs', 'decisao-humana', 'housekeeping'],
  'Estado: 13 files, 70883 bytes (~71KB), untracked em D:\\viralata\\worktrees\\wt-e79e15ca\\.tmp-legal-docs\\. Range: 00_Guia_Implementacao_Legal.md → 12_Termo_Adesao_Abrigos_ONG.md. Gerados pelo auto-import do Google Forms na fase legal v2, ficaram fora do commit cdaac20.\n\n**3 caminhos (origem do transcript lock 174):**\n(a) commit + push — `git add .tmp-legal-docs && git commit && git push` — polui o PR, dificulta review\n(b) descartar — `mavis-trash .tmp-legal-docs` — recuperável via OS Trash\n(c) archive — `mv .tmp-legal-docs .harness/archive/legal-v2-raw/` — mantém audit trail\n\n**Recomendação:** (b) — mavis-trash é recuperável, LEGL-201 v2 já está na main via wt-e79e15ca, a fonte raw provavelmente não agrega.\n\nOrigem: discussão no transcript lock do wt/e79e15ca, registrada no AGENTS.md §3.'
));

// TASK-362 (D-01): Foster = Voluntário?
tasks.push(mk(
  'TASK-362',
  '[D-01] Decisão: Foster = Voluntário com capability especial?',
  'decision', 'shelter', 'high', 'ready', 'human', [],
  ['decisao-humana', 'D-01', 'foster', 'voluntario', 'schema'],
  'Origem: INT-AB-02 (Agente A) + INT-BA-04 (Agente B). Foster (clubs/{clubId}/fosters/{fosterId}) tem foster_uid. Pergunta em aberto: o foster é modelado como VOLUNTÁRIO + papel adicional, ou é uma entidade separada?\n\n**Opções:**\n(a) Foster = Voluntário com `is_foster: true` no roster + entry separada em fosters (overlap mínimo)\n(b) Foster = entidade totalmente separada (atual, com `foster_uid` próprio)\n(c) Forking — voluntário pode ter flag `foster_eligible`, mas foster é sempre doc separado\n\n**Impacto:** Schema de `clubs/{clubId}/volunteers/{uid}`, schema de `clubs/{clubId}/fosters/{fosterId}`, UI no painel do abrigo (mesclar ou separar abas), Cloud Functions de notify (FCM ao LT vs voluntário), permissões granulares (TASK-267 + TASK-280).\n\n**Recomendação:** (c) — mais flexível, evita retrabalho em TASK-243 (atribuições finas de voluntários) e TASK-274 (capability matrix). Decisão bloqueia implementação de TASK-274, TASK-275 e TASK-326.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-01.'
));

// TASK-363 (D-02): Aba Voluntários vs Equipe
tasks.push(mk(
  'TASK-363',
  '[D-02] Decisão: Aba Voluntários vs Equipe (mesclar ou separar)?',
  'decision', 'shelter', 'medium', 'ready', 'human', [],
  ['decisao-humana', 'D-02', 'ux', 'painel-abrigo', 'mesclar-separar'],
  'Origem: INT-AB-10 (Agente A). ClubTeamTab.jsx (linha 99) mostra useClubMembers (membros da ONG). Voluntários (TASK-263..287) é lista separada. Decisão UX: mesclar em uma única aba "Pessoas" (sub-tabs: Equipe / Voluntários) ou manter separadas?\n\n**Opções:**\n(a) Separar — abas distintas "Equipe" e "Voluntários" (UX mais limpo, fácil de entender pra cada papel)\n(b) Mesclar — aba "Pessoas" com sub-tabs "Equipe" e "Voluntários" (visão unificada, mais cliques pra chegar)\n(c) Mesclar mas sem sub-tabs — lista única filtrável por tipo (poder e complexidade)\n\n**Impacto:** TASK-263 (CTA público), TASK-264 (JoinVolunteerModal), TASK-274 (atribuições finas), OrganizationAdminPanel.jsx (estrutura de tabs).\n\n**Recomendação:** (a) — separação clara, especialmente porque voluntário pode também ser membro (papel duplo INT-AB-03) e mesclar confunde. Decisão bloqueia implementação de TASK-263 e TASK-274.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-02.'
));

// TASK-364 (D-03): Reputação de voluntário (horas → score)
tasks.push(mk(
  'TASK-364',
  '[D-03] Decisão: Reputação de voluntário (horas → score) ou sem gamificação?',
  'decision', 'community', 'low', 'ready', 'human', [],
  ['decisao-humana', 'D-03', 'gamificacao', 'reputacao', 'produto'],
  'Origem: INT-AB-09 (Agente A). Após adoção, o adotante tem rating (adoption_ratings). Pergunta: voluntário que ajudou na adoption deveria ter bônus de reputação? Métrica: "horas_voluntariadas".\n\n**Opções:**\n(a) Sem score — voluntário não tem reputação, apenas log de horas\n(b) Score simples — `volunteer_reputation: 0-100` baseado em horas_logged_total + participations_count + bg_check_status\n(c) Score com badges — same as (b) + badges de "Voluntário Bronze/Prata/Ouro" + leaderboard\n\n**Impacto:** Schema de clubs/{clubId}/volunteers/{uid} (campo `reputation_score`), UI (badge no roster), Cloud Function para atualizar score (cron?), gamificação (pode ser feature, não obrigação).\n\n**Recomendação:** (b) — score simples sem leaderboard, LGPD-friendly (não expõe ranking). Decisão de produto + DPO. NÃO bloqueia nenhum trabalho de TASK-263..287 (que já tem estrutura sem reputation).\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-03.'
));

// TASK-365 (D-04): Email transacional: SendGrid vs Resend
tasks.push(mk(
  'TASK-365',
  '[D-04] Decisão: Email transacional — SendGrid vs Resend (LGPD + data center BR)',
  'decision', 'infra', 'critical', 'ready', 'human', ['TASK-291'],
  ['decisao-humana', 'D-04', 'email', 'sendgrid', 'resend', 'lgpd', 'blocker'],
  'Origem: TASK-291 (Agente B). Cloud Function sendEmail precisa de provedor.\n\n**Comparação:**\n- **SendGrid** (Twilio): Madura, tier grátis limitado (100/dia), data center EUA default (LGPD exige BAA/adequação), preço $19.95/mês Essentials.\n- **Resend**: Mais nova (2023), DX excelente, data center EU (Frankfurt default — adequado LGPD), preço $20/mês Pro, foco em transacional.\n- **Amazon SES**: Barato ($0.10/1000), maduro, mas configuração complexa, sandbox mode irritante.\n- **Mailgun**: Similar SendGrid, $35/mês Foundation.\n\n**Recomendação:** **Resend** — DX moderna, data center EU (mais próximo LGPD BR que EUA), preço similar. Mas DPO precisa validar a adequação à LGPD.\n\n**Impacto:** Bloqueia TASK-291 (EMAIL-001) e por consequência TASK-292 (FCM-001), TASK-268, TASK-269, TASK-270, TASK-276 (todas as Cloud Functions que usam email).\n\n**Severidade:** CRITICAL — sem email, sem notificações de adoption/match/milestone, que são LGPD compliance (Marco Civil Art. 15 + Lei 14.063/2020).\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-04.'
));

// TASK-366 (D-05): Payment gateway pra eventos pagos
tasks.push(mk(
  'TASK-366',
  '[D-05] Decisão: Payment gateway pra eventos pagos (Pix obrigatório)',
  'decision', 'events', 'low', 'ready', 'human-jurídico', [],
  ['decisao-humana', 'D-05', 'pagamento', 'pix', 'compliance', 'pci', 'lgpd'],
  'Origem: GAP-REG-05.1..05.4 (Agente C). club_events sem is_paid, price_cents, currency. Hoje tudo é gratuito. Tipos novos incluem FUNDRAISING (que pode ser pago).\n\n**Opções:**\n(a) **Stripe** — global, PCI DSS Level 1, suporta Pix BR, mas taxa 4% + R$0,39.\n(b) **Mercado Pago** — líder LATAM, taxa 4.99% + Pix grátis, checkout pro split, sandbox fácil.\n(c) **Pagar.me** — BR puro, taxa 4.99% + Pix 0.99%, foco em recorrência, Bunzl/Pagar.me group.\n(d) **Pagar com Pix direto (sem gateway)** — gerar QR Pix dinâmico, sem split. Requer PSP (Stripe Connect, MP, Pagar.me).\n(e) **Sem pagamento por enquanto** — eventos continuam gratuitos, fundraising via Doação normal (TASK-313 + club_donations).\n\n**Decisão de arquitetura:** Pricing/payment é blocker pra FUNDRAISING como tipo de evento?\n\n**Impacto:** Compliance PCI (LGPD), contrato jurídico, integração com Cloud Functions, schema de club_events (is_paid, price_cents, currency, payment_intent_id), reconciliação com club_ledger, UX (checkout flow), nota fiscal.\n\n**Severidade:** LOW se eventos pagos não forem requisito imediato. CRITICAL se a Fase 23 incluir eventos pagos. Decisão do user + DPO + Jurídico.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-05.'
));

// TASK-367 (D-06): FCM push real
tasks.push(mk(
  'TASK-367',
  '[D-06] Decisão: FCM push real (depende de app nativo?)',
  'decision', 'infra', 'high', 'ready', 'human', [],
  ['decisao-humana', 'D-06', 'fcm', 'push', 'app-nativo', 'pwa'],
  'Origem: GAP-INT-04.5 (Agente C) + TASK-292 (Agente B). FCM push real exige configuração no Firebase Console + App Check + service worker. **Push só funciona com app nativo OU service worker registrado**.\n\n**Opções:**\n(a) **Sem FCM push por enquanto** — usar só in-app (sino, notifications/) + email (TASK-291). Mais simples, sem dependência de app nativo.\n(b) **FCM em PWA** — service worker registra token, push funciona no Chrome/Edge desktop + Android. iOS Safari só a partir de iOS 16.4+ (2023).\n(c) **FCM em app nativo** — exige Capacitor/Ionic wrapper ou app nativo, custo de manutenção alto.\n\n**Recomendação:** (b) se user quiser push real agora (a PWA é web responsive, funciona em mobile via browser). (a) se preferir simplicidade primeiro.\n\n**Impacto:** Bloqueia TASK-292 (FCM-001), TASK-345 (FCM push não in-app), TASK-268/269/270/276 (FCM admin/voluntário/BG/digest).\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-06.'
));

// TASK-368 (D-07): DPO sign-off
tasks.push(mk(
  'TASK-368',
  '[D-07] Decisão: DPO sign-off antes de qualquer canário em prod',
  'decision', 'lgpd', 'critical', 'ready', 'human-jurídico', [],
  ['decisao-humana', 'D-07', 'dpo', 'lgpd', 'compliance', 'blocker'],
  'Origem: Múltiplas tasks LGPD (TASK-241, 248, 272, 287, 294, 295, 331, 332). Marco Civil Art. 15 (retenção 6 meses) + Lei 14.063/2020 (assinatura eletrônica) + LGPD Art. 18 (export/delete) exigem sign-off de DPO antes de qualquer feature de PII em produção, mesmo com flag OFF em abrigo canário.\n\n**Bloqueios:** TASK-241, 248, 272, 287, 294, 295, 331, 332 — todas precisam de DPO sign-off antes de canário.\n\n**Quem:** DPO humano. Pode ser o user + consultor externo, ou user sozinho se for DPO certificado.\n\n**Severidade:** CRITICAL — sem sign-off, plataforma ilegal por LGPD.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-07.'
));

// TASK-369 (D-08): Corte Fase 22 → 23 priorização Q3
tasks.push(mk(
  'TASK-369',
  '[D-08] Decisão: Corte da Fase 22 → 23 — priorização Q3 das 98 tasks',
  'decision', 'docs', 'high', 'ready', 'human', [],
  ['decisao-humana', 'D-08', 'roadmap', 'q3', 'priorizacao'],
  'Origem: .harness/_consolidation-2026-07-11.md §1.6 — estimativa de 6 sprints (12-15 semanas) pra cobrir os 12 blockers + 30 high + medium.\n\n**Pergunta:** Quais tasks entram no roadmap Q3 2026?\n\n**Opções:**\n(a) **Só os 12 blockers CRITICAL** (TASK-263-265, 288-292, 329, 331, 332) — 12 tasks, ~1 sprint.\n(b) **Blockers + high UX** (todos os 12 blockers + 18 high de UX público/mobile/a11y) — ~30 tasks, 3 sprints.\n(c) **Sprint 1 do roadmap sugerido** (TASK-141-148 do Agente B + TASK-141-145 do Agente C) — foco em LGPD + segurança + smoke.\n(d) **Tudo** — 6 sprints, 12-15 semanas. Cobre o backlog completo.\n\n**Recomendação:** Começar com (a) — 1 sprint de blockers, depois expandir. DPO sign-off (D-07) bloqueia vários.\n\n**Impacto:** Roadmap Q3, alocação de devs, priorização de MRs.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-08.'
));

// TASK-370 (D-09): Validação CPF
tasks.push(mk(
  'TASK-370',
  '[D-09] Decisão: Validação CPF (algoritmo local vs API)',
  'decision', 'shelter', 'medium', 'ready', 'human', [],
  ['decisao-humana', 'D-09', 'cpf', 'validacao', 'custo'],
  'Origem: GAP-INT-8.1 (Agente B) + TASK-321. Campo cpf é livre hoje (sem validação).\n\n**Opções:**\n(a) **Algoritmo local** — validar dígitos verificadores (Módulo 11), zero custo, offline. Não verifica se CPF é real/ativo, só formato.\n(b) **API Receita Federal** — oficial, mas não tem API pública gratuita. Alternativa: serpro.gov.br (pago, R$0.10/consulta em lote).\n(c) **API third-party (BrasilAPI, Invertexto, etc)** — grátis ou baixo custo, mas dependência externa e LGPD (compartilhar PII com terceiro).\n(d) **Sem validação** — manter campo livre, confiar no usuário.\n\n**Recomendação:** (a) + audit log se campo preenchido. Cobertura: 100% formato válido, mas 30-40% CPFs "válidos" podem ser fictícios (problema conhecido de validação só por DV). Para matching real com bases públicas, exige (b) ou (c).\n\n**Impacto:** TASK-321, schema de adopter_profile, Zod schema, audit log.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-09.'
));

// TASK-371 (D-10): Calendar
tasks.push(mk(
  'TASK-371',
  '[D-10] Decisão: Calendar integration — Google Calendar API vs Cal.com vs nada',
  'decision', 'shelter', 'medium', 'ready', 'human', [],
  ['decisao-humana', 'D-10', 'calendar', 'google-calendar', 'oauth', 'cal-com'],
  'Origem: TASK-170/317 (Agente B) + GAP-INT-5.1 (Agente B). Entrevistas e home checks precisam de scheduling.\n\n**Opções:**\n(a) **Google Calendar API** — OAuth2, sync bidirecional, ubiquitous. Complexidade: OAuth client setup + token refresh + handling.\n(b) **Cal.com** (ou similar) — open source, self-hosted, embed widget. Self-hosted exige infra, hosted tem tier grátis limitado.\n(c) **.ics download** (TASK-344 do Agente C) — usuário baixa, importa no calendar deles. Zero OAuth, simples, mas UX pior.\n(d) **Sem calendar** — coordenação manual (email + chat). Funciona pra MVP, escala ruim.\n\n**Recomendação:** (c) pra MVP (já tá no TASK-344 do Agente C), (a) quando entrevistas virarem volume.\n\n**Impacto:** TASK-317 (Agente B), TASK-170 (B), TASK-344 (C), OAuth flow, schema de interview.\n\nOrigem: .harness/_consolidation-2026-07-11.md §1.4 D-10.'
));

// Adicionar
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
console.log(`Range: TASK-361 a TASK-371`);
console.log('Tasks:');
tasks.forEach(t => console.log(`  ${t.id} [${t.priority}] ${t.title}`));

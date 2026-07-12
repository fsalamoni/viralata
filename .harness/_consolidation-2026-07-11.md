# Avaliação Independente (4 Olhos) + Consolidação — 2026-07-11 21:46

> **Sessão:** mvs_311d078987d0414a90f57ef28b789b18 (root)
> **Worktree:** D:\viralata\.worktrees\wt-e79e15ca
> **Status:** IN_PROGRESS (TASK-262)
> **Inputs:** 3 relatórios dos Task agents em `.harness/_report-{volunteers,shelter-foster-adoption,community-events}.md`

---

## 0. Resumo executivo

| Frente | Agente | Gaps | Tasks propostas | Cobertura | Blocker crítico |
|---|---|---|---|---|---|
| VOLUNTÁRIOS | A (ses_0ac40841) | 25 | 25 (TASK-232-256) | ~55% | 5 (UX público + perfil + atribuições) |
| ABRIGOS + FOSTER + ADOÇÃO | B (ses_0ac40840) | 47 | 41 (TASK-141-181) | ~70% | 3 (CONTRACT, POSTADOPT, INTERVIEW) |
| COMUNIDADE + ADOTANTE + EVENTOS | C (ses_0ac408406) | 42 | 32 (TASK-141-172) | ~49% | 4 (1 sec, 1 LGPD, 1 multi-tenant, 1 flag) |
| **TOTAL** | | **114** | **98** | **~58%** | **12** |

**Cobertura geral estimada: ~58%.** Há massa crítica (Fase 0–22 do SHELTER_MGMT_ROADMAP, mais Community/Adopter/Events em progresso), mas há **gaps de integração, UX público, LGPD compliance ponta-a-ponta, e segurança multi-tenant em comunidade**.

---

## 1. Reavaliação independente (4 olhos) — gaps entre agentes

### 1.1 Conflito de IDs entre Agente B e Agente C

**Problema:** Ambos Agente B e Agente C propuseram IDs `TASK-141..TASK-181` (B) e `TASK-141..TASK-172` (C). Conflito direto.

**Resolução aplicada:** Renumerar pra sequencial único após TASK-262 (minhas últimas):
- **Agente A (Voluntários):** TASK-232-256 → renumerar pra **TASK-263-287** (25 tasks)
- **Agente B (Abrigos/Foster/Adoção):** TASK-141-181 → renumerar pra **TASK-288-328** (41 tasks)
- **Agente C (Comunidade/Adotante/Eventos):** TASK-141-172 → renumerar pra **TASK-329-360** (32 tasks)

Total consolidado: **98 tasks novas** (TASK-263 a TASK-360).

### 1.2 Cross-check de interfaces (10 A↔B + 4 B↔A + 11 C↔A,B)

**Consolidação de interfaces** (sem implementação ainda, só registro pra resolver durante implementação):

| ID | Descrição | Origem | Envolvidos | Status |
|---|---|---|---|---|
| INT-AB-01 | Volunteer ↔ Exhibition (vincular voluntário a evento) | A | A + C | Decisão: TASK-244 (A) + TASK-354 (C) |
| INT-AB-02 | Foster = Voluntário com capability? | A + B | A + B | **DECISÃO PENDENTE** — same uid? |
| INT-AB-03 | Adotante ∩ Voluntário (papel duplo) | A | A + B | OK (multi-role, sem conflito) |
| INT-AB-04 | Volunteer Community (home unificado) | A | A + C | Decisão: TASK-234 (A) + TASK-348 (C) |
| INT-AB-05 | Termo pattern compartilhado (volunteer + adoption) | A + B | A + B | Sincronizar migração p/ `terms_acceptances/` |
| INT-AB-06 | Smart Search: volunteer entity | A | A + C | Coordenar (TASK-242 A + TASK-333 C) |
| INT-AB-07 | Volunteer Termo v2 + outras features Legais | A + C | A + C + B | Mesmo padrão |
| INT-AB-08 | Volunteer Notifications aggregation | A | A + C | Coordenar (TASK-237 A + TASK-336 C) |
| INT-AB-09 | Volunteer Hours ↔ Adopter Score | A | A + B | **DECISÃO DE PRODUTO** |
| INT-AB-10 | Admin Panel: nova aba Voluntários vs Equipe | A | A + C | UX decisao: separar ou mesclar |
| INT-BA-01 | Pet tem campo "voluntários responsáveis" | B | A + B | Coordenar (TASK-244 A + TASK-326 B) |
| INT-BA-02 | Voluntários como "Responsáveis" no card do pet | B | A + B | Decisão: TASK-244 (A) + nova (B) |
| INT-BA-03 | Vitrine: vinculação de voluntários a shifts | B | A + B | Coberto em TASK-244 |
| INT-BA-04 | Foster: voluntário pode também ser LT? | B | A + B | **DECISÃO PENDENTE** |
| INT-BC-01 | Adotante tem perfil completo (cross) | B | B + C | Integração boa, falta página pública (TASK-151 C + TASK-156 B) |
| INT-BC-02 | Eventos públicos (community_events + club_events) | B + C | B + C | Coordenar (TASK-151 C + TASK-156 B) |
| INT-BC-03 | Busca (Smart Search) | B + C | B + C | Coordenar (TASK-242 A + TASK-333 C) |
| INT-BC-04 | Mural do abrigo (voluntário posta) | B + C | A + B + C | OK (já existe ClubFeedTab) |
| INT-BC-05 | Doação (club_donations) | B + C | B + C | GAP: CTA de doar após match approved |
| INT-CA-01 | Vínculo evento ↔ voluntário | C | A + C | **BLOQUEIO CRUZADO** — depende de A entregar schema de volunteers |
| INT-CA-02 | Adotante tem dashboard de applications | C | B + C | Coordenar (TASK-142 B + TASK-340 C) |
| INT-CA-03 | Pets anteriores do adotante | C | B + C | Coordenar (GAP-UX-02.2 C + Adotante Profile B) |
| INT-CA-04 | Match visual "pets compatíveis" | C | B + C | Coordenar (Cloud Function já existe, falta UI) |
| INT-CA-05 | Vínculo evento ↔ pet | C | B + C | Coordenar (TASK-153 C + pets collection B) |
| INT-CA-10 | Voluntário na Comunidade (papel intermediário) | C | A + C | Coordenar (volunteer entity A + community_member C) |

**Total:** 25 interfaces mapeadas. **3 decisões pendentes que bloqueiam implementação:** INT-AB-02 (foster), INT-AB-04 (mesclar abas), INT-AB-09 (reputação de voluntário).

### 1.3 Gaps CRÍTICOS consolidados (cross-frente) — top 12 blockers

Em ordem de prioridade, considerando segurança + LGPD + blocker funcional:

| # | ID | Título | Agente | Severity | Bloqueia |
|---|---|---|---|---|---|
| 1 | **TASK-329** (C-141) | Tighten firestore.rules em `community_events`, `community_posts/comments`, `community_forum_*` (multi-tenant + ownership) | C | CRITICAL (sec) | Tudo de Comunidade/Eventos em prod |
| 2 | **TASK-330** (C-142) | Fechar `audit_logs` `create: if isAuth()` → `if false` (client não escreve; só Admin SDK) | C | HIGH (sec) | Audit log confiável |
| 3 | **TASK-288** (B-141) | Criar coleção `contracts/{contractId}` dedicada com Storage de PDF assinado | B | CRITICAL | LGPD + Lei 14.063/2020 |
| 4 | **TASK-289** (B-142) | UI do dashboard pessoal do adotante pós-adoção | B | CRITICAL | Pós-adoção completo |
| 5 | **TASK-290** (B-143) | Fluxo de entrevista dedicado (scheduling + checklist + record) | B | CRITICAL | Adoção completa |
| 6 | **TASK-291** (B-144) | SendGrid/Resend pra email transacional | B | CRITICAL | Notificações LGPD |
| 7 | **TASK-292** (B-145) | FCM push notifications | B | CRITICAL (depende 291) | Notificações real-time |
| 8 | **TASK-293** (B-146) | `scripts/smoke-prod.mjs` com smoke test cross-role | B | CRITICAL | Gate de release |
| 9 | **TASK-263** (A-232) | CTA "Quero ser voluntário" na página pública do abrigo | A | CRITICAL (UX) | Voluntários público |
| 10 | **TASK-264** (A-233) | Modal de inscrição de voluntário (JoinVolunteerModal) | A | CRITICAL (UX, depende 263) | Voluntários público |
| 11 | **TASK-331** (C-143) | LGPD export: incluir community_posts, community_forum_messages, community_memberships | C | CRITICAL (LGPD) | LGPD art. 18 V |
| 12 | **TASK-332** (C-144) | LGPD delete: purgar community_memberships, community_posts, community_forum_messages | C | CRITICAL (LGPD) | LGPD art. 18 VI |

### 1.4 DECISÕES HUMANAS pendentes (consolidadas)

| # | Decisão | Origem | Impacto | Quem decide |
|---|---|---|---|---|
| D-01 | Foster = Voluntário com capability especial? | INT-AB-02, INT-BA-04 | Schema + UI | Product (user) |
| D-02 | Aba Voluntários vs Equipe (mesclar ou separar) | INT-AB-10 | UX do painel abrigo | Product (user) |
| D-03 | Reputação de voluntário (horas → score) | INT-AB-09 | Gamificação | Product (user) |
| D-04 | Email transacional: SendGrid vs Resend | TASK-291 | Custo + LGPD (data center BR) | Platform (DPO + user) |
| D-05 | Payment gateway pra eventos pagos | GAP-REG-05.1-4 (C) | Compliance PCI + LGPD | Product + Jurídico |
| D-06 | FCM push real (depende de app nativo?) | GAP-INT-04.5 (C) | Setup Firebase | Platform (user) |
| D-07 | DPO sign-off antes de qualquer canário em prod | Múltiplas LGPD | Bloqueia release | DPO humano |
| D-08 | Corte da Fase 22 → 23: priorização Q3 | Tudo | Roadmap | Product (user) |
| D-09 | Validação CPF (algoritmo local vs API) | GAP-INT-8.1 (B) | Custo | Platform |
| D-10 | Calendar: Google Calendar API vs Cal.com vs nada | TASK-170 (B) | OAuth complexity | Platform |

### 1.5 Anti-patterns Regra A verificados (consolidado dos 3 agentes)

| Anti-pattern | Agente A | Agente B | Agente C | Total |
|---|---|---|---|---|
| Aba sem UX público | ❌ GAP (página abrigo sem CTA voluntário) | ❌ GAP (CTAs das 3 jornadas) | ❌ GAP (evento sem página pública) | 3 GAPs |
| Empty/error/loading state faltando | ⚠️ parcial | ⚠️ parcial | ⚠️ GAP em CommunityDetail:107 | 3 GAPs |
| Mobile + a11y em todas as telas | ⚠️ parcial | ❌ GAP (TASK-155) | ⚠️ parcial | 3 GAPs |
| Zod em cada mutation | ✅ 100% | ✅ 100% | ❌ GAP (4 mutations comunidade sem Zod) | 1 GAP |
| LGPD em PII em cada etapa | ⚠️ GAP (soft-delete, export) | ⚠️ GAP (auditoria dataExport/delete) | ❌ GAP (consent granular PII nova) | 3 GAPs |
| Multi-tenant shelter_id em cada coleção | ✅ 100% | ✅ 100% | ❌ **CRITICAL** (community_events sem validação) | 1 CRITICAL |
| Snapshot imutável em application | n/a | ✅ Confirmado | n/a | OK |
| Feature flag por sub-frente (não tudo junto) | ✅ OK | ✅ OK | ❌ GAP (faltam 7 flags) | 1 GAP |
| Smoke test cross-role | ❌ GAP (TASK-249) | ❌ GAP (TASK-146) | ❌ GAP (TASK-170, 171) | 3 GAPs |
| Auditoria de mudanças em cada etapa | ✅ OK | ✅ OK | ⚠️ GAP (5 ações faltando) | 1 GAP |
| Audit log fechado (client não escreve) | n/a | n/a | ❌ HIGH GAP (TASK-330) | 1 HIGH |
| Adimplência (gratuito vs pago) | n/a | n/a | ❌ GAP blocker se pago | 1 GAP |
| Milestones pós-adoption com cron <= now+90d | n/a | ✅ OK | n/a | OK |

**Síntese dos anti-patterns:**
- **3 CRITICAL/HIGH** que violam Regra A §1.7: TASK-329 (multi-tenant), TASK-330 (audit log aberto), TASK-331/332 (LGPD).
- **3 GAPs estruturais recorrentes** entre agentes: smoke test cross-role, UX público das jornadas, mobile + a11y.
- **1 GAP específico por frente** que vale atenção.

### 1.6 Estimativa de esforço (consenso dos 3 agentes)

| Sprint | Foco | Tasks | Estimativa |
|---|---|---|---|
| Sprint 0 (1-2 semanas) | Segurança + LGPD críticas | 329, 330, 288, 331, 332 | 5 tasks, 1 sprint |
| Sprint 1 (2 semanas) | Contrato + Pós-adoção + Email + LGPD + Smoke | 288-293, 331, 332 | 7 tasks, 1 sprint |
| Sprint 2 (2 semanas) | Voluntários público + Entrevista + FCM | 263-267, 290, 292, 293 | 8 tasks, 1 sprint |
| Sprint 3 (2-3 semanas) | UX abrigo rico + Applications + LT + Contrato UI | 295, 297, 298, 300, 304, 305, 311, 314 | 8 tasks, 2 sprints |
| Sprint 4 (2-3 semanas) | Eventos completos + Adotante dashboard + Integrações | 333-360 (subset) | ~15 tasks, 2 sprints |
| Sprint 5 (2 semanas) | Polish + Mobile + a11y + Bottom sheet + Analytics | 312, 313, 351-360 (resto) | ~10 tasks, 1 sprint |

**Total:** 6 sprints (12-15 semanas) pra cobrir os 12 blockers + 30 high + medium.

### 1.7 Recomendações (independente dos agentes)

1. **ANTES de qualquer MR novo:** resolver TASK-329 (rules community multi-tenant) + TASK-330 (audit log fechado). São furos de segurança ativos.
2. **LGPD compliance check** (DPO assina) ANTES de qualquer feature de PII novo entrar em prod, mesmo com flag OFF. DPO-001 é bloqueador.
3. **Padronizar padrão de aceite de termos** entre Adoção (B) e Voluntários (A) — ambos deveriam usar `terms_acceptances/` collection (já tem rule imutável). Decisão de arquitetura: unificar.
4. **Criar flag `SHELTER_CONTRACT_V1`** dedicada a contrato (não está hoje) + flag `SHELTER_POSTADOPTION_V1` dedicada a pós-adoção (não está hoje).
5. **Smoke test cross-role é gate de release** (não nice-to-have). Sem isso, "done" não é verificável.
6. **Priorizar feature flags** — TASK-150 do Agente C adiciona 7 flags. Sem elas, "ativar feature" = "ativar tudo", o que é perigoso.
7. **Atualizar AGENTS.md** com os blockers 329 e 330 como exceções à regra §1.3 "Firestore rules com return explícito" — já que essas **NÃO têm**.

---

## 2. Próximos passos do orquestrador

1. ✅ Marcar TASK-257/258/259/260 como done, TASK-262 como in_progress.
2. ⏸️ **Aguardar peer wt-auto-import (mvs_44f2762343f94f28b506f2f4c8c12eae) sobre matar PID 40808** (sync.cjs --watch ainda rodando do main).
3. ⏳ Adicionar 98 tasks consolidadas ao SCRUM_TASKS.json do worktree (TASK-263 a TASK-360), com blockedBy consistentes.
4. ⏳ Smoke test + commit + push no branch `wt/e79e15ca-orchestration`.
5. ⏳ Marcar TASK-262 (avaliação) como done.
6. ⏳ Atualizar SCRUM_TASKS do worktree com referências cruzadas (interfaces, blockedBy).
7. ⏳ Broadcast final pros 3 agentes + root + peers com o mapa completo.

---

> **Próximo passo do root session:** adicionar 98 tasks consolidadas (TASK-263 a TASK-360) ao SCRUM_TASKS do worktree, sequencial, com Regra B §2.2 (auto-campos: startedAt, updatedAt, blockedBy, evidence).

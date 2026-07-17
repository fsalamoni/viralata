# Funcionalidades da Administração de Abrigo — Pedido vs Entregue

> **Documento vivo** para confrontar o que o usuário pediu em cada chat com
> o que foi de fato implementado (e em que estado visual está).
>
> Origem: user pediu em 2026-07-16 16:35 para eu "retomar das conversas
> anteriores todas as funcionalidades que pedi para serem implementadas
> na administração de abrigo. Me traga todas as funcionalidades que pedi
> para implementar, com a descrição do que dei e a descrição do que, de
> fato, foi desenvolvido. Uma a Uma."
>
> **Última atualização**: 2026-07-16 16:45

---

## Como ler este documento

Cada módulo abaixo tem:
- **Pedido pelo user**: descrição do que foi solicitado (resumido).
- **Entregue (código)**: arquivos, tasks SCRUM, componentes.
- **Estado visual atual** (no painel de produção): ⚠️ OK / Inacessível / Quebrado.
- **Flag gate**: nome da feature flag, default OFF (geralmente).
- **Ajustes pendentes**: o que ainda precisa ser feito.

Os módulos estão ordenados na **mesma ordem em que aparecem no
painel admin** (Visão Geral → … → Lares Temporários).

---

## Índice de Módulos

1. [Visão Geral](#1-visão-geral-overviewtab)
2. [Geral](#2-geral-clubgeneraladmintab)
3. [Pets para Adoção](#3-pets-para-adoção-clubpetsdatagrid)
4. [Mural da ONG](#4-mural-da-ong-clubfeedtab)
5. [Chamados de Doação](#5-chamados-de-doação-clubdonationstab)
6. [Prestação de Contas](#6-prestação-de-contas-clubfinancetab)
7. [Relatórios](#7-relatórios-reportstab)
8. [Indicadores](#8-indicators-indicatorstab)
9. [Conversas](#9-conversas-clubchatadmintab)
10. [Equipe](#10-equipe-clubteamtab)
11. [Configurações](#11-configurações-clubadmintab)
12. [Dashboard (Shelter)](#12-dashboard-shelter-dashboardpage)
13. [Pendências (Kanban)](#13-pendências-kanban-kanbanpage)
14. [Vitrines](#14-vitrines-exhibitionslist)
15. [Voluntários](#15-voluntários-volunteersadmintab)
16. [Prontuário](#16-prontuário-shelterpetscopedtab-kindmedical)
17. [Medicação](#17-medicação-shelterpetscopedtab-kindmedications)
18. [Timeline](#18-timeline-shelterpetscopedtab-kindtimeline)
19. [Lares Temporários](#19-lares-temporários-fosterslist)

---

# 1. Visão Geral (`OverviewTab`)

## Pedido pelo user
"Quero ver na visão geral: quantos animais tenho cadastrados, quantos seguidores, ano de fundação, e descrição pública."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/pages/OrganizationAdminPanel.jsx:401-431` (função `OverviewTab`).
- **Componentes**:
  - `arena-stats-grid` (3 cards: Animais Cadastrados / Seguidores / Fundação)
  - `arena-section-card` (Sobre a organização com descrição)
- **Tasks SCRUM done**: TASK-621 (Dashboard cards visuais), TASK-758 (refinar AdminDashboard).

## Estado visual atual (sua imagem, 2026-07-16 16:35)
- ✅ **3 cards estatísticos lado a lado** (Animais 2 / Seguidores 1 / Fundação 2026).
- ⚠️ **Layout funcional mas isolado**, sem hierarquia clara em relação à header.
- ⚠️ **Falta polish**: padding, espaçamento entre cards, alinhamento com a header.

## Flag gate
- Nenhuma (sempre visível).

## Ajustes pendentes
- [ ] Aplicar DS_V2 v1.0 com mais respiro.
- [ ] Conectar com dados reais (atualmente mostra `pets.length` direto, sem loading state).

---

# 2. Geral (`ClubGeneralAdminTab`)

## Pedido pelo user
"Quero editar os dados do abrigo: nome, descrição, logo, missão, endereço, contatos, redes sociais."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubGeneralAdminTab.jsx`.
- **Tasks SCRUM done**: TASK-751 (refinar sub-abas do painel admin).

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (transborda do `TabsList`).
- ⚠️ **Não consigo nem clicar** sem rolar.

## Flag gate
- Nenhuma (sempre visível para admin).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs (ver §1 do plano de ação).
- [ ] Validação visual bloco-a-bloco.

---

# 3. Pets para Adoção (`ClubPetsDataGrid`)

## Pedido pelo user
"Quero CRUD completo dos pets: cadastrar, editar, mudar status (disponível, adotado, em LT), foto, raça, idade, comportamento médico."

## Entregue (código)
- **Arquivos**:
  - `src/modules/organizations/components/ClubPetsDataGrid.jsx`
  - `src/modules/pets/hooks/usePets.js` (`useMyPets`)
- **Tasks SCRUM done**: TASK-130 (página individual de adoção com timeline).

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).

## Flag gate
- Nenhuma (sempre visível para admin).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Validar CRUD end-to-end com dados reais.

---

# 4. Mural da ONG (`ClubFeedTab`)

## Pedido pelo user
"Quero um feed de posts do abrigo: avisos, campanhas, eventos. Com moderação (denunciar, deletar)."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubFeedTab.jsx`.
- **Tasks SCRUM done**:
  - TASK-156: Mural feed público de posts (read-only) em `/comunidades/{id}`.
  - TASK-157: Mural clickwrap em comentários + moderação.
  - TASK-158: Mural perfil público dos autores de post.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Confirmar se clickwrap está aplicado em todos os pontos.

---

# 5. Chamados de Doação (`ClubDonationsTab`)

## Pedido pelo user
"Quero gerenciar campanhas de arrecadação: item (ração, veterinário, etc), valor, meta, prazo, status."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubDonationsTab.jsx`.
- **Tasks SCRUM done**: TASK-097 (clickwrap Doação Financeira).

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- 🚨 **Funcionalidade incompleta**: apenas 1 task de doações feita (clickwrap). CRUD de campanhas, metas, prazos, status de captação — **NÃO implementados**.

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] 🚨 **Implementar CRUD completo de campanhas** (sistema de metas, prazos, status, comprovantes).

---

# 6. Prestação de Contas (`ClubFinanceTab`)

## Pedido pelo user
"Quero lançar entradas (doações) e saídas (veterinário, ração, medicamentos), ver saldo, gerar prestação de contas pública (LGPD Art. 18 V)."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubFinanceTab.jsx`.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- 🚨 **Funcionalidade bem incompleta**: 0 tasks específicas. **NÃO existe sistema de lançamentos de despesa nem prestação pública**.

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] 🚨 **Implementar do zero**:
  - Lançamentos de entrada/saída
  - Saldo agregado
  - Exportação prestação pública (LGPD)

---

# 7. Relatórios (`ReportsTab`)

## Pedido pelo user
"Quero exportar dados do abrigo em CSV/PDF: animais, adoções, doações, voluntários. E poder compartilhar link assinado (com prazo) com veterinário/ONG parceira."

## Entregue (código)
- **Arquivo**: `src/modules/shelter/components/ReportsTab.jsx`.
- **Tasks SCRUM done**:
  - TASK-154: Relatórios exportação CSV/PDF.
  - TASK-155: Relatórios compartilhamento seguro (link assinado).

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_REPORTS` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Validar export PDF em dados reais.
- [ ] Validar link assinado.

---

# 8. Indicadores (`IndicatorsTab`)

## Pedido pelo user
"Quero KPIs: taxa de adoção, tempo médio de permanência, taxa de retorno pós-adoção, conversão de voluntários."

## Entregue (código)
- **Arquivo**: `src/modules/shelter/components/IndicatorsTab.jsx`.
- **Tasks SCRUM done**:
  - TASK-602: Auditoria visual completa + fix de sobreposições.
  - TASK-758: Refinar AdminDashboard.
  - TASK-782, 784: Audit DS_V2.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_INDICATORS` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Conectar com agregações reais (atualmente mock?).

---

# 9. Conversas (`ClubChatAdminTab`)

## Pedido pelo user
"Quero um chat onde admin fala com membros, candidatos a adoção, doadores."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubChatAdminTab.jsx`.
- **Tasks SCRUM done**: TASK-349 (Chat admin de comunidade).

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.

---

# 10. Equipe (`ClubTeamTab`)

## Pedido pelo user
"Quero gerenciar membros do abrigo: papéis, permissões granulares (animals, finance, donations, feed, team), convidar novos membros."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubTeamTab.jsx`.
- **Tasks SCRUM done**:
  - TASK-348: Convite de membros para comunidade.
  - TASK-165: Equipe perfil público.
  - TASK-166: Equipe convite público.
- **Permissões**: `CLUB_PERMISSION` enum com 5 permissões granulares.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Validar UX de convite.

---

# 11. Configurações (`ClubAdminTab`)

## Pedido pelo user
"Quero configurações sensíveis: Stripe, integrações, exclusão, transferência de ownership."

## Entregue (código)
- **Arquivo**: `src/modules/organizations/components/ClubAdminTab.jsx`.
- **Tasks SCRUM done** (configurações amplas): TASK-038, TASK-039, TASK-040, TASK-053, TASK-105, TASK-107, TASK-171, TASK-176, TASK-188.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).

## Flag gate
- Nenhuma.

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Validar transfer-ownership end-to-end.

---

# 12. Dashboard (Shelter) (`DashboardPage`)

## Pedido pelo user
"Quero visão macro do abrigo: pendências urgentes, animais recém-chegados, medicações atrasadas, métricas de voluntários."

## Entregue (código)
- **Arquivo**: `src/modules/shelter/components/DashboardPage.jsx` (+ DashboardCard, DashboardWidgetManager).
- **Tasks SCRUM done**:
  - TASK-621: Dashboard cards visuais.
  - TASK-758: Refinar AdminDashboard.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_DASHBOARD` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Conectar com dados reais (atualmente mock?).

---

# 13. Pendências (Kanban) (`KanbanPage`)

## Pedido pelo user
"Quero um Trello: colunas customizáveis, cards de tarefa, checklists, atribuição a voluntários, due dates."

## Entregue (código)
- **Arquivos** (8!):
  - `src/modules/shelter/components/KanbanPage.jsx`
  - `KanbanBoard.jsx`
  - `KanbanCard.jsx`
  - `KanbanColumn.jsx`
  - `KanbanCardModal.jsx`
  - `KanbanCreateCard.jsx`
  - `KanbanCreateColumn.jsx`
- **Tasks SCRUM done**:
  - TASK-004: Kanban reorder.
  - TASK-005: Kanban addChecklistItem mutation.
  - TASK-101: Defensive coding KanbanTab.
  - TASK-150: Kanban dashboard pessoal.
  - TASK-151: Kanban integração com voluntários.
  - TASK-370: Decisão validação CPF.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.
- 🚨 **ESTE É O KANBAN QUE VOCÊ PERGUNTOU NA IMAGEM** — não está inacessível por bug, está por causa do transbordar do layout + flag OFF.

## Flag gate
- `SHELTER_KANBAN` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag e validar UX em dados reais.

---

# 14. Vitrines (`ExhibitionsList`)

## Pedido pelo user
"Quero listar eventos onde levo animais para adoção (feiras, shoppings, eventos). Inscrever voluntários, confirmar presença."

## Entregue (código)
- **Arquivos** (4):
  - `src/modules/shelter/components/ExhibitionsList.jsx`
  - `ExhibitionDetails.jsx`
  - `ExhibitionForm.jsx`
  - `ExhibitionVolunteers.jsx`
- **Tasks SCRUM done**:
  - TASK-145, 149, 181, 162, 163, 164: vitrines públicas, RSVP, feed.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_EXHIBITIONS` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag.

---

# 15. Voluntários (`VolunteersAdminTab`)

## Pedido pelo user
"Quero CRUD de voluntários, escalas, lista de presença, vínculo com pet/evento, atribuição a kanban, auditoria, métricas."

## Entregue (código)
- **Arquivos** (14!): `VolunteersAdminTab.jsx` + `VolunteerProfileForm.jsx` + `VolunteersRoster.jsx` + `VolunteerAuditTrail.jsx` + `CrossRosterSection.jsx` + `AssignmentMatrix.jsx` + `VolunteerMetricsCard.jsx` + etc.
- **Tasks SCRUM done**: **92 tasks** (módulo mais robusto do projeto).
  - TASK-204, 205, 206, 208: voluntários público.
  - TASK-209: termo v2 com LGPD + Lei 14.063/2020.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flags OFF** por default.

## Flag gate
- `SHELTER_VOLUNTEERS` (default OFF)
- `SHELTER_VOLUNTEER_PROFILE_V1` (default OFF)

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flags (precisam das DUAS).
- [ ] Validar auditoria.

---

# 16. Prontuário (`ShelterPetScopedTab kind="medical"`)

## Pedido pelo user
"Quero prontuário veterinário por animal: consultas, vacinas, exames, peso, observações, anexos. LGPD-compliant."

## Entregue (código)
- **Arquivos**:
  - `src/modules/shelter/components/MedicalRecordsList.jsx`
  - `MedicalRecordForm.jsx`
  - `src/modules/organizations/components/ShelterPetScopedTab.jsx`
- **Tasks SCRUM done**:
  - TASK-136: Prontuário público (read-only).
  - TASK-138: Dashboard de medicações pendentes.
  - TASK-141: Compliance % adesão medicação.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_HEALTH_RECORDS` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag.
- [ ] Validar LGPD (consentimento explícito por base legal).

---

# 17. Medicação (`ShelterPetScopedTab kind="medications"`)

## Pedido pelo user
"Quero medicações em curso por animal: nome, dose, frequência, início, fim, status (pendente/administrada/atrasada)."

## Entregue (código)
- **Arquivos** (3):
  - `src/modules/shelter/components/MedicationsList.jsx`
  - `MedicationForm.jsx`
  - `MedicationsDueCard.jsx`
- **Tasks SCRUM done**: TASK-138, 141.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_MEDICATION` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag.

---

# 18. Timeline (`ShelterPetScopedTab kind="timeline"`)

## Pedido pelo user
"Quero linha do tempo do animal: chegou, exames, medicação, mudança de comportamento, adoção, retorno, etc."

## Entregue (código)
- **Arquivos**:
  - `src/modules/shelter/components/TimelineList.jsx`
  - `TimelineEventForm.jsx`

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_PET_TIMELINE` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag.

---

# 19. Lares Temporários (`FostersList`)

## Pedido pelo user
"Quero gerenciar lares temporários: pet em LT, LT vinculado, status (active/returned/paused), updates, devolução. LGPD."

## Entregue (código)
- **Arquivos** (5):
  - `src/modules/shelter/components/FostersList.jsx`
  - `FosterActionDialog.jsx`
  - `FosterCtaCard.jsx`
  - `FosterTermsAcceptanceDialog.jsx`
  - `MyFostersSection.jsx`
- **Tasks SCRUM done**: **72 tasks**.
  - TASK-132: "Quero ser LT" no perfil do abrigo.
  - TASK-133: "Meus LTs" no perfil do usuário.

## Estado visual atual
- ⚠️ **Aba em 2ª fileira** (inacessível).
- ⚠️ **Flag OFF** por default.

## Flag gate
- `SHELTER_FOSTER` (default OFF).

## Ajustes pendentes
- [ ] Resolver transbordar de tabs.
- [ ] Ativar flag.
- [ ] Validar LGPD (termo de LT).

---

# Resumo Executivo

| # | Módulo | Tasks done | Visual | Flag | Bloqueio |
|---|---|---|---|---|---|
| 1 | Visão Geral | ~3 | ⚠️ funcional | nenhuma | polish |
| 2 | Geral | ~3 | ❌ 2ª fileira | nenhuma | layout |
| 3 | Pets | ~12 | ❌ 2ª fileira | nenhuma | layout |
| 4 | Mural | ~11 | ❌ 2ª fileira | nenhuma | layout |
| 5 | Doações | 1 | ❌ 2ª fileira | nenhuma | **+ CRUD** |
| 6 | Prestação | 0 | ❌ 2ª fileira | nenhuma | **+ sistema** |
| 7 | Relatórios | 2 | ❌ 2ª fileira | SHELTER_REPORTS OFF | layout + flag |
| 8 | Indicadores | 2 | ❌ 2ª fileira | SHELTER_INDICATORS OFF | layout + flag |
| 9 | Conversas | 1 | ❌ 2ª fileira | nenhuma | layout |
| 10 | Equipe | 3 | ❌ 2ª fileira | nenhuma | layout |
| 11 | Configurações | 14 | ❌ 2ª fileira | nenhuma | layout |
| 12 | Dashboard | 2 | ❌ 2ª fileira | SHELTER_DASHBOARD OFF | layout + flag |
| 13 | Kanban | 8 | ❌ 2ª fileira | SHELTER_KANBAN OFF | layout + flag |
| 14 | Vitrines | 33 | ❌ 2ª fileira | SHELTER_EXHIBITIONS OFF | layout + flag |
| 15 | Voluntários | 92 | ❌ 2ª fileira | 2 flags OFF | layout + flag |
| 16 | Prontuário | 41 | ❌ 2ª fileira | SHELTER_HEALTH_RECORDS OFF | layout + flag |
| 17 | Medicação | 41 | ❌ 2ª fileira | SHELTER_MEDICATION OFF | layout + flag |
| 18 | Timeline | ~2 | ❌ 2ª fileira | SHELTER_PET_TIMELINE OFF | layout + flag |
| 19 | Lares Temp. | 72 | ❌ 2ª fileira | SHELTER_FOSTER OFF | layout + flag |

---

# Plano de Ação Imediato (2026-07-16)

## Etapa 1 — RESOLVER LAYOUT (HOJE)
**Problema raiz**: `arena-admin-tabs` em `src/index.css` usa `flex-wrap`,
fazendo as 14+ abas quebrarem em 2 fileiras e sobreporem o conteúdo.

**Solução**: reorganizar as 19 abas em **6-7 grupos semânticos** com
sub-abas internas. Cada grupo = 1 aba horizontal. Sub-abas = pills
dentro do conteúdo.

**Grupos propostos**:
1. **Visão Geral** (sem sub-abas)
2. **Operacional** → sub-abas: Pets, Prontuário, Medicação, Timeline
3. **Pessoas** → sub-abas: Equipe, Voluntários, Lares Temporários
4. **Engajamento** → sub-abas: Mural, Conversas, Vitrines, Kanban
5. **Financeiro** → sub-abas: Doações, Prestação, Relatórios, Indicadores
6. **Configurações** → sub-abas: Geral, Conta, Integrações

**Aplicar DS_V2** (cores, espaçamentos, hierarquia) consistente com o
restante do site.

## Etapa 2 — ATIVAR FLAGS (após layout OK)
- Após layout harmônico, ligar `SHELTER_*` gradualmente (1-2 por vez).
- User valida visualmente cada uma.

## Etapa 3 — COMPLETAR GAPS (após validação)
- 🚨 **Doações**: CRUD completo de campanhas
- 🚨 **Prestação de Contas**: sistema de lançamentos
- Qualquer outro gap que aparecer na validação.

---

## ⚠️ LESSON LEARNED — HOTFIX 2026-07-16 23:14 (CRÍTICA)

**Sintoma**: User reportou "Não apareceu nenhuma flag nova para mim" + "A página dos antigos não está entrando" após TASK-786..810 estarem todas done (incluindo TASK-792..797 que ativaram SHELTER_*).

**Causa raiz**:
1. TASK-792..797 mudaram `DEFAULT_FEATURE_FLAGS` para `true` no código.
2. O doc Firestore `platform_settings/global` (que `subscribePlatformSettings` lê) tinha `false` salvo para essas flags (de quando admin ligou/desligou manualmente em algum momento).
3. A migração v2 (`migrateLegacyFlags`) só aplicava DEFAULT novo se TODAS as flags estavam em false. Como UX flags já estavam ON, `storedAllFalse=false` → migração NÃO rodava.
4. Resultado: Firestore persistido continuou com `false` mesmo após merge + deploy. UI `/admin/flags` mostrava OFF. Painel admin abrigo não mostrava abas SHELTER_* (dependem de `SHELTER_FOUNDATION=true`).

**Correção** (commit `f6c9ed6`, HOTFIX-001): migração v3 com 2 critérios:
- Critério 1: TODAS flags em false → migra tudo.
- Critério 2: Caso contrário → migra apenas `SHELTER_*` que estão `undefined`/`null`. Preserva controles explícitos do admin (true/false salvos não são tocados).

**REGRA ao mudar DEFAULT de flag em massa** (D-FLAG-05, CORE_DIRECTIVES §9.2):
1. Mudar DEFAULT no `featureFlags.js`.
2. Atualizar `migrateLegacyFlags` em `FeatureFlagsContext.migration.js` (cobrir a nova flag no critério de migração).
3. Atualizar `FLAGS_MIGRATION_VERSION` em `platformSettingsService.js`.
4. Adicionar teste na `FeatureFlagsContext.migration.test.js`.
5. `npm run build` verde.
6. Commitar com mensagem: "fix(flags): migração vN — <motivo>".
7. **Pedir ao user para limpar cache** (`Ctrl+Shift+R`) e validar visualmente.

**REGRA anti-facada**: mudar DEFAULT no código não basta. SEMPRE verificar que o Firestore persistido herda o novo DEFAULT.

---

*Documento vivo. Atualizar a cada bloco finalizado.*

*Cross-references: `docs/CORE_DIRECTIVES.md` §9.2 (D-FLAG-05, D-FLAG-06, D-FLAG-07), `docs/AGENTS.md` Regra A (Avaliação Plena).*

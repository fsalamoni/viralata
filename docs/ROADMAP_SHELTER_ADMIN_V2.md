# Roadmap — Aprimoramentos do Admin do Abrigo (V2)

> **Status**: Rodada 1 concluída (auditoria + planejamento). Implementação nas rodadas seguintes.
> **Versão**: 0.1.0 — 2026-08-28
> **Owner**: sessão Copilot/Mavis do repo `fsalamoni/viralata`
> **Escopo**: persona **Abrigos** → área administrativa. Quatro frentes solicitadas pelo dono do produto (@fsalamoni):
> 1. **Pessoas** (Equipe, Voluntários, Lares Temporários)
> 2. **Engajamento** (Mural, Vitrines)
> 3. **Documentos do abrigo** (editor interno de formulários/termos/contratos)
> 4. **Loja do abrigo** (marketplace completo: admin + público)
>
> **Regra de ouro (pedido explícito do usuário)**: desenvolver com calma, parte por parte, **sem quebrar nada**. Cada fase é isolada, atrás de **feature flag `OFF` por padrão**, com worktree próprio, testes e validação em produção antes de ligar a flag. Ao final de cada rodada: relatar o que foi feito + o que falta + **prompt exato** para a próxima rodada.

---

## 1. Como usar este roadmap

- Cada **Fase** é uma rodada de desenvolvimento independente, entregável sozinha, sem efeitos colaterais nas demais (feature flag `OFF`).
- A ordem é pensada por **dependência** e **risco**: primeiro a fundação compartilhada (notificações acionáveis, que os 3 fluxos de convite reutilizam), depois Pessoas, depois Engajamento, depois Documentos, depois Loja.
- Ao concluir uma fase, marque o checkbox na seção **§12 Rastreamento** e atualize `.harness/SCRUM_TASKS.json` (Regra B do `AGENTS.md`).
- Cada fase tem um **Prompt de continuação** pronto para copiar/colar e iniciar a próxima rodada no chat.

### Convenções (reafirmadas do `AGENTS.md` / `docs/SHELTER_MGMT_ROADMAP.md`)

1. **Feature flag por fase** — `SHELTER_*`, default OFF; ligar só após validar em produção.
2. **Schema evolutivo, não-breaking** — campos novos com default e backfill seguro; nunca renomear coleção/campo em produção sem dual-read/write. Usar `FieldValue.deleteField()` para nulificar (Zod `.partial()` aceita string, não `null`).
3. **Coleções novas convivem com antigas** — nada de mexer no que já funciona.
4. **Defense in depth** — Firestore rules + service layer + hook + UI gating; `return` explícito em toda função de rules; deny-by-default.
5. **Auditoria** — toda mutação relevante grava `audit_log` imutável (`user_id`, `action`, `document_version`, `timestamp`, `ip_address`, `user_agent`).
6. **LGPD** — consentimento por base legal, retenção, direito ao esquecimento, isolamento multi-tenant (dados de um abrigo não vazam para outro).
7. **UX/UI** — Design System V2 (`docs/DESIGN_SYSTEM.md`, `docs/design-system-v2/`), mobile-first, a11y (keyboard nav, ARIA, contraste), copy PT-BR, estados de erro/loading/empty/success informativos.
8. **Worktree** por fase: `feat/shelter-<fase>-<slug>`. **Commits conventional**. `npm test` verde, `npm run typecheck` 0 erros, `npm run lint` 0 erros nos arquivos tocados, `npm run build` OK antes de commitar.

---

## 2. Estado atual (auditoria — Rodada 1)

Resumo do que **já existe** hoje no código, para não reconstruir o que está pronto e focar em **completar/aprimorar**.

### 2.1 Painel administrativo
- `src/modules/organizations/pages/OrganizationAdminPanel.jsx` (wrapper) → `OrganizationAdminPanel.v3.jsx` via flag `V3_PAGE_SHELTER_ADMIN`.
- Grupos de abas: **overview, operational, people, engagement, store, finance, settings**. Sub-abas de `people`: `team`, `volunteers`, `foster`. Sub-abas de `engagement`: `feed` (Mural), `chat`, `kanban`, `exhibitions` (Vitrines).
- Abas gated por feature flag (`SHELTER_FOUNDATION` + específica) **e** permissão.
- Rota: `/organizacoes/:orgId/admin` (protegida por `ShelterAdminGate`). Página pública do abrigo: `/abrigos/:shelterId` (`ShelterPublic`).

### 2.2 Pessoas
- **Equipe** (`ClubTeamTab.jsx`): coleções `club_members`, `club_member_invites`. Serviço `clubService.js` já tem `inviteMemberToClub()`, `acceptClubInvite()`, `declineClubInvite()`, `inviteMembersToClub()`. Hooks `useAcceptClubInvite`/`useDeclineClubInvite`. Permissões em `domain/permissions.js` (`CLUB_PERMISSION`: ANIMALS, FINANCE, DONATIONS, FEED, TEAM, VOLUNTEERS + granulares `volunteers:read|manage_status|bg_check|bulk|delete`). **Owner** (`club.created_by`) = todas as permissões.
- **Voluntários** (`VolunteersAdminTab.jsx`/`VolunteersRoster.jsx`): perfil global `users/{uid}/volunteer_profile/main` (skills, availability, radius_km, transporte); roster do abrigo `clubs/{clubId}/volunteers/{uid}` (status, background_check, termos). Signup via `JoinVolunteerModal` (4 passos). Rotas públicas: `/voluntarios`, `/voluntarios/seja`, `/voluntarios/termo`, `/perfil/voluntario`.
- **Lares Temporários** (`FostersList.jsx`): `clubs/{clubId}/fosters/{fosterId}` com `foster_profile_snapshot` imutável, workflow de status (pending→active→extended/ended/interrupted), aceite de termo com assinatura+hash (Lei 14.063/2020). Rotas públicas: `/lares-temporarios`, `/lares-temporarios/:uid/historico`, `/lares-temporarios/dashboard`.

### 2.3 Engajamento
- **Mural** (`ClubFeedTab.jsx` + `clubFeedService.js`): CRUD de posts, likes, comentários. Rota pública de mural para comunidades existe (`/mural` → `PublicMuralFeed`), mas **não há view pública do mural do abrigo**.
- **Vitrines** (`exhibition.js` 501 linhas + `exhibitionService.js` 871 linhas + `ExhibitionForm/List/Details/Volunteers`, `PostEventLog`): CRUD completo do evento. Páginas públicas **já existem**: `/vitrines` (`PublicExhibitions`) e `/vitrines/:id` (`PublicExhibitionDetail`, 344 linhas). Flags `SHELTER_EXHIBITIONS`, `SHELTER_EXHIBITION_WORKFLOW_V1`.

### 2.4 Documentos
- Textos legais versionados em `src/modules/shelter/domain/legal/` (≈22 arquivos), `termsAcceptanceService` + modais de aceite. Módulo **contratos** (`src/modules/contracts/`): contrato de adoção com assinatura digital (status pending_shelter_signature → fully_signed → cancelled), `ShelterContractsList` em `/abrigos/:shelterId/contracts`. Módulo **entrevistas** (`src/modules/interview/`): `ShelterInterviewsList` em `/abrigos/:shelterId/interviews`. Formulários de adoção hoje via **Google Forms webhook** (sem construtor interno).

### 2.5 Loja
- `src/modules/shelter/domain/store/`, `shelterStoreService`, `StoreAdmin` + painéis, `ShelterStorePublicTab`, `MarketplacePage` (`/mercado`). Pagamento off-platform (PIX/externo). Flag `SHELTER_STORE_V1`. **Falta**: ~~carrinho, checkout, pedidos, fulfillment, analytics~~ (entregue na Fase 7 · `SHELTER_STORE_V2`); refinamento contínuo de UX admin vs. loja pública.

### 2.6 Notificações (fundação dos convites)
- `src/core/services/notificationService.js`: coleção `notifications`, real-time (`useNotifications.js` onSnapshot). `NotificationsMenu.jsx` mostra dropdown **sem** botões de ação. `buildPayload()` **não** tem campos de ação/CTA. Convite de membro já dispara notificação (tipo `CLUB_INVITE`, mensagem "Toque para aceitar ou recusar") mas **só linka para fora** — não há aceitar/recusar inline. **Este é o gap fundamental, pedido 3× (equipe, voluntários, lares).**

---

## 3. Fase 0 — Notificações acionáveis (fundação compartilhada)

> **Por que primeiro**: os três fluxos de Pessoas (equipe, voluntários, lares) pedem "convite/aceite por notificação, aceitar ou recusar na própria notificação". Construir isso uma vez, genérico e reutilizável, destrava as Fases 1–3.

- **Flag**: `SHELTER_ACTIONABLE_NOTIFICATIONS_V1` (default OFF).
- **Worktree**: `feat/shelter-fase0-actionable-notifications`.
- **Objetivo**: notificações podem carregar uma **ação** (ex.: aceitar/recusar convite) executável inline no dropdown e numa futura central de notificações.

**Escopo**
- Estender o schema de notificação (aditivo, retrocompatível) em `notificationService.js`:
  - `action_kind` (ex.: `club_invite`, `volunteer_invite`, `foster_invite`), `action_ref` (ex.: `{ clubId, inviteId }`), `action_state` (`pending|accepted|declined|expired`), `actions[]` (rótulo + intent).
- `NotificationsMenu.jsx`: quando `action_kind` presente e `action_state === 'pending'`, renderizar botões **Aceitar** / **Recusar** (com `stopPropagation`, estados loading/erro, otimista). Ao responder, atualizar `action_state` e `read`.
- Camada de resolução de ação: mapear `action_kind` → handler (reutiliza `acceptClubInvite`/`declineClubInvite`; extensível a voluntário/lar nas fases seguintes).
- Firestore rules: confirmar que dono da notificação pode atualizar `action_state`/`read` (já permitido para `user_id`); `club_member_invites` já permite update pelo convidado.

**Permissões / LGPD**: nenhuma permissão nova (é o próprio usuário agindo sobre a própria notificação). Registrar `audit_log` do aceite/recusa.

**Critérios de aceitação**
- Com flag OFF, comportamento **idêntico** ao atual (nenhuma mudança visível).
- Com flag ON: convite de membro aparece com Aceitar/Recusar inline; aceitar cria membership e some o CTA; recusar marca declined. Sem regressão nas notificações comuns.
- Testes unit (payload/handler) + componente (render condicional dos botões) verdes.

**Prompt de continuação** → ver §11 (Fase 0).

---

## 4. Fase 1 — Pessoas · Equipe (1.1)

- **Flag**: `SHELTER_TEAM_V2` (default OFF). Depende da Fase 0.
- **Worktree**: `feat/shelter-fase1-team`.

**Objetivo**: deixar explícito que a **Equipe** é formada por **membros** — usuários que compõem o abrigo de forma **permanente** (não transitórios), com **ao menos um nível de atribuição**, podendo ou não ter atribuições de administração/decisão.

**Escopo**
- **Conceito/copy**: cabeçalho e ajuda contextual explicando o que é "membro" (permanente, com atribuição, decisão opcional). Distinguir de voluntário/lar (transitórios).
- **Convite funcional por notificação** (usa Fase 0): fluxo aceitar/recusar inline; estados pendente/aceito/recusado visíveis na lista.
- **Permissões por escopo**: revisar e **explicitar todos os blocos** de permissão (ANIMALS, FINANCE, DONATIONS, FEED, TEAM, VOLUNTEERS + granulares) com rótulos, descrições e agrupamento visual; deny-by-default; owner sempre total.
- **Tabela de membros** (aprimorar design): colunas nível de acesso/escopo, telefone, e-mail, endereço e demais campos relevantes; respeitar privacidade por campo (`MEMBER_FIELD_DEFAULT_PRIVACY`).
- **Documentos/termos**: coluna/aba com status de documentos e termos do membro relativos ao abrigo (responsabilidade etc.), **ligada aos documentos da plataforma** (Fase 6 aprofunda o editor; aqui expõe status e link).
- Surface de **solicitações de entrada** (join requests) no V3 (aprovar/recusar), se ainda não renderizado.

**Dados**: `club_members`, `club_member_invites` (existentes). Aditivos: campos de status de documentos por membro (referência aos aceites/contratos).

**LGPD**: exibição de contato/endereço sujeita a privacidade por campo e base legal; audit de convite/entrada/mudança de permissão.

**Critérios de aceitação**: flag OFF = comportamento atual; flag ON = nova tabela, convite inline, blocos de permissão claros, status de documentos, join requests acionáveis. Testes verdes.

**Prompt de continuação** → §11 (Fase 1).

---

## 5. Fase 2 — Pessoas · Voluntários (1.2)

- **Flag**: `SHELTER_VOLUNTEERS_V2` (default OFF). Depende das Fases 0 e (idealmente) 1.
- **Worktree**: `feat/shelter-fase2-volunteers`.

**Objetivo**: explicitar que **voluntário** é uma espécie de "membro" **não permanente** (temporário/transitório), que faz parte da equipe de modo transitório; **pode ser promovido a membro permanente** por um membro com atribuição; fica numa **lista à disposição** para receber atividades/tarefas; pode receber **qualquer atribuição** a critério de membros com atribuição; indica os **tipos de atividade** a que se dispõe (ver formulários de voluntário).

**Escopo**
- **Conceito/copy** + ação **"Promover a membro"** (concede atribuições; move para Equipe).
- **Vínculo por notificação** (Fase 0): convidar/vincular voluntário com aceite/recusa inline.
- **Permissões por escopo**: mesmos blocos da Equipe podem ser concedidos a voluntário, a critério de membro com atribuição; revisar granulares de voluntário existentes.
- **Tabela de voluntários** (aprimorar): nível de acesso/escopo, telefone, e-mail, endereço, **disponível hoje** (com base na `availability`/data atualizada), **período de disponibilidade**, **lista de atividades a que se dispõe**, e demais campos relevantes; status (active/paused/blocked/left), background check.
- **Documentos/termos**: status e link dos documentos/termos do voluntário relativos ao abrigo (termo de voluntariado — Lei 14.063/2020).

**Dados**: `clubs/{clubId}/volunteers/{uid}`, `users/{uid}/volunteer_profile/main`, participações. Aditivos: cálculo "disponível hoje" derivado de `availability`.

**Critérios de aceitação**: flag OFF = atual; flag ON = tabela rica com disponibilidade/atividades, convite inline, promoção a membro, status de documentos. Testes verdes.

**Prompt de continuação** → §11 (Fase 2).

---

## 6. Fase 3 — Pessoas · Lares Temporários (1.3)

- **Flag**: `SHELTER_FOSTER_V2` (default OFF). Depende das Fases 0 e 2.
- **Worktree**: `feat/shelter-fase3-foster`.

**Objetivo**: explicitar que **Lar Temporário** é uma **espécie de voluntário** não permanente; fica em **lista específica** à disposição para receber atividades/tarefas; pode receber **qualquer atribuição** a critério de membros com atribuição; indica **as datas** em que fica à disposição para acolher pets, a **quantidade** de pets que pode acolher e o **tipo** de pets. Criar **todos os formulários, funcionalidades e documentos** necessários.

**Escopo**
- **Conceito/copy** + posicionamento como sub-tipo de voluntário, em lista própria.
- **Vínculo por notificação** (Fase 0): propor/convidar lar com aceite/recusa inline; formulário público de candidatura a lar temporário.
- **Permissões por escopo**: introduzir permissões dedicadas a foster (hoje usa fallback de `canManageTeam`); qualquer atribuição concedível a critério do membro.
- **Disponibilidade estruturada**: datas à disposição, **quantidade** de pets aceitos, **tipos** de pets aceitos.
- **Tabela de lares** (aprimorar): nível de acesso/escopo, telefone, e-mail, endereço, **disponível hoje**, **período de disponibilidade**, **quantidade** aceita, **tipos** aceitos, demais campos; status workflow; status/link de documentos e termos do lar.
- **Formulários/documentos**: termo de responsabilidade do lar, ficha de acolhimento, relatório de updates, devolução.

**Dados**: `clubs/{clubId}/fosters/{fosterId}` (+ `foster_profile_snapshot`). Aditivos: `availability_dates`, `capacity`, `accepted_pet_types`.

**Critérios de aceitação**: flag OFF = atual; flag ON = lista de lares com disponibilidade/qtde/tipos, convite inline, formulários e termos, status de documentos. Testes verdes.

**Prompt de continuação** → §11 (Fase 3).

---

## 7. Fase 4 — Engajamento · Mural (2.1)

- **Flag**: `SHELTER_MURAL_V2` (default OFF).
- **Worktree**: `feat/shelter-fase4-mural`.

**Objetivo**: aprimorar ao máximo o Mural — configurações e tudo que for importante para o admin **gerenciar, publicar e interagir com o público**.

**Escopo**
- **Composer avançado**: agendamento de publicação, rascunhos, anexos/galeria, categorias/tags, menções.
- **Gestão**: fixar/destacar (pin/feature), arquivar, busca/filtro, ordenação.
- **Moderação**: painel de moderação de comentários/interações do público (aprovar, ocultar, denunciar), políticas.
- **Interação com público**: respostas do abrigo, reações, controles de quem pode comentar (privacidade).
- **Analytics**: alcance, curtidas, comentários por post.
- **View pública**: mural do abrigo visível na página pública `/abrigos/:shelterId` (bloco Mural) e/ou rota dedicada.

**Dados**: `club_posts` + subcoleções de comentários/likes. Aditivos: `pinned`, `scheduled_for`, `status`, `tags`, `moderation_state`.

**Critérios de aceitação**: flag OFF = atual; flag ON = composer avançado, pin/agendar/buscar, moderação, view pública. Testes verdes.

**Prompt de continuação** → §11 (Fase 4).

---

## 8. Fase 5 — Engajamento · Vitrines (2.2)

> Maior fase. As páginas públicas (`/vitrines`, `/vitrines/:id`) e o CRUD admin **já existem**; o foco é transformar a Vitrine num **gerenciador integral de evento**.

- **Flag**: `SHELTER_EXHIBITION_OPS_V1` (default OFF) + flags existentes de exhibitions.
- **Worktree**: `feat/shelter-fase5-vitrines`.

**Objetivo**: desenvolver a Vitrine como **criação e gestão integral de um evento**: data, espaço, estrutura física, informações a visitantes, tratativas de adoção/doação, reuniões com adotantes, documentos/fotos dos pets, mutirão (vacinas/cirurgias/consultas), organização de voluntários, logística (transporte, alimentação, água, luz, energia, internet). Página **interna de admin** + página **pública** de divulgação — com excelência de UX/UI para todos os tipos de usuário.

**Escopo (módulos do evento)**
- **Planejamento**: checklist do evento, data/horário, local/venue, estrutura física, orçamento.
- **Pets na vitrine**: seleção de pets, staging, documentos/fotos por pet, status de adoção no evento.
- **Mutirão de saúde**: agenda de vacinas/cirurgias/consultas atrelada ao evento.
- **Voluntários do evento**: turnos/escalas, papéis (cuidador, transporte ida/volta, carregamento), check-in/out, RSVP público.
- **Logística**: transporte, alimentação, água, energia, internet — itens, responsáveis, custos.
- **Tratativas**: fila de adoção/doação no evento, reuniões com adotantes, encaminhamento a contrato/entrevista existentes.
- **Página pública** (`/vitrines/:id`): aprimorar divulgação (agenda, local, pets, "quero adotar", "quero ser voluntário", compartilhamento).
- **Pós-evento**: log/resultados (aproveitar `PostEventLog`).

**Dados**: `clubs/{clubId}/exhibitions/{id}` (+ subcoleções para logística, staging, shifts, mutirão). Verificar consistência de schema público (`exhibitions_public` vs. subcoleção) antes de codar.

**Critérios de aceitação**: flag OFF = atual; flag ON = admin com planejamento/logística/pets/mutirão/voluntários/tratativas e página pública aprimorada. Testes verdes.

**Prompt de continuação** → §11 (Fase 5).

---

## 9. Fase 6 — Documentos do abrigo (3)

- **Flag**: `SHELTER_DOCUMENTS_V1` (default OFF).
- **Worktree**: `feat/shelter-fase6-documents`.

**Objetivo**: ajustar apresentação e funcionamento de **todos os documentos**; criar um **espaço** na área admin para todos os documentos do abrigo — **formulários (de adoção e outros), termos, contratos etc.** — com **editor interno**.

**Escopo**
- **Central de documentos** (nova sub-aba admin): lista unificada de formulários, termos, contratos, com status, versão, vínculos.
- **Editor interno**: construtor de formulários (campos, validação), editor de termos/contratos com versionamento; templates.
- **Vínculos**: ligar documentos aos fluxos (adoção, voluntário, lar, membro) e aos textos legais versionados existentes (`domain/legal/`), contratos (`modules/contracts`) e entrevistas (`modules/interview`).
- **Aceite & analytics**: rastrear aceites, versões, quem assinou, quando; exportação.
- **Formulário de adoção in-app** (alternativa ao Google Forms webhook, mantendo compatibilidade).

**LGPD**: versionamento imutável de termos aceitos, retenção, trilha de auditoria de assinatura (Lei 14.063/2020).

**Critérios de aceitação**: flag OFF = atual; flag ON = central + editor + versionamento + vínculos + analytics de aceite. Testes verdes.

**Prompt de continuação** → §11 (Fase 6).

---

## 10. Fase 7 — Loja do abrigo (4)

- **Flag**: `SHELTER_STORE_V2` (default OFF). Depende de `SHELTER_STORE_V1`.
- **Worktree**: `feat/shelter-fase7-store`.

**Objetivo**: desenvolver a **loja (marketplace)** do abrigo de forma completa e detalhada, com **página interna de admin** e **página pública** de acesso de usuários comuns — separadas e organizadas.

**Escopo**
- **Admin da loja**: CRUD de produtos aprimorado, estoque, categorias, preços/variações, pedidos, fulfillment, relatórios/analytics.
- **Loja pública**: catálogo, busca/filtros, página de produto, **carrinho**, **checkout**, acompanhamento de pedido.
- **Pagamentos**: manter off-platform (PIX/externo) e preparar ponto de extensão para processador; conciliação.
- **Separação de páginas**: admin (`/organizacoes/:orgId/admin?tab=store:*`) vs. pública (loja do abrigo + `/mercado`).

**Dados**: coleções de produtos/pedidos/estoque (novas subcoleções). Aditivos não-breaking sobre o store atual.

**Critérios de aceitação**: flag OFF = atual; flag ON = admin completo + loja pública com carrinho/checkout/pedidos. Testes verdes.

**Prompt de continuação** → §11 (Fase 7).

---

## 11. Prompts de continuação (copiar/colar)

> Use um destes para iniciar a próxima rodada. Cada um referencia este roadmap e mantém a regra "sem quebrar nada, flag OFF, testes verdes".

**Fase 0 — Notificações acionáveis**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 0 (Notificações acionáveis).
Flag SHELTER_ACTIONABLE_NOTIFICATIONS_V1 default OFF, worktree feat/shelter-fase0-actionable-notifications.
Aceitar/recusar convite na própria notificação (inline), reutilizando acceptClubInvite/declineClubInvite.
Sem regressão com a flag OFF. Testes verdes, typecheck/lint/build OK. Ao final, relate feito x falta e o prompt da Fase 1.
```

**Fase 1 — Pessoas · Equipe**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 1 (Pessoas · Equipe).
Flag SHELTER_TEAM_V2 default OFF, worktree feat/shelter-fase1-team. Depende da Fase 0.
Conceito de membro permanente, convite por notificação inline, blocos de permissão explícitos, tabela rica
(nível/telefone/e-mail/endereço), status de documentos/termos vinculados, join requests acionáveis.
Sem regressão com flag OFF. Testes verdes. Ao final, relate feito x falta e o prompt da Fase 2.
```

**Fase 2 — Pessoas · Voluntários**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 2 (Pessoas · Voluntários).
Flag SHELTER_VOLUNTEERS_V2 default OFF, worktree feat/shelter-fase2-volunteers. Depende das Fases 0 e 1.
Voluntário = membro transitório; promover a membro; vínculo por notificação inline; permissões concedíveis;
tabela com disponível-hoje/período/atividades/contato/endereço; status de documentos/termos.
Sem regressão com flag OFF. Testes verdes. Ao final, relate feito x falta e o prompt da Fase 3.
```

**Fase 3 — Pessoas · Lares Temporários**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 3 (Pessoas · Lares Temporários).
Flag SHELTER_FOSTER_V2 default OFF, worktree feat/shelter-fase3-foster. Depende das Fases 0 e 2.
Lar = espécie de voluntário em lista própria; datas de disponibilidade, quantidade e tipos de pets;
vínculo por notificação inline; permissões concedíveis; formulários e documentos do lar; tabela rica.
Sem regressão com flag OFF. Testes verdes. Ao final, relate feito x falta e o prompt da Fase 4.
```

**Fase 4 — Engajamento · Mural**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 4 (Engajamento · Mural).
Flag SHELTER_MURAL_V2 default OFF, worktree feat/shelter-fase4-mural.
Composer avançado (agendar/rascunho/tags/menções), fixar/buscar/arquivar, moderação de interações,
analytics e view pública do mural do abrigo. Sem regressão com flag OFF. Testes verdes.
Ao final, relate feito x falta e o prompt da Fase 5.
```

**Fase 5 — Engajamento · Vitrines**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 5 (Engajamento · Vitrines).
Flag SHELTER_EXHIBITION_OPS_V1 default OFF, worktree feat/shelter-fase5-vitrines.
Gestão integral do evento: planejamento/venue/estrutura, pets+docs/fotos, mutirão de saúde, voluntários/escalas,
logística (transporte/alimentação/energia/internet), tratativas de adoção/doação, página pública aprimorada.
Sem regressão com flag OFF. Testes verdes. Ao final, relate feito x falta e o prompt da Fase 6.
```

**Fase 6 — Documentos do abrigo**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 6 (Documentos do abrigo).
Flag SHELTER_DOCUMENTS_V1 default OFF, worktree feat/shelter-fase6-documents.
Central de documentos + editor interno de formulários/termos/contratos, versionamento, vínculos aos fluxos e
aos legais existentes, analytics de aceite, formulário de adoção in-app. Sem regressão com flag OFF.
Testes verdes. Ao final, relate feito x falta e o prompt da Fase 7.
```

**Fase 7 — Loja do abrigo**
```
Seguindo docs/ROADMAP_SHELTER_ADMIN_V2.md, implemente a FASE 7 (Loja do abrigo).
Flag SHELTER_STORE_V2 default OFF, worktree feat/shelter-fase7-store.
Admin da loja (produtos/estoque/pedidos/fulfillment/analytics) + loja pública (catálogo/carrinho/checkout/pedido),
separadas e organizadas, pagamento off-platform com ponto de extensão. Sem regressão com flag OFF.
Testes verdes. Ao final, relate feito x falta e o roadmap de acabamento.
```

---

## 12. Rastreamento

| Fase | Área | Flag | Worktree | Status |
|---|---|---|---|---|
| 0 | Notificações acionáveis | `SHELTER_ACTIONABLE_NOTIFICATIONS_V1` | `feat/shelter-fase0-actionable-notifications` | 👀 em review (código completo, flag OFF) |
| 1 | Pessoas · Equipe | `SHELTER_TEAM_V2` | `feat/shelter-fase1-team` | 👀 em review (código completo, flag OFF) |
| 2 | Pessoas · Voluntários | `SHELTER_VOLUNTEERS_V2` | `feat/shelter-fase2-volunteers` | 👀 em review (código completo, flag OFF) |
| 3 | Pessoas · Lares Temporários | `SHELTER_FOSTER_V2` | `feat/shelter-fase3-foster` | 👀 em review (código completo, flag OFF) |
| 4 | Engajamento · Mural | `SHELTER_MURAL_V2` | `feat/shelter-fase4-mural` | 👀 em review (código completo, flag OFF) |
| 5 | Engajamento · Vitrines | `SHELTER_EXHIBITION_OPS_V1` | `feat/shelter-fase5-vitrines` | 👀 em review (código completo, flag OFF) |
| 6 | Documentos do abrigo | `SHELTER_DOCUMENTS_V1` | `feat/shelter-fase6-documents` | 👀 em review (código completo, flag OFF) |
| 7 | Loja do abrigo | `SHELTER_STORE_V2` | `feat/shelter-fase7-store` | 👀 em review (código completo, flag OFF) |

**Legenda**: ⏳ pendente · 🔨 em progresso · 👀 em review · ✅ concluído (flag validada em produção).

---

## 13. Notas de risco / verificações antes de codar

- **Fase 0**: notificações são usadas em toda a plataforma — mudanças devem ser **estritamente aditivas** e atrás de flag; garantir zero regressão com flag OFF.
- **Fase 5**: confirmar o schema público das vitrines (`exhibitions_public` vs. `clubs/{clubId}/exhibitions/{id}`) e os campos de data (`datetime_start` vs. `event_date`) antes de mexer na página pública.
  - **CONFIRMADO (2026-08)**: a fonte de verdade do admin é `clubs/{clubId}/exhibitions/{id}` com `datetime_start`/`datetime_end` (ISO), `venue.address`, `title`, `notes`. **Não existe** `event_date`, `location`, `description` nem `cover_url` no schema real (`src/modules/shelter/domain/operational/exhibition.js`).
  - **Gap 1 — mirror vazio**: `exhibitions_public` (lido por `PublicExhibitionDetail.jsx` via `exhibitionPublicService`) **não tem nenhum writer** no código — a coleção fica vazia, então a página de detalhe pública nunca renderiza dados reais. Falta: escrever o espelho público (Cloud Function `onWrite` ou no serviço de admin) na publicação da vitrine.
  - **Gap 2 — leitura anônima bloqueada**: as `firestore.rules` exigem membership do clube para ler `clubs/{clubId}/exhibitions` → visitante anônimo não lista vitrines em `ShelterPublic.jsx`. Falta: regra de leitura pública para vitrines publicadas (ou depender do mirror do Gap 1).
  - **Gap 3 — orderBy divergente**: `ShelterPublic.fetchExhibitions` ordenava por `event_date` (inexistente). Com `SHELTER_EXHIBITION_OPS_V1` ON passa a ordenar por `datetime_start` e o card tolera `datetime_start`/`venue.address`/`notes`; com a flag OFF o comportamento legado é preservado byte-a-byte.
- **Fase 6**: editor interno é sensível a XSS — sanitizar entradas/HTML; manter imutabilidade de termos aceitos.
  - **Armazenamento aditivo**: o registry `documents` (`{ items: Document[], updated_at, updated_by_uid }`) mora no próprio doc `clubs/{clubId}` (não em subcoleção), gravado por dot-path (`'documents.items'`). Motivo: a regra de update do doc do clube não tem `hasOnly()` e já exige owner/admin — escritas aditivas passam e a própria regra faz o gate. `firestore.rules` **inalterado**. O registry guarda só **templates** (sem PII), então residir no doc mundialmente legível é seguro (como banners/store_products).
  - **XSS**: sem DOMPurify no repo. Corpos são Markdown; `sanitizeText`/`stripHtmlTags` removem tags/comentários/declarações HTML **na escrita** (regex exige letra após `<`, preservando "a < b", "<3" e sintaxe Markdown). Render usa `MarkdownContent` (react-markdown com `skipHtml`) — defesa em profundidade.
  - **Imutabilidade**: `publishDocument` calcula SHA-256 (`computeDocumentHash` → `sha256:<hex>`) do corpo (termos/contrato/política) ou do `JSON.stringify(form_schema)` (formulário) e anexa uma versão; `appendVersion` recusa sobrescrever número de versão existente. Corpos de versões antigas **não** são retidos no registry (só metadados/hashes) — a prova de imutabilidade é o hash em cada versão + nos registros de aceite.
  - **Analytics de aceite**: computados (não persistidos) de coleções que o abrigo já lê — `adoption_workflow` (aceite = `terms_accepted_at`), `contracts` (aceite = `fully_signed`), `interviews` (completed/evaluated). Leitura best-effort (falha → zeros por coleção). Sem PII.
  - **Formulário de adoção in-app**: entregue como documento de categoria `form` com construtor + pré-visualização. **Falta**: submissão gravando em `adoption_workflow` e migração do Google Forms webhook.
- **Fase 7**: carrinho/checkout sem processador de pagamento próprio nesta rodada; manter off-platform com ponto de extensão.
  - **Reuso aditivo da Fase 1 (CONFIRMADO 2026-08)**: a Loja v1 já grava `clubs/{clubId}/store_products/{id}` (público) + `/private/main` (custo/fornecedores) e `clubs/{clubId}/store_orders/{id}` com `items[]`, `status` (pending→confirmed→paid→shipped→delivered/cancelled), `total_cents`, `buyer_uid`, `shelter_club_id`, `activity[]`. A Fase 7 **reusa** `createOrder`/`updateProduct` e adiciona campos **aditivos**: `variants[]` (rótulo/preço/estoque/SKU) no produto e `fulfillment` (transportadora/rastreio/previsão) no pedido. Schemas sem `hasOnly()` → escritas aditivas passam sem tocar `firestore.rules`.
  - **Carrinho client-side**: o carrinho mora em `localStorage` (`viralata_store_cart_v2`), **não** no Firestore — store singleton (`hooks/cartStore.js`) com emitter + `useSyncExternalStore`, SSR-safe e sincronizado entre abas. Identidade da linha = `club_id::product_id::variant_id`. Multi-abrigo; no checkout, um `createOrder` por abrigo (best-effort: falha de um não aborta os outros).
  - **Rastreio do comprador**: `listMyOrders(uid)` usa `collectionGroup('store_orders') where buyer_uid == uid` **sem** `orderBy` (campo único auto-indexado; ordenação client-side) → `firestore.indexes.json` **inalterado**. Regras já permitem o comprador ler o próprio pedido.
  - **Pagamento off-platform com ponto de extensão**: registry de provedores em `storeCart.js` (`registerPaymentProvider`/`listAvailablePaymentProviders`/`resolvePaymentInstructions`) com 4 provedores embutidos (PIX/link externo/dinheiro na retirada/a combinar). É a costura para um gateway futuro sem reescrever o checkout.
  - **Sem regressão com flag OFF**: todas as superfícies novas (subaba Analytics, controles de fulfillment, campo de variações, `CartButton`/`AddToCartButton`, rota `/meus-pedidos`) são montadas **apenas** com `SHELTER_STORE_V2` ON; com a flag OFF o payload do produto não inclui `variants` e nada muda no comportamento v1.
- **Todas**: manter isolamento multi-tenant; `audit_log` em toda mutação; a11y e responsividade validadas.

---

## 14. Auditoria de integração cross-fase (2026-08-29)

> **Objetivo**: confirmar que as superfícies **compartilhadas** entre fases funcionam quando **múltiplas flags** estão ON ao mesmo tempo, e que com as flags OFF não há regressão. Auditoria **read-only** (nenhum arquivo alterado por ela).

> **Nota sobre nomes de flag**: o prompt de conclusão citou `SHELTER_TEAM_V1`/`SHELTER_VOLUNTEERS_V1`/`SHELTER_FOSTER_V1`, mas os identificadores reais no código são **`SHELTER_TEAM_V2`**, **`SHELTER_VOLUNTEERS_V2`** e **`SHELTER_FOSTER_V2`** (as fases 1–3 são "v2" da respectiva aba). Ver `src/modules/shelter/domain/constants.js`.

### 14.1 Defaults confirmados
Todas as 8 flags nascem **OFF**: o spread `Object.values(SHELTER_FEATURE_FLAG).map((k) => [k, false])` em `src/core/featureFlags.js:738-740` define `false` para cada flag do abrigo, e **nenhuma** das 8 aparece na lista de overrides `true` que vem depois (`featureFlags.js:742-771`). ✅

### 14.2 Superfície A — Notificações acionáveis (Fase 0) reusadas por Fases 1/2/3
- **Implementação**: campos aditivos de ação são gravados por `buildNotificationActionFields()` (`src/core/services/notificationService.js`), que retorna `{ action_kind:null, action_ref:null, action_state:null }` quando não há ação (Firestore-safe, retrocompatível). O sino (`NotificationsMenu.jsx`) só renderiza os botões Aceitar/Recusar quando `SHELTER_ACTIONABLE_NOTIFICATIONS_V1` está ON; caso contrário cai no item link-only legado.
- **Combinação assimétrica (Fase 1/2/3 ON, Fase 0 OFF)**: o convite é criado e **funciona** (aceite/recusa continuam via fluxo do convite); a notificação apenas não mostra os botões inline (fallback link-only). **Sem crash.** ✅
- **Combinação assimétrica (Fase 0 ON, Fase 1/2/3 OFF)**: se existir um convite pendente, os botões renderizam e funcionam; sem convites novos, nada aparece. ✅
- **Achado menor (não bloqueante)**: o fluxo de convite grava os campos `action_*` mesmo com a Fase 0 OFF (≈50 bytes/convite inertes). Otimização opcional → **TASK-942**.
- **Regressão com tudo OFF**: sino é link-only, idêntico ao legado. ✅

### 14.3 Superfície B — Documentos (Fase 6) ↔ fluxos e legais
- **Implementação**: os vínculos de documento a fluxos são **enums estáticos** (`DOC_AUDIENCE`: `volunteer`/`foster`/`member` em `src/modules/shelter/domain/documents/shelterDocuments.js`), não leituras vivas de outra fase; o catálogo legal (`src/modules/shelter/domain/legal/`) é hardcoded e não lê flags; a central de documentos self-gate em `SHELTER_DOCUMENTS_V1` (`OrganizationAdminPanel.v3.jsx`).
- **Combinação assimétrica (Fase 6 ON, Fase 2/3 OFF)**: um documento vinculado ao fluxo "voluntário"/"lar" **não quebra** — o alvo é uma string de enum, não um lookup na coleção de voluntários/lares. ✅
- **Regressão com Fase 6 OFF**: aba Documentos oculta; painel legado inalterado. ✅
- **Gap funcional conhecido (não é regressão)**: submissão do formulário de adoção in-app ainda não grava em `adoption_workflow` (hoje via Google Forms webhook) → **TASK-941**.

### 14.4 Superfície C — Voluntários (Fase 2) ↔ Vitrines (Fase 5)
- **Implementação**: caminhos de dados **independentes** — roster de voluntários em `clubs/{clubId}/volunteers/{uid}` (gate `SHELTER_VOLUNTEERS_V2`) e escala da vitrine em `clubs/{clubId}/exhibitions/{exId}/shifts/{id}` (gate `SHELTER_EXHIBITION_OPS_V1`). A escala usa contador de vagas (`slots_filled`), **não** um join na coleção de voluntários.
- **Combinação assimétrica (Fase 5 ON, Fase 2 OFF ou vice-versa)**: cada aba gate a própria UI, nenhuma lê a flag da outra; **sem acoplamento rígido, sem crash**. ✅
- **Regressão com flags OFF**: Vitrines cai para lista read-only (`ExhibitionsList`); Voluntários cai para `VolunteersRoster` legado. ✅
- **Gap funcional conhecido (não é regressão)**: o espelho público `exhibitions_public` **não tem writer** (página de detalhe pública fica vazia) e a leitura anônima de `clubs/{clubId}/exhibitions` depende das `firestore.rules` → **TASK-939** (writer) e **TASK-940** (regra de leitura pública).

### 14.5 Veredito
**Zero risco de regressão com as flags OFF. Nenhum crash nas combinações assimétricas testadas.** Não há estado mutável compartilhado entre fases. Um único achado menor (14.2) é otimização opcional. Os "gaps" listados são **funcionalidades a completar** (não regressões) e foram abertos como tasks (§16).

### 14.6 Hardening aplicado nesta rodada (code review)
- **Fase 7 (Loja) — `setOrderFulfillment`**: adicionada guarda `if (!snap.exists()) throw new Error('Pedido não encontrado.')` antes do `updateDoc`, alinhando ao padrão já usado em `exhibitionOpsService`/`shelterDocumentsService` (evita erro Firestore `not-found` cru ao gravar envio de um pedido inexistente). Teste de cobertura adicionado (`shelterStoreOpsService.test.js`). Sem mudança de comportamento no caminho feliz; 829 testes de `src/modules/shelter/**` verdes.
- **Fase 4 (Mural) — `sortMuralPosts(posts, now)`**: o parâmetro `now` é intencionalmente descartado (`void now`) — a ordenação depende só de estado fixado + `pinned_at`/`createdMs` (independente do tempo); mantido por uniformidade de assinatura com os demais helpers do módulo. Não é bug; sem alteração.

---

## 15. Plano de rollout progressivo

> **Princípio**: ligar **uma flag por vez**, em produção, respeitando as **dependências** entre fases; validar antes com smoke (flag OFF), abrir janela de ativação, monitorar 24h, e ter rollback trivial (voltar a flag para OFF em `/admin/flags`, sem deploy).

### 15.1 Ordem de ativação (por dependência e risco)

| Ordem | Fase | Flag | Depende de (deve já estar ON) | Task |
|---|---|---|---|---|
| 1 | 0 · Notificações acionáveis | `SHELTER_ACTIONABLE_NOTIFICATIONS_V1` | — (fundação) | TASK-931 |
| 2 | 1 · Equipe v2 | `SHELTER_TEAM_V2` | Fase 0 | TASK-932 |
| 3 | 2 · Voluntários v2 | `SHELTER_VOLUNTEERS_V2` | Fases 0, 1 | TASK-933 |
| 4 | 3 · Lares Temporários v2 | `SHELTER_FOSTER_V2` | Fases 0, 2 | TASK-934 |
| 5 | 6 · Documentos v1 | `SHELTER_DOCUMENTS_V1` | — (independente; útil cedo p/ termos dos fluxos de Pessoas) | TASK-935 |
| 6 | 4 · Mural v2 | `SHELTER_MURAL_V2` | Fase 0 (menções/CTA) | TASK-936 |
| 7 | 5 · Vitrines v1 (ops) | `SHELTER_EXHIBITION_OPS_V1` | — (idealmente Fase 2 p/ escala) | TASK-937 |
| 8 | 7 · Loja v2 | `SHELTER_STORE_V2` | **`SHELTER_STORE_V1`** (pré-requisito) | TASK-938 |

**Guardas de dependência** (checar antes de ligar):
- Não ligar **Voluntários v2** antes de **Equipe v2** + **Fase 0**.
- Não ligar **Lares v2** antes de **Voluntários v2**.
- **Loja v2** exige **Loja v1** já ativa (a v2 é aditiva sobre a v1).
- **Documentos v1** pode subir cedo (item 5) para que Equipe/Voluntários/Lares já apontem termos versionados; não bloqueia nem é bloqueada.

### 15.2 Procedimento por fase (runbook)
Para **cada** ativação:
1. **Pré-ativação (flag OFF)**: `npm run build` + `npm run smoke:routes` (35 rotas, ver §16 Fase 7) num preview; confirmar 0 quebradas e que as rotas novas da fase respondem (200 público ou redirect→/login quando protegida).
2. **Ativar**: ligar **somente** a flag da fase em `/admin/flags` (master admin). Nada de deploy — é runtime.
3. **Fumaça pós-ativação**: repetir o smoke com a flag ON; abrir manualmente a aba/superfície da fase no painel do abrigo e a superfície pública correspondente.
4. **Monitorar 24h**: Sentry (erros JS), Crashlytics (se app mobile/PWA), logs de **Cloud Functions** (crons/webhooks/triggers), e **billing API** (pico de leituras/gravações Firestore). Critério de rollback: erro novo atribuível à fase, pico anômalo de custo, ou quebra de fluxo público.
5. **Rollback (se preciso)**: voltar a flag para OFF em `/admin/flags` (efeito imediato, comportamento legado restaurado). Registrar incidente e reabrir a task da fase.
6. **Concluir**: só então marcar a fase como ✅ em §12 e `resolvedAt` na task de rollout.

### 15.3 Sinais de saúde por fase (o que observar)
- **Fase 0**: taxa de aceite/recusa inline vs. link; erros ao gravar `action_state`.
- **Fases 1–3**: convites enviados vs. aceitos; erros de permissão (deny-by-default disparando indevidamente).
- **Fase 4 (Mural)**: posts agendados publicando no horário; comentários ocultados/reexibidos; alcance.
- **Fase 5 (Vitrines)**: criação de evento/ops; escala de voluntários; **não** confiar na página pública de detalhe até o writer do mirror (TASK-939).
- **Fase 6 (Documentos)**: versões append-only com `content_hash`; nenhum HTML cru renderizado.
- **Fase 7 (Loja)**: pedidos criados por abrigo no checkout; fulfillment; `/meus-pedidos` do comprador; nenhuma escrita de `variants` com a flag OFF.

---

## 16. Checklist da Regra A por fase (UX · Papéis · Regras · Integrações · Pós-deploy)

> Legenda: **[x]** entregue · **[ ]** falta (com a task aberta). "Pós-deploy" = ativação em produção + 24h de monitoramento (runbook §15.2). Gaps viram tasks em `.harness/SCRUM_TASKS.json` (TASK-931 a TASK-945).

### Fase 0 — Notificações acionáveis (`SHELTER_ACTIONABLE_NOTIFICATIONS_V1`)
- **UX**: [x] botões Aceitar/Recusar inline no sino; [x] estado pendente/aceito/recusado; [x] fallback link-only com flag OFF.
- **Papéis**: [x] convidado responde; [x] emissor vê o estado.
- **Regras**: [x] campos de ação aditivos/retrocompatíveis; [x] sem mudança em `firestore.rules`.
- **Integrações**: [x] reusada por Fases 1/2/3; [ ] gate da escrita de `action_*` quando a flag está OFF (otimização) → **TASK-942**.
- **Pós-deploy**: [ ] ativar + 24h → **TASK-931**.

### Fase 1 — Equipe v2 (`SHELTER_TEAM_V2`)
- **UX**: [x] tabela rica (acesso, telefone, e-mail, endereço); [x] blocos de permissão rotulados; [x] status/vínculo de documentos.
- **Papéis**: [x] membro permanente vs. transitório explícito; [x] owner = todas as permissões.
- **Regras**: [x] convite por notificação (usa Fase 0); [x] additive, sem `firestore.rules`.
- **Integrações**: [x] documentos/termos (Fase 6, via enum); [x] Fase 0.
- **Pós-deploy**: [ ] ativar + 24h → **TASK-932**.

### Fase 2 — Voluntários v2 (`SHELTER_VOLUNTEERS_V2`)
- **UX**: [x] tabela (atividades, "disponível hoje", período, contato); [x] referência de blocos de permissão concedíveis.
- **Papéis**: [x] transitório; [x] promoção a membro por quem tem atribuição.
- **Regras**: [x] promoção/convite por notificação (Fase 0); [x] snapshot de perfil no roster do abrigo (rules impedem ler `volunteer_profile` global).
- **Integrações**: [x] Fases 0 e 1; [x] escala de Vitrines (Fase 5) por caminho independente.
- **Pós-deploy**: [ ] ativar + 24h → **TASK-933**.

### Fase 3 — Lares Temporários v2 (`SHELTER_FOSTER_V2`)
- **UX**: [x] lista própria; [x] disponibilidade (datas, capacidade, tipos de pet); [x] tabela rica.
- **Papéis**: [x] espécie de voluntário (transitório); [x] promoção/atribuição por membro com atribuição.
- **Regras**: [x] vínculo/promoção por notificação (Fase 0); [x] placements (propor/aceitar/prorrogar/finalizar) intactos; [x] termo com assinatura+hash.
- **Integrações**: [x] Fases 0 e 2; [x] documentos (Fase 6, via enum).
- **Pós-deploy**: [ ] ativar + 24h → **TASK-934**.

### Fase 4 — Mural v2 (`SHELTER_MURAL_V2`)
- **UX**: [x] composer avançado (agendamento, rascunho, tags, menções); [x] fixar/arquivar/busca; [x] moderação de comentários; [x] analytics; [x] view pública.
- **Papéis**: [x] admin/membro com permissão `feed`; [x] público interage.
- **Regras**: [x] campos aditivos em `club_posts`; [x] sem `firestore.rules`.
- **Integrações**: [x] Fase 0 (menções/CTA).
- **Pós-deploy**: [ ] ativar + 24h → **TASK-936**.

### Fase 5 — Vitrines v1 / ops (`SHELTER_EXHIBITION_OPS_V1`)
- **UX**: [x] lista funcional → detalhes; [x] planejamento/logística/saúde/adoção; [x] escala de voluntários; [x] log pós-evento.
- **Papéis**: [x] admin/membro; [x] voluntários na escala.
- **Regras**: [x] campo `ops` aditivo no mesmo doc; [x] sem `firestore.rules`.
- **Integrações**: [x] escala reusa voluntários; [ ] **writer do mirror `exhibitions_public`** (detalhe público vazio) → **TASK-939**; [ ] **leitura anônima** de vitrines publicadas (rules) → **TASK-940**.
- **Pós-deploy**: [ ] ativar + 24h → **TASK-937**.

### Fase 6 — Documentos v1 (`SHELTER_DOCUMENTS_V1`)
- **UX**: [x] central (formulários/termos/contratos) com status/versão/vínculos; [x] editor Markdown + construtor de formulário; [x] pré-visualização.
- **Papéis**: [x] owner/admin editam; [x] vínculo por audiência (membro/voluntário/lar/adoção).
- **Regras**: [x] versionamento append-only + `content_hash` (imutabilidade); [x] sanitização (Markdown + skipHtml); [x] campo `documents` aditivo; [x] sem `firestore.rules`.
- **Integrações**: [x] catálogo legal versionado; [x] fluxos via enum; [ ] **submissão do formulário de adoção in-app → `adoption_workflow`** + migração Google Forms → **TASK-941**.
- **Pós-deploy**: [ ] ativar + 24h → **TASK-935**.

### Fase 7 — Loja v2 (`SHELTER_STORE_V2`)
- **UX**: [x] carrinho multi-abrigo; [x] checkout (um pedido por abrigo); [x] `/meus-pedidos`; [x] analytics admin; [x] fulfillment; [x] variações.
- **Papéis**: [x] comprador (auth); [x] admin da loja (CRUD/fulfillment/analytics).
- **Regras**: [x] `variants`/`fulfillment` aditivos; [x] rastreio do comprador sem `orderBy` (sem novo índice); [x] sem `firestore.rules`.
- **Integrações**: [x] reusa `createOrder`/`updateProduct` da Loja v1; [x] pagamento off-platform com registry de provedores; [ ] **gateway de pagamento real** via ponto de extensão → **TASK-943**; [ ] persistência do carrinho cross-device (hoje `localStorage`) → **TASK-944**.
- **Pós-deploy**: [ ] ativar + 24h (exige Loja v1 ON) → **TASK-938**.

### Transversal
- [ ] **Cobertura de testes e2e/componente** (Playwright) das superfícies V2 + rodar `smoke:routes` com as flags toggladas → **TASK-945**.

---

*Documento vivo. Atualize §12 e `.harness/SCRUM_TASKS.json` ao concluir cada fase.*

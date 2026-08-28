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
- `src/modules/shelter/domain/store/`, `shelterStoreService`, `StoreAdmin` + painéis, `ShelterStorePublicTab`, `MarketplacePage` (`/mercado`). Pagamento off-platform (PIX/externo). Flag `SHELTER_STORE_V1`. **Falta**: carrinho, checkout, pedidos, fulfillment, analytics; separação clara admin vs. loja pública.

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
| 4 | Engajamento · Mural | `SHELTER_MURAL_V2` | `feat/shelter-fase4-mural` | ⏳ pendente |
| 5 | Engajamento · Vitrines | `SHELTER_EXHIBITION_OPS_V1` | `feat/shelter-fase5-vitrines` | ⏳ pendente |
| 6 | Documentos do abrigo | `SHELTER_DOCUMENTS_V1` | `feat/shelter-fase6-documents` | ⏳ pendente |
| 7 | Loja do abrigo | `SHELTER_STORE_V2` | `feat/shelter-fase7-store` | ⏳ pendente |

**Legenda**: ⏳ pendente · 🔨 em progresso · 👀 em review · ✅ concluído (flag validada em produção).

---

## 13. Notas de risco / verificações antes de codar

- **Fase 0**: notificações são usadas em toda a plataforma — mudanças devem ser **estritamente aditivas** e atrás de flag; garantir zero regressão com flag OFF.
- **Fase 5**: confirmar o schema público das vitrines (`exhibitions_public` vs. `clubs/{clubId}/exhibitions/{id}`) e os campos de data (`datetime_start` vs. `event_date`) antes de mexer na página pública.
- **Fase 6**: editor interno é sensível a XSS — sanitizar entradas/HTML; manter imutabilidade de termos aceitos.
- **Fase 7**: carrinho/checkout sem processador de pagamento próprio nesta rodada; manter off-platform com ponto de extensão.
- **Todas**: manter isolamento multi-tenant; `audit_log` em toda mutação; a11y e responsividade validadas.

---

*Documento vivo. Atualize §12 e `.harness/SCRUM_TASKS.json` ao concluir cada fase.*

# REGENCY: Pet Ops V3 (TASK-V3-PET-OPS-LOG) — Documento de Implementação

> **Status:** DEPLOYED em `sw-v72.4` (PR #198) + correções sw-v93..v95
> **+ SHELTER_PET_OPS_TABLES_V1 (PR #204) + agendamento (PR #205) + fixes (PR #206)**
> **Data:** 2026-07-22 (atualizado 2026-08-03)
> **Bundle:** `PetDetailV3-DyhpBi3o.js` (123692 bytes)

## Visão geral

A feature "Pet Ops" implementa um sistema completo de gestão operacional de
pets para abrigos (ONGs) na plataforma Viralata. Combina 3 sistemas críticos
que se integram em uma única experiência:

1. **ID imutável** (`pet_seq`) — número sequencial global, permanente, único por pet
2. **Log imutável** (`pet_audit_log`) — registro completo de todas as mudanças
3. **Anotações** (`pet_notes`) — campo livre dos administradores
4. **Timeline visual** — agregação cronológica de todos os eventos

Tudo isso é apresentado em duas views:
- **Tabela operacional** na aba "Operacional" do painel admin da ONG
- **Painel admin do pet** com 3 novas tabs (Anotações, Log, Timeline)

---

## 1. Tabela Operacional (`PetsOpsTable`)

### Localização
- `src/modules/organizations/components/PetsOpsTable.jsx`
- Renderizada em: `ClubPetsDataGrid` (default view = `'ops'`)

### Estrutura da tabela

| Coluna | Conteúdo | Tipo |
|---|---|---|
| **ID** (1ª) | `pet_seq` formatado como `#000001` | Link clicável → `/pets/<id>` |
| Nome | `pet.name` ou `pet.title` | Texto |
| Espécie | Cachorro / Gato / Coelho / Pássaro / Outro | Texto |
| Porte | Mini / Pequeno / Médio / Grande / Gigante | Texto |
| Status | Disponível / Em processo / Adotado / Indisponível | Badge colorido |
| **Histórico** | — | Link `#history` |
| **Cuidados** | — | Link `#care` |
| **Saúde** | — | Link `#health` |
| **Timeline** | — | Link `#timeline` |
| **Anotações** | — | Link `#notes` |

### D-NOVAS

- **D-PET-SEQ-IMMUTABLE**: pet_seq é o ID PERMANENTE do pet. Nunca pode
  ser alterado. Formatado como `#000001` (6 dígitos). Enforced em
  firestore.rules + service.ts.
- **D-PET-OPS-TABLE-PRIMARY-NAVIGATION**: cada linha é um ponto de entrada
  para o painel admin do pet. ID é a primary nav (clicável).
- **D-PET-OPS-COL-FUNCTIONAL**: cada coluna funcional leva a uma seção
  do painel admin via hash deep-link (`/pets/<id>#<section>`).
- **D-PET-OPS-CAN-MANAGE**: links só aparecem se `canManage=true`. Sem
  permissão, mostra apenas ícones desabilitados (cinza).
- **D-PET-SEQ-FALLBACK**: pets antigos (sem pet_seq) usam `pet_code`
  (VLT-000123) ou os primeiros 6 chars do Firestore docId.

### Ordenação e filtros

- Ordenação clicável: ID, Nome, Data de cadastro
- Filtro de busca: nome, raça, cidade, ID
- EmptyState quando vazio ou filtro sem resultado
- Skeleton durante carregamento

---

## 2. ID Imutável (`pet_seq`)

### Geração
- `getNextPetSeq()` em `src/modules/pets/services/petService.js`
- Usa `runTransaction` atômico em `/pet_seq_counter/global` (Firestore)
- Retorna o próximo número (current + 1)
- Fallback: `Math.floor(Date.now() / 1000) % 1_000_000` se transaction falhar

### Imutabilidade (defense-in-depth)

**Camada 1 — Service (`petService.ts`)**:
```js
// D-PET-SEQ-IMMUTABLE: pet_seq NUNCA pode ser alterado
const safeUpdates = { ...updates };
if (Object.prototype.hasOwnProperty.call(safeUpdates, 'pet_seq')) {
  logger.warn('[petService] tentativa de alterar pet_seq bloqueada', ...);
  delete safeUpdates.pet_seq;
}
```

**Camada 2 — Firestore Rules**:
```
allow update: if isAuth() && (...) && (
  // pet_seq IMUTÁVEL depois de criado
  (resource.data.pet_seq == null && request.resource.data.pet_seq != null) ||
  (resource.data.pet_seq == request.resource.data.pet_seq) ||
  isPlatformAdmin()
);
```

### Formato de exibição
- `#000001` (6 dígitos, zero-padded)
- Fonte: `font-mono` + cor primary
- Background: `bg-primary/10`
- Ícone: `Hash` (lucide)

### Pets legados (sem pet_seq)
- Fallback 1: `pet_code` (VLT-000123)
- Fallback 2: `#${docId.slice(0, 6)}`

---

## 3. Log Imutável (`pet_audit_log`)

### Localização
- Subcoleção: `pets/{petId}/pet_audit_log`
- Service: `src/modules/pets/services/petLogService.js`
- Hook: `src/modules/pets/hooks/usePetLog.js`
- Componente: `src/modules/pets/components/PetLog.jsx`
- Tab no PetDetailV3: **"Log"**

### Schema de cada entrada
```js
{
  action: 'pet_created' | 'pet_updated' | 'pet_deleted' | 'vet_visit_created' | ...,
  actor_uid: string,
  actor_name: string,
  actor_email: string,
  target_collection: string,
  target_doc_id: string,
  details: object,
  created_at: serverTimestamp,
}
```

### D-NOVAS

- **D-PET-LOG-IMMUTABLE**: `pet_audit_log` é **append-only**.
  `update=false`, `delete=false` em firestore.rules.
- **D-PET-LOG-PER-CHANGE**: cada create/update/delete em pet ou
  subcoleção registra log via `appendPetLog`. Captura actor + target +
  details. Best-effort (não bloqueia operação principal se falhar).

### Eventos registrados (28 actions)

#### Pet
- `pet_created`, `pet_updated`, `pet_deleted`

#### Saúde (subcoleções)
- `vet_visit_created`, `vet_visit_updated`, `vet_visit_deleted`
- `treatment_created`, `treatment_updated`, `treatment_deleted`
- `medication_created`, `medication_updated`, `medication_deleted`

#### Cuidados
- `care_log_created`, `care_log_updated`, `care_log_deleted`

#### Histórico
- `devolution_created`, `devolution_updated`, `devolution_deleted`
- `adopter_history_created`, `adopter_history_updated`, `adopter_history_deleted`

#### Anotações
- `note_created`, `note_deleted`

### Permissões (firestore.rules)
- **read**: `isPlatformAdmin() || canManagePet()`
- **create**: `isPlatformAdmin() || canManagePet()`
- **update**: `false` (imutável)
- **delete**: `false` (imutável)

### Visualização (Tab "Log")
- Lista cronológica reversa (mais recente primeiro)
- Cada entrada: ícone colorido + label + data + descrição + actor
- Cores semânticas: rose (criação), sky (update), emerald (saúde), amber (treatment), slate (delete)

---

## 4. Anotações (`pet_notes`)

### Localização
- Subcoleção: `pets/{petId}/pet_notes`
- Service: `src/modules/pets/services/petNotesService.js`
- Hook: `src/modules/pets/hooks/usePetNotes.js`
- Componente: `src/modules/pets/components/PetNotes.jsx`
- Tab no PetDetailV3: **"Anotações"**

### Schema de cada anotação
```js
{
  text: string,           // conteúdo da anotação (até 1000 chars)
  author_uid: string,
  author_name: string,
  author_email: string,
  created_at: serverTimestamp,
}
```

### D-NOVAS

- **D-PET-NOTES-AUTHOR-DELETE**: notas só podem ser excluídas pelo
  autor (`author_uid` match) ou platform_admin. Outros admins podem
  criar mas não deletar.

### Permissões (firestore.rules)
- **read**: `isPlatformAdmin() || canManagePet()`
- **create**: `isPlatformAdmin() || canManagePet()` + campos obrigatórios
- **update**: `false` (imutável)
- **delete**: `isPlatformAdmin() || resource.data.author_uid == request.auth.uid`

### UX (Tab "Anotações")
- Formulário de nova anotação (textarea + contador + botão)
- Lista cronológica reversa
- Cada anotação: texto + autor + tempo relativo
- Botão de excluir (só aparece se o user é autor ou platform_admin)
- Toast feedback em criar/excluir
- AnimatePresence no Framer Motion

---

## 5. Timeline Visual

### Localização
- Service: `src/modules/pets/services/petTimelineService.js`
- Hook: `src/modules/pets/hooks/usePetTimeline.js`
- Componente: `src/modules/pets/components/PetTimelineView.jsx`
- Tab no PetDetailV3: **"Timeline"**

### D-NOVAS

- **D-PET-LOG-TIMELINE-AGGREGATION**: Timeline agrega TODOS os eventos
  do pet (criação, mudanças, saúde, cuidados, histórico, anotações) em
  ordem cronológica reversa. Combina 9 fontes diferentes em uma view única.

### Fontes agregadas
1. `pet.created_at` (cadastro inicial)
2. `pet_audit_log` (todas as mudanças)
3. `pet_notes` (anotações)
4. `vet_visits` (consultas)
5. `treatments` (tratamentos)
6. `medications` (medicações)
7. `care_log` (cuidados)
8. `devolutions` (devoluções)
9. `adopters_history` (histórico de adotantes)

### Estrutura de cada evento
```js
{
  id: string,
  type: string,
  date: Date,
  title: string,
  description: string,
  icon: string,        // nome do ícone lucide
  color: 'rose' | 'sky' | 'emerald' | 'amber' | 'primary' | 'slate',
  actor: string,
  data: object,
}
```

### Visual (Tab "Timeline")
- Linha vertical do timeline (esquerda)
- Cada evento: ícone circular colorido + card com título + descrição + actor
- Agrupamento por dia
- Cores semânticas:
  - **rose**: criação, medicamentos, devoluções
  - **sky**: update, cuidados, anotações
  - **emerald**: saúde (vet_visits), adotantes
  - **amber**: tratamentos
  - **primary**: pet_created
  - **slate**: delete
- Animações de entrada (Framer Motion)
- Lazy loading (50 eventos por fonte)

---

## 6. Hash Router

### D-NOVAS

- **D-HASH-ROUTER-PET-TABS**: tabs do PetDetailV3 são navegáveis por
  hash (`#history`, `#care`, `#health`, `#timeline`, `#notes`, `#log`).
  PetsOpsTable usa isso para deep-link direto.

### Comportamento
- URL `/pets/<id>#history` → ativa tab "Histórico"
- URL `/pets/<id>#log` → ativa tab "Log"
- Scroll suave para a tab correspondente (`scrollIntoView`)
- Backward compat com `?tab=history` (legacy)
- Hash atualiza quando user clica em tab (via `history.replaceState`)
- `hashchange` event listener para suportar navegação back/forward

### Tabs disponíveis
1. `about` (default) — Sobre
2. `health` — Saúde
3. `care` — Cuidados
4. `history` — Histórico
5. `notes` — Anotações (NOVO)
6. `log` — Log (NOVO)
7. `timeline` — Timeline (NOVO)

---

## 7. Firestore Rules (mudanças)

### Pets (update)
```js
allow update: if isAuth() && (
  // ... existing permission check
) && (
  // D-PET-SEQ-IMMUTABLE: pet_seq é IMUTÁVEL depois de criado
  (resource.data.pet_seq == null && request.resource.data.pet_seq != null) ||
  (resource.data.pet_seq == request.resource.data.pet_seq) ||
  isPlatformAdmin()
);
```

### Subcoleções novas
```js
// pet_notes
match /pet_notes/{noteId} {
  allow read: if isAuth() && (isPlatformAdmin() || canManagePet(...));
  allow create: if isAuth() && (isPlatformAdmin() || canManagePet(...))
    && request.resource.data.keys().hasAll(['text', 'author_uid', 'created_at']);
  allow update: if false;  // imutável
  allow delete: if isAuth() && (isPlatformAdmin() || resource.data.author_uid == request.auth.uid);
}

// pet_audit_log
match /pet_audit_log/{logId} {
  allow read: if isAuth() && (isPlatformAdmin() || canManagePet(...));
  allow create: if isAuth() && (isPlatformAdmin() || canManagePet(...))
    && request.resource.data.keys().hasAll(['action', 'actor_uid', 'created_at']);
  allow update: if false;  // imutável
  allow delete: if false;  // imutável
}
```

### Counter global
```js
// TASK-V3-PET-OPS-LOG: counter global para pet_seq (atômico)
match /pet_seq_counter/{counterId} {
  allow read, write: if isAuth() && isPlatformAdmin();
}
```

---

## 8. Arquivos criados/modificados

### Novos (criados)
- `src/modules/pets/services/petLogService.js` (3.231 bytes)
- `src/modules/pets/services/petLogService.test.js` (4.614 bytes)
- `src/modules/pets/services/petNotesService.js` (3.121 bytes)
- `src/modules/pets/services/petTimelineService.js` (9.691 bytes)
- `src/modules/pets/hooks/usePetLog.js` (589 bytes)
- `src/modules/pets/hooks/usePetNotes.js` (1.665 bytes)
- `src/modules/pets/hooks/usePetTimeline.js` (594 bytes)
- `src/modules/pets/components/PetLog.jsx` (6.860 bytes)
- `src/modules/pets/components/PetNotes.jsx` (6.463 bytes)
- `src/modules/pets/components/PetTimelineView.jsx` (5.022 bytes)
- `src/modules/organizations/components/PetsOpsTable.jsx` (13.052 bytes)
- `src/modules/organizations/components/PetsOpsTable.test.jsx` (4.656 bytes)

### Modificados
- `src/modules/pets/services/petService.js` (getNextPetSeq + log em CRUD)
- `src/modules/pets/services/petMedicalService.js` (log em CRUD de subcoleções)
- `src/modules/pets/services/petHistoryService.js` (log em CRUD de subcoleções)
- `src/modules/pets/pages/PetDetailV3.jsx` (3 novas tabs + hash router)
- `src/modules/organizations/components/ClubPetsDataGrid.jsx` (nova view 'ops')
- `firestore.rules` (pet_seq immutable + pet_notes + pet_audit_log + counter)

---

## 9. Testes (19 novos)

### petLogService (9 testes)
- `PET_LOG_ACTIONS` exporta enum correto
- `appendPetLog` retorna `{ ok: false }` se petId ausente
- `appendPetLog` retorna `{ ok: false }` se action ausente
- `appendPetLog` grava entrada com actor_uid/actor_name/email/collection/docId
- `appendPetLog` usa fallback "Sistema" se actor sem nome
- `appendPetLog` retorna `{ ok: false }` se addDoc falhar (mas NÃO throw)
- `listPetLog` retorna array vazio se petId ausente
- `listPetLog` retorna array vazio se getDocs falhar
- `listPetLog` mapeia docs com id

### PetsOpsTable (10 testes)
- Renderiza 1 linha por pet (3 pets + 1 header)
- Exibe ID como #000042 (formato imutável)
- Fallback: pet sem pet_seq usa pet_code
- D-PET-OPS-TABLE-PRIMARY-NAVIGATION: ID é link para /pets/<id>
- D-PET-OPS-COL-FUNCTIONAL: 5 colunas funcionais por linha
- D-PET-OPS-COL-FUNCTIONAL: cada coluna leva a /pets/<id>#<section>
- D-PET-OPS-CAN-MANAGE: links só aparecem se canManage=true
- D-PET-OPS-FILTER: filtro de busca por nome
- D-PET-OPS-FILTER: filtro de busca por ID
- EmptyState quando pets = []

**Total**: 339/339 testes passando (era 320 antes)

---

## 10. Deployment

- **PR**: #198 (squash merged)
- **Commit**: `fb2c90b`
- **Bundle**: `PetDetailV3-DyhpBi3o.js` (123692 bytes)
- **SW**: `sw-v72.js` (mesmo SW, novo conteúdo)
- **Estado**: DEPLOYED em produção ✅

---

## 11. Decisões D- (resumo)

| ID | Descrição |
|---|---|
| D-PET-SEQ-IMMUTABLE | pet_seq é ID permanente, nunca alterado |
| D-PET-LOG-IMMUTABLE | pet_audit_log é append-only |
| D-PET-LOG-PER-CHANGE | cada CRUD registra log via appendPetLog |
| D-PET-OPS-TABLE-PRIMARY-NAVIGATION | cada linha é ponto de entrada ao painel admin |
| D-PET-OPS-COL-FUNCTIONAL | colunas funcionais usam hash deep-link |
| D-PET-OPS-CAN-MANAGE | links só aparecem se canManage=true |
| D-PET-SEQ-FALLBACK | pets antigos usam pet_code como fallback |
| D-HASH-ROUTER-PET-TABS | tabs navegáveis por hash URL |
| D-PET-NOTES-AUTHOR-DELETE | notas só autor/platform_admin podem deletar |
| D-PET-LOG-TIMELINE-AGGREGATION | Timeline combina 9 fontes em 1 view |
| **D-HOOKS-ORDER-PRESERVE** (sw-v93) | `useArenaPageClasses` em `PetDetailV3` foi movido para ANTES dos early returns (rules-of-hooks) |
| **D-FIRESTORE-MATCH-SCOPE** (sw-v95) | Subcoleções de pet (`health_records`, `vet_visits`, `treatments`, `care_log`, `devolutions`, `adopters_history`) DEVEM ser aninhadas sob `match /pets/{petId}` correto (eram órfãs no top-level) |
| **D-FIRESTORE-RULES-DEFINITION** (sw-v95) | `shelterCanAccess` / `shelterCanManage` foram definidas (não existiam → kanban sempre negava) |

---

## 12. CRITICAL FIX — Subcoleções Pet órfãs (sw-v95, 2026-07-31)

### Sintoma

Em qualquer pet (`/pets/:petId`), prontuário/vacinas/cuidados/histórico
negavam acesso. Usuário via "permission-denied" em:
- `health_records` (prontuário)
- `vet_visits` (vacinas)
- `treatments` (tratamentos)
- `care_log` (cuidados)
- `devolutions` (devoluções)
- `adopters_history` (histórico de adotantes)

### Causa raiz

As 6 subcoleções estavam com `match` no **top-level** (fora do bloco
`match /pets/{petId}` que declarava `petId`). Logo:
1. `petId` estava fora de escopo nas condições
2. O path da regra não casava com o real `pets/{petId}/...`
3. O compilador emitia warning "Invalid variable name: petId"
4. As regras SEMPRE negavam

### Fix

Envolvidas em `match /pets/{petId}` corretamente:

```js
match /pets/{petId} {
  match /health_records/{recordId} { ... }
  match /vet_visits/{visitId} { ... }
  match /treatments/{treatmentId} { ... }
  match /care_log/{logId} { ... }
  match /devolutions/{devolutionId} { ... }
  match /adopters_history/{historyId} { ... }
}
```

### Lição (D-FIRESTORE-MATCH-SCOPE)

**REGRA**: Subcoleções DEVEM ser aninhadas sob o path correto.
Variáveis de escopo (`{petId}`, `{clubId}`, `{communityId}`) só estão
disponíveis dentro do `match` que as declara.

**Prevenção**: CI deve rodar `firebase firestore:rules:get --emulator`
e falhar se houver warning "Invalid function/variable name".

---

## 13. CRITICAL FIX — PetDetailV3 rules-of-hooks (sw-v93, 2026-07-31)

### Sintoma

`PetDetailV3` crashava intermitentemente com "Invalid hook call" ou
render state inconsistente.

### Causa raiz

`useArenaPageClasses` (hook customizado) era chamado **DEPOIS** dos
early returns (`if (isLoading) return <Loading />` e `if (!pet) return
<NotFound />`). Isso viola a **Rule of Hooks** (hooks devem ser
chamados sempre na mesma ordem, sem condicionais).

### Fix

Hook movido para ANTES dos early returns.

### Lição (D-HOOKS-ORDER-PRESERVE)

**REGRA**: SEMPRE chamar hooks no TOPO do componente, ANTES de qualquer
early return. Caso contrário, o React perde o tracking e emite warning
"Rendered fewer hooks than expected".

**Prevenção**: ESLint plugin `eslint-plugin-react-hooks` (já configurado).
Mas atenção: ele NÃO detecta quando o hook é chamado DEPOIS de early
return em MESMO escopo condicional (não é regra condicional, é regra
de ORDEM).

---

**Última atualização**: 2026-08-03
**Versão**: sw-v72.4 + sw-v93..v95 + SHELTER_PET_OPS_TABLES_V1 (PR #204) + agendamento (PR #205) + fixes (PR #206)
**Mantido por**: Mavis

---

## §14. SHELTER_PET_OPS_TABLES_V1 (PR #204, 2026-07-31)

### Visão geral

Feature flag `SHELTER_PET_OPS_TABLES_V1` (default OFF) ativa **7
tabelas operacionais agregadas do abrigo** na aba "Operacional" do
painel admin da ONG. Cada tabela é uma visão agregada por tipo de
registro (medicações, consultas, tratamentos, etc.) com filtro por
pet, formulário de registro, listagem e ações CRUD.

### Sub-abas operacionais (7 tipos)

| # | Tab key | Título | Subcoleção | dateField | Ícone |
|---|---|---|---|---|---|
| 1 | `ops_medications` | Medicações | `pets/{petId}/medications` | `start_date` | Pill |
| 2 | `ops_vet_visits` | Consultas veterinárias | `pets/{petId}/vet_visits` | `visit_date` | Stethoscope |
| 3 | `ops_treatments` | Tratamentos | `pets/{petId}/treatments` | `start_date` | Bandage |
| 4 | `ops_health_records` | Vacinas/Vermifugação | `pets/{petId}/health_records` | `applied_date` | Syringe |
| 5 | `ops_care_log` | Cuidados | `pets/{petId}/care_log` | `care_date` | Sparkles |
| 6 | `ops_devolutions` | Devoluções | `pets/{petId}/devolutions` | `devolution_date` | Undo2 |
| 7 | `ops_adopters_history` | Histórico de adotantes | `pets/{petId}/adopters_history` | `start_date` | HeartHandshake |

### Arquitetura

```
PetOpsTab (container genérico)
   ↓
PET_OPS_CONFIGS (configs declarativas em petOpsConfigs.jsx)
   ↓
PetOpsTable (lista) + PetOpsForm (formulário genérico)
   ↓
petMedicalService / petHistoryService / petHealthRecordsService
   ↓
Firestore subcollections
```

**Configuração declarativa**: cada sub-aba é definida como um objeto
em `PET_OPS_CONFIGS` com:
- `key`, `tabKey`, `title`, `icon`
- `dateField`, `dateLabel`, `emptyHint`
- `listFn`, `createFn`, `updateFn`, `deleteFn` (importados dos services)
- `fields` (config do formulário)
- `columns` (config da tabela)

**Vantagem**: zero código duplicado. Adicionar nova sub-aba = adicionar
entrada no config.

### Modelo de dados unificado (D-PET-OPS-UNIFIED-MODEL)

Todas as 7 subcoleções seguem o **mesmo modelo**:
- **Campo de data nativo** (ex.: `visit_date`, `start_date`, `care_date`)
- `scheduled_for` (opcional, ISO date) — agendamento para o futuro
- `completed_at` (opcional, ISO) — marca agendamento como realizado

**Status derivado** (calculado em runtime, sem persistir):
- `done` — realizado (com `completed_at` ou data efetiva hoje/passado)
- `scheduled` — agendado para o futuro
- `overdue` — agendado no passado, não realizado

**Data efetiva** = `scheduled_for ?? <campo nativo>`

### Componentes principais

- **`PetOpsTab.jsx`** (126 linhas) — Container com 7 sub-abas. Filtra
  por pet (useMyPets) e delega para `PetOpsTable`.
- **`PetOpsTable.jsx`** (299 linhas) — Tabela genérica. Usa `PET_OPS_CONFIGS`
  para renderizar colunas, abrir `PetOpsForm` para CRUD.
- **`PetOpsForm.jsx`** (175 linhas) — Formulário genérico. Renderiza
  campos baseado em config, com validação de data efetiva.
- **`petOpsConfigs.jsx`** (231 linhas) — 7 configs declarativas
  (PET_OPS_CONFIGS).
- **`petOpsScheduling.js`** (182 linhas) — Lógica pura de
  agendamento/proximidade. Testado.

### Services criados

- **`petHealthRecordsService.js`** (120 linhas) — CRUD para
  `pets/{petId}/health_records` (vacinas, vermifugação).
  Adicionado em PR #204.

### D-* decisões

| ID | Decisão |
|---|---|
| **D-PET-OPS-UNIFIED-MODEL** | Todas as 7 subcoleções operacionais seguem o mesmo modelo (campo nativo + `scheduled_for` + `completed_at`) |
| **D-PET-OPS-DECLARATIVE-CONFIGS** | Sub-abas definidas declarativamente em `PET_OPS_CONFIGS` (zero código duplicado) |
| **D-PET-OPS-STATUS-DERIVED** | Status (done/scheduled/overdue) é calculado em runtime via `recordStatus()`, NÃO persistido |
| **D-PET-OPS-DATE-EFFECTIVE** | Data efetiva = `scheduled_for ?? <campo nativo>` (lógica em `petOpsScheduling.js`) |
| **D-PET-OPS-PROXIMITY-WINDOW** | Badge de proximidade aparece se data efetiva está nos próximos 7 dias (`PROXIMITY_WINDOW_DAYS`) |

---

## §15. Agendamento + Status na Página do Pet (PR #205, 2026-07-31)

### Visão geral

PR #205 leva o **modelo de agendamento** das tabelas operacionais
(SHELTER_PET_OPS_TABLES_V1) para DENTRO da página do pet
(`PetDetailV3`) e no banco de dados do pet — tudo vinculado à
mesma subcoleção `pets/{petId}/...`, **sem duplicar dados**.

### Peças compartilhadas

- **`SchedulingFields.jsx`** (37 linhas) — Toggle "Agendar para data
  futura" usado nos formulários. Componente genérico.
- **`RecordStatusBadge.jsx`** (40 linhas) — Badge Agendada/Atrasada
  + proximidade (aparece para agendados/atrasados). Usa
  `petOpsScheduling.js`.
- **`initScheduled()` / `applyScheduling()`** — Helpers puros em
  `petOpsScheduling.js` (testados).

### Formulários com agendamento (gravam `scheduled_for` na subcoleção do pet)

- `PetVetVisitForm` (Consultas)
- `PetTreatmentForm` (Tratamentos)
- `PetCareLogForm` (Cuidados)
- `PetDevolutionForm` (Devoluções, só contexto admin)

### Listas com badge de status/proximidade

- `PetVetVisits`, `PetTreatments`, `PetDevolutions`,
  `PetAdoptersHistory`.

### Vacinas e vermifugação (CRUD novo na página do pet)

- **`usePetHealthRecords.js`** (53 linhas) — Hook CRUD.
- **`PetHealthRecordForm.jsx`** (154 linhas) — Form com agendamento.
- **`PetHealthRecords.jsx`** (92 linhas) — Lista de gestão.
- `PetDetailV3` passa a mostrar a gestão para quem gerencia
  (`canManage`) e mantém a visão pública (`PublicHealthRecord`)
  para visitantes.

### Correção relacionada

**`PublicHealthRecord.jsx`** — Esconde agendamentos futuros (ainda
NÃO aplicados) da visão pública. Publicamente só aparece o que já
foi realizado.

### D-* decisões

| ID | Decisão |
|---|---|
| **D-PET-OPS-SCHEDULING-REUSE** | Mesmo modelo de agendamento reutilizado entre tabelas do abrigo e página do pet (zero duplicação) |
| **D-PET-OPS-MANAGE-ONLY-CRUD** | CRUD de saúde só aparece para quem `canManage=true`; visitantes veem `PublicHealthRecord` (read-only) |
| **D-PET-OPS-PUBLIC-ONLY-DONE** | Visão pública do pet só mostra registros `done` (agendamentos futuros ocultos) |

---

## §16. Fixes nas Tabelas Operacionais (PR #206, 2026-08-01)

### 4 correções

1. **Medicação na saúde do pet não dá mais erro "actor.uid é obrigatório"**:
   - `PetMedicationForm` agora usa o serviço `petMedicalService`
     (`usePetMedical`), que injeta o ator autenticado e grava em
     `pets/{petId}/medications` — a mesma coleção lida pelas
     planilhas do abrigo.
   - Adiciona também a opção de agendar a medicação para uma data
     futura.

2. **Coluna PET das planilhas mostra nome + ID imutável**:
   - Antes: só o nome (pets sem nome ficavam indistinguíveis)
   - Depois: nome (ou "Sem nome") + ID imutável `#000001` / `pet_code`
     no mesmo padrão do painel admin
   - Também exibido no seletor de pet do modal de registro.

3. **Datas entram corretamente em realizadas/agendadas/atrasadas**:
   - `recordStatus()` passa a considerar a data efetiva.
   - Registro **sem** `scheduled_for` mas com campo de data nativo
     no futuro → "Agendada" (antes: "Realizada")
   - Registro sem `scheduled_for` no passado → "Realizada" (mantido)
   - `scheduled_for` no passado → "Atrasada" (mantido)
   - `proximityLabel`, `isUpcoming`, `summarizeAlerts` e
     `RecordStatusBadge` recebem `dateField` para o cálculo por
     data efetiva.

4. **Seletor "Novo registro" lista todos os pets do abrigo**
   (`useMyPets`):
   - Com o ID visível, pets sem nome deixam de ser indistinguíveis.

### D-* decisões

| ID | Decisão |
|---|---|
| **D-PET-ID-DISPLAY** | Toda tabela/seletor de pet mostra nome + ID imutável (`#000001` / `pet_code`) no padrão do painel admin |
| **D-PET-OPS-RECORD-STATUS-BY-DATE** | `recordStatus()` considera data efetiva (`scheduled_for ?? dateField`) para classificar done/scheduled/overdue |
| **D-PET-MEDICATION-VIA-MEDICAL-SERVICE** | `PetMedicationForm` deve usar `petMedicalService` (NÃO service legado) para injetar `actor.uid` |

---

## §17. Fixes de Permissions para Usuários Não-Admin (PR #207, 2026-08-03)

### 4 correções de `firestore.rules`

1. **Criar organização/abrigo** (`createClub`):
   - **Causa**: `createClub` grava o doc do clube E o membership
     admin do criador no MESMO `writeBatch`. A regra de create de
     `club_members` exigia `isClubOwnerUid` (get do clube), mas em
     um batch o clube **ainda não foi commitado** → negado.
   - **Fix**: Adiciona `isClubOwnerUidAfter` (getAfter/existsAfter)
     e permite o criador autocriar sua associação admin quando o
     clube está sendo criado no mesmo batch.

2. **Entrar no abrigo por convite/código** (`joinClubByCode`):
   - **Causa**: `joinClubByCode` grava o membership E incrementa
     `member_count` no mesmo batch. A regra de update do clube
     exigia `isClubMember`, mas o membership é criado no mesmo
     batch → negado.
   - **Fix**: Adiciona `isClubMemberAfter` (existsAfter) ao ramo
     de `member_count`.

3. **Cadastrar pets** (`getNextPetSeq`):
   - **Causa**: `getNextPetSeq` usa `runTransaction` em
     `pet_seq_counter/global`, mas a regra restringia a
     `platform_admin`. A transação de todos os outros usuários
     falhava (caindo no fallback por timestamp, que quebra a
     **unicidade do pet_seq**).
   - **Fix**: Libera leitura/escrita do contador para qualquer
     usuário autenticado (doc só guarda value).

4. **Inscrever-se como voluntário** (`JoinVolunteerModal`):
   - **Causa**: Hook chamado com shape errado (`useAcceptVolunteerTerms`
     sem uid; payloads sem `acceptance/actor/input`; sem
     `signature_text`; lia `terms_accepted_version` inexistente).
   - **Fix**: Reescreve `handleSubmit` para o contrato correto,
     coleta a assinatura eletrônica no passo do termo, e relaxa a
     regra de create de `volunteer_profile` (valida os campos de
     assinatura só quando presentes; o aceite continua imutável
     em `terms_acceptances` e reforçado na rostagem).

### Mecanismo `getAfter` / `existsAfter`

Regras usam `getAfter()` / `existsAfter()` — mecanismo próprio do
Firestore para writes em batch/transação. Permite ENXERGAR o estado
APÓS o commit da operação/batch atual. Sem impacto de segurança: o
criador só vira admin do clube que ele mesmo cria; o auto-ingresso
já era gated.

```js
// isClubOwnerUid (antes do commit) — usado em updates normais
function isClubOwnerUid(clubId, uid) {
  return exists(/databases/$(database)/documents/clubs/$(clubId))
    && get(/databases/$(database)/documents/clubs/$(clubId)).data.created_by == uid;
}

// isClubOwnerUidAfter (depois do commit) — usado em batches onde o clube é criado junto
function isClubOwnerUidAfter(clubId, uid) {
  return existsAfter(/databases/$(database)/documents/clubs/$(clubId))
    && getAfter(/databases/$(database)/documents/clubs/$(clubId)).data.created_by == uid;
}
```

### D-* decisões

| ID | Decisão |
|---|---|
| **D-FIRESTORE-BATCH-AFTER** | Em `writeBatch` que cria doc E referencia ele (ex.: createClub), usar `getAfter`/`existsAfter` na rule para enxergar estado pós-commit |
| **D-FIRESTORE-COUNTER-OPEN-AUTH** | `pet_seq_counter/global` é liberado para qualquer auth (doc só guarda value, sem dados sensíveis) |
| **D-VOLUNTEER-SIGN-AT-TERM-STEP** | `signature_text` é coletado no passo do termo (NÃO no submit final) para garantir fonte canônica |

---

## §18. Fixes de Curtir/Comentar no Mural e Fórum (PR #208, 2026-08-03)

### 3 correções de `firestore.rules` (contadores denormalizados)

Auditoria completa das regras de contadores denormalizados: várias
ações sociais comuns davam permission-denied para quem não era
autor/admin, porque a transação/updateDoc que incrementa o
contador no doc-pai era barrada pela regra de update.

1. **Mural da ONG** (`club_posts`) — curtir/comentar:
   - **Causa**: Transação incrementa `likes_count` / `comments_count`
     no post. Regra de update só permitia autor (com 0 curtidas),
     admin ou permissão `feed` → membro comum não conseguia curtir
     nem comentar.
   - **Fix**: Adiciona ramo que libera atualizar **SOMENTE os
     contadores** (sem alterar outros campos).

2. **Mural da comunidade** (`community_posts`) — mesmo caso.
   - **Fix**: Adiciona o mesmo ramo de contadores.

3. **Fórum da ONG** (`club_forum_threads`) — comentar:
   - **Causa**: Ao comentar num tópico, o serviço atualiza
     `comment_count` / `last_activity_ms` / `participant_ids` do
     tópico. Regra só permitia autor/admin → para não-autores a
     atualização era negada (silenciosa, mas o tópico não subia
     nem contava direito).
   - **Fix**: Libera membros do clube a atualizar **SOMENTE esses
     campos de atividade**.

### Padrão usado

Padrão idêntico ao já existente em
`club_forum_threads(likes)` / `community_forum_threads` /
`community_forum_messages` (hasOnly de contadores). O **doc de
like/comentário continua gated** à parte; **contadores são
cosméticos** (a verdade é a subcoleção). Sem ampliação de acesso
relevante.

```js
// Exemplo: mural da ONG
allow update: if isAuth() && (
  // Autor (com 0 curtidas) ou admin
  (resource.data.author_uid == request.auth.uid && resource.data.likes_count == 0) ||
  isClubAdmin(clubId) ||
  hasClubPermission(clubId, 'feed') ||
  // NOVO: qualquer membro pode atualizar SOMENTE contadores
  isClubMember(clubId) && isOnlyCountersUpdate()
);

function isOnlyCountersUpdate() {
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['likes_count', 'comments_count', 'updated_at']);
}
```

### D-* decisões

| ID | Decisão |
|---|---|
| **D-FIRESTORE-COUNTER-OPEN-TO-MEMBERS** | Qualquer membro do clube pode atualizar SOMENTE contadores denormalizados (`likes_count`, `comments_count`, `comment_count`, `last_activity_ms`, `participant_ids`). O doc de like/comentário continua gated. |
| **D-FIRESTORE-IS-ONLY-COUNTERS-UPDATE** | Helper `isOnlyCountersUpdate()` valida que `affectedKeys().hasOnly([...counters])` antes de permitir o update |

---

## §19. Histórico Consolidado

| Data | Evento |
|---|---|
| 2026-07-22 | TASK-V3-PET-OPS-LOG deployed (sw-v72.4, PR #198) |
| 2026-07-31 | sw-v93: PetDetailV3 rules-of-hooks corrigido |
| 2026-07-31 | sw-v95: Subcoleções Pet órfãs corrigidas (health_records, vet_visits, treatments, care_log, devolutions, adopters_history) |
| 2026-07-31 | **PR #204**: SHELTER_PET_OPS_TABLES_V1 (7 tabelas operacionais agregadas, flag OFF por default) |
| 2026-07-31 | **PR #205**: Agendamento + status na página do pet + CRUD de vacinas/vermifugação |
| 2026-08-01 | **PR #206**: Fix medicação + pet ID display + status por data efetiva |
| 2026-08-03 | **PR #207**: Fix permissions (criar abrigos, entrar, pets, voluntários) — `getAfter`/`existsAfter` em batches |
| 2026-08-03 | **PR #208**: Fix permissions (curtir/comentar em mural e fórum) — `isOnlyCountersUpdate` |

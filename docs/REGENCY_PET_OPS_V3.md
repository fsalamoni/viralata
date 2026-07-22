# REGENCY: Pet Ops V3 (TASK-V3-PET-OPS-LOG) — Documento de Implementação

> **Status:** DEPLOYED em `sw-v72.4` (PR #198)
> **Data:** 2026-07-22
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

---

**Última atualização**: 2026-07-22
**Versão**: sw-v72.4
**Mantido por**: Mavis

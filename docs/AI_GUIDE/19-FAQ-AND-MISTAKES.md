# 19-FAQ-AND-MISTAKES.md — FAQ + Erros Comuns

> **Atualizado em 2026-07-24**
>
> Respostas para perguntas frequentes + armadilhas comuns.

---

## §1. FAQ — Perguntas Frequentes

### §1.1. Onde está X?

**P: Onde está o feed de pets?**
R: `src/modules/pets/pages/PetFeed.v3.jsx` (V3) ou `PetFeed.v1.jsx`
(V1 legacy). Wrapper em `src/pages/Feed.jsx` decide via feature flag.

**P: Onde está o detalhe de pet?**
R: `src/modules/pets/pages/PetDetailV3.jsx` (admin) ou
`PetDetailView.v3.jsx` (público).

**P: Onde está o painel admin da plataforma?**
R: `src/modules/admin/pages/AdminDashboard.v3.jsx`. Rota: `/admin`.

**P: Onde está o painel admin de ONG?**
R: `src/modules/organizations/pages/OrganizationAdminPanel.v3.jsx`.
Rota: `/organizacoes/:id/admin`.

**P: Onde está o painel de abrigo?**
R: `src/modules/shelter/pages/ShelterAdminDashboard.v3.jsx`.
Rota: `/abrigo`.

**P: Onde está o kanban?**
R: `src/modules/shelter/pages/KanbanPage.jsx`. Rota: `/abrigo/kanban`.

**P: Onde está o mural da comunidade?**
R: `src/modules/communities/components/CommunityMural.jsx`.
Rota: `/comunidades/:id/mural`.

**P: Onde está o chat?**
R: `src/modules/chat/pages/ChatPage.v3.jsx`. Rota: `/chat`.

**P: Onde estão as notificações?**
R: `src/modules/notifications/components/Notifications.jsx` (sino no
TopBar) + `NotificationsPage.jsx` (página completa).

**P: Onde está o relatório de denúncias?**
R: `src/modules/reports/pages/CreateReport.jsx` (criar) +
`MyReports.jsx` (user) + `AdminReports.jsx` (admin).

### §1.2. Como adicionar Y?

**P: Como adicionar um novo pet?**
R: User clica em "Cadastrar pet" → `CreatePet.jsx` → chama
`createPet()` em `petService.js` → grava em `pets/{petId}` +
auto-gera `pet_seq` via Cloud Function → log em `pet_audit_log`.

**P: Como adicionar uma nova ONG?**
R: User vai em `/organizacoes/criar` → form → chama `createClub()`
em `clubService.js` → grava em `clubs/{clubId}` → status
`pending` (aprovação por platform_admin).

**P: Como adicionar um novo admin de ONG?**
R: Owner da ONG vai em `/organizacoes/:id/admin/membros` → adiciona
uid → role + permissions → grava em `clubs/{clubId}/members/{uid}`.

**P: Como adicionar um novo voluntário?**
R: User vai em `/voluntarios/seja` → wizard → cria perfil em
`volunteer_profile/{uid}` + join em `clubs/{clubId}/volunteers/{uid}`.

**P: Como adicionar uma nova rota?**
R: Editar `src/App.jsx` + adicionar entrada em `04-PAGES-ROUTES.md`.

**P: Como adicionar um novo campo em pet?**
R:
1. Adicionar em `02-DATA-MODEL.md` §2.2
2. Adicionar em `firestore.rules` se afeta permissões
3. Adicionar em `src/modules/pets/domain/petSchema.js` (Zod)
4. Atualizar `PetCard.jsx`, `PetDetailV3.jsx` para usar
5. Adicionar runtime test
6. Adicionar migration se aplicável

**P: Como adicionar um novo feature flag?**
R:
1. Adicionar em `src/core/config/featureFlags.js` DEFAULT (false)
2. Se OFF→ON muda comportamento, adicionar em `migrateLegacyFlags`
3. Bumpar `FLAGS_MIGRATION_VERSION`
4. Adicionar entrada em `platform_settings/main.feature_flags` (admin)
5. Ativar via `/admin/flags`

### §1.3. Por que Y?

**P: Por que `pet_seq` é imutável?**
R: Para ter ID permanente estável. Migrações podem renomear docId
mas `pet_seq` permanece. Ver `D-PET-SEQ-IMMUTABLE`.

**P: Por que há V1 e V3 mas não V2?**
R: V2 foi pulado para economizar tempo. V1 → V3 direto.
Wrappers em `src/pages/` decidem via feature flag.

**P: Por que feature flags para tudo?**
R: Para permitir ativar/desativar features sem deploy.
Admin pode ligar aos poucos. Ver `D-FEATURE-FLAGS-OBRIGATORIAS`.

**P: Por que service worker é bumpado a cada deploy?**
R: Para evitar bundle stale. SW vN-1 pode servir bundle antigo.
Bump vN → vN+1 força fresh. Ver `D-PWA-BUMP-ALWAYS-UI`.

**P: Por que runtime tests são obrigatórios?**
R: Static analysis não pega variáveis undefined em escopo
(ex: `canEdit` em `PetDetailV3.jsx:770`). Runtime test renderiza
o componente e detecta. Ver `D-PET-DETAIL-RUNTIME-TEST`.

**P: Por que emojis não são permitidos?**
R: Pedido do usuário. Usar `lucide-react` para ícones.
Ver `D-USER-EMOJIS`.

**P: Por que `window.location.reload()` é perigoso?**
R: Interrompe user no meio de ação. Sempre deferir.
Ver `D-PWA-STALE-UNREGISTER-DEFER`.

**P: Por que defense-in-depth?**
R: Para garantir segurança em todas as camadas:
UI esconde + Hook valida + Service re-valida + Rules bloqueia.

**P: Por que 3 audit scripts + 1 combinado?**
R: Para validar:
1. Imports lucide (tree shaking)
2. aria-current (acessibilidade)
3. Referências em docs (links quebrados)
Combinado em `audit-docs.mjs` para rodar tudo de uma vez.

### §1.4. Onde encontro Z?

**P: Onde encontro as decisões de design importantes?**
R: `13-DECISIONS.md` (D-*).

**P: Onde encontro os fixes recentes?**
R: `15-RECENT-FIXES.md` (últimos 30 dias).

**P: Onde encontro o schema do Firestore?**
R: `02-DATA-MODEL.md` (completo).

**P: Onde encontro as regras do Firestore?**
R: `firestore.rules` (2155 linhas) + `07-FIRESTORE-RULES.md` (helpers).

**P: Onde encontro os testes?**
R: `*.test.jsx` e `*.test.js` ao lado de cada arquivo.
Runtime tests: `*.runtime.test.jsx`.

**P: Onde encontro o SCRUM?**
R: `.harness/SCRUM_TASKS.json` + UI em `/scrum` (admin).

**P: Onde encontro os workflows de deploy?**
R: `.github/workflows/` + `09-DEPLOY.md`.

**P: Onde encontro os ícones?**
R: `node_modules/lucide-react`. Import explícito em cada arquivo.
Validar com `scripts/validate-lucide-imports.mjs`.

### §1.5. Como debug X?

**P: Bundle deployed mas user não vê a feature?**
R: SW vN-1 cacheado. Ver:
- Bundle deployed: `curl -m 10 -s https://viralata.web.app/ | grep index`
- SW: `curl -m 10 -s https://viralata.web.app/sw-v74.js`
- Feature no bundle: `curl ... | grep "feature-name"`
- SW no browser: DevTools → Application → Service Workers

**P: Test falha com "X is not a function"?**
R: Mock mal feito. Verificar se mock exporta corretamente.

**P: Test falha com "Cannot destructure X"?**
R: Provider mockado faltando. Adicionar `QueryClientProvider`,
`MemoryRouter`, etc.

**P: Build falha com import error?**
R: Path errado, componente não existe, ou default vs named export.
Verificar `import MyComponent from './MyComponent'` vs
`import { MyComponent }`.

**P: Firestore "Permission denied"?**
R: Rules não deployadas OU helper com erro OU path errado.
Ver: `firebase firestore:rules:get` + `firebase emulators:start`.

**P: "ReferenceError: X is not defined" em produção?**
R: Variável não declarada em escopo. Adicionar runtime test
para componentes críticos.

**P: "X is not defined" no build (só prod)?**
R: Tree shaking + globals. Provavelmente import faltando.
Validar com `node scripts/validate-lucide-imports.mjs`.

**P: PWA não atualiza?**
R: SW cacheado. Limpar cache: DevTools → Application →
Storage → Clear site data. Ou aguardar 24h (browser auto).

---

## §2. Erros Comuns — Anti-Padrões

### §2.1. ❌ ERRADO vs ✅ CERTO

#### ❌ Refactor massivo sem aprovação

```bash
# ❌ ERRADO
git checkout -b refactor-everything
# Reescreve 50 arquivos
git push
```

```bash
# ✅ CERTO
# 1. Perguntar antes
# 2. Dividir em PRs pequenos
# 3. Cada PR com 1 foco
```

#### ❌ Mudar schema sem migração

```js
// ❌ ERRADO
// Adicionar campo required em collection existente
// Users antigos não têm o campo → quebra
allow create: if request.resource.data.new_field is string;
```

```js
// ✅ CERTO
// Campo optional + default + migration
allow create: if request.resource.data.new_field == null 
  || request.resource.data.new_field is string;

// Migration script
// node scripts/migrate-add-new-field.mjs
```

#### ❌ Remover camada de segurança sem repor

```js
// ❌ ERRADO
// Remover ensureCanMutatePet porque "rules já validam"
batch.update(doc(db, 'pets', petId), data);
```

```js
// ✅ CERTO
// Manter defense-in-depth
await ensureCanMutatePet(petId, actor);
batch.update(doc(db, 'pets', petId), data);
```

#### ❌ Hard-coded secrets

```js
// ❌ ERRADO
const apiKey = 'AIzaSyD...';
```

```js
// ✅ CERTO
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

#### ❌ `// TODO` sem contexto

```js
// ❌ ERRADO
// TODO: fix this
```

```js
// ✅ CERTO
// TODO(Mavis, 2026-07-24): migrate to React Query
// Tracking: TASK-XXX
// Context: User complained about N+1 in feed
```

#### ❌ Branch acumulada por > 7 dias

```bash
# ❌ ERRADO
# Branch feature/TASK-XXX aberta há 3 semanas
```

```bash
# ✅ CERTO
# PR aberto em 24-48h
# Se demorar, rebase com main + testar
```

#### ❌ Merge sem CI passing

```bash
# ❌ ERRADO
# gh pr merge --admin (force)
```

```bash
# ✅ CERTO
# Esperar CI verde
# Verificar checks passando
# Depois merge
```

#### ❌ Push direto em main (sem PR)

```bash
# ❌ ERRADO
git checkout main
git commit -m "fix"
git push origin main
```

```bash
# ✅ CERTO
git checkout -b fix/TASK-XXX
git commit -m "fix: ..."
git push origin fix/TASK-XXX
gh pr create
```

#### ❌ Console.log em produção

```js
// ❌ ERRADO
console.log('DEBUG: pet created', pet);
```

```js
// ✅ CERTO
import { logger } from '@/core/observability/logger';
logger.debug('pet_created', { petId: pet.id });
```

#### ❌ Emoji em código/UI

```jsx
// ❌ ERRADO
<h1>Bem-vindo! 🐶</h1>
```

```jsx
// ✅ CERTO
<h1>Bem-vindo!</h1>
<Dog className="w-6 h-6 inline" />
```

#### ❌ `var`, `==`, `any`

```js
// ❌ ERRADO
var x = 1;
if (x == null) { }
function process(data: any) { }
```

```js
// ✅ CERTO
const x = 1;
if (x === null) { }
function process(data: Pet) { }
```

#### ❌ `window.location.reload()` durante interação

```js
// ❌ ERRADO
setTimeout(() => window.location.reload(), 50);
```

```js
// ✅ CERTO
const lastActivity = Number(sessionStorage.getItem('pwa-stale-last-activity') || '0');
if (Date.now() - lastActivity < 5000) {
  setTimeout(() => { /* defer */ }, 5000);
  return;
}
setTimeout(() => window.location.reload(), 50);
```

#### ❌ Misturar `import` e `require` em tests

```js
// ❌ ERRADO
import { describe } from 'vitest';
const { myFunction } = require('./myService');
```

```js
// ✅ CERTO
import { describe } from 'vitest';
import { myFunction } from './myService';
```

#### ❌ Esquecer de atualizar docs

```bash
# ❌ ERRADO
# Mudou rota, schema, decisão → não atualizou docs
```

```bash
# ✅ CERTO
# Mudou rota → atualiza 04-PAGES-ROUTES.md
# Mudou schema → atualiza 02-DATA-MODEL.md
# Decisão importante → cria D-* em 13-DECISIONS.md
```

#### ❌ Esquecer de rodar `sync.cjs --fix` após merge

```bash
# ❌ ERRADO
# PR merged, mas SCRUM não foi sync
```

```bash
# ✅ CERTO
# Após merge
node .harness/sync.cjs --fix
git add .harness/ public/
git commit -m "chore(scrum): sync after PR #XXX"
git push
```

#### ❌ Esquecer de bump SW ao mudar UI

```bash
# ❌ ERRADO
# Mudou pagination-controls.jsx
# Não bumpou SW → user vê bundle antigo
```

```bash
# ✅ CERTO
# Mudou UI → bump vN → vN+1
# 1. vite.config.js
# 2. registerPwa.js
# 3. cleanupStaleCaches.js (adicionar vN na STALE)
# 4. tests
# 5. build + deploy
```

#### ❌ Esquecer de validar imports lucide

```bash
# ❌ ERRADO
# Adicionou <MessageSquare /> no JSX
# Não adicionou no import → "is not defined" em prod
```

```bash
# ✅ CERTO
# 1. Adicionar <MessageSquare /> no JSX
# 2. Adicionar MessageSquare no import
# 3. Rodar node scripts/validate-lucide-imports.mjs
# 4. Commit + push
```

#### ❌ Esquecer de criar runtime test para componente crítico

```bash
# ❌ ERRADO
# Criou PetCard novo
# Sem runtime test → bugs passam (canEdit undefined, etc)
```

```bash
# ✅ CERTO
# Para componentes críticos: SEMPRE runtime test
# *.runtime.test.jsx com dados mockados
```

### §2.2. Resumo Visual de Anti-Padrões

| ❌ ERRADO | ✅ CERTO |
|----------|---------|
| Refactor massivo | PRs pequenos focados |
| Sem migration | Migration + version bump |
| Sem defense-in-depth | UI + Hook + Service + Rules |
| Hard-coded secrets | env vars |
| TODO sem contexto | TODO com autor/data/task |
| Branch +7 dias | PR em 24-48h |
| Force merge | CI verde + checks |
| Push direto main | PR + review |
| console.log | logger |
| Emoji | lucide-react |
| var/==/any | const/===/typed |
| reload imediato | defer ou banner |
| ESM + CJS mixed | ESM puro |
| Docs desatualizados | Sempre atualizar |
| sync.cjs skipped | SEMPRE rodar |
| SW não bumped | vN → vN+1 |
| lucide não validado | validate-lucide-imports |
| Sem runtime test | runtime test para críticos |

---

## §3. Lições Aprendidas (Post-mortem)

### §3.1. sw-v72.5 (MessageSquare undefined)

**Lição**: ícone no JSX sem import = quebra em prod.
**Prevenção**: `validate-lucide-imports.mjs` em CI.

### §3.2. sw-v73.1/73.2 (PWA stale unregister)

**Lição**: bundle deployed OK mas user via bundle stale.
**Prevenção**: auto-unregister SEMPRE (não só com flag).

### §3.3. sw-v73.3 (canEdit ReferenceError)

**Lição**: var renomeada em escopo de componente passou em static.
**Prevenção**: runtime tests para componentes críticos.

### §3.4. sw-v73.3 (reload interrompendo user)

**Lição**: window.location.reload() durante interação = UX destrutivo.
**Prevenção**: track activity + defer ou banner explícito.

### §3.5. Test fixes (2026-07-23)

**Lição**: testes misturando ESM/CJS quebram suite.
**Prevenção**: ESM puro em todos os tests.

**Lição**: testes com collection errada após denormalização.
**Prevenção**: validar testes ao adicionar coleção denormalizada.

**Lição**: testes com prop renomeada quebram.
**Prevenção**: atualizar tests ao renomear prop.

---

## §4. Onde Pedir Ajuda

1. **Antes de pedir**:
   - `15-RECENT-FIXES.md` (fix recente?)
   - `14-TROUBLESHOOTING.md` (problema comum?)
   - `13-DECISIONS.md` (decisão similar?)
   - `git log --oneline -20` (mudanças recentes?)

2. **Onde pedir**:
   - GitHub issues
   - Canal de comunicação (definir)
   - Email: fsalamoni (human maintainer)

3. **Como pedir** (template em `16-AGENT-ONBOARDING.md` §6.3)

---

**Próxima leitura**: `13-DECISIONS.md` (decisões importantes)

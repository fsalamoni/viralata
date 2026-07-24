# 11-CORE-DIRECTIVES.md — Regras Invioláveis, Princípios, Engineering HOT

> **⚠️ LEITURA OBRIGATÓRIA antes de QUALQUER mudança no código**
> Atualizado em 2026-07-24 (revisão completa pós-varredura)

---

## §1. Princípios Fundamentais

### §1.1. NÃO PREJUDICAR NADA

> "Não quero que você estrague nada. Tudo está funcionando, vamos
> manter assim. Funcionalidade, banco, nada."

**Implicações**:
- Antes de qualquer mudança, ler código existente e entender contexto
- Mudanças incrementais, NUNCA refactor massivo sem aprovação
- Testes ANTES de mudar (TDD quando possível)
- Backup mental: "como reverter se quebrar?"
- Defense-in-depth: nunca remover uma camada de segurança sem adicionar
  outra equivalente

### §1.2. CALMA, CAUTELA, ATENÇÃO

> "Faça com calma e atenção, não estrague nada!"

**Implicações**:
- Pensar antes de digitar
- Validar antes de commitar
- Verificar depois de deploy
- Documentar enquanto faz (não "depois")

### §1.3. RESOLVER DE FORMA DEFINITIVA

> "Resolva de uma vez, de modo definitivo e completo."

**Implicações**:
- Não fazer "fix temporário" sem documentar
- Não introduzir TODO sem plano claro
- Não usar "gambiarra" — usar a solução certa
- Se for spec grande, dividir em tasks mas fazer completo

### §1.4. UX/UI É PRIORIDADE

> "UX/UI é prioridade."

**Implicações**:
- User experience vem antes de código bonito
- Testar em mobile, em conexões lentas
- Acessibilidade WCAG 2.1 AA
- Skeletons, loading states, error states
- Mensagens de erro claras e úteis
- Não usar emoji em UI (D-USER-EMOJIS)

### §1.5. PREVENÇÃO > CORREÇÃO

> "Prevenir e prever falhas antes de entregar."

**Implicações**:
- Runtime tests > static analysis (pega mais bugs)
- Validators e schemas (Zod) em toda input
- Defense-in-depth: UI + Hook + Service + Rules
- Empty states, error states, loading states

### §1.6. MERGE + DEPLOY AUTOMÁTICO

> "MERGES + DEPLOYS AUTOMÁTICOS: quando terminar conjunto de tarefas,
> fazer merge (squash) + deploy."

**Implicações**:
- Push em main = deploy
- Não acumular branches
- Não fazer "merge depois"
- Verificar CI passing antes de declarar done

### §1.7. DOCUMENTAÇÃO SEMPRE ATUALIZADA

> Toda mudança → doc correspondente atualizado.

**Implicações**:
- Mudou rota? Atualizar `04-PAGES-ROUTES.md`
- Mudou schema? Atualizar `02-DATA-MODEL.md`
- Mudou arquitetura? Atualizar `01-ARCHITECTURE.md`
- Mudou decisão? Adicionar D-* em `13-DECISIONS.md`
- Bug fix? Adicionar em `15-RECENT-FIXES.md`

---

## §2. Regras de Código

### §2.1. SEM EMOJI

> **D-USER-EMOJIS**: usuário não quer nenhum emoji no código OU na UI.

```jsx
// ❌ Errado
<h1>Bem-vindo! 🐶</h1>
<button>Adotar ❤️</button>

// ✅ Correto
<h1>Bem-vindo!</h1>
<button>Adotar</button>
<Dog className="w-4 h-4 inline" />  // ícone lucide-react
```

### §2.2. SEM `console.log` em produção

```js
// ❌ Errado
console.log('DEBUG: pet created', pet);

// ✅ Correto
import { logger } from '@/core/observability/logger';
logger.debug('pet_created', { petId: pet.id });
```

### §2.3. SEM `var`, USAR `const`/`let`

```js
// ❌ Errado
var x = 1;

// ✅ Correto
const x = 1;
let y = 2;
```

### §2.4. SEM `==`, USAR `===`

```js
// ❌ Errado
if (x == null) { }

// ✅ Correto
if (x === null) { }
```

### §2.5. SEM `any` (TypeScript)

```ts
// ❌ Errado
function process(data: any) { }

// ✅ Correto
function process(data: Pet) { }
```

### §2.6. SEM `// TODO` sem contexto

```js
// ❌ Errado
// TODO: fix this

// ✅ Correto (com issue link, autor, data)
// TODO(Mavis, 2026-07-24): Refatorar para usar React Query
// Tracking: TASK-XXX
```

### §2.7. SEM `window.location.reload()` se user pode estar interagindo

> **D-PWA-STALE-UNREGISTER-DEFER (sw-v73.3)**: NUNCA fazer
> `window.location.reload()` se o user pode estar digitando/rolando/clicando.
> Track activity via `pwa-stale-last-activity` (sessionStorage).
> Se interagiu < 5s, defer 5s.

```js
// ❌ Errado
setTimeout(() => window.location.reload(), 50);

// ✅ Correto
const lastActivity = Number(sessionStorage.getItem('pwa-stale-last-activity') || '0');
const isInteracting = (Date.now() - lastActivity) < 5000;
if (isInteracting) {
  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.location.reload();
    }
  }, 5000);
  return;
}
setTimeout(() => { window.location.reload(); }, 50);
```

---

## §3. Regras de Feature Flag

### §3.1. TUDO ATRÁS DE FLAG

> **D-FEATURE-FLAGS-OBRIGATORIAS**: Toda feature nova DEVE estar atrás
> de feature flag, ativada no admin.

```jsx
// ✅ Padrão
import { useFeatureFlag } from '@/core/hooks/useFeatureFlag';

export default function MyPage() {
  const { enabled: useV3 } = useFeatureFlag('my-feature-v3');
  return useV3 ? <MyPageV3 /> : <MyPageV1 />;
}
```

### §3.2. MIGRAÇÃO EM `migrateLegacyFlags`

> **D-FEATURE-FLAG-MIGRATION**: Ao mudar flag OFF→ON, SEMPRE adicionar
> migração em `migrateLegacyFlags` + bump `FLAGS_MIGRATION_VERSION`.

```js
// src/core/config/featureFlags.js
export function migrateLegacyFlags(flags) {
  if (flags.version < 73) {
    // sw-v73: pet_log public read for owner
    flags['pet-log-public-read'] = flags['pet-log-public-read'] ?? false;
    flags.version = 73;
  }
  return flags;
}
```

### §3.3. SE A FLAG MUDA SEM MIGRAÇÃO, É FACHADA

> Mudar o DEFAULT no código sem migração no Firestore = fachada. Users
> existentes não recebem a feature.

---

## §4. Regras de PWA / Service Worker

> Ver `06-PWA-CACHE.md` para detalhes.

### §4.1. SEMPRE VALIDAR IMPORTS LUCIDE

> **D-PET-OPS-LUCIDE-IMPORT (sw-v72.5)**: SEMPRE validar que TODOS os
> ícones do lucide usados em JSX estão no import. Build NÃO pega isso
> (tree shaking + globals).

```bash
node scripts/validate-lucide-imports.mjs
```

### §4.2. SEMPRE BUMP SW AO MUDAR UI

> **D-PWA-BUMP-ALWAYS-UI**: SEMPRE bumpar SW ao mudar UI. Bundle pode
> estar stale no user.

```js
// vite.config.js: vN → vN+1
filename: 'sw-vN.js'  →  filename: 'sw-vN+1.js'

// src/core/pwa/registerPwa.js
const swUrl = 'sw-vN+1.js';

// src/core/pwa/cleanupStaleCaches.js: adicionar vN na STALE_SW_NAMES
```

### §4.3. UNREGISTER RODAR SEMPRE

> **D-PWA-UNREGISTER-ALWAYS (sw-v73.2)**: `unregisterStaleAndMaybeReload`
> roda SEMPRE, não só quando `PWA_ENABLED=true`.

### §4.4. DEFER RELOAD SE USER INTERAGINDO

> **D-PWA-STALE-UNREGISTER-DEFER (sw-v73.3)**: NUNCA
> `window.location.reload()` se user pode estar interagindo. Track
> activity via `pwa-stale-last-activity` (sessionStorage). Se interagiu
> < 5s, defer 5s.

### §4.5. SEMPRE RUNTIME TEST PARA COMPONENTES CRÍTICOS

> **D-PET-DETAIL-RUNTIME-TEST (sw-v73.3)**: SEMPRE criar
> `*.runtime.test.jsx` para componentes críticos. Static analysis +
> imports tests não substituem. Bug `canEdit` só foi pego com runtime
> test.

---

## §5. Regras de Firestore

### §5.1. pet_seq É IMUTÁVEL

> **D-PET-SEQ-IMMUTABLE (sw-v72.4)**: `pet_seq` é o ID PERMANENTE de
> um pet. NUNCA pode ser alterado. Gerado atomicamente por Cloud Function
> usando `pet_seq_counter`. Client NUNCA escreve.

```js
// firestore.rules
allow update: if canManagePet(petId) &&
  request.resource.data.pet_seq == resource.data.pet_seq;  // ★ IMUTÁVEL
```

### §5.2. pet_audit_log É APPEND-ONLY

> **D-PET-LOG-IMMUTABLE (sw-v72.4)**: `pet_audit_log` é append-only.
> Update bloqueado. Delete só por platform_admin.

```js
// firestore.rules
allow update: if false;  // ★ IMUTÁVEL
```

### §5.3. SEMPRE LOG EM CRUD DE PET

> **D-PET-LOG-PER-CHANGE (sw-v72.4)**: cada CRUD de pet DEVE chamar
> `appendPetLog()` com actor, action, target, details.

```js
// src/modules/pets/services/petService.js
import { appendPetLog } from './petLogService';

export async function updatePet(petId, data, actor) {
  // ... update
  await appendPetLog(petId, {
    action: 'pet_updated',
    actor,
    target: { collection: 'pets', doc_id: petId },
    details: { fields_changed: Object.keys(data) },
  });
}
```

### §5.4. DEFENSE-IN-DEPTH: UI + HOOK + SERVICE + RULES

> Toda escrita segue o padrão:
> 1. **UI**: esconde botão se user não tem permissão
> 2. **Hook**: valida permissão antes de chamar service
> 3. **Service**: re-valida com helper (ensureCanMutatePet, etc)
> 4. **Firestore Rules**: bloqueio final

### §5.5. ensureCanMutatePet ANTES DE batch.update

> **D-ENSURE-CAN-MUTATE-PET**: toda escrita em pet DEVE chamar
> `ensureCanMutatePet(petId, actor)` ANTES do `batch.update()`.

```js
import { ensureCanMutatePet } from './petPermissions';

export async function updatePet(petId, data, actor) {
  await ensureCanMutatePet(petId, actor);  // ★ throw se sem permissão
  const batch = writeBatch(db);
  batch.update(doc(db, 'pets', petId), data);
  await batch.commit();
}
```

### §5.6. NOTAS: AUTOR PODE DELETAR

> **D-PET-NOTES-AUTHOR-DELETE (sw-v72.4)**: `pet_notes` — read/create
> canManage, update=false, delete autor ou platform_admin.

```js
// firestore.rules
allow delete: if (isAuth() && resource.data.author.uid == request.auth.uid) || isPlatformAdmin();
```

---

## §6. Regras de UI

### §6.1. TopBar + BottomTabBar OBRIGATÓRIOS

> Páginas públicas DEVEM usar `withLayout(name, Component)` para ter
> TopBar + BottomTabBar + Footer. Admin pages podem omitir.

### §6.2. SEM PONTOS DE ADMIN EM PÁGINA PÚBLICA

> **D-PET-PUBLIC-V2-SEM-ADMIN (sw-v72)**: Páginas PÚBLICAS (PetDetailView)
> NÃO devem ter botões de admin/gestão. ZERO. Apenas "Quero adotar",
> "Compartilhar", "Reportar".

```jsx
// ❌ Errado (página pública com botão admin)
<button>Editar pet</button>
<button>Painel</button>

// ✅ Correto
<button>Quero adotar</button>
<button>Compartilhar</button>
<button>Reportar</button>
```

### §6.3. HERO PADRÃO PARA PET

> **D-PET-PUBLIC-V2-HERO (sw-v72)**: Hero `from-rose-500 via-orange-500
> to-amber-500` é o padrão para páginas de pet público.

### §6.4. LABEL FALLBACK OBRIGATÓRIO

> **D-LABEL-FALLBACK (sw-v72.2)**: `LABEL[campo] || campo` é padrão
> obrigatório. Não pode quebrar se label não existir.

```jsx
const SIZE_LABELS = { small: 'Pequeno', medium: 'Médio', large: 'Grande' };
const sizeLabel = SIZE_LABELS[pet.size] || pet.size;  // ★ FALLBACK
```

### §6.5. PAINEL ÚNICO, NO TOPO

> **D-CLUB-DETAIL-PANEL-UNICO (sw-v72.3)**: APENAS 1 botão Painel, no topo
> da página. NÃO múltiplos botões espalhados.

### §6.6. LINK PLURAL

> **D-LINK-PLURAL-ORGS (sw-v72.3)**: SEMPRE `/organizacoes/` (plural) para
> diretório de ONGs. `/clubes/` é legacy e redireciona.

### §6.7. LINK MUTÁVEL COM RUNTIME TEST

> **D-PET-PUBLIC-V2-RUNTIME-SAFETY (sw-v72.2)**: testes DEVEM cobrir pet
> com TODOS os campos (mesmo campos nullable) para garantir que não
> quebra com dados reais.

---

## §7. Regras de Hash Router

### §7.1. TABS VIA HASH URL

> **D-HASH-ROUTER-PET-TABS (sw-v72.4)**: tabs de PetDetailView são
> navegáveis por hash URL (`#log`, `#notes`, `#timeline`). User pode
> compartilhar link direto para a tab.

```jsx
const [tab, setTab] = useSearchParams();
const activeTab = tab.get('tab') || 'overview';

<Tabs value={activeTab} onValueChange={(v) => setTab({ tab: v })}>
  <TabsList>
    <TabsTrigger value="overview">Visão geral</TabsTrigger>
    <TabsTrigger value="log">Log</TabsTrigger>
    <TabsTrigger value="notes">Anotações</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## §8. Regras de Testes

### §8.1. SEMPRE CRIAR RUNTIME TEST PARA COMPONENTES CRÍTICOS

> **D-PET-DETAIL-RUNTIME-TEST (sw-v73.3)**: Variáveis undefined em
> escopo (como `canEdit` → `canEditHistory`) só são pegas com render
> real. Static analysis + imports tests não substituem.

### §8.2. NUNCA MISTURAR `import` E `require` NO MESMO `.test.jsx`

> **D-TEST-MIXED-ESM-CJS (sw-v73.3)**: nunca misturar `import` e
> `require` no mesmo `.test.jsx`. Usar ESM puro.

```js
// ❌ Errado
import { describe, it, expect } from 'vitest';
const { myFunction } = require('./myService');  // ★ QUEBRA SUITE

// ✅ Correto
import { describe, it, expect } from 'vitest';
import { myFunction } from './myService';
```

### §8.3. SEMPRE `.default` EM DYNAMIC IMPORT

> **D-TEST-NAMED-VS-DEFAULT-EXPORT (sw-v73.3)**: testes com dynamic
> import devem usar `.default` se o componente só tem `export default`.

```js
// ❌ Errado
const Component = await import('./MyComponent');

// ✅ Correto
const Component = (await import('./MyComponent')).default;
```

### §8.4. SEMPRE ATUALIZAR TESTS AO ADICIONAR COLEÇÃO DENORMALIZADA

> **D-TEST-COLLECTION-EXPECTATION (sw-v73.3)**: ao adicionar coleção
> denormalizada (TASK-312), atualizar testes que esperam collection
> original.

```js
// ❌ Errado
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'fosters');

// ✅ Correto
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'search_fosters');
```

### §8.5. SEMPRE ATUALIZAR TESTS AO RENOMEAR PROP

> **D-TEST-COMPONENT-API-CHANGED (sw-v73.3)**: ao renomear prop no
> componente, atualizar testes imediatamente.

```jsx
// ❌ Errado (após renomeação message → title/description)
<ErrorState message="Erro" />

// ✅ Correto
<ErrorState title="Erro" description="Tente novamente" />
```

---

## §9. Engineering HOT (Checklist Pré-Commit)

Antes de fazer commit, SEMPRE verificar:

```bash
# 1. Lint passa
npm run lint

# 2. Tests passam
npx vitest run

# 3. Build passa
npx vite build

# 4. Imports lucide OK
node scripts/validate-lucide-imports.mjs

# 5. Bundle grep (se renomeou variável)
grep OLD_NAME src/
grep NEW_NAME src/

# 6. Runtime test (se criou/modificou componente crítico)
# Verificar que *.runtime.test.jsx existe
```

---

## §10. Regras de Hotfixes PWA

### §10.1. SEMPRE SEGUIR O WORKFLOW

> **D-FUTURE-PWA-DEPLOY-CHECKLIST (sw-v72.5)**: ao deployar PWA com
> SW novo:
> 1. SEMPRE bump SW (vN → vN+1)
> 2. SEMPRE adicionar lógica de auto-unregister (se vN-1 é stale)
> 3. SEMPRE fazer reload DEFERIDO (não imediato)
> 4. SEMPRE ter banner "Nova versão disponível" como fallback
> 5. NUNCA fazer reload durante interação do user

### §10.2. SEMPRE VALIDAR BUNDLE DEPLOYED

> Após deploy, SEMPRE validar bundle:
> 1. `curl -m 10 -s https://viralata.web.app/sw-vN.js` (deve existir)
> 2. `curl -m 10 -s https://viralata.web.app/ | grep index` (bundle correto)
> 3. `curl -m 10 -s ... | grep <feature>` (feature presente)

### §10.3. SEMPRE VERIFICAR SW CACHEADO

> **D-FUTURE-PWA-SW-CACHE (sw-v73.1)**: bug "já foi deployado mas não
> funciona" → verificar bundle deployed (curl+grep) E SW cacheado do
> browser (DevTools).

---

## §11. Anti-Padrões (NUNCA FAZER)

### §11.1. ❌ Refactor massivo sem aprovação
### §11.2. ❌ Mudar schema sem migração
### §11.3. ❌ Remover camada de segurança sem repor
### §11.4. ❌ Hard-coded secrets/URLs
### §11.5. ❌ `// TODO` sem contexto
### §11.6. ❌ Branch acumulada por > 7 dias
### §11.7. ❌ Merge sem CI passing
### §11.8. ❌ Push direto em main (sem PR)
### §11.9. ❌ Console.log em produção
### §11.10. ❌ Emoji em código/UI
### §11.11. ❌ `var`, `==`, `any`
### §11.12. ❌ `window.location.reload()` durante interação
### §11.13. ❌ Misturar `import` e `require` em tests
### §11.14. ❌ Esquecer de atualizar docs
### §11.15. ❌ Esquecer de rodar `sync.cjs --fix` após merge

---

## §12. Quando Em Dúvida

1. **Verificar `15-RECENT-FIXES.md`** — bug similar já aconteceu?
2. **Verificar `13-DECISIONS.md`** — decisão similar já foi tomada?
3. **Verificar `14-TROUBLESHOOTING.md`** — problema comum já documentado?
4. **Verificar `00-START-HERE.md` §1** — qual doc ler para esta task?
5. **Em último caso, perguntar ao usuário** — explicitamente, sem ficar
   em loop

---

**Próxima leitura**: `12-CODING-STANDARDS.md` (padrões de código detalhados).

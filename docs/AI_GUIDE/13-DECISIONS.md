# 13-DECISIONS.md — Decisões Arquiteturais Importantes (D-*)

> **Atualizado em 2026-07-24**
>
> Decisões D-* são **invioláveis** a menos que explicitamente revertidas
> por uma nova decisão. Antes de mudar algo, verifique se há D-*
> relacionada.

## §1. Como Adicionar uma Decisão

```md
### D-NOME-CURTO (YYYY-MM-DD)

**Contexto**: o problema que motivou a decisão
**Decisão**: o que foi decidido
**Consequências**: trade-offs e implicações
**Alternativas consideradas**: outras opções e por que foram rejeitadas
```

Após criar, **nunca** reverter sem criar uma `D-NOME-DEPRECATED` que
explique o motivo.

## §2. Decisões de Pets

### D-PET-SEQ-IMMUTABLE (sw-v72.4, 2026-07-22)

**Contexto**: precisamos de um ID permanente para pets que seja
estável independente do Firestore `documentId` (que pode ser renomeado
em migrações).

**Decisão**: `pet_seq` é um número atômico (1, 2, 3, ...) gerado por
Cloud Function usando `pet_seq_counter/{counterId}`. NUNCA pode ser
alterado após criação.

**Consequências**:
- Pet ID é estável através de migrações
- Cloud Function tem custo mínimo (1 read + 1 write por create)
- Counter precisa de backup (mas é simples)
- URL canônica de pet pode ser `/pet/<pet_seq>` (futuro)

**Implementação**:
```js
// firestore.rules
allow update: if canManagePet(petId) &&
  request.resource.data.pet_seq == resource.data.pet_seq;
```

### D-PET-LOG-IMMUTABLE (sw-v72.4, 2026-07-22)

**Contexto**: precisamos de auditoria completa de mudanças em pets.

**Decisão**: `pet_audit_log/{logId}` é append-only. Update bloqueado
para todos. Delete só por platform_admin.

**Implementação**:
```js
allow update: if false;  // IMUTÁVEL
```

### D-PET-LOG-PER-CHANGE (sw-v72.4, 2026-07-22)

**Contexto**: garantir log consistente em todas as operações.

**Decisão**: cada CRUD de pet DEVE chamar `appendPetLog()` com
actor, action, target, details.

**Consequências**:
- Log sempre atualizado
- Custo: 1 write extra por operação (aceitável)
- Implementação fácil via `appendPetLog` helper

### D-PET-OPS-TABLE-PRIMARY-NAVIGATION (sw-v72.4, 2026-07-22)

**Contexto**: admins precisam navegar rapidamente entre pets.

**Decisão**: na tabela de ops (PetsOpsTable), cada linha é ponto de
entrada para o detalhe do pet.

### D-HASH-ROUTER-PET-TABS (sw-v72.4, 2026-07-22)

**Contexto**: permitir share de link direto para uma tab específica.

**Decisão**: tabs de PetDetailView são navegáveis por hash URL
(`#log`, `#notes`, `#timeline`).

### D-PET-NOTES-AUTHOR-DELETE (sw-v72.4, 2026-07-22)

**Contexto**: notas são conteúdo user-generated.

**Decisão**: `pet_notes` — read/create/update canManage, delete só
autor (via `resource.data.author.uid`) ou platform_admin.

### D-PET-DETAIL-RUNTIME-TEST (sw-v73.3, 2026-07-22)

**Contexto**: bug `canEdit` ReferenceError passou em static analysis
mas só foi pego com runtime test.

**Decisão**: para CADA página/componente crítico, criar
`*.runtime.test.jsx` que renderiza com dados mockados.

**Consequências**:
- Mais tests, mas cobertura real
- Pega variáveis undefined em escopo
- Custo: ~5min por componente crítico

### D-ENSURE-CAN-MUTATE-PET (TASK-029, 2026-07-22)

**Contexto**: defense-in-depth para escritas em pets.

**Decisão**: toda escrita em pet DEVE chamar `ensureCanMutatePet(petId, actor)`
ANTES do `batch.update()`.

## §3. Decisões de UI

### D-USER-EMOJIS (2026-07-22)

**Contexto**: usuário pediu.

**Decisão**: NENHUM emoji em código OU UI. Usar `lucide-react` para
ícones.

### D-PET-PUBLIC-V2-HERO (sw-v72, 2026-07-22)

**Decisão**: Hero `from-rose-500 via-orange-500 to-amber-500` é o
padrão para páginas de pet público.

### D-PET-PUBLIC-V2-SEM-ADMIN (sw-v72, 2026-07-22)

**Decisão**: páginas PÚBLICAS (PetDetailView) NÃO devem ter botões de
admin/gestão. ZERO. Apenas "Quero adotar", "Compartilhar", "Reportar".

### D-PET-PUBLIC-V2-RUNTIME-SAFETY (sw-v72.2, 2026-07-22)

**Decisão**: testes DEVEM cobrir pet com TODOS os campos (mesmo
campos nullable) para garantir que não quebra com dados reais.

### D-LABEL-FALLBACK (sw-v72.2, 2026-07-22)

**Decisão**: `LABEL[campo] || campo` é padrão obrigatório. Não pode
quebrar se label não existir.

### D-CLUB-DETAIL-PANEL-UNICO (sw-v72.3, 2026-07-22)

**Decisão**: APENAS 1 botão Painel, no topo da página. NÃO múltiplos
botões espalhados.

### D-LINK-PLURAL-ORGS (sw-v72.3, 2026-07-22)

**Decisão**: SEMPRE `/organizacoes/` (plural) para diretório de ONGs.
`/clubes/` é legacy e redireciona.

## §4. Decisões de PWA

### D-PWA-STALE-UNREGISTER (sw-v73.1, 2026-07-22)

**Contexto**: bundle deployed pode estar stale no user (SW vN-1).

**Decisão**: SWs vN-1 devem ser desregistrados no boot da vN.

### D-PWA-UNREGISTER-ALWAYS (sw-v73.2, 2026-07-22)

**Contexto**: sw-v73.1 não rodava quando PWA_ENABLED=false.

**Decisão**: `unregisterStaleAndMaybeReload` roda SEMPRE, independente
de PWA_ENABLED.

### D-PWA-STALE-UNREGISTER-DEFER (sw-v73.3, 2026-07-22)

**Contexto**: reload de 50ms interrompia user no meio de interação.

**Decisão**: NUNCA `window.location.reload()` se user pode estar
interagindo. Track activity via `pwa-stale-last-activity` (sessionStorage).
Se interagiu < 5s, defer 5s.

### D-PET-OPS-LUCIDE-IMPORT (sw-v72.5, 2026-07-22)

**Contexto**: `MessageSquare is not defined` em produção.

**Decisão**: SEMPRE validar que TODOS os ícones do lucide usados em
JSX estão no import. Build NÃO pega isso (tree shaking + globals).

**Implementação**: `scripts/validate-lucide-imports.mjs`.

### D-PWA-BUMP-ALWAYS-UI (TASK-PWA, 2026-07-22)

**Decisão**: SEMPRE bumpar SW (vN → vN+1) ao mudar UI.

### D-PWA-SKIPWAITING-TRUE (2026-07-22)

**Decisão**: `workbox.skipWaiting = true` para auto-update.

### D-PWA-CLIENTSCLAIM-TRUE (2026-07-22)

**Decisão**: `workbox.clientsClaim = true` para forçar novo SW.

### D-PWA-NUCLEAR-RESET (HOTFIX-005)

**Decisão**: para SWs legacy (v0-v5, `sw.js`), nukeAllCaches + reload.
Flag `hotfix-005-reload` no sessionStorage evita loop infinito.

### D-FUTURE-PWA-DEPLOY-CHECKLIST (NEW, sw-v72.5)

**Decisão**: ao deployar PWA com SW novo:
1. SEMPRE bump SW (vN → vN+1)
2. SEMPRE adicionar lógica de auto-unregister (se vN-1 é stale)
3. SEMPRE fazer reload DEFERIDO (não imediato)
4. SEMPRE ter banner "Nova versão disponível" como fallback
5. NUNCA fazer reload durante interação do user

### D-FUTURE-AUTO-RELOAD-INTERACTION (NEW, sw-v73.3)

**Decisão**: NUNCA `window.location.reload()` se user pode estar
interagindo. Sempre deferir ou oferecer botão "Reload".

### D-FUTURE-ICON-ADD-WORKFLOW (NEW, sw-v72.5)

**Decisão**: workflow ao adicionar ícone:
1. Adicionar ícone no JSX
2. Adicionar no import (lucide-react)
3. Rodar `node scripts/validate-lucide-imports.mjs`
4. Commit
5. Validar bundle deployed (`curl` + `grep`)

## §5. Decisões de Feature Flags

### D-FEATURE-FLAGS-OBRIGATORIAS (TASK-022, 2026-07)

**Decisão**: TODA feature nova DEVE estar atrás de feature flag,
ativada no admin.

### D-FEATURE-FLAG-MIGRATION (TASK-022, 2026-07)

**Decisão**: ao mudar flag OFF→ON, SEMPRE adicionar migração em
`migrateLegacyFlags` + bump `FLAGS_MIGRATION_VERSION`.

## §6. Decisões de Testes

### D-TEST-NAMED-VS-DEFAULT-EXPORT (sw-v73.3, 2026-07-22)

**Decisão**: testes com dynamic import devem usar `.default` se o
componente só tem `export default`.

### D-TEST-MIXED-ESM-CJS (sw-v73.3, 2026-07-22)

**Decisão**: NUNCA misturar `import` e `require` no mesmo `.test.jsx`.
Usar ESM puro.

### D-TEST-COLLECTION-EXPECTATION (sw-v73.3, 2026-07-22)

**Decisão**: ao adicionar coleção denormalizada (TASK-312), atualizar
testes que esperam collection original.

### D-TEST-COMPONENT-API-CHANGED (sw-v73.3, 2026-07-22)

**Decisão**: ao renomear prop no componente, atualizar testes
imediatamente.

## §7. Decisões de SCRUM

### D-SCRUM-REGRA-A (TASK-022, 2026-07)

**Decisão**: REGRA A — Após MERGE de PR, rodar `node .harness/sync.cjs --fix`
para auto-sync do SCRUM_TASKS.json.

### D-SCRUM-REGRA-B (TASK-022, 2026-07)

**Decisão**: REGRA B — A cada ~10 tasks, rodar `node .harness/sync.cjs --check`
para verificar inconsistências.

## §8. Decisões de Deploy

### D-DEPLOY-MAIN-AUTO (TASK-022, 2026-07)

**Decisão**: push em main dispara deploy automático via GitHub Actions.
NÃO acumular branches.

### D-DEPLOY-MERGE-SQUASH (TASK-022, 2026-07)

**Decisão**: merges via SQUASH no GitHub. Histórico limpo, 1 commit
por feature.

## §9. Decisões Deprecated (para histórico)

> Decisões antigas que foram revertidas. Mantidas para contexto.

### D-V2-SKIP-DEPRECATED (2026-05)

V2 foi pulado. Apenas V1 e V3. Decidido para economizar tempo.

---

**Próxima leitura**: `14-TROUBLESHOOTING.md` (problemas comuns).

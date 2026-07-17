# Feature Flag Lifecycle

> Como ativar, desativar e migrar feature flags na Viralata.
> Ver também: `docs/FEATURE_FLAGS.md`, `src/core/lib/FeatureFlagsContext.migration.js`.

## Os 4 Lugares de uma Flag

Cada flag existe em **4 lugares simultaneamente**. Todos devem estar sincronizados:

```
1. src/core/featureFlags.js          → enum (SHELTER_KANBAN, etc.)
2. src/core/featureFlags.js          → DEFAULT_FEATURE_FLAGS[key] = false
3. src/core/lib/FeatureFlagsContext.migration.js → lógica de migração
4. Firestore: platform_settings/global → feature_flags[key] = true/false
```

**Mudar só 1 lugar = flag quebrada.**

---

## Como Ativar uma Flag (p/ Admin)

### Caminho 1: /admin/flags (UI)
1. Acesse `https://viralata.app/admin/flags` (requer `platform_admin`).
2. Localize a flag desejada.
3. Clique no toggle.
4. A mudança é gravada em Firestore `platform_settings/global`.
5. Aplica-se imediatamente para todos os usuários.

⚠️ **Não é suficiente só alterar `DEFAULT_FEATURE_FLAGS` no código** — o Firestore sobrescreve o valor default. O admin precisa ativar manualmente OU a migração deve escrever o valor.

### Caminho 2: Migração Automática
Para flags que devem estar ON por padrão após deploy:
1. Alterar `DEFAULT_FEATURE_FLAGS[key] = true` no código.
2. Adicionar critério de migração em `FeatureFlagsContext.migration.js`.
3. Bump `FLAGS_MIGRATION_VERSION` em `platformSettingsService.js`.
4. Adicionar teste em `FeatureFlagsContext.migration.test.js`.
5. Fazer deploy.

**Anti-fachada**: diff de 1 linha mudando `DEFAULT[X] = true` SEM migração = fachada. O Firestore ignora `DEFAULT` se `platform_settings/global` existir.

---

## Como Desativar uma Flag (p/ Admin)

1. Acesse `/admin/flags`.
2. Desative o toggle.
3. O valor `false` é gravado em Firestore.
4. Aplica-se imediatamente.

Para reverter permanentemente: volte a ativar no UI.

---

## A Migração (por que existe?)

O Firestore guarda valores explícitos de flags. Após `cache.clear()` ou em outro browser, o app lê do Firestore — que pode ter valores velhos de antes da flag existir.

A migração corrige isso:
1. Detecta flags `undefined`/`null` no Firestore.
2. Aplica `DEFAULT_FEATURE_FLAGS`.
3. Escreve o valor corrigido no Firestore.
4. Marca `_migrations.flags = FLAGS_MIGRATION_VERSION`.

### Versão Atual
```js
// src/core/services/platformSettingsService.js
export const FLAGS_MIGRATION_VERSION = 4;
```

### Como Bump a Versão (quando a lógica muda)

1. `platformSettingsService.js`: `FLAGS_MIGRATION_VERSION++` + comentário explicando.
2. `FeatureFlagsContext.migration.js`: adicionar novo critério em `migrateLegacyFlags`.
3. `FeatureFlagsContext.migration.test.js`: adicionar teste para o novo critério.
4. Commit com mensagem descrevendo a mudança.

### Critérios de Migração v3 (HOTFIX-001)

```js
if (storedAllFalse) {
  // Caso 1: Firestore completamente vazio → aplicar todos DEFAULT
  Object.entries(DEFAULT).forEach(([k, v]) => { result[k] = v; });
} else {
  // Caso 2: Firestore parcialmente populado → migrar só undefined/null
  SHELTER_KEYS.forEach(key => {
    if (result[key] === undefined || result[key] === null) {
      result[key] = DEFAULT[key] ?? false;
    }
  });
}
```

### Critérios de Migração v4

Ver `FeatureFlagsContext.migration.js` para a lógica atual.

---

## Flag Categories

| Categoria | Prefixo | Padrão | Quem ativa |
|-----------|---------|--------|-----------|
| Shelter features | `SHELTER_*` | OFF | Admin plataforma |
| Community features | `COMMUNITY_*` | OFF | Admin plataforma |
| PWA/Performance | `PWA_*` | varies | Auto (deploy) |
| Legacy | (sem prefixo) | varies | Auto (migração) |

---

## Debug

Se uma flag não está funcionando:
1. Abra DevTools → Application → IndexedDB/Firestore → `platform_settings/global`.
2. Verifique `feature_flags[key]`.
3. Limpe cache do browser (Ctrl+Shift+R).
4. Verifique `_migrations.flags >= FLAGS_MIGRATION_VERSION`.
5. Se `_migrations.flags < current`: a migração vai rodar e corrigir.

### URL de Debug
```
/admin/flags?debug=1
```
Mostra todos os valores (DEFAULT + Firestore + efetivo final) para diagnóstico.

---

## Anti-Patterns

| ❌ Não faça | ✅ Faça |
|-----------|---------|
| Mudar DEFAULT sem migração | Mudar DEFAULT + adicionar critério + bumpar versão |
| Ativar flag manualmente e commitar | Migrar no código (reproduzível) |
| Esquecer de bumpar versão | Sempre bumpar após mudar lógica |
| Testar só no seu browser | Adicionar teste em `FeatureFlagsContext.migration.test.js` |
| Falar "user pode ligar manualmente" | Migrar + DEFAULT ativado para entrega automática |

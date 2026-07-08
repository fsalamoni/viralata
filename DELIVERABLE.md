# Feature flags: Pet Feed reliability + Mural likes/comments

## Resumo

Implementação aditiva de **duas features** no projeto `viralata`, ambas
controladas por feature flags na página `AdminPlatformSettings` (default OFF).

Ambas as features **não alteram comportamento nenhum** quando a flag está
desligada. Toda a lógica nova está atrás de `useFeatureFlag(...)`, com o
código original preservado em arquivos `*.original.jsx`.

---

## Feature 1 — `PET_FEED_RELIABILITY_FIX` (Fase 1)

### O que faz
- Move os filtros do feed (espécie, porte, cidade, raio) do servidor para o
  cliente via novo módulo puro `feedFilters.js`.
- Garante uma **única query Firestore** (`status == available + orderBy
  created_at`), coberta por índice já existente — elimina erros
  `failed-precondition` quando o usuário combina filtros.
- Quando a geocoding é parcial (cidade fora da tabela), um **banner
  "location fallback"** avisa o usuário que o feed está mostrando pets de
  todas as cidades em vez de ficar vazio.

### Arquivos novos
- `src/modules/pets/domain/feedFilters.js` — `applyFeedFilters()` puro
- `src/modules/pets/domain/feedFilters.test.js` — 12 testes
- `src/modules/pets/pages/PetFeedEnhanced.jsx` — nova arquitetura

### Arquivos modificados
- `src/modules/pets/domain/geoDistance.js` — exports **aditivos**
  (`normalizePlaceText`, `resolvePetCoords`, `filterByRadius`); nenhum
  export removido
- `src/core/featureFlags.js` — registro da flag + PT-BR metadata
- `src/modules/pets/pages/PetFeed.jsx` — vira wrapper:
  ```jsx
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.PET_FEED_RELIABILITY_FIX);
  return useEnhanced ? <PetFeedEnhanced /> : <PetFeedOriginal />;
  ```

### Arquivos preservados
- `src/modules/pets/pages/PetFeed.original.jsx` (era o PetFeed.jsx antes)
- `src/modules/pets/services/petService.js` — `getAvailablePets` original
  mantido integralmente (usado pelo PetFeed.original)

---

## Feature 2 — `MURAL_LIKES_AND_COMMENTS` (Fase 2)

### O que faz
- Adiciona UI de **curtidas** e **comentários** nos posts do Mural das
  comunidades.
- `PostCard` extraído como sub-componente (encapsulamento, lazy load de
  comments, ConfirmDialog para delete, useCallback para perf).
- As funções de service e as regras Firestore **já existiam** no main —
  o Mural só não consumia. Agora consome.

### Arquivos novos
- `src/modules/communities/components/MuralTabEnhanced.jsx`

### Arquivos modificados
- `src/modules/communities/services/communityService.js` — função
  **aditiva** `getMyLikedPostIds(userId)`; nenhuma função alterada
- `src/core/featureFlags.js` — registro da flag
- `src/modules/communities/components/MuralTab.jsx` — vira wrapper

### Arquivos preservados
- `src/modules/communities/components/MuralTab.original.jsx`
- `src/modules/communities/domain/permissions.js` (granular permissions)
- `src/modules/communities/domain/constants.js`
- Toda a sub-árvore `src/modules/communities/components/forum/` (PollComponent,
  CommentSection, AttachmentRenderer, etc.)

---

## Validação

| Check | Resultado |
|-------|-----------|
| `npm test` (vitest) | **17 arquivos · 165 testes · todos passam** |
| `npm run typecheck` | 0 erros |
| `npm run lint` (arquivos novos/modificados) | 0 erros · 5 warnings (todas em código `.original.jsx` pré-existente) |
| `git diff origin/main -- firestore.rules` | 0 linhas |
| `git diff origin/main -- firestore.indexes.json` | 0 linhas |
| `priority.test.js` preservado | ✅ |
| `permissions.js` / `constants.js` preservados | ✅ |
| `PetFeed.original.jsx` / `MuralTab.original.jsx` | ✅ ambos existem |
| `AdminPlatformSettings.jsx` renderiza 2 flags | ✅ (data-driven via `FEATURE_FLAG_META`) |

### Novos testes adicionados (12)
- `feedFilters.test.js`:
  - filtro por espécie
  - filtro por porte
  - filtro por cidade normalizada (case/accents)
  - filtro por raio
  - filtro por `hideOwnerId`
  - `locationFallback` liga quando filtro zera mas há pets
  - `locationFallback` false quando resultado direto funciona
  - edge cases (array vazio, undefined inputs)

---

## Como testar

1. Subir o ambiente local (`npm run dev`).
2. Entrar como **admin master** (`/admin/configuracoes`).
3. Em **Configurações globais → Feature flags**:
   - **Confiabilidade do Feed de Pets** → ligar → ir em `/feed` → ver
     filtros funcionando e banner de fallback quando aplicável.
   - **Curtidas e comentários no Mural** → ligar → abrir uma comunidade
     → Mural → curtir/comentar posts.
4. **Desligar as flags** = comportamento volta ao estado anterior
   (idêntico ao main antes deste PR).

---

## UX/UI

### Banner de fallback do Feed
- Aparece **acima da lista de pets** quando filtros de localização zeram
  o resultado mas há pets na plataforma
- Cor de destaque (high-contrast), ícone `Info` da lucide-react
- Texto em PT-BR: "Nenhum pet encontrado em **{cidade}** num raio de
  **{raio} km** — mostrando pets de todas as cidades da plataforma."
- Sem fechar manualmente — some quando os filtros voltam a retornar
  resultados diretamente

### MuralTabEnhanced
- `Heart` ícone com estado preenchido quando curtido
- Botão de comentário abre thread inline (lazy load, não pesa o feed)
- `ConfirmDialog` shadcn/ui antes de deletar post
- `useCallback` em `fetchPosts` para performance
- `Set` para lookup O(1) dos likes do usuário
- Mesma paleta visual e spacing do resto do app

---

## Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Admin esquecer flag OFF em produção | Default é OFF; sem ação do admin, comportamento é idêntico ao main |
| Edge cases em normalização de cidade | 12 testes cobrem cases; tabela de cidades documentada |
| Performance com 500 pets no client | Limite atual `limitCount = 500`; pode ser re-avaliado se base crescer |
| MuralTabEnhanced cresce em LOC | Encapsulado em PostCard; service layer intocado |

---

## Próximos passos sugeridos (fora do escopo deste PR)

- Adicionar e2e tests para os 2 fluxos flag ON/OFF (Playwright)
- Métricas de uso: log quando `locationFallback` ativa para mapear gaps
  de geocoding
- Migrar a lógica de `useMyMembership` no ClubDetail pra mesma
  arquitetura aditiva (se aplicável)
- Aplicar o mesmo padrão em outras telas com bugs de query conhecidos

---

## Como reverter

Reverter o commit é seguro e completo:
```bash
git revert 4705f96
```
Nenhuma migração de dados é necessária (schema inalterado).
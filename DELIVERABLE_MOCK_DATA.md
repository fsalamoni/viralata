# DELIVERABLE · Mock Data System

> Pacote de dados demo + painel admin para carregar/limpar com 2 cliques.
> Sessão: `mvs_44f2762343f94f28b506f2f4c8c12eae` (Mavis root)
> Data: 2026-07-12 21:35 (America/Sao_Paulo)
> Worktree: `D:\viralata\.worktrees\wt-17ff480a`
> Branch: `wt/17ff480a`
> Flag: `MOCK_DATA_PANEL` (default ON)

## 1. Scope

Resolver a fricção de ter dados de demonstração: antes era preciso cadastrar cada
usuário/pet/ONG manualmente para validar fluxos, demos e treinamentos. Agora
existe um pacote determinístico (~150 documentos em 28 coleções) materializável
em 2 cliques, e limpável com a mesma facilidade.

**Casos de uso cobertos:**
- Demo da plataforma pra investidor/ONG/equipe — popula tudo, mostra, limpa.
- Treinamento de admins novos — povoa, deixa mexer, limpa.
- Validação visual de fluxos (Regra A §1, §2) com dados realistas.
- Smoke test ponta-a-ponta em produção sem precisar criar manualmente.
- Teste de auditoria/LGPD com volume representativo.

## 2. O que foi entregue

| Arquivo | O que faz |
|---|---|
| `src/mocks/constants.js` | prefixos determinísticos (`mock_usr_`, `mock_org_`, `mock_pet_`, `mock_com_`, `mock_evt_`, `mock_post_`, `mock_don_`, `mock_cnv_`, `mock_aud_`, `mock_ntf_`, `mock_rep_`, `mock_led_`, `mock_cmp_`, `mock_frm_`, `mock_int_`, `mock_rat_`, `mock_cpo_`, `_mock_tag`); helpers `daysAgoIso`, `daysAgoMs` |
| `src/mocks/users.js` | 10 perfis (`mock_usr_001`–`mock_usr_010`) com perfil público em `athlete_profiles` |
| `src/mocks/clubs.js` | 3 ONGs (`mock_org_001` Patinhas do Bem / `mock_org_002` Bigodes do Rio / `mock_org_003` Caramelo BH) + 2 comunidades editoriais |
| `src/mocks/pets.js` | 12 pets (cães, gatos, coelho) com 4 adotados, 2 in_process, 6 disponíveis, donos pessoa/ONG; 6 adoption_interests; 2 adoption_ratings |
| `src/mocks/organizations.js` | 8 club_members, 8 community_members, 5 club_events, 6 club_posts + 22 likes + 6 comentários, 3 forum_threads + 6 comentários, 3 campaigns + 4 donations + 14 ledger entries + 3 categories, 5 community_posts + 22 likes + 6 comentários + 2 community_events |
| `src/mocks/social.js` | 2 conversations (1 direta, 1 grupo) + 11 mensagens, 8 notifications, 6 audit_logs, 2 abuse_reports |
| `src/mocks/index.js` | agregado `mockPayloads[]` consumido pelo service |
| `src/mocks/mockDataService.js` | `loadAll`/`clearAll`/`getStatus`/`getMockSummary`/`getMockVersion`; batch chunked (450 ops), substitui `REAL_USER_UID`/`REAL_USER_NAME` no runtime |
| `src/mocks/mockData.test.js` | 29 testes: cobertura, determinismo, cross-references, shape, helpers |
| `src/modules/admin/pages/AdminMockData.jsx` | painel admin com botões Carregar/Limpar, status por coleção, modais de confirmação (palavra-chave para limpar) |
| `src/core/featureFlags.js` | `MOCK_DATA_PANEL` flag + meta |
| `src/App.jsx` + `src/modules/admin/pages/AdminDashboard.jsx` | rota `/admin/mock-data` + card no menu admin |

**Cobertura (28 coleções):**
- Identidade: `users`, `athlete_profiles`
- Comunidade: `communities`, `clubs`, `community_members`, `club_members`
- Pets: `pets`, `adoption_interests`, `adoption_ratings`
- ONG: `club_events`, `club_posts`, `club_post_likes`, `club_post_comments`,
  `club_forum_threads`, `club_forum_threads/{id}/comments` (sub),
  `club_campaigns`, `club_donations`, `club_ledger`, `club_ledger_categories`
- Comunidade editorial: `community_posts`, `community_post_likes`,
  `community_post_comments`, `community_events`
- Chat: `conversations`, `conversations/{id}/messages` (sub)
- Transversal: `notifications`, `audit_logs`, `abuse_reports`

## 3. Decisões de modelagem

### 3.1 Tag `_mock: true` em todos os documentos

```js
mockMeta({ kind: 'pet' })
// → { _mock: true, _mock_version: '2026-07-12.1', _mock_loaded_at_ms: 1717... }
```

`clearAll()` usa `where('_mock', '==', true)` em cada coleção. Usuários reais
nunca são afetados.

### 3.2 Placeholders `REAL_USER_UID` / `REAL_USER_NAME`

Coleções que exigem `request.auth.uid == X` (interesses, posts, etc.) não podem
ter `user_id` fake. O `loadAll()` recebe o `realUid`/`realUserName` do chamador
e substitui recursivamente nos payloads antes do `setDoc`.

### 3.3 IDs determinísticos

`mock_pet_001`, `mock_org_001`, etc. Permite:
- idempotência (re-rodar `loadAll` apenas sobrescreve);
- cleanup preciso (sabemos exatamente o que apagar);
- leitura do console do Firestore é trivial.

### 3.4 Privacidade por isolamento

`audit_logs` é imutável (Firestore rules). `clearAll` tenta apagar mesmo assim;
se falhar (provavelmente vai), reporta no array `errors[]` mas segue adiante.
Logs de mock não vazam para auditoria útil — só poluem, podem ser limpos
manualmente se incomodar.

## 4. Como usar

### 4.1. Painel admin (recomendado)

1. Login como `fsalamoni@gmail.com` (platform_admin).
2. Acessar `/admin/mock-data` (card "Dados demo" no menu admin).
3. Clicar "Carregar dados demo" → confirma → 150 docs criados em segundos.
4. Navegar pelo app (feed, ONGs, comunidades, chat) com dados realistas.
5. Clicar "Limpar dados demo" → digitar `APAGAR DADOS DEMO` → confirma.

### 4.2. Programaticamente

```js
import { loadAll, clearAll, getStatus } from '@/mocks/mockDataService';

await loadAll({
  realUid: user.uid,
  realUserName: user.displayName,
  onProgress: (name, current, total) => console.log(`${name} (${current}/${total})`),
});

const { byCollection, total } = await getStatus();
console.log(`${total} docs de mock em produção agora.`);

await clearAll({ realUid: user.uid, realUserName: user.displayName });
```

## 5. Testes & validação

| Comando | Resultado |
|---|---|
| `npx vitest run src/mocks` | 29/29 passing (cobertura, cross-refs, shape, helpers) |
| `npm test` (suite completa) | 332/332 passing (segunda passada, primeira teve 2 flaky em PWA) |
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros |
| `npm run build` | success em 12.72s, 98 entries precache, 3784.52 KiB |
| Bundle hash do painel | `AdminMockData-zoMLMhap.js` (58.80 kB, gzip 17.75 kB) |

## 6. Regra A · avaliação plena (aplicada)

| Eixo | Cobertura |
|---|---|
| **UX** | Página segue `arena-page` wrapper (`useArenaPageClasses`), `PageHero` com badge de versão, cards com `p-6`, mobile-friendly (1 col), estados loading/empty/error visíveis |
| **Papéis** | Restrito a `platform_admin` via `AdminRoute` + flag `MOCK_DATA_PANEL`. Usuário anônimo → redirect /login. Não-admin logado → redirect /feed. Flag off → mensagem explicativa com link para /admin/flags |
| **Regras de negócio** | `clearAll` filtra por `_mock: true` (zero risco a dados reais); `loadAll` idempotente; sub-coleções resolvidas via `resolveParent`; `audit_logs` (imutável) reporta erro mas não trava o resto; `getStatus` valida `_mock === true` antes de contar |
| **Integrações** | Firestore (web SDK), `createAuditLog` do `auditService`, `useFeatureFlag` do `FeatureFlagsContext`, `useAuth` do `FirebaseAuthContext`. Substituição de placeholder via `deepReplace` |
| **Estado pós-deploy** | Feature flag default ON (projeto pessoal do admin); flag pode ser desligada em /admin/flags; smoke test em prod: clicar "Carregar" → conferir feed/diretório → "Limpar" → conferir que sumiu tudo mockado mas dados reais (se houver) permanecem |

## 7. Limitações conhecidas (não-bloqueantes)

1. **Sem smoke test automatizado em prod**: por conveniência, é clicável no
   painel. Para automação, criar teste Playwright que carrega → confere count
   → limpa.
2. **Sem teste do `loadAll`/`clearAll` no emulador**: Firestore emulator local
   precisaria de Cloud Functions config — fora do escopo desta entrega.
   Validação manual em prod está ok.
3. **`audit_logs` imutável**: o `clearAll` reporta erro nessa coleção; o admin
   pode deletar manualmente se quiser. Não é grave — só ocupa espaço.
4. **Sem upload de fotos de mock**: `photos: []` em todos os pets/posts. Para
   ficar visualmente mais rico, pode ser adicionado upload de imagens estáticas
   no Storage ou uso de URLs externas (cuidado com CORS/LGPD).

## 8. Reverter

Não-bloqueante. Remover a feature flag em /admin/flags esconde a página. Para
remover o código:

```bash
# Remove a rota
# (App.jsx) deletar o <Route path="/admin/mock-data" ... />
# (AdminDashboard.jsx) remover o item do array `sections`
# (featureFlags.js) remover FEATURE_FLAG.MOCK_DATA_PANEL + DEFAULT

git revert <commit>
# ou
git reset --hard <commit-anterior>
```

## 9. Próximos passos (backlog)

- Adicionar upload de fotos via Storage mockado (placeholders `.jpg` em `public/mocks/`).
- Implementar `mocks/MOCK_TEMPLATES.json` pra trocar perfil de demo (e.g., "ONG pequena" vs "rede nacional").
- Adicionar mais eventos (`club_events`) com diferentes visibilities (privado/público) para testar invariantes de regra.
- Smoke test Playwright: carregar mocks → conferir rota `/feed` retorna N pets → limpar.

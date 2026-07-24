# 09-DEPLOY.md — CI/CD, Deploy, GitHub

> **Atualizado em 2026-07-24**

## §1. Pipeline de Deploy

```
┌─────────────┐
│ git push    │
│ origin main │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ GitHub Actions       │
│ .github/workflows/   │
│   deploy.yml         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 1. Install           │
│ 2. Lint              │
│ 3. Test              │
│ 4. Build             │
│ 5. Deploy            │
│    Firebase Hosting  │
│    viralata.web.app  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Post-deploy          │
│ - Validar SW         │
│ - Validar bundle     │
│ - Update SCRUM       │
└──────────────────────┘
```

## §2. Workflows

### §2.1. `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx vitest run

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx vite build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: viralata-4cf0b
```

### §2.2. `.github/workflows/scrum-sync.yml`

Auto-sync do `SCRUM_TASKS.json`.

### §2.3. `.github/workflows/scrum-topbar.yml` / `scrum-topbar-finalizer.yml`

Post-deploy SCRUM topbar update.

## §3. Secrets (GitHub)

Configure em `Settings → Secrets and variables → Actions`:

| Secret | Descrição |
|--------|-----------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON do service account (download do Firebase Console) |
| `FIREBASE_PROJECT_ID` | `viralata-4cf0b` |
| `VITE_FIREBASE_API_KEY` | API key (expor no .env) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `viralata-4cf0b.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `viralata-4cf0b` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `viralata-4cf0b.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (number) |
| `VITE_FIREBASE_APP_ID` | (string) |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` (opcional) |

## §4. Workflow de Desenvolvimento

### §4.1. Branch nova

```bash
git checkout main
git pull
git checkout -b feature/<name>
# ... código
git add .
git commit -m "feat: <description>"
git push origin feature/<name>
# Abrir PR no GitHub
```

### §4.2. PR

- **CI roda**: lint, test, build
- **Review**: pelo menos 1 aprovação
- **Merge**: SQUASH MERGE
- **Auto-deploy**: push em main dispara deploy

### §4.3. Merge + Deploy Automático

> **REGRA**: Quando terminar conjunto de tarefas, fazer merge (squash)
> + deploy completo e integral. Atualizar documentos.

```bash
# Local
git checkout main
git pull
git merge --squash feature/<name>
git commit -m "feat: <description>"
git push origin main

# GitHub Actions roda deploy automaticamente
# Monitorar em: github.com/fsalamoni/viralata/actions
```

## §5. Firebase Hosting

### §5.1. Configuração

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg|ico)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=604800" }
        ]
      }
    ]
  }
}
```

### §5.2. URLs

- **Produção**: https://viralata.web.app
- **Custom domain**: https://viralata.app (se configurado)
- **Preview channels**: PR-triggered (se configurado)

## §6. Firestore Rules Deploy

```bash
# Validar primeiro
firebase firestore:rules:test

# Deploy apenas rules
firebase deploy --only firestore:rules

# Deploy com índices
firebase deploy --only firestore:rules,firestore:indexes
```

## §7. Cloud Functions Deploy

```bash
# Build
cd functions
npm run build

# Deploy
firebase deploy --only functions

# Deploy function específica
firebase deploy --only functions:rankPlayers
```

## §8. Rollback

### §8.1. Rollback do Frontend

```bash
# Via Firebase Console
firebase hosting:clone SOURCE_SITE:VERSION TARGET_SITE

# Ou via Git (reverter commit)
git revert HEAD
git push origin main
```

### §8.2. Rollback de Rules

```bash
# Baixar versão anterior
firebase firestore:rules:get > firestore.rules.bak

# Editar
# ...

# Deploy
firebase deploy --only firestore:rules
```

## §9. Verificação Pós-Deploy

### §9.1. Bundle deployed

```bash
# Verificar SW atual
curl -m 10 -s https://viralata.web.app/sw-v73.js | head -3

# Verificar bundle
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -3

# Verificar feature específica
curl -m 10 -s https://viralata.web.app/assets/index-DKT4N-aG.js | grep -c "pwa-stale-last-activity"
```

### §9.2. Smoke test

```bash
# Verificar rotas principais (devem retornar 200)
for path in / /feed /pet/J6FqNRfke0KOZo9nPI5E /organizacoes; do
  code=$(curl -m 10 -o /dev/null -s -w "%{http_code}" "https://viralata.web.app$path")
  echo "$path: $code"
done
```

### §9.3. Console

- **Firebase Console**: https://console.firebase.google.com/project/viralata-4cf0b
- **App Hosting**: https://viralata-4cf0b.web.app
- **Auth**: aba Authentication
- **Firestore**: aba Firestore Database
- **Functions**: aba Functions
- **Hosting**: aba Hosting

## §10. Monitoramento

### §10.1. Logs

```bash
# Cloud Functions logs
firebase functions:log

# Firestore logs (Console)
# Firebase Console → Firestore → Usage tab
```

### §10.2. Alertas (Firebase Console)

- Quota exceeded
- Error rate
- Latency p95
- Auth failures

### §10.3. Custom logging

- `src/core/observability/logger.js` — logger customizado
- Envia para console (dev) e Cloud Logging (prod)
- Use `logger.info()`, `logger.error()`, `logger.audit()`

## §11. Workflows Úteis

### §11.1. Comando Completo (após task)

```bash
# 1. Validar local
npx vitest run
npx vite build
node scripts/validate-lucide-imports.mjs

# 2. Commit
git add .
git commit -m "feat(scope): <description>"

# 3. Push
git push origin main

# 4. Monitorar
gh run watch

# 5. Validar produção
sleep 60  # wait for deploy
curl -m 10 -s https://viralata.web.app/sw-v73.js | head -3
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -3

# 6. SCRUM sync
node .harness/sync.cjs --fix
```

### §11.2. gh CLI

```bash
# Listar PRs abertos
gh pr list

# Criar PR
gh pr create --title "..." --body "..."

# Ver status de um PR
gh pr status 123

# Ver runs do CI
gh run list

# Watch um run
gh run watch

# Ver logs
gh run view --log
```

## §12. Checklist de Deploy

- [ ] Código testado localmente (`npx vitest run`)
- [ ] Build OK (`npx vite build`)
- [ ] Validação de imports (`node scripts/validate-lucide-imports.mjs`)
- [ ] Sem warnings críticos
- [ ] Sem TODOs pendentes (ou documentados)
- [ ] Documentação atualizada (ver `10-SCRUM.md`)
- [ ] Mensagem de commit descritiva
- [ ] Push em main (NÃO em branch)
- [ ] CI passing
- [ ] Deploy successful
- [ ] Validação em produção (bundle + SW)
- [ ] SCRUM sync
- [ ] Slack/Discord notification (se aplicável)

---

**Próxima leitura**: `10-SCRUM.md` (regras SCRUM, sync).

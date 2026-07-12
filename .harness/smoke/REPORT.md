STATUS PARCIAL — wt/e79e15ca @ 67a4c7a (3 commits ahead of main)

SMOKE
- typecheck: PASS (tsc --noEmit, 0 erros)
- build:     PASS (vite build, 17.43s, PWA precache 112 entries / 4290 KiB)
- test:      2 FAIL | 1359 PASS (62/64 files)

FAILURES (mesma raiz, 2 arquivos, mesmo assertion)
  src/modules/shelter/services/exhibitionService.test.js
  src/modules/shelter/domain/operational/exhibition.test.js
  > formatExhibitionDateTime('2026-08-01T14:30:00.000Z')
  Expected: "01/08/2026 14:30"
  Received: "01/08/2026 11:30"
  -> helper converte como UTC em vez de America/Sao_Paulo (TZ off-by-3h)

LOGS
  D:\viralata\.worktrees\wt-e79e15ca\.harness\smoke\typecheck.log
  D:\viralata\.worktrees\wt-e79e15ca\.harness\smoke\build.log     (14.6 KB)
  D:\viralata\.worktrees\wt-e79e15ca\.harness\smoke\test.log      (2.3 KB)

MR
- branch ja pushed (origin/wt/e79e15ca, "Everything up-to-date")
- PR ainda NAO criado: gh CLI sem oauth_token
  (C:\Users\Usuario\AppData\Roaming\GitHub CLI\hosts.yml soh tem user, sem token)
- para criar o MR preciso de: `gh auth login` ou $env:GH_TOKEN setado

WORKTREE LOCAL (uncommitted, nao vai pro MR)
  M .harness/SCRUM_PROTOCOL.md / SCRUM_TASKS.json / sync.cjs
  M src/modules/pets/pages/PetFeed.jsx  (+ .v1.jsx, - .original.jsx)
  M src/pages/legal/LegalPageViewer.jsx
  ?? .harness/.autosync-cursor.json / autosync.cjs / install-hooks.cjs / .tmp-legal-docs/

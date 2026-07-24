# Contributing to Viralata

> **Welcome!** This document is for humans and AI agents who want to
> contribute to the Viralata project (a Brazilian pet adoption PWA).

## ⚠️ BEFORE YOU START

**Read first**: [`docs/AI_GUIDE/00-START-HERE.md`](docs/AI_GUIDE/00-START-HERE.md)

This is **mandatory reading**. It orients you on:
1. What the project is and its inviolable rules
2. How to navigate the documentation
3. Where to find modules, patterns, and conventions
4. How to code, test, commit, merge, and deploy
5. What to avoid (common pitfalls)
6. How to keep documentation up to date

After reading `00-START-HERE.md`, also read:
- `docs/AI_GUIDE/11-CORE-DIRECTIVES.md` — inviolable rules + engineering HOT
- `docs/AI_GUIDE/16-AGENT-ONBOARDING.md` — step-by-step onboarding

## Project Overview

**Viralata** is a Brazilian pet adoption PWA (React + Vite + Firebase).
It connects people and NGOs that have pets for adoption with interested
adopters. UI in Portuguese (pt-BR), mobile-first, low-connectivity.

- **Live**: https://viralata.web.app
- **Stack**: React 18, Vite 6.4, Firebase, React Query 5, Tailwind 3, shadcn/ui
- **Code of conduct**: be respectful, no emojis, document everything

## Quick Start

```bash
# 1. Clone
git clone https://github.com/fsalamoni/viralata.git
cd viralata

# 2. Install
npm install

# 3. Configure .env (ask @fsalamoni for credentials)
cp .env.example .env
# Fill VITE_FIREBASE_* vars

# 4. Run dev server
npm run dev
# Open http://localhost:5173

# 5. Run tests
npx vitest run

# 6. Build
npx vite build
```

## Development Workflow

1. **Pick a task** from `.harness/SCRUM_TASKS.json` (or GitHub issues)
2. **Create a branch**: `git checkout -b feature/TASK-XXX`
3. **Read the relevant docs** (see `00-START-HERE.md` §1)
4. **Implement** with tests
5. **Validate locally**:
   ```bash
   npx vitest run
   npx vite build
   node scripts/validate-lucide-imports.mjs
   ```
6. **Update docs** (if you changed something)
7. **Commit** with descriptive message
8. **Push** + open PR
9. **After merge**: `node .harness/sync.cjs --fix`

## Code Style

- Follow `docs/AI_GUIDE/12-CODING-STANDARDS.md`
- No emojis in code or UI
- Use `lucide-react` for icons (validate with script)
- Use tokens (`bg-primary`, `text-foreground`), not raw Tailwind colors
- All writes go through service + Firestore rules (defense-in-depth)
- All features behind feature flags (admin-controlled)

## Testing

- **Runtime tests** for critical components (`*.runtime.test.jsx`)
- **Service tests** for all business logic
- **Hook tests** for React Query hooks
- **Schema tests** for Zod schemas
- See `docs/AI_GUIDE/08-TESTING.md` for patterns

## PWA / Service Worker

- **ALWAYS** bump SW (vN → vN+1) when changing UI
- Update `vite.config.js`, `registerPwa.js`, `cleanupStaleCaches.js`
- See `docs/AI_GUIDE/06-PWA-CACHE.md`

## SCRUM

- **Regra A**: Run `node .harness/sync.cjs --fix` after every merge
- **Regra B**: Run `node .harness/sync.cjs --check` every ~10 tasks
- See `docs/AI_GUIDE/10-SCRUM.md`

## Commit Messages

Use conventional commits:
```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update docs
chore(scope): maintenance task
refactor(scope): code refactor
test(scope): add tests
```

Include `TASK-XXX` in the message when applicable.

## Pull Request Process

1. **Tests pass** locally (`npx vitest run`)
2. **Build passes** locally (`npx vite build`)
3. **PR title** includes `TASK-XXX` if applicable
4. **PR description** explains:
   - What changed
   - Why
   - How to test
   - Screenshots (if UI)
5. **CI passes** (lint, test, build)
6. **SQUASH MERGE** (not merge commit)
7. **Auto-deploy** triggers on push to main

## Deployment

- Push to `main` triggers `.github/workflows/deploy.yml`
- Deploys to Firebase Hosting (viralata.web.app)
- See `docs/AI_GUIDE/09-DEPLOY.md`

## Documentation

**Every change must update corresponding docs.**

| Changed... | Update... |
|-----------|-----------|
| Schema Firestore | `02-DATA-MODEL.md` |
| New route | `04-PAGES-ROUTES.md` |
| Architecture | `01-ARCHITECTURE.md` |
| Design token | `05-DESIGN-SYSTEM.md` |
| Business rule | `11-CORE-DIRECTIVES.md` |
| New decision | `13-DECISIONS.md` (with D-*) |
| Bug fix | `15-RECENT-FIXES.md` |
| New module | `03-MODULES.md` + `modules/<NN>-<NAME>.md` |
| Workflow | `09-DEPLOY.md` or `10-SCRUM.md` |

## Common Pitfalls

- ❌ Forgetting to bump SW → users see stale bundle
- ❌ Adding icon to JSX without import → `is not defined` in prod
- ❌ Skipping runtime tests → variables undefined go unnoticed
- ❌ Using `console.log` → noisy prod console
- ❌ Using emojis → forbidden by user
- ❌ `window.location.reload()` during user interaction → destroys UX
- ❌ Mixing `import` and `require` in tests → suite breaks
- ❌ Updating `pet_seq` → breaks pet immutable ID

## Getting Help

1. Check `docs/AI_GUIDE/14-TROUBLESHOOTING.md`
2. Check `docs/AI_GUIDE/15-RECENT-FIXES.md`
3. Check `docs/AI_GUIDE/13-DECISIONS.md`
4. Ask in GitHub issues

## License

Private project. All rights reserved.

## Maintainer

- **fsalamoni** (human maintainer)
- **Mavis** (AI agent, root session)

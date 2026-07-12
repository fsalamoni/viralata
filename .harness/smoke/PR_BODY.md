## wt/e79e15ca @ 03f6a5c (4 commits ahead of main 5da437b)

### Smoke

- typecheck: PASS (`tsc -p ./jsconfig.json --noEmit`, 0 errors)
- build:     PASS (`vite build`, 17.43s, PWA precache 112 entries / 4290.13 KiB)
- test:      2 FAIL | 1359 PASS (62/64 files)
  - same root cause in 2 files:
    - `src/modules/shelter/services/exhibitionService.test.js`
    - `src/modules/shelter/domain/operational/exhibition.test.js`
  - `formatExhibitionDateTime('2026-08-01T14:30:00.000Z')` returns `01/08/2026 11:30` (expected `14:30`) — helper formats as UTC, ignores `America/Sao_Paulo` (TZ off-by-3h)
  - tracked as follow-up TASK (to be filed in next sync)

### What's in this branch

- feat(harness+legal+shelter): TASK-126..130 autosync + smart detection + git hooks
  - `.harness/sync.cjs`: smart commit detection (TASK-XXX/RISK-XXX in messages), quiet mode, integrity check accepts RISK-XXX in blockedBy, `behind-main` category
  - `.harness/autosync.cjs`: daemon polling `mavis communication messages` to ingest TASK-XXX / RISK-XXX / MR#N into task history. Cursor persisted at `.autosync-cursor.json`. Semantic detection (verifier-pass/fail, report-delivered, producer-no-go, fixes-delivered)
  - `.harness/install-hooks.cjs`: one-shot pre-commit (`sync --check`) + post-merge (`sync --fix`) hook installer
  - `.harness/SCRUM_PROTOCOL.md` v1.0 → v1.3 (new §13.7, §14)
- feat(harness): TASK-061+062 — `sync.cjs` + SCRUM_PROTOCOL §13 auto-sync baseline
- fix(orgs+shelter): TASK-068+069+104+105 — defensive coding + single acceptance dialog
  - `CreateClub.jsx`, `OrganizationAdminPanel.jsx`, `FostersList.jsx`, `AdoptionFormFill.jsx`: null-safe guards
  - `SingleAcceptanceDialog.jsx` (new): unified legal acceptance flow
- docs(shelter): TASK-076 — DELIVERABLE.md refresh

### Diff stat

15 files changed, +6464 / -252

### Feature flag

No new SHELTER_* flag introduced by these commits (all defensive/infra/legal).

### Worktree

- branch: `wt/e79e15ca`
- pushed: `origin/wt/e79e15ca` (up-to-date)
- bundle: `index-mNd972GK.js` (per 03f6a5c footer)

### Composition with sibling worktree

- this branch: `mavis communication → JSON` (TASK/RISK/MR# ingestion into SCRUM_TASKS.json)
- sibling `wt/legal-v2`: `JSON → HTML` (renders dashboard / report)
- together: end-to-end pipeline (comm in → JSON mid → HTML out)

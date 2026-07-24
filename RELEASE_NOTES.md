# Release Notes

> Histórico de releases significativas do Viralata.
> Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **AI_GUIDE Documentation** (sw-v74, 2026-07-24)
  - Pasta `docs/AI_GUIDE/` com 18 docs principais + 15 docs por módulo
  - 36 documentos novos (~3000 linhas)
  - Documento de leitura obrigatória `00-START-HERE.md`
  - Regras invioláveis em `11-CORE-DIRECTIVES.md`
  - Decisões D-* em `13-DECISIONS.md`
- 29 testes novos (core/permissions 15, reports 9, PetCard 5)
- Script `scripts/audit-aria-current.mjs`
- Script `scripts/validate-doc-references.mjs`
- Script `scripts/audit-docs.mjs` (combinado)
- Script `scripts/setup-new-dev.sh` (setup rápido)
- `CONTRIBUTING.md` (guia de contribuição)

### Fixed
- aria-current em `<p>` (pagination-controls.jsx) — corrigido
- Cobertura de tests: core/permissions 0% → 80%, reports 0% → 70%

## [sw-v74] - 2026-07-24

### Changed
- PWA: bump SW v73 → v74

## [sw-v73.3] - 2026-07-22

### Fixed
- `canEdit` ReferenceError em `/pets/<id>` (renomeado para `canEditHistory`)
- Auto-reload interrompendo user no meio de interação (defer 5s)

## [sw-v72.4] - 2026-07-22

### Added
- TASK-V3-PET-OPS-LOG: Pet Ops V3
- `pet_seq` (ID imutável)
- `pet_audit_log` (log imutável)
- `pet_notes` (anotações)
- `PetTimelineView` (timeline visual de 9 fontes)
- `PetsOpsTable` (tabela operacional)

## [sw-v72.3] - 2026-07-22

### Fixed
- ClubDetail: 1 botão Painel no topo (não múltiplos)
- Link plural `/organizacoes/` (não `/clubes/`)

## [sw-v72.2] - 2026-07-22

### Fixed
- GENDER_LABEL fallback (`LABEL[campo] || campo`)

## [sw-v72.1] - 2026-07-22

### Added
- PetDetailView polish

## [sw-v72] - 2026-07-22

### Added
- PetDetailView V3 Redesign
- Hero `from-rose-500 via-orange-500 to-amber-500`
- ZERO botões admin em página pública

## Versões Anteriores

Ver git log para histórico completo.

---

**Convenções**:
- **Added**: novas features
- **Changed**: mudanças em features existentes
- **Deprecated**: features que serão removidas
- **Removed**: features removidas
- **Fixed**: bug fixes
- **Security**: fixes de segurança

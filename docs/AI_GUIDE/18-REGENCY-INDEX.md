# 18-REGENCY-INDEX.md — Índice de Specs V3 (REGENCY)

> **Atualizado em 2026-07-24**
>
> Cada `REGENCY_*.md` documenta a especificação completa de uma feature
> V3 (terceira geração) do Viralata.

## §1. Specs V3 por Módulo

| Módulo | Spec | Status | PR | SW |
|--------|------|--------|----|----|
| Pets (V3 Redesign) | `docs/REGENCY_PET_DETAIL_V3.md` | Done | #194 | sw-v72 |
| Pets (V3 Polish) | (sw-v72.1) | Done | #195 | sw-v72.1 |
| Pets (V3 Gender) | (sw-v72.2) | Done | #196 | sw-v72.2 |
| Pets (V3 Ops) | `docs/REGENCY_PET_OPS_V3.md` | Done | #198 | sw-v72.4 |
| Organizations | (sw-v72.3) | Done | #197 | sw-v72.3 |
| Partners | (TASK-027) | Done | - | sw-v62 |
| Communities | (TASK-V3) | Done | - | - |
| Shelter | (TASK-V3) | Done | - | - |
| Admin | (TASK-V3) | Done | - | - |

## §2. Onde Estão as Specs

```
docs/
├── REGENCY_*.md     # Specs V3 (~14KB cada)
├── V3_*_QUESTIONS.md # Q&A por feature V3
└── AI_GUIDE/
    ├── 18-REGENCY-INDEX.md (este)
    └── modules/
        └── <NN>-<NAME>.md # Doc por módulo
```

## §3. REGENCY_PET_DETAIL_V3

**Status**: Done (sw-v72)
**PR**: #194
**Tamanho**: ~12KB

**O que tem**:
- Spec completa do redesign do PetDetailView
- Hero, layout, decisões de UX
- D-PET-PUBLIC-V2-HERO
- D-PET-PUBLIC-V2-SEM-ADMIN

## §4. REGENCY_PET_OPS_V3

**Status**: Done (sw-v72.4)
**PR**: #198
**Tamanho**: ~14KB

**O que tem**:
- Spec completa do sistema Pet Ops
- 3 novas tabs (Log, Notes, Timeline)
- PetsOpsTable (kanban de pets da ONG)
- D-PET-SEQ-IMMUTABLE
- D-PET-LOG-IMMUTABLE
- D-PET-LOG-PER-CHANGE
- D-PET-NOTES-AUTHOR-DELETE
- D-HASH-ROUTER-PET-TABS

## §5. Quando Criar uma Spec REGENCY

Ao iniciar uma feature V3:

1. Criar `docs/REGENCY_<NAME>_V3.md`
2. Incluir:
   - Contexto
   - Objetivos
   - UX/UI (wireframes ASCII, hero, etc)
   - Dados (schema, campos)
   - Regras de negócio
   - Firestore rules
   - Testes
   - Critérios de aceitação
3. Adicionar entrada em `18-REGENCY-INDEX.md`

## §6. V3_*_QUESTIONS

Q&A por feature V3. Formato:

```md
# V3_<NAME>_QUESTIONS

## P: <pergunta>?
R: <resposta>

## P: <outra pergunta>?
R: <outra resposta>
```

**Localização**: `docs/V3_*_QUESTIONS.md`

## §7. Outras Specs Úteis

| Spec | Descrição |
|------|-----------|
| `docs/REGENCY_*` (todas) | Specs V3 (acima) |
| `docs/ROADMAP.md` | Roadmap do projeto (fases) |
| `docs/AGENTS_CHANGELOG.md` | Histórico de mudanças |
| `docs/CHANGELOG.md` | Changelog técnico |
| `docs/AUDITS/AUDIT_FULL_*.md` | Relatórios de auditoria |

## §8. Como Navegar

1. Quer entender uma feature V3? → Leia `docs/REGENCY_<NAME>_V3.md`
2. Tem dúvida sobre V3? → Leia `docs/V3_<NAME>_QUESTIONS.md`
3. Quer saber roadmap? → Leia `docs/ROADMAP.md`
4. Quer saber mudanças? → Leia `docs/AGENTS_CHANGELOG.md`

---

**Próxima leitura**: `modules/01-PETS.md` (doc do módulo pets).

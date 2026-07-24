# AI_GUIDE/ — Documentação-Guia do Projeto Viralata

> **Esta pasta é o GUIA OFICIAL para qualquer IA ou desenvolvedor**
> que for trabalhar no projeto. Leia `00-START-HERE.md` PRIMEIRO.

## Estrutura

```
docs/AI_GUIDE/
├── 00-START-HERE.md              ★ LEITURA OBRIGATÓRIA
├── 01-ARCHITECTURE.md            Camadas, Firebase, PWA
├── 02-DATA-MODEL.md              Schema Firestore completo
├── 03-MODULES.md                 Mapa dos 15 módulos
├── 04-PAGES-ROUTES.md            79 rotas documentadas
├── 05-DESIGN-SYSTEM.md           Tokens, cores, tipografia
├── 06-PWA-CACHE.md               Service Worker, hotfixes
├── 07-FIRESTORE-RULES.md         Regras + helpers
├── 08-TESTING.md                 Padrões de teste
├── 09-DEPLOY.md                  CI/CD, GitHub Actions
├── 10-SCRUM.md                   Regras SCRUM
├── 11-CORE-DIRECTIVES.md         ★ REGRAS INVIOLÁVEIS
├── 12-CODING-STANDARDS.md        Padrões de código
├── 13-DECISIONS.md               Decisões D-*
├── 14-TROUBLESHOOTING.md         Problemas comuns
├── 15-RECENT-FIXES.md            Últimos 30 dias
├── 16-AGENT-ONBOARDING.md        Onboarding novo dev/IA
├── 17-AUDIT-2026-07-23.md        Relatório varredura completa
├── 18-REGENCY-INDEX.md           Índice de REGENCY_*.md
├── 19-FAQ-AND-MISTAKES.md        FAQ + armadilhas comuns
├── 20-FIRESTORE-SECURITY.md      Boas práticas segurança
├── EXAMPLE_FEATURE_V3.md         Exemplo real de feature
├── TEMPLATE_REGENCY.md           Template para novos specs
├── INDEX.md                      Este arquivo
├── README.md                     Sobre esta pasta
├── modules/                      Docs por feature (15)
│   ├── 01-PETS.md
│   ├── 02-ORGANIZATIONS.md
│   ├── 03-COMMUNITIES.md
│   ├── 04-SHELTER.md
│   ├── 05-ADMIN.md
│   ├── 06-PARTNERS.md
│   ├── 07-USERS.md
│   ├── 08-CHAT.md
│   ├── 09-NOTIFICATIONS.md
│   ├── 10-REPORTS.md
│   ├── 11-ADOPTER.md
│   ├── 12-ADOPTION.md
│   ├── 13-CONTRACTS.md
│   ├── 14-INTERVIEW.md
│   └── 15-ONBOARDING.md
└── diagrams/                     Diagramas de arquitetura
    └── architecture.md            10 diagramas Mermaid
```

## Como Usar

### Para um dev/IA NOVO no projeto

1. Ler `00-START-HERE.md` (este te orienta)
2. Ler `11-CORE-DIRECTIVES.md` (regras invioláveis)
3. Ler `16-AGENT-ONBOARDING.md` (passo-a-passo)
4. Ler `01-ARCHITECTURE.md` (visão geral)
5. Rodar `./scripts/setup-new-dev.sh` (setup automático)

### Para uma TASK específica

1. Verificar `00-START-HERE.md` §1 (mapa de leitura por tipo)
2. Ler docs relevantes
3. Ver `19-FAQ-AND-MISTAKES.md` (armadilhas comuns)
4. Ver `EXAMPLE_FEATURE_V3.md` (se for feature nova)
5. Implementar
6. Atualizar docs (ver `00-START-HERE.md` §10)
7. Validar (`node scripts/audit-docs.mjs`)
8. Commit + push + deploy

### Para DEBUGAR

1. Verificar `14-TROUBLESHOOTING.md` (problema comum)
2. Verificar `15-RECENT-FIXES.md` (fix recente)
3. Verificar `19-FAQ-AND-MISTAKES.md` (FAQ)
4. Verificar `13-DECISIONS.md` (decisão similar)
5. Verificar `20-FIRESTORE-SECURITY.md` (se for security)

### Para ADICIONAR NOVA FEATURE

1. Ver `EXAMPLE_FEATURE_V3.md` (walkthrough completo)
2. Usar `TEMPLATE_REGENCY.md` (se for V3 spec)
3. Aplicar boas práticas de `20-FIRESTORE-SECURITY.md`
4. Testar com `08-TESTING.md` (padrões)
5. Bump SW (ver `06-PWA-CACHE.md`)

## Convenções da Pasta

- **Nomes em MAIÚSCULAS numeradas** (00-..., 01-..., ...) para ordem de leitura
- **Cada doc é auto-contido** mas referencia outros
- **Sempre atualizado** após mudanças relevantes
- **Markdown** puro (sem HTML excessivo)
- **Links relativos** entre docs
- **Diagramas** em Mermaid (renderizam no GitHub)
- **Exemplos reais** em arquivos EXAMPLE_*.md

## Quem mantém

- **Mavis** (AI agent, root session)
- **fsalamoni** (human maintainer)
- Última atualização: 2026-07-24

## Estatísticas

- **Total docs**: 25 (22 + 3 meta)
- **Total módulos**: 15 docs por feature
- **Total diagramas**: 10 Mermaid
- **Total linhas**: ~4500+
- **Cobre**: 100% do projeto (arquitetura, código, testes, deploy)
- **Validações automatizadas**: 4 scripts (audit-docs combina 3)
- **Tests passing**: ~1730+

## Scripts Úteis

```bash
# Setup novo dev
./scripts/setup-new-dev.sh

# Validar tudo (3 auditorias)
node scripts/audit-docs.mjs

# Gerar changelog
node scripts/generate-changelog.mjs

# Validar imports lucide
node scripts/validate-lucide-imports.mjs

# Auditar aria-current
node scripts/audit-aria-current.mjs

# Validar refs em docs
node scripts/validate-doc-references.mjs
```

## Links Rápidos

- [00-START-HERE.md](00-START-HERE.md) — começo
- [11-CORE-DIRECTIVES.md](11-CORE-DIRECTIVES.md) — regras invioláveis
- [16-AGENT-ONBOARDING.md](16-AGENT-ONBOARDING.md) — onboarding
- [19-FAQ-AND-MISTAKES.md](19-FAQ-AND-MISTAKES.md) — armadilhas
- [20-FIRESTORE-SECURITY.md](20-FIRESTORE-SECURITY.md) — segurança
- [EXAMPLE_FEATURE_V3.md](EXAMPLE_FEATURE_V3.md) — exemplo prático
- [TEMPLATE_REGENCY.md](TEMPLATE_REGENCY.md) — template
- [diagrams/architecture.md](diagrams/architecture.md) — diagramas

---

**Mantenha este diretório atualizado** ao modificar o projeto.
Ver `00-START-HERE.md` §10 para workflow completo.

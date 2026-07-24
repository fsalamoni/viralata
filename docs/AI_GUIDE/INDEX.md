# AI_GUIDE/ — Documentação-Guia do Projeto Viralata

> **Esta pasta é o GUIA OFICIAL para qualquer IA ou desenvolvedor**
> que for trabalhar no projeto. Leia `00-START-HERE.md` PRIMEIRO.

## Estrutura

```
docs/AI_GUIDE/
├── 00-START-HERE.md          ★ LEITURA OBRIGATÓRIA
├── 01-ARCHITECTURE.md        Camadas, Firebase, PWA
├── 02-DATA-MODEL.md          Schema Firestore completo
├── 03-MODULES.md             Mapa dos 15 módulos
├── 04-PAGES-ROUTES.md        79 rotas documentadas
├── 05-DESIGN-SYSTEM.md       Tokens, cores, tipografia
├── 06-PWA-CACHE.md           Service Worker, hotfixes
├── 07-FIRESTORE-RULES.md     Regras + helpers
├── 08-TESTING.md             Padrões de teste
├── 09-DEPLOY.md              CI/CD, GitHub Actions
├── 10-SCRUM.md               Regras SCRUM
├── 11-CORE-DIRECTIVES.md     ★ REGRAS INVIOLÁVEIS
├── 12-CODING-STANDARDS.md    Padrões de código
├── 13-DECISIONS.md           Decisões D-*
├── 14-TROUBLESHOOTING.md     Problemas comuns
├── 15-RECENT-FIXES.md        Últimos 30 dias
├── 16-AGENT-ONBOARDING.md    Onboarding novo dev/IA
├── 17-AUDIT-2026-07-23.md    Relatório varredura completa
├── 18-REGENCY-INDEX.md       Índice de REGENCY_*.md
├── INDEX.md                  Este arquivo
├── README.md                 Sobre esta pasta
├── modules/                  Docs por feature (15)
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
└── diagrams/                 Diagramas de arquitetura
```

## Como Usar

### Para um dev/IA NOVO no projeto

1. Ler `00-START-HERE.md` (este te orienta)
2. Ler `11-CORE-DIRECTIVES.md` (regras invioláveis)
3. Ler `16-AGENT-ONBOARDING.md` (passo-a-passo)
4. Ler `01-ARCHITECTURE.md` (visão geral)

### Para uma TASK específica

1. Verificar `00-START-HERE.md` §1 (mapa de leitura por tipo)
2. Ler docs relevantes
3. Implementar
4. Atualizar docs se mudou algo
5. Commit + push + deploy

### Para DEBUGAR

1. Verificar `14-TROUBLESHOOTING.md` (problema comum)
2. Verificar `15-RECENT-FIXES.md` (fix recente)
3. Verificar `13-DECISIONS.md` (decisão similar)

## Convenções da Pasta

- **Nomes em MAIÚSCULAS numeradas** (00-..., 01-..., ...) para ordem de leitura
- **Cada doc é auto-contido** mas referencia outros
- **Sempre atualizado** após mudanças relevantes
- **Markdown** puro (sem HTML excessivo)
- **Links relativos** entre docs

## Quem mantém

- **Mavis** (AI agent, root session)
- **fsalamoni** (human maintainer)
- Última atualização: 2026-07-24

## Estatísticas

- **Total docs**: 18 + 15 modules = 33 arquivos
- **Total linhas**: ~3000 (estimado)
- **Cobre**: 100% do projeto (arquitetura, código, testes, deploy)

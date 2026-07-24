# AI_GUIDE/

Documentação-guia oficial do projeto Viralata. Esta pasta existe para
que **qualquer IA ou desenvolvedor consiga trabalhar no projeto sem
começar do zero**.

## O que esta pasta faz

1. **Orienta leitura**: `00-START-HERE.md` indica qual doc ler em cada
   situação
2. **Documenta arquitetura**: camadas, módulos, rotas, design system
3. **Documenta decisões**: por que algo é como é (D-*)
4. **Documenta processos**: SCRUM, deploy, testes
5. **Documenta troubleshooting**: como resolver problemas comuns
6. **Documenta fixes recentes**: para evitar reintroduzir bugs
7. **Documenta onboarding**: como começar a contribuir

## Por que existe

Antes desta pasta:
- Documentação espalhada em vários lugares
- Sem guia "leia X antes de Y"
- Decisões importantes se perdiam
- Novos devs/IA tinham que explorar o código todo

Agora:
- Tudo organizado em `docs/AI_GUIDE/`
- 18 documentos principais + 15 docs por módulo
- Ordem de leitura clara
- Decisões preservadas (D-*)
- Fixes recentes visíveis (15-RECENT-FIXES.md)

## Estrutura

Ver `INDEX.md` para lista completa.

## Manutenção

Esta pasta é **mantida ativamente**. Toda mudança significativa no
projeto DEVE ser refletida aqui:

| Mudou... | Atualizar... |
|----------|--------------|
| Schema Firestore | `02-DATA-MODEL.md` |
| Arquitetura (nova camada) | `01-ARCHITECTURE.md` |
| Token de design | `05-DESIGN-SYSTEM.md` |
| Rota nova | `04-PAGES-ROUTES.md` |
| Regra de negócio nova | `11-CORE-DIRECTIVES.md` |
| Decisão arquitetural | `13-DECISIONS.md` |
| Bug fix novo | `15-RECENT-FIXES.md` |
| Problema recorrente | `14-TROUBLESHOOTING.md` |
| Workflow novo | `09-DEPLOY.md` ou `10-SCRUM.md` |

## Como contribuir

1. Identificar a doc correta
2. Editar (preferir `memory_edit` ou `edit` tool)
3. Atualizar a data no topo do doc
4. Commitar + push + deploy
5. Sincronizar SCRUM

## Contato

- **Maintainer**: Mavis (AI) + fsalamoni (human)
- **Última revisão**: 2026-07-24

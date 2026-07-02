# docs/ — Base de conhecimento (para IA e humanos)

Documentação de referência da plataforma **Viralata** (adoção responsável de
pets), escrita para que qualquer pessoa — ou IA — entenda a estrutura e o
funcionamento com o **mínimo de tokens/leitura**, sem precisar varrer o
código.

## Ordem de leitura

1. **[`AI_CONTEXT.md`](./AI_CONTEXT.md)** — documento-mestre. Leia primeiro:
   o que é, stack, arquitetura, papéis, rotas, dados, notificações, deploy e
   convenções, tudo condensado.
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — camadas, estado, design system,
   Firebase, PWA, testes, CI/CD e padrões de código.
3. **[`DATA_MODEL.md`](./DATA_MODEL.md)** — coleções Firestore, campos,
   relacionamentos e princípios das regras de segurança.
4. **[`MODULES.md`](./MODULES.md)** — o que cada módulo faz, arquivos-chave,
   fluxos e o mapa rota → módulo.
5. **[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)** — identidade visual: paleta,
   tipografia, padrões de layout e efeitos de movimento/scroll.
6. **[`ROADMAP.md`](./ROADMAP.md)** — histórico do plano de execução por
   fases (design system e limpeza concluídos; follow-ups funcionais
   conhecidos e não implementados ficam na Fase 3).

> O `README.md` da raiz cobre funcionalidades para o usuário final, como rodar
> e publicar. Estes docs cobrem **estrutura e funcionamento interno**.

## Como manter atualizado

Ao mudar **arquitetura, coleções Firestore, rotas ou papéis**, atualize o doc
correspondente (e o `AI_CONTEXT.md` se afetar o panorama). Mantenha o texto
**denso e factual** — o objetivo é custo baixo de leitura.
</content>

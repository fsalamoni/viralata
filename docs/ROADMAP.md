# Roadmap — Viralata

> Plano de organização do desenvolvimento por fases. Ver
> `docs/DESIGN_SYSTEM.md` para o fundamento visual detalhado por trás das
> Fases 0 e 1 abaixo. Este documento é o plano — nada aqui foi implementado
> ainda, é o ponto de partida para as próximas sessões/colaboradores.

## Contexto

A plataforma já tem paridade funcional com os dois documentos de
planejamento originais (arquitetura 100% Firebase, com Cloud Functions
pontuais onde há gatilho de servidor). O que falta agora não é
funcionalidade — é **consistência visual**: o app funciona bem, mas parece
"genérico" porque a maior parte das páginas ignora o sistema de design
tokens que já existe no projeto (ver diagnóstico completo em
`docs/DESIGN_SYSTEM.md`). Este roadmap organiza o trabalho de design e os
follow-ups funcionais conhecidos em fases sequenciais, para que qualquer
colaborador possa pegar um lote e executá-lo sem precisar rediscutir
decisões de design a cada página.

## O que já está entregue

Núcleo do negócio: Radar de Pets (Cloud Function), avaliações pós-adoção,
planilha de gestão de pets para ONGs (pets podem pertencer a uma
organização), permissão granular "editar pets" no clube.

Confiança e transparência: QR Code de doação + CNPJ na página da
organização, compartilhamento social do pet (imagem "story" com QR),
LGPD (consentimento no onboarding, exportar dados, excluir conta),
páginas institucionais (Termos, Legislação, Política de Privacidade
corrigida).

Administração e monetização: status "em processo" na adoção + notificação
aos demais interessados, multi-espécie (coelhos e pássaros), Super Admin
(banir usuário, excluir organização, dashboard de métricas com gráficos),
espaço de anúncios (`AdSlot`, placeholder controlado por feature flag).

## Fase 0 — Fundação de design (pré-requisito de tudo)

Objetivo: provar a nova identidade visual em um recorte pequeno antes de
propagar para o resto do app.

1. Aplicar a paleta terracota/creme/oliva de `docs/DESIGN_SYSTEM.md` em
   `src/index.css` (mesmos nomes de variável, só novos valores).
2. Instalar `framer-motion`.
3. Redesenhar o shell (`src/components/Layout.jsx`): header glass sticky,
   nav com pill ativo, logo em gradiente.
4. Reescrever `src/pages/Home.jsx` como vitrine da nova identidade (hero
   assimétrico com foto real + blob orgânico, sem emoji gigante).
5. Estabelecer o padrão definitivo de `PetCard.jsx` (hover-lift, chip de
   vidro, sombra colorida) — vira a referência para os demais cards do app.

**Critério de pronto**: Home e o feed de pets (`PetFeed`) 100% no novo
padrão, revisados visualmente pelo usuário antes de propagar para as
demais ~28 páginas — evita retrabalho em massa se algo precisar mudar.

## Fase 1 — Propagação do design

Aplicar o mesmo receituário (tokens + cards + motion sutil) no restante do
app, em lotes independentes entre si:

- **Lote A — Pets**: `PetDetail`, `CreatePet`, `MyPets`, `RadarSettings`.
- **Lote B — Organizações**: `ClubsDirectory`, `ClubDetail`, `CreateClub`
  (já usam o sistema de tokens, só precisam de repaletagem — menor esforço
  que os demais lotes).
- **Lote C — Perfil, Onboarding, Chat**: `Profile`, `OnboardingQuestionnaire`,
  `ChatPage`.
- **Lote D — Institucional e Admin**: `Terms`, `Legislation`,
  `PrivacyPolicy`, todas as páginas `/admin/*`.

Cada lote: `npm run build` + navegação manual das rotas do lote antes de
seguir para o próximo.

## Fase 2 — Limpeza e consistência

1. Remover o código órfão do produto anterior (ver lista completa na seção
   10 de `docs/DESIGN_SYSTEM.md`): `Landing.jsx`, `AdminTournaments.jsx`,
   `AthleteProfile.jsx`, `AthletesDirectory.jsx`, funções de torneio em
   `adminService.js`.
2. Atualizar `docs/MODULES.md` e `docs/ARCHITECTURE.md` — hoje ainda
   descrevem o produto anterior (torneios/atletas de pickleball), não a
   Viralata.
3. Auditoria de sanidade: `grep` por cor hardcoded (`orange-500`,
   `bg-gray-50` etc.) fora dos tokens, para garantir que nada ficou de fora
   da migração.

## Fase 3 — Follow-ups funcionais conhecidos

Itens já identificados como reduções de escopo ou limitações explícitas em
entregas anteriores, para retomar quando fizer sentido:

- Integração real de rede de anúncios no `AdSlot` (hoje só o placeholder
  estrutural — depende de uma conta de ads real, fora do escopo executável
  sem essa informação).
- Permissões granulares adicionais do clube (`view_reports`,
  `manage_team`, `reply_chat`), além da já implementada `edit_pets`.
- Dark mode completo com switch (os tokens `.dark` já existem em
  `index.css`, mas não são usados hoje — despriorizado nesta rodada).
- CMS de conteúdo institucional via Markdown, caso decidam trocar os
  componentes JSX estruturados atuais das páginas legais.

## Como usar este roadmap

- Cada fase é sequencial; dentro da Fase 1, os lotes são independentes e
  podem ser distribuídos entre colaboradores diferentes.
- Verificação padrão por lote/fase: `npm test -- --run`, `npm run build`,
  checagem visual manual das rotas tocadas; se alguma mudança tocar
  `firestore.rules` (não previsto nas Fases 0–2, que são puramente
  visuais), validar no emulador local antes de commitar — mesmo método já
  usado nas entregas anteriores.
- Commits pequenos e coerentes por lote, com mensagem descritiva, seguindo
  o padrão já usado no histórico do repositório.

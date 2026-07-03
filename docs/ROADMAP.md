# Roadmap — Viralata

> Plano de organização do desenvolvimento por fases. Ver
> `docs/DESIGN_SYSTEM.md` para o fundamento visual detalhado por trás das
> Fases 0 e 1 abaixo. **Fases 0 e 1 (todos os lotes) e o núcleo funcional da
> Fase 3 (módulo de Organizações completo + filtro de raio no Feed) estão
> entregues** — ver "O que já está entregue" abaixo. O que resta é a
> limpeza de código órfão da Fase 2 e os itens residuais da Fase 3.

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
filtro de localização e raio (5/10/25/50/100 km) no Feed — o raio ajusta o
texto de resumo, filtro real de distância ainda depende de geocoding (ver
Fase 3).

Confiança e transparência: QR Code de doação + CNPJ na página da
organização, compartilhamento social do pet (imagem "story" com QR),
LGPD (consentimento no onboarding, exportar dados, excluir conta),
páginas institucionais (Termos, Legislação, Política de Privacidade
corrigida).

Administração e monetização: status "em processo" na adoção + notificação
aos demais interessados, multi-espécie (coelhos e pássaros), Super Admin
(banir usuário, excluir organização, dashboard de métricas com gráficos),
espaço de anúncios (`AdSlot`, placeholder controlado por feature flag).

**Módulo de Organizações (redesign completo)**: `/comunidade` é o
diretório/perfil público (o que antes vivia em `/organizacoes`, sem mudar
de comportamento); `/organizacoes` é o hub de gestão ("Minhas
organizações" / "Descobrir outras"), com painel de administração dedicado
em `/organizacoes/:id/admin` (abas Visão Geral, Animais, Mural, Doações,
Prestação de Contas, Equipe, Configurações, cada uma condicionada à
permissão do usuário — ver `domain/permissions.js`). Rotas e links de
notificações antigos continuam funcionando via redirect.
- **Permissões granulares**: proprietário (`clubs.created_by`) sempre com
  as 5 permissões (`animals`, `finance`, `donations`, `feed`, `team`),
  travado na UI; administradores herdam tudo por padrão e podem ser
  restringidos por permissão individual — substitui o antigo `edit_pets`
  único, com compatibilidade retroativa.
- **Planilha de animais em massa**: edição inline (já existia) + "baixar
  planilha modelo" (.xlsx) + "importar planilha" (.xlsx/.csv/.json) com
  deduplicação pelo ID do animal, contadores de novos/duplicados/erros,
  decisão por item (manter/substituir) e confirmação seletiva.
- **Chamados de doação**: campanhas com meta/arrecadado/prazo, registro
  manual de valores recebidos, marcação como concluída ao atingir 100%.
- **Prestação de contas**: lançamentos de receita/despesa por categoria,
  filtro de período (mensal/semestral/anual), totais e proporção por
  categoria em BRL.

## Fase 0 — Fundação de design (pré-requisito de tudo) ✅ concluída

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

## Fase 1 — Propagação do design ✅ concluída (todos os lotes)

Aplicar o mesmo receituário (tokens + cards + motion sutil) no restante do
app, em lotes independentes entre si:

- **Lote A — Pets**: `PetDetail`, `CreatePet`, `MyPets`, `RadarSettings`. ✅
- **Lote B — Organizações**: `ClubsDirectory`, `ClubDetail`, `CreateClub`
  (já usam o sistema de tokens, só precisam de repaletagem — menor esforço
  que os demais lotes). ✅
- **Lote C — Perfil, Onboarding, Chat**: `Profile`, `OnboardingQuestionnaire`,
  `ChatPage`. ✅
- **Lote D — Institucional e Admin**: `Terms`, `Legislation`,
  `PrivacyPolicy`, todas as páginas `/admin/*`. ✅

Cada lote: `npm run build` + navegação manual das rotas do lote antes de
seguir para o próximo.

Novas páginas introduzidas depois desta fase (`OrganizationsHub`,
`OrganizationAdminPanel` e as abas `ClubTeamTab`/`ClubDonationsTab`/
`ClubFinanceTab`) já nasceram no padrão de tokens — não precisam de lote
próprio.

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
- Dark mode completo com switch (os tokens `.dark` já existem em
  `index.css`, mas não são usados hoje — despriorizado nesta rodada).
- CMS de conteúdo institucional via Markdown, caso decidam trocar os
  componentes JSX estruturados atuais das páginas legais.
- **Geocoding real para o filtro de raio do Feed**: hoje `PetFeed` filtra
  por igualdade exata de cidade (`petService.getAvailablePets({ city })`);
  os chips de raio (5–100 km) só ajustam o texto de resumo. Filtro de
  distância de verdade precisa de lat/lng por pet (Geocoding API ou base
  de cidades) + geohash no Firestore para query eficiente por proximidade.
- **Parser assistido por LLM na importação de planilha de animais**: hoje
  a importação (`domain/petImport.js`) mapeia colunas por nome (com alias
  PT/EN) — cobre `.xlsx`/`.csv`/`.json` estruturados no formato do modelo,
  mas não tenta inferir colunas livres/fora do padrão. Ver nota de
  segurança abaixo antes de expandir o parser.
- **`xlsx` (SheetJS) via npm está fixo em 0.18.5**, com CVEs conhecidos
  (prototype pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`)
  não corrigidos nessa versão publicada no registry — os patches só saem
  no CDN próprio do SheetJS. Mitigado hoje limitando o uso da lib a
  `.xlsx` (o único formato que exige parsing binário; `.csv`/`.json` usam
  parsers próprios sem dependência) e mantendo o parsing 100% client-side,
  sem tocar em dado de outro usuário. Revisar quando o SheetJS publicar
  uma versão corrigida no npm, ou migrar para instalação via tarball do
  CDN deles se a política de rede do time permitir.
- **Chamados de doação sem visibilidade pública**: por ora `club_campaigns`
  só aparece no painel de administração (fiel ao protótipo). Considerar
  expor as campanhas ativas também no perfil público da organização
  (`/comunidade/:id`) para viabilizar doação real, não só acompanhamento
  interno.
- Bottom tab bar fixa no mobile (o protótipo original pede header
  compacto + tab bar fixa; o app hoje usa o menu mobile em dropdown já
  existente do `Layout.jsx` — funcionalmente equivalente, mas não é o
  mesmo padrão visual do handoff).

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

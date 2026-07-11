# Roadmap — Viralata

> Plano de organização do desenvolvimento por fases. Ver
> `docs/DESIGN_SYSTEM.md` para o fundamento visual detalhado por trás das
> Fases 0 e 1 abaixo. **Fases 0, 1 e 2 estão concluídas, e a maior parte da
> Fase 3 também** — ver "O que já está entregue" abaixo. O que resta na
> Fase 3 depende de decisão externa (conta de ads real) ou é limitação
> estrutural documentada (cobertura de cidades do filtro de raio, CVE do
> `xlsx` sem patch no npm).

## Roadmap paralelo: Sistema de Gestão do Abrigo

Em paralelo ao roadmap acima, está em andamento o **Sistema de Gestão do
Abrigo** — a grande evolução da plataforma pra transformá-la num hub
completo de gestão da causa animal. Ver
**[`docs/SHELTER_MGMT_ROADMAP.md`](./SHELTER_MGMT_ROADMAP.md)** para o
plano detalhado (22 fases, 5 macro-blocos, ~25-40 dias de trabalho).

Status atual (2026-07-11):

| Fase | Nome | Status | PR |
|---|---|---|---|
| 0 | Preparação (renomeação + skeleton) | ✅ Concluída | #37 |
| 1 | Cadastro Único do Animal | ✅ Concluída | #38, #39 |
| 2 | Timeline do Animal | ✅ Concluída | #40 |
| 3 | Workflow de Adoção | ✅ Concluída | #41 |
| 4 | Perfil Completo do Adotante | ✅ Concluída | #42 |
| 5 | Google Forms webhook (canal opt-in) | ✅ Concluída | #43, #44, #46, #47 |
| 6 | Pós-Adoção com CRON de materialização | ✅ Concluída | #48 |
| 7 | Lares Temporários (Fosters) | ✅ Concluída | #49 |
| 8 | Prontuário Médico (Health Records) | ✅ Concluída | #50 |
| 9 | Gestão de Medicamentos | ✅ Concluída | #51 |
| 10 | Galeria de Fotos (soft delete + purge 30d) | ✅ Concluída | #52 |
| 11 | Vitrines / Eventos | ✅ Concluída | #56 (workflow V1) |
| 12 | Escalas + RSVP de Vitrines | ✅ Concluída | (parte do #56) |
| 13 | Gestão de Voluntários | ✅ Concluída | #54 |
| 14 | Dashboard do Abrigo (tempo real) | ✅ Concluída | #61 |
| 15 | Central de Pendências (Kanban) ⚠️ GRANDE | 🟡 PR aberto | #63 |
| 16 | Relatórios de Abrigos | 🟡 PR aberto | #64 |
| 17 | Indicadores de Vitrines + Voluntários | 🟡 PR aberto | #65 |
| 18 | Busca Inteligente ⚠️ GRANDE | 🚨 Decisão pendente (Meilisearch vs Typesense vs Algolia vs Firestore) | — |
| 19 | Termos e Políticas completos (Legal) ⚠️ GRANDE | ✅ Concluída | #58 |
| 20 | Segurança Avançada | ✅ Concluída | #62 |
| 21 | Painel de Saúde da Plataforma (Admin Master) | ✅ Concluída | #60 |
| 22 | Migração Final + Cutover | ⏸️ Aguardando | — |

**18/22 fases concluídas** (0–14 ✅, 19 ✅, 20 ✅, 21 ✅; 15–18 ⏸️, 22 ⏸️). Último commit: `7440da8` (fix functions vitest).

Convenções: ✅ concluído · 🟡 em andamento · ⏸️ aguardando · ❌ bloqueado. Cada fase = 1 feature flag (`SHELTER_*`) default OFF. Módulo isolado em `src/modules/shelter/`. Princípios: schema evolutivo, dual-read/write durante migração, defense in depth, audit log de tudo.

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
filtro de localização e raio (5/10/25/50/100 km) no Feed com distância
real via haversine para as ~70 cidades da tabela de
`pets/domain/geoDistance.js` (fora dela, cai para filtro de texto exato —
ver Fase 3).

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

## Fase 2 — Limpeza e consistência ✅ concluída

1. ~~Remover o código órfão do produto anterior~~ — os arquivos listados
   originalmente aqui (`Landing.jsx`, `AdminTournaments.jsx`,
   `AthleteProfile.jsx`, `AthletesDirectory.jsx`) já não existiam mais no
   código (removidos em sessão anterior a esta). O que sobrava de fato
   órfão era `organizationService.js` + as coleções `organizations`/
   `organization_members`/`organization_reports` em `firestore.rules` (um
   segundo modelo de organização, nunca conectado a nenhuma rota/UI,
   substituído por `clubs`/`club_members`) — confirmado via grep e
   removido. Também corrigidas as últimas referências reais ao produto
   anterior fora de docs: cache do service worker (`public/sw.js`), baseURL
   padrão do Playwright e o teste e2e `tests/e2e/public-routes.spec.js`
   (testava título "Pickleball" e rotas que não existem mais).
2. `docs/MODULES.md`, `docs/ARCHITECTURE.md`, `docs/AI_CONTEXT.md` e
   `docs/README.md` reescritos para descrever a Viralata real (stack,
   módulos, rotas, modelo de dados atuais) em vez do produto de torneios.
3. Auditoria de sanidade (`grep` por cor hardcoded fora dos tokens):
   encontrou e corrigiu 4 páginas que nunca tinham passado por nenhum lote
   da Fase 1 — `Login.jsx`, `BannedNotice.jsx`, `PageNotFound.jsx` e a
   moldura de `CreateReport.jsx` (o documento imprimível/PDF em si
   permanece neutro de propósito — é para impressão, não é UI do app).
   Cores `emerald-*` em componentes de UI compartilhados (`badge.jsx`
   variant `success`, `AuditLogTable`, uploads/anexos, switch) foram
   deixadas como estão: é uma paleta "sucesso" semântica separada da marca,
   não um resíduo do produto anterior — mudar isso é uma decisão de design
   à parte, não uma limpeza.
4. **Bônus não previsto nesta fase**: a auditoria também encontrou o sino de
   notificações completamente quebrado (contador de não lidas sempre zero
   por um hook mal-desestruturado, tipos de notificação de organização
   gravando `undefined` por chaves inexistentes no enum, e nenhuma UI para
   de fato ler as notificações — só um link morto para `/perfil#notificacoes`).
   Corrigido: `NotificationsMenu.jsx` é o painel dropdown real do sino.

## Fase 3 — Follow-ups funcionais conhecidos

Itens já identificados como reduções de escopo ou limitações explícitas em
entregas anteriores. Os quatro que dependiam só de trabalho de produto já
foram resolvidos; o que resta depende de decisão externa (conta de ads,
política de rede do time) ou é uma limitação estrutural documentada:

- ~~Geocoding real para o filtro de raio do Feed~~ ✅ — `PetFeed` agora
  filtra por distância de verdade (fórmula de haversine) quando a cidade
  digitada está na tabela estática de coordenadas de
  `domain/geoDistance.js` (70 cidades: capitais + principais regiões
  metropolitanas). **Limitação que permanece**: cidade fora da tabela cai
  de volta para o filtro de texto exato (aviso explícito na tela, não
  finge precisão que não existe); cobertura completa de todos os
  municípios do Brasil exigiria uma API de geocoding paga ou uma base
  completa + geohash no Firestore.
- ~~Chamados de doação sem visibilidade pública~~ ✅ — campanhas ativas
  agora aparecem no perfil público da organização (`/comunidade/:id`),
  não só no painel de administração.
- ~~Bottom tab bar fixa no mobile~~ ✅ — adicionada em `Layout.jsx`,
  aditiva ao menu hambúrguer existente (que continua cobrindo os itens
  que não cabem nos 5 slots da barra).
- Integração real de rede de anúncios no `AdSlot` (hoje só o placeholder
  estrutural — depende de uma conta de ads real, fora do escopo executável
  sem essa informação).
- Dark mode completo com switch (os tokens `.dark` já existem em
  `index.css`, mas não são usados hoje — despriorizado nesta rodada).
- CMS de conteúdo institucional via Markdown, caso decidam trocar os
  componentes JSX estruturados atuais das páginas legais.
- **Parser assistido por LLM na importação de planilha de animais**: hoje
  a importação (`domain/petImport.js`) mapeia colunas por nome (com alias
  PT/EN) — cobre `.xlsx`/`.csv`/`.json` estruturados no formato do modelo,
  mas não tenta inferir colunas livres/fora do padrão.
- **`xlsx` (SheetJS) via npm está fixo em 0.18.5**, com CVEs conhecidos
  (prototype pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`)
  não corrigidos nessa versão publicada no registry — os patches só saem
  no CDN próprio do SheetJS. Mitigado hoje limitando o uso da lib a
  `.xlsx` (o único formato que exige parsing binário; `.csv`/`.json` usam
  parsers próprios sem dependência) e mantendo o parsing 100% client-side,
  sem tocar em dado de outro usuário. Revisar quando o SheetJS publicar
  uma versão corrigida no npm, ou migrar para instalação via tarball do
  CDN deles se a política de rede do time permitir.

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

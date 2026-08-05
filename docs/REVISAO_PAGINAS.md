# Revisão de Páginas — Personas V4

Documento de acompanhamento da revisão página a página, por persona/acesso.
Mantém a organização do trabalho de adequação das páginas ao modelo de
personas V4 (ver `docs/PLAN_PERSONAS_V4.md` e `docs/PERSONA_CAPABILITIES.md`).

**Legenda de status:** ⬜ pendente · 🔄 em andamento · ✅ revisada

---

## Acesso: Abrigo (persona `shelter_staff`)

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Entrada do abrigo | `/entrar/abrigo` | `src/pages/onboarding/ShelterEntry.jsx` | ✅ | Lista os abrigos do usuário como primeiras opções de ingresso; abaixo, "inserir código" e "criar novo abrigo"; ambos funcionais. Topbar sem Painel/Pets/Mural e sem indicação de abrigo (só o switch) nesta página de gateway. |
| Painel do abrigo | `/organizacoes/:orgId/admin` | `OrganizationAdminPanel.{v1,v3}.jsx` | 🔄 | Item 7 aplicado (sem "voltar para a ONG"/"ver página pública" no acesso de abrigo). Falta revisão detalhada de abas/ferramentas por permissão. |
| Página pública do abrigo | `/organizacoes/:orgId` | `ClubDetail.{v1,v3}.jsx` | 🔄 | Item 4 aplicado (sem atalho "Painel" com V4 on). Revisão pública ainda pendente. |
| Diretório de abrigos | `/organizacoes` | `ClubsDirectory.jsx` | 🔄 | Item 4/6 aplicados (código só no acesso de abrigo; filtro cidade/raio). Revisão fina pendente. |

## Acesso: Comunidade (persona `community_staff`)

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Entrada da comunidade | `/entrar/comunidade` | `src/pages/onboarding/CommunityEntry.jsx` | ⬜ | Aplicar os mesmos ajustes do abrigo (lista de comunidades do usuário + código + criar; topbar de gateway). |
| Painel da comunidade | `/comunidade/:id/admin` | `CommunityAdminPanel.{v1,v3}.jsx` | 🔄 | Item 7 aplicado. Revisão detalhada pendente. |
| Página pública da comunidade | `/comunidade/:id` | `CommunityDetail.{v1,v3}.jsx` | ⬜ | |
| Diretório de comunidades | `/comunidade` | `CommunitiesDirectory.jsx` | 🔄 | Item 5/6 aplicados. Revisão fina pendente. |

## Acesso: Adotante (persona `adopter`)

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Feed | `/feed` | — | ⬜ | |
| Busca | `/busca` | `SearchPage.jsx` | ⬜ | |

## Acesso: Doador (persona `donor`)

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Meus pets | `/meus-pets` | — | ⬜ | |
| Cadastro de pet | `/pets/new` | — | ⬜ | |

## Acesso: Voluntário (persona `volunteer`)

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Inscrição de voluntário | `/voluntarios/seja` | `VolunteerSignup.jsx` | ⬜ | |
| Painel do voluntário | `/perfil/voluntario` | — | ⬜ | |

## Transversais

| Página | Rota | Arquivo | Status | Observações |
|---|---|---|---|---|
| Landing | `/` | `Home.{v1,v3}.jsx` + `PersonaEntryGrid.jsx` | ✅ | Portas de entrada por acesso (item 1); admin master só para o admin. |
| Seleção de acesso | `/acesso` | `PersonaSelection.jsx` | 🔄 | Conteúdo por persona (item 3). Topbar de gateway a revisar. |
| Switcher (topbar) | — | `PersonaSwitcher.jsx` | ✅ | Só mostra os acessos do próprio usuário (item 8). |

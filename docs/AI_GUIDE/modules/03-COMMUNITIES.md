# Module 03 — Communities (Comunidades)

> Comunidades independentes de usuários. Mural, fórum, eventos.

## §1. Visão Geral

**Path**: `src/modules/communities/`
**Linhas**: ~3000
**Tests**: 104

## §2. Funcionalidades

### §2.1. Diretório (`/comunidades`)

- Lista de comunidades
- Filtros: type (public, private, invite-only)
- Cards com cover, nome, member count

### §2.2. Detalhe (`/comunidades/:id`)

- Cover, descrição
- Mural (posts)
- Fórum (tópicos)
- Membros

### §2.3. Fórum (`/comunidades/:id/forum/:topicId`)

- Tópico com replies
- Markdown suportado
- Tags

### §2.4. Mural criar (`/comunidades/:id/mural/criar`)

- Form com text + media
- Posts podem ter imagens/vídeos

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `CommunitiesDirectory.jsx` | Diretório |
| `CommunityDetail.v3.jsx` | Detalhe |
| `CommunityCard.jsx` | Card |
| `CommunityForumTopic.jsx` | Tópico do fórum |
| `MuralCreate.jsx` | Criar post |
| `MyCommunities.jsx` | Minhas comunidades |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `communityService.js` | CRUD de comunidade |
| `communityMemberService.js` | Membros |
| `muralService.js` | Posts do mural |
| `forumService.js` | Tópicos + replies |
| `communityPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useCommunity` | Query |
| `useCommunities` | Lista |
| `useMyCommunities` | Minhas comunidades |
| `useCommunityMembers` | Membros |
| `useMural` | Posts do mural |
| `useForum` | Tópicos do fórum |

## §6. Schema

Ver `02-DATA-MODEL.md` §2.7.

---

**Próximo módulo**: `modules/04-SHELTER.md`

# HOOKS

> Referência de todos os hooks customizados da Viralata. Organizado por módulo.
> Para padrões de uso, veja `docs/ARCHITECTURE.md`.

## Convenções

- **React Query**: hooks de dados (`useXxx`) usam `useQuery`/`useMutation`. Loading/Error via `isLoading`/`isError`/`error` do react-query — não repetir estado local.
- **Retorno**: sempre `{ data, isLoading, isError, error, refetch }` para queries; `{ mutate, mutateAsync, isPending }` para mutations.
- **Arquitetura**: `pages → hooks → services → domain`. Hooks nunca chamam Firestore direto — passam por services.
- **Segurança**: qualquer hook de escrita deve verificar permissões antes de mutar.

---

## `src/core/hooks/`

### `useAuth()`
Retorna o contexto de autenticação Firebase.
```js
const { user, userProfile, isAuthenticated, isLoading } = useAuth();
```
- `user`: `firebase.User` ou null
- `userProfile`: doc `users/{uid}` do Firestore ou null
- `isAuthenticated`: boolean
- ⚠️ Não confunde `user` (Firebase) com `userProfile` (Firestore doc). Sempre usar `userProfile` para dados de domínio.

### `useColorMode()`
Retorna e controla o tema claro/escuro.
```js
const { colorMode, toggleColorMode } = useColorMode();
```
- `colorMode`: `'light' | 'dark'`
- ⚠️ Não persiste no Firestore — usa localStorage apenas. Se o user limpar dados do site, volta para light.

### `useFeedPreferences()`
Preferências de feed do adotante (animais compatíveis, raças, porte, UF).
```js
const { data: prefs, update, isSaving } = useFeedPreferences();
```
- ⚠️ Pode sobrescrever preferências existentes. Sempre fazer merge: `{ ...current, ...updates }`.

### `useUiPreferences()`
Preferências de UI do usuário (tema, notificação por email).
```js
const { data: prefs, update, isSaving } = useUiPreferences();
```

### `useRateLimit(key, limit, windowMs)`
Rate limiting client-side para ações.
```js
const { isAllowed, recordAction } = useRateLimit('create-pet', 5, 60000);
```
- ⚠️ É client-side only — não protege contra múltiplos browsers/dispositivos. Segurança real no `firestore.rules`.

### `useReducedMotionSafe()`
Respeita `prefers-reduced-motion`.
```js
const shouldAnimate = useReducedMotionSafe(); // boolean
```

---

## `src/modules/pets/hooks/`

### `usePets({ clubId?, filters? })`
Lista pets (disponíveis ou de um abrigo específico).
```js
const { data: pets = [], isLoading } = usePets({ clubId: 'xyz' });
```

### `usePetShareImage(petId)`
Gera imagem de compartilhamento do pet.
```js
const { generateImage, isGenerating } = usePetShareImage(petId);
```

### `usePetPermissions(petId)`
Retorna permissões do usuário sobre um pet.
```js
const { canEdit, canDelete } = usePetPermissions(petId);
```
- ⚠️ Verifica só `isOwner`/`isClubAdmin` — não valida ownership no Firestore.

---

## `src/modules/organizations/hooks/`

### `useClubs()`
Lista todos os clubes.
```js
const { data: clubs = [] } = useClubs();
```

### `useClub(id)`
Fetch único clube por ID.
```js
const { data: club, isLoading } = useClub('club-id');
```
- ⚠️ Retorna null se ID vazio (habilita com `enabled: !!id`).

### `useMyMembership(clubId)`
Membership do user atual no clube.
```js
const { data: membership } = useMyMembership(clubId);
```

### `useClubPosts(clubId)`
Posts do mural do clube.
```js
const { data: posts = [] } = useClubPosts(clubId);
```

### `useClubDonations(clubId)`
Chamados de doação do clube.
```js
const { data: donations = [] } = useClubDonations(clubId);
```

### `useClubLedger(clubId)`
Lançamentos financeiros do clube.
```js
const { data: entries = [] } = useClubLedger(clubId);
```

### `useClubChatThreads(clubId)` / `useClubChatMessages(threadId)`
Chat do clube.
```js
const { data: threads = [] } = useClubChatThreads(clubId);
const { data: messages = [] } = useClubChatMessages(threadId);
```

### `useClubForum(clubId)`
Threads do fórum do clube.
```js
const { data: threads = [] } = useClubForum(clubId);
```

### `useClubLedgerCategories(clubId)`
Categorias de lançamento financeiro.
```js
const { data: categories = [] } = useClubLedgerCategories(clubId);
```

---

## `src/modules/shelter/hooks/`

### `useDashboard(shelterClubId)`
Métricas agregadas do abrigo.
```js
const { data: metrics } = useDashboard(shelterClubId);
```

### `useKanban(clubId)`
Boards + columns do Kanban.
```js
const { data: boards = [] } = useKanban(clubId);
```

### `useCards(clubId, boardId)`
Cards de um board específico.
```js
const { data: cards = [] } = useCards(clubId, boardId);
```

### `useExhibitions(shelterClubId, filters?)`
Vitrines do abrigo.
```js
const { data: exhibitions = [] } = useExhibitions(shelterClubId, { status: 'active' });
```

### `useMedicalRecords(petId, shelterClubId, filters?)`
Prontuário médico do pet.
```js
const { data: records = [] } = useMedicalRecords(petId, shelterClubId, { type: 'vaccine' });
```

### `useMedications(petId, shelterClubId, filters?)`
Medicações do pet.
```js
const { data: meds = [] } = useMedications(petId, shelterClubId, { status: 'active' });
```

### `useTimeline(petId, shelterClubId)`
Linha do tempo de eventos do pet.
```js
const { data: events = [] } = useTimeline(petId, shelterClubId);
```

### `useFosters(shelterClubId, filters?)`
Lar temporário (Foster).
```js
const { data: fosters = [] } = useFosters(shelterClubId, { status: 'active' });
```

### `useVolunteerProfile(volunteerId)`
Perfil do voluntário.
```js
const { data: profile } = useVolunteerProfile(volunteerId);
```

### `useVolunteerParticipations(volunteerId)`
Participações de voluntário.
```js
const { data: participations = [] } = useVolunteerParticipations(volunteerId);
```

### `useVolunteerMetrics(shelterClubId)`
Métricas de voluntariado.
```js
const { data: metrics } = useVolunteerMetrics(shelterClubId);
```

### `useVolunteerAssignment(shelterClubId)`
Atribuições de voluntário.
```js
const { data: assignments = [] } = useVolunteerAssignment(shelterClubId);
```

### `useVolunteerCertificate(certificateId)`
Certificado de voluntário.
```js
const { data: cert } = useVolunteerCertificate(certificateId);
```

### `useAdoptionApplications(petId)`
Candidaturas de adoção.
```js
const { data: applications = [] } = useAdoptionApplications(petId);
```

### `useAdopterProfile()`
Perfil do adotante logado.
```js
const { data: profile } = useAdopterProfile();
```

### `useAdopterDashboard()`
Dashboard do adotante.
```js
const { data: dashboard } = useAdopterDashboard();
```

### `useMyPostAdoptionTasks()`
Tasks de pós-adoção do adotante.
```js
const { data: tasks = [] } = useMyPostAdoptionTasks();
```

### `useReports(shelterClubId)`
Relatórios do abrigo.
```js
const { data: reports = [] } = useReports(shelterClubId);
```

### `useShelterLedger(shelterClubId)`
Livro razão do abrigo.
```js
const { data: ledger = [] } = useShelterLedger(shelterClubId);
```

### `useShelterDonations(shelterClubId)`
Doações do abrigo.
```js
const { data: donations = [] } = useShelterDonations(shelterClubId);
```

### `useShelterOnboarding(shelterClubId)`
Onboarding do abrigo.
```js
const { data: onboarding } = useShelterOnboarding(shelterClubId);
```

### `useSmartSearch(shelterClubId, query)`
Busca inteligente de pets.
```js
const { data: results = [] } = useSmartSearch(shelterClubId, 'cachorro');
```

### `useTermsAcceptance()`
Aceite de termos.
```js
const { data: acceptance } = useTermsAcceptance();
```

### `useGallery(shelterClubId)`
Galeria de fotos do abrigo.
```js
const { data: gallery = [] } = useGallery(shelterClubId);
```

### `useIndicators(shelterClubId)`
Indicadores do abrigo.
```js
const { data: indicators } = useIndicators(shelterClubId);
```

### `useGoogleFormsConfig(shelterClubId)`
Config de integração Google Forms.
```js
const { data: config } = useGoogleFormsConfig(shelterClubId);
```

### `useShelterAnimalProfile(petId)`
Perfil animal do abrigo.
```js
const { data: profile } = useShelterAnimalProfile(petId);
```

---

## `src/modules/communities/hooks/`

### `useCommunity(id)`
Fetch comunidade por ID.
```js
const { data: community } = useCommunity('community-id');
```

### `useCommunityMembers(communityId)`
Membros da comunidade.
```js
const { data: members = [] } = useCommunityMembers(communityId);
```

### `useCommunityEvent(communityId, eventId)`
Evento de comunidade.
```js
const { data: event } = useCommunityEvent(communityId, eventId);
```

### `useCommunityEventRsvps(eventId)`
RSVPs de evento de comunidade.
```js
const { data: rsvps = [] } = useCommunityEventRsvps(eventId);
```

---

## `src/modules/chat/hooks/`

### `useChat()`
Chat global/privado.
```js
const { threads, messages, sendMessage } = useChat();
```
- ⚠️ Usa `onSnapshot` para realtime — cleanup via `useEffect return () => unsubscribe()`.

---

## `src/modules/notifications/hooks/`

### `useNotifications()`
Notificações do usuário.
```js
const { data: notifications = [] } = useNotifications();
```

### `useFCMRequest()`
Requisição de permissão FCM (push notifications).
```js
const { requestPermission, hasPermission } = useFCMRequest();
```

---

## Armadilhas Conhecidas

| Hook | Armadilha | Correção |
|------|-----------|----------|
| `useAuth()` | `user` vs `userProfile` — user pode existir mas profile ainda carregando | Sempre verificar `userProfile` para dados de domínio |
| `useFeedPreferences()` | Pode sobrescrever prefs existentes | Sempre merge: `{ ...current, ...new }` |
| `useRateLimit()` | Client-side only — não protege contra múltiplos browsers | Segurança real no `firestore.rules` |
| Chat hooks | `onSnapshot` sem cleanup = memory leak | Sempre `return () => unsubscribe()` em useEffect |
| `useClub(id)` | Retorna null se `id` vazio | Verificar `enabled: !!id` |
| `useMyMembership(clubId)` | Pode retornar null se user não é membro | Verificar `membership?.role` antes de usar |

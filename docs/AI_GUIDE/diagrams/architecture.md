# Diagrama de Arquitetura

> Diagrama textual (Mermaid) da arquitetura do Viralata.

## §1. Camadas da Aplicação

```mermaid
graph TB
  subgraph "UI (React + Tailwind)"
    Pages[V1/V3 Pages]
    Components[60+ Components]
  end

  subgraph "Modules (15 features)"
    Pets[pets/]
    Orgs[organizations/]
    Communities[communities/]
    Shelter[shelter/]
    Admin[admin/]
    Others[10 outros]
  end

  subgraph "Core (shared)"
    Firebase[config/firebase]
    Hooks[hooks/]
    PWA[pwa/]
    Services[audit, error]
    Perms[permissions/]
  end

  subgraph "Firebase"
    Auth[Authentication]
    Firestore[(Firestore DB viralata)]
    Storage[Storage]
    Hosting[Hosting viralata.web.app]
    Functions[Cloud Functions]
  end

  Pages --> Components
  Components --> Modules
  Modules --> Core
  Core --> Firebase
  Modules --> Firestore
  Firestore -.->|Rules| Functions
```

## §2. Fluxo de Adoção

```mermaid
sequenceDiagram
  participant U as User
  participant App as React App
  participant FS as Firestore
  participant CF as Cloud Function
  participant N as Notifications

  U->>App: Acessa viralata.web.app
  App->>FS: Query pets (status=available)
  FS-->>App: Lista de pets
  U->>App: Clica em pet
  App->>FS: Get pet/<id>
  FS-->>App: Pet data
  U->>App: "Quero adotar"
  App->>FS: Create interest/
  FS-->>App: OK
  CF->>N: Notify ONG
  N->>App: Show notification
  ONG->>App: Approve interest
  App->>FS: Update interest (approved)
  CF->>FS: Create adoption/
  N-->>U: Notificação
```

## §3. Sistema de Pet Ops V3

```mermaid
graph LR
  Pet[Pet] -->|appendPetLog| Log[pet_audit_log]
  Pet --> VetVisits[pet_vet_visits]
  Pet --> Treatments[pet_treatments]
  Pet --> CareLog[pet_care_log]
  Pet --> Devolutions[pet_devolutions]
  Pet --> AdoptersHistory[pet_adopters_history]
  Pet --> Notes[pet_notes]
  Pet --> Photos[photo_urls]
  Pet --> Gallery[gallery]

  Log --> Timeline[pet_timeline]
  VetVisits --> Timeline
  Treatments --> Timeline
  CareLog --> Timeline
  Devolutions --> Timeline
  AdoptersHistory --> Timeline
  Notes --> Timeline
  Photos --> Timeline
  Gallery --> Timeline
```

## §4. Sistema de Permissões

```mermaid
graph TB
  User[User] -->|login| Auth[Firebase Auth]
  Auth --> Profile[users/<uid>]

  Profile -->|is_platform_admin=true| PlatformAdmin[Platform Admin]
  Profile -->|role=adopter| Adopter[Adopter]
  Profile -->|role=shelter| Shelter[Shelter User]

  Shelter --> Club[clubs/<clubId>/members/<uid>]
  Club -->|role=owner| Owner[Owner]
  Club -->|role=admin| Admin[Admin]
  Club -->|role=manager| Manager[Manager]
  Club -->|role=volunteer| Volunteer[Volunteer]

  Owner --> AllPerms[All Permissions]
  Admin --> MostPerms[Most Permissions]
  Manager --> SpecificPerms[Specific Permissions]
  Volunteer --> LimitedPerms[Limited Permissions]

  Adopter --> CanAdopt[Can create interest]
  Adopter --> CanView[Can view pets]
  Adopter --> CanReport[Can report abuse]
```

## §5. PWA / Service Worker

```mermaid
graph TB
  User[User Browser] -->|Load page| SW[Service Worker sw-v74.js]
  SW -->|Precache 211 entries| Cache[Cache Storage]
  SW -->|NetworkFirst for HTML| Network[Network]
  SW -->|CacheFirst for assets| Cache

  User -->|interagindo| Track[sessionStorage: pwa-stale-last-activity]
  Track -->|interacted < 5s| DeferReload[Defer reload 5s]
  Track -->|idle| ImmediateReload[Reload 50ms]
```

## §6. SCRUM Workflow

```mermaid
graph LR
  Backlog[backlog] --> Pending[pending]
  Pending --> Ready[ready]
  Ready --> InProgress[in_progress]
  InProgress --> PR[PR + Review]
  PR --> Merged[merged]
  Merged --> Sync[sync.cjs --fix]
  Sync --> Done[done]
  Done --> Deployed[deployed]
```

## §7. Camadas de Defesa (Defense-in-Depth)

```mermaid
graph TB
  UI[UI Layer] -->|esconde botões| Hook[Hook Layer]
  Hook -->|valida permissão| Service[Service Layer]
  Service -->|re-valida + ensureCanMutate| Rules[Firestore Rules]
  Rules -->|bloqueio final| FS[(Firestore)]
```

## §8. Module Architecture

```mermaid
graph LR
  Module[module/] --> Components[components/]
  Module --> Hooks[hooks/]
  Module --> Services[services/]
  Module --> Domain[domain/]
  Module --> Pages[pages/]
  Module --> Tests[__tests__/]
```

## §9. Deployment Pipeline

```mermaid
graph LR
  Local[Local code] -->|git push| GitHub[GitHub main]
  GitHub -->|trigger| GHA[GitHub Actions]
  GHA -->|lint| Lint[ESLint]
  GHA -->|test| Test[Vitest]
  GHA -->|build| Build[Vite Build]
  Build -->|sw-v74.js| Firebase[Firebase Hosting]
  Firebase -->|deploy| Live[viralata.web.app]
  Live -->|users| Users[End Users]
```

## §10. Documentation Map

```mermaid
graph TB
  StartHere[00-START-HERE.md] --> Core[11-CORE-DIRECTIVES.md]
  StartHere --> Arch[01-ARCHITECTURE.md]
  StartHere --> Data[02-DATA-MODEL.md]
  StartHere --> Modules[03-MODULES.md]
  StartHere --> Routes[04-PAGES-ROUTES.md]

  Modules --> Mod01[modules/01-PETS.md]
  Modules --> Mod02[modules/02-ORGANIZATIONS.md]
  Modules --> Mod03[modules/03-COMMUNITIES.md]
  Modules --> Mod04[modules/04-SHELTER.md]
  Modules --> Mod05[modules/05-ADMIN.md]
  Modules --> Mod06-15[... 10 outros]

  Core --> Decisions[13-DECISIONS.md]
  Core --> Standards[12-CODING-STANDARDS.md]
  Core --> Recent[15-RECENT-FIXES.md]
  Core --> Trouble[14-TROUBLESHOOTING.md]
```

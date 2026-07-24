# 12-CODING-STANDARDS.md — Padrões de Código, Convenções

> **Atualizado em 2026-07-24**

## §1. Nomenclatura

### §1.1. Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente | PascalCase.jsx | `PetCard.jsx` |
| Hook | camelCase.js (prefix `use`) | `usePet.js` |
| Service | camelCase.js (sufixo `Service`) | `petService.js` |
| Domain | camelCase.js | `petLog.js` |
| Test | `<original>.test.jsx` ou `<original>.test.js` | `PetCard.test.jsx` |
| Runtime test | `<original>.runtime.test.jsx` | `PetDetailV3.runtime.test.jsx` |
| Page V1 | `PascalCase.jsx` | `PetDetail.jsx` (wrapper) |
| Page V3 | `PascalCaseV3.jsx` | `PetDetailV3.jsx` |
| Page V3 admin | `PascalCaseAdmin.v3.jsx` | `ShelterAdminDashboard.v3.jsx` |
| Schema | camelCase.js | `pet.js` (Zod schemas) |
| Page index | `index.js` (em pages/) | `pages/index.js` |

### §1.2. Identificadores

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Variável | camelCase | `petName` |
| Constante | SCREAMING_SNAKE | `MAX_PETS_PER_PAGE` |
| Função | camelCase | `getPetById` |
| Componente React | PascalCase | `PetCard` |
| Hook | camelCase (prefix `use`) | `usePet` |
| Tipo (TS) | PascalCase | `Pet` |
| Interface (TS) | PascalCase (prefix `I` opcional) | `IPet` ou `Pet` |
| Enum | PascalCase | `PetStatus` |
| Constante de enum | SCREAMING_SNAKE | `PetStatus.ADOPTED` |
| Boolean | prefix `is/has/can/should` | `isLoading`, `hasPermission` |
| Async function | prefix `fetch/get/load` (opcional) | `fetchPetById` |

### §1.3. Paths

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Path (plural) | snake_case + plural | `pet_vet_visits` |
| Field | snake_case | `created_at` |
| ID | snake_case | `user_id` |
| Status | snake_case | `in_progress` |
| Action | snake_case | `pet_created` |

## §2. Estrutura de Componente

### §2.1. Padrão

```jsx
// 1. Imports externos
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';

// 2. Imports internos (sempre usar @ alias)
import { useAuth } from '@/core/hooks/useAuth';
import { getPet } from '@/modules/pets/services/petService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ErrorState';

// 3. Constantes
const MAX_DESCRIPTION_LENGTH = 500;
const STALE_TIME = 30_000;

// 4. Componente principal (export default)
export default function PetCard({ petId, onAdopt }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 5. Hooks
  const { data: pet, isLoading, error } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME,
  });
  
  // 6. Computed
  const canAdopt = useMemo(
    () => pet?.status === 'available' && user?.uid !== pet?.owner_id,
    [pet, user]
  );
  
  // 7. Handlers
  const handleAdopt = () => {
    if (onAdopt) onAdopt(pet);
    else navigate(`/quero-adotar/${pet.id}`);
  };
  
  // 8. Early returns
  if (isLoading) return <Skeleton className="w-full aspect-square" />;
  if (error || !pet) return <ErrorState title="Erro ao carregar" />;
  
  // 9. JSX
  return (
    <article className="rounded-md overflow-hidden shadow bg-card">
      <img src={pet.photo_url} alt={pet.name} className="w-full aspect-square object-cover" />
      <div className="p-3">
        <h3 className="font-semibold text-lg">{pet.name}</h3>
        <p className="text-sm text-muted-foreground">
          {pet.breed} • {pet.city}
        </p>
        {canAdopt && (
          <Button onClick={handleAdopt} className="mt-2 w-full">
            Quero adotar
          </Button>
        )}
      </div>
    </article>
  );
}
```

### §2.2. Props

```jsx
// ✅ Bom: destructuring + PropTypes-like comment
export default function PetCard({ petId, onAdopt, showStatus = true }) {
  // ...
}

// ❌ Ruim: props sem destructuring
export default function PetCard(props) {
  const petId = props.petId;
  // ...
}
```

### §2.3. Conditional Rendering

```jsx
// ✅ Bom: ternário para 2 casos
{canAdopt ? <Button>Adotar</Button> : null}

// ✅ Bom: && para uma condição
{canAdopt && <Button>Adotar</Button>}

// ❌ Ruim: 0 como boolean
{petCount && <Badge>{petCount}</Badge>}  // 0 não renderiza!

// ✅ Correto
{petCount > 0 && <Badge>{petCount}</Badge>}
```

### §2.4. Lists

```jsx
// ✅ Bom: key estável
{petList.map((pet) => <PetCard key={pet.id} petId={pet.id} />)}

// ❌ Ruim: key por index
{petList.map((pet, i) => <PetCard key={i} petId={pet.id} />)}

// ❌ Ruim: key faltando (warning)
{petList.map((pet) => <PetCard petId={pet.id} />)}
```

## §3. Estrutura de Service

### §3.1. Padrão

```js
// src/modules/pets/services/petService.js
import { doc, getDoc, collection, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { ensureCanMutatePet } from './petPermissions';
import { appendPetLog } from './petLogService';

export async function getPet(petId) {
  if (!db || !petId) return null;
  const snap = await getDoc(doc(db, 'pets', petId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listPets(filters = {}) {
  if (!db) return [];
  let q = query(collection(db, 'pets'), where('status', '==', 'available'));
  if (filters.species) q = query(q, where('species', '==', filters.species));
  if (filters.city) q = query(q, where('city', '==', filters.city));
  if (filters.limit) q = query(q, limit(filters.limit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createPet(input, actor) {
  if (!db) throw new Error('Firestore not available');
  
  const petRef = doc(collection(db, 'pets'));
  const data = {
    ...input,
    pet_seq: await getNextPetSeq(),  // Cloud Function
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: actor.uid,
    updated_by: actor.uid,
  };
  
  const batch = writeBatch(db);
  batch.set(petRef, data);
  await batch.commit();
  
  await appendPetLog(petRef.id, {
    action: 'pet_created',
    actor,
    target: { collection: 'pets', doc_id: petRef.id },
    details: { name: data.name },
  });
  
  return { id: petRef.id, ...data };
}

export async function updatePet(petId, input, actor) {
  if (!db) throw new Error('Firestore not available');
  
  await ensureCanMutatePet(petId, actor);  // ★ throw se sem permissão
  
  const data = {
    ...input,
    updated_at: serverTimestamp(),
    updated_by: actor.uid,
  };
  
  const batch = writeBatch(db);
  batch.update(doc(db, 'pets', petId), data);
  await batch.commit();
  
  await appendPetLog(petId, {
    action: 'pet_updated',
    actor,
    target: { collection: 'pets', doc_id: petId },
    details: { fields_changed: Object.keys(input) },
  });
}
```

### §3.2. Error Handling

```js
// ✅ Bom: erro descritivo
export async function createPet(input, actor) {
  if (!input?.name) throw new Error('pet.name is required');
  if (!input?.owner_id) throw new Error('pet.owner_id is required');
  // ...
}

// ✅ Bom: try/catch com contexto
try {
  await updateDoc(doc(db, 'pets', petId), data);
} catch (err) {
  logger.error('pet_update_failed', { petId, actor: actor.uid, error: err.message });
  throw new Error(`Failed to update pet ${petId}: ${err.message}`);
}
```

## §4. Estrutura de Hook

### §4.1. Padrão

```js
// src/modules/pets/hooks/usePet.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPet, listPets, createPet, updatePet } from '../services/petService';

const STALE_TIME = 30_000;

export function usePet(petId) {
  return useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME,
  });
}

export function usePetList(filters = {}) {
  return useQuery({
    queryKey: ['pet-list', filters],
    queryFn: () => listPets(filters),
    staleTime: STALE_TIME,
  });
}

export function useCreatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createPet(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pet-list'] });
      qc.setQueryData(['pet', data.id], data);
    },
  });
}

export function useUpdatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, input, actor }) => updatePet(petId, input, actor),
    onSuccess: (data, { petId }) => {
      qc.setQueryData(['pet', petId], data);
      qc.invalidateQueries({ queryKey: ['pet-list'] });
    },
  });
}
```

## §5. Formatação (Prettier)

Configuração padrão (em `.prettierrc`):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

```bash
# Formatar
npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,md}"

# Verificar
npx prettier --check "src/**/*.{js,jsx}"
```

## §6. ESLint

Configuração padrão (em `.eslintrc.json`):

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-var": "error",
    "eqeqeq": "error",
    "prefer-const": "warn",
    "react/prop-types": "off"
  }
}
```

```bash
# Lint
npm run lint

# Fix
npm run lint -- --fix
```

## §7. Imports (Ordem)

```jsx
// 1. Externos (libs)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internos absolutos (@ alias)
import { useAuth } from '@/core/hooks/useAuth';
import { Button } from '@/components/ui/button';

// 3. Internos relativos
import { getPet } from '../services/petService';
import { PetCard } from './PetCard';

// 4. Estilos (sempre por último)
import './MyPage.css';
```

## §8. CSS (Tailwind)

### §8.1. Ordem de classes (convencional)

```jsx
// 1. Layout (display, position, flex, grid)
className="flex flex-col items-center"

// 2. Box model (w, h, p, m)
className="w-full h-auto p-4 mt-2"

// 3. Background, border
className="bg-card rounded-md border"

// 4. Typography
className="text-lg font-semibold text-foreground"

// 5. Effects (shadow, opacity, transition)
className="shadow-md hover:shadow-lg transition"

// 6. States (hover, focus, active, disabled)
className="hover:bg-primary/90 focus-visible:ring-2"
```

### §8.2. Custom classes (cn helper)

```jsx
import { cn } from '@/core/lib/cn';

<button
  className={cn(
    'bg-primary text-primary-foreground rounded-md px-4 py-2',
    isLoading && 'opacity-50 cursor-not-allowed',
    isPrimary && 'shadow-md',
    'hover:bg-primary/90'
  )}
>
  {label}
</button>
```

## §9. Comentários

### §9.1. Quando comentar

```js
// ✅ Bom: explica "por quê"
// Use Cloud Function to atomically increment pet_seq
// (avoids race conditions with concurrent creates)
const petSeq = await getNextPetSeq();

// ✅ Bom: referencia issue/task
// TODO(Mavis, 2026-07-24): migrate to React Query
// Tracking: TASK-XXX

// ❌ Ruim: explica "o quê" (código já é claro)
// Increment counter
counter++;

// ❌ Ruim: comentário desatualizado
// Loop through 5 items  // (código tem 10)
```

### §9.2. JSDoc

```js
/**
 * Get pet by ID.
 * @param {string} petId - Pet document ID
 * @returns {Promise<Pet | null>} Pet object or null if not found
 * @throws {Error} If Firestore is not available
 */
export async function getPet(petId) {
  // ...
}
```

## §10. Async/Await

### §10.1. Padrão

```js
// ✅ Bom: try/catch com contexto
try {
  const pet = await getPet(petId);
  return pet;
} catch (err) {
  logger.error('get_pet_failed', { petId, error: err.message });
  throw err;
}

// ❌ Ruim: sem tratamento
const pet = await getPet(petId);
return pet;
```

### §10.2. Parallel vs Sequential

```js
// ✅ Parallel: independente
const [pet, owner, shelter] = await Promise.all([
  getPet(petId),
  getUser(pet.owner_id),
  getClub(pet.shelter_id),
]);

// ✅ Sequential: dependente
const pet = await getPet(petId);
const owner = await getUser(pet.owner_id);
```

## §11. Conditional Imports (Lazy)

```jsx
// ✅ Bom: lazy para features grandes
const PetDetailV3 = React.lazy(() => import('./PetDetailV3'));

// ✅ Bom: dynamic import para utilitários grandes
const { formatDate } = await import('date-fns');
```

## §12. Form Validation (Zod)

```js
import { z } from 'zod';

export const createPetSchema = z.object({
  name: z.string().min(2).max(50),
  species: z.enum(['dog', 'cat', 'other']),
  gender: z.enum(['male', 'female', 'unknown']),
  size: z.enum(['small', 'medium', 'large', 'extra-large']),
  city: z.string().min(2),
  state: z.string().length(2),
  owner_id: z.string().min(1),
});

// Validação
const result = createPetSchema.safeParse(input);
if (!result.success) {
  throw new Error(result.error.errors[0].message);
}
```

## §13. React Query Patterns

### §13.1. Query keys

```js
// ✅ Bom: array, hierárquico
['pet', petId]
['pet-list', filters]
['pet-log', petId, { limit: 50 }]

// ❌ Ruim: string concatenada
'pet_' + petId
```

### §13.2. Invalidation

```js
// ✅ Bom: invalidar prefix
qc.invalidateQueries({ queryKey: ['pet-list'] });

// ❌ Ruim: set manual
qc.setQueryData(['pet-list', {}], newList);
```

## §14. Performance

### §14.1. Memoization

```jsx
// ✅ useMemo: cálculo caro
const sortedPets = useMemo(
  () => pets.sort((a, b) => b.created_at - a.created_at),
  [pets]
);

// ✅ useCallback: função passada como prop
const handleAdopt = useCallback((pet) => {
  navigate(`/quero-adotar/${pet.id}`);
}, [navigate]);

// ✅ React.memo: componente puro
export default React.memo(PetCard);
```

### §14.2. Lazy + Suspense

```jsx
const PetDetailV3 = React.lazy(() => import('./PetDetailV3'));

<Suspense fallback={<Skeleton className="w-full h-screen" />}>
  <PetDetailV3 />
</Suspense>
```

## §15. Testes

Ver `08-TESTING.md` para padrões detalhados.

---

**Próxima leitura**: `13-DECISIONS.md` (decisões D-*).

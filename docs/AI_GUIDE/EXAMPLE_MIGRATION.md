# EXAMPLE_MIGRATION.md — Exemplo de Migration (Schema Change)

> **Atualizado em 2026-07-24**
>
> Walkthrough de um exemplo real: como adicionar novo campo a uma
> collection existente sem quebrar users antigos.

## §1. Contexto

User pediu: "Quero adicionar campo `priority_score` em pets para
destacar pets urgentes no feed. Pets urgentes devem ter badge
diferente."

## §2. Análise

### §2.1. O que sei

- `pets/{petId}` é a collection
- Pets existentes NÃO têm `priority_score`
- Novos pets DEVEM ter (com default 0)
- UI: badge "Urgente" se `priority_score > 0`

### §2.2. Riscos

1. **Pets antigos sem campo** → UI pode quebrar
2. **Index ausente** → query lenta
3. **Migration não roda** → comportamento inconsistente
4. **Rules bloqueiam** → user não consegue criar pet

### §2.3. Plano

1. Adicionar campo como **optional** (não required)
2. Default = 0 em todas as escritas (UI + service)
3. Migration script para setar 0 em pets existentes
4. Index composto (status, priority_score, created_at)
5. Rules allow (campos opcionais OK)
6. UI lida com undefined (treat as 0)
7. Atualizar docs (DATA_MODEL + DECISIONS)

## §3. Implementação

### §3.1. Schema Zod (optional)

```js
// src/modules/pets/domain/pet.js
import { z } from 'zod';

export const petSchema = z.object({
  // ... campos existentes
  priority_score: z.number().int().min(0).max(100).optional(),
  // ↑ optional, default = 0 na UI/service
});

// Em migrations
export const LEGACY_PET_DEFAULT = {
  priority_score: 0,
};
```

### §3.2. Service (default)

```js
// src/modules/pets/services/petService.js
import { LEGACY_PET_DEFAULT } from '../domain/pet';

export async function createPet(input, actor) {
  const data = {
    ...input,
    ...LEGACY_PET_DEFAULT,  // garante default
    pet_seq: await getNextPetSeq(),
    created_at: serverTimestamp(),
    // ...
  };
  // ...
}
```

### §3.3. UI (lê com fallback)

```jsx
// src/modules/pets/components/PetCard.jsx
export default function PetCard({ pet }) {
  const priority = pet.priority_score ?? 0;  // fallback para legacy
  
  return (
    <article>
      {/* ... */}
      {priority > 0 && (
        <Badge variant="destructive" className="absolute top-2 right-2">
          Urgente
        </Badge>
      )}
    </article>
  );
}
```

### §3.4. Migration script

```js
// scripts/migrate-priority-score.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const app = initializeApp(/* config */);
const db = getFirestore(app);

const MIGRATION_VERSION = '2026-07-24-priority-score';

async function migrate() {
  console.log('Starting migration: priority_score default 0');
  
  // Buscar pets sem priority_score
  const petsRef = collection(db, 'pets');
  const allPets = await getDocs(petsRef);
  
  let updated = 0;
  let skipped = 0;
  
  for (const petDoc of allPets.docs) {
    const data = petDoc.data();
    
    if (data.priority_score !== undefined) {
      skipped++;
      continue;
    }
    
    // Setar 0
    await updateDoc(doc(db, 'pets', petDoc.id), {
      priority_score: 0,
      migrated_at: serverTimestamp(),
      migration_version: MIGRATION_VERSION,
    });
    
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Updated ${updated} pets...`);
    }
  }
  
  console.log(`Migration done: ${updated} updated, ${skipped} skipped`);
}

migrate().catch(console.error);
```

### §3.5. Rodar migration

```bash
# Backup primeiro
firebase firestore:export gs://viralata-backups/2026-07-24

# Rodar
node scripts/migrate-priority-score.mjs

# Validar
node scripts/verify-migration.mjs  # opcional
```

### §3.6. Firestore Rule (optional OK)

```js
match /pets/{petId} {
  allow create: if /* ... */
    && request.resource.data.priority_score == null 
    || (request.resource.data.priority_score is int 
        && request.resource.data.priority_score >= 0 
        && request.resource.data.priority_score <= 100);
  
  // Update: qualquer valor válido
  allow update: if /* ... */
    && (request.resource.data.priority_score == null 
        || (request.resource.data.priority_score is int 
            && request.resource.data.priority_score >= 0 
            && request.resource.data.priority_score <= 100));
}
```

### §3.7. Index composto

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "pets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "priority_score", "order": "DESCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

```bash
firebase deploy --only firestore:indexes
```

### §3.8. Update feed query (opcional)

```js
// src/modules/pets/services/petService.js
export async function listPets(filters = {}) {
  let q = query(
    collection(db, 'pets'),
    where('status', '==', 'available')
  );
  
  // Ordenar por priority_score DESC, depois created_at DESC
  q = query(q, orderBy('priority_score', 'desc'), orderBy('created_at', 'desc'));
  
  // ...
}
```

## §4. Validação

### §4.1. Testes

```js
// src/modules/pets/services/petService.test.js
it('creates pet with default priority_score 0', async () => {
  const id = await createPet({ name: 'Rex', /* ... */ }, actor);
  // Verifica que foi gravado com priority_score: 0
});

it('legacy pet sem priority_score não quebra UI', () => {
  const legacyPet = { id: 'p1', name: 'Rex' /* sem priority_score */ };
  render(<PetCard pet={legacyPet} />);
  // Não deve mostrar badge "Urgente"
  expect(screen.queryByText('Urgente')).not.toBeInTheDocument();
});
```

### §4.2. Emulator

```bash
firebase emulators:start --only firestore
```

### §4.3. Staging

```bash
# Deploy rules + indexes
firebase deploy --only firestore:rules,firestore:indexes

# Rodar migration em staging
node scripts/migrate-priority-score.mjs

# Validar UI
# (abrir em browser)
```

## §5. Atualizar Docs

### §5.1. `02-DATA-MODEL.md`

```md
### §2.2. `pets/{petId}`

```typescript
{
  // ... campos existentes
  priority_score: number,  // 0-100, default 0, 0 = não urgente
  // ...
}
```

**Adicionado em**: 2026-07-24 (migration `2026-07-24-priority-score`)
```

### §5.2. `13-DECISIONS.md`

```md
### D-PET-PRIORITY-SCORE (2026-07-24)

**Contexto**: User pediu para destacar pets urgentes no feed.

**Decisão**: Adicionar campo `priority_score` (0-100, default 0).

**Implementação**:
- Campo **optional** com default 0
- Migration script para pets existentes
- Index composto (status, priority_score, created_at)
- UI fallback: `pet.priority_score ?? 0`

**Consequências**:
- Pets antigos sem campo são tratados como 0 (não urgente)
- Novos pets têm default 0
- Admin pode setar 1-100 para marcar como urgente
- Query otimizada com index
```

### §5.3. `15-RECENT-FIXES.md`

```md
### §X. Pet Priority Score (2026-07-24)

**Data**: 2026-07-24
**Severidade**: N/A (feature)
**Descrição**: Adicionado campo `priority_score` (0-100) em pets
para destacar pets urgentes.
**D-**: D-PET-PRIORITY-SCORE
**Arquivos**:
- src/modules/pets/domain/pet.js (schema)
- src/modules/pets/services/petService.js (default)
- src/modules/pets/components/PetCard.jsx (badge "Urgente")
- scripts/migrate-priority-score.mjs (NEW)
- firestore.indexes.json (index composto)
- firestore.rules (validação)
```

## §6. Checklist Pré-Deploy

- [ ] Schema Zod atualizado
- [ ] Service tem default
- [ ] UI tem fallback (?? 0)
- [ ] Migration script testado em emulator
- [ ] Migration script rodável em produção
- [ ] Firestore Rule atualizada
- [ ] Index composto criado
- [ ] Testes adicionados
- [ ] Docs atualizados (DATA_MODEL, DECISIONS, RECENT_FIXES)
- [ ] Backup feito antes da migration
- [ ] Plano de rollback documentado

## §7. Plano de Rollback

Se algo der errado:

1. **Reverter UI**: feature flag (se aplicável)
2. **Reverter rules**: `firebase deploy --only firestore:rules --force`
3. **Reverter index**: deletar index, esperar 5 min
4. **Reverter dados**: usar backup do `firestore:export`

## §8. Lições Aprendidas

(preencher após deploy)

- Lição 1
- Lição 2

---

**Este exemplo mostra como fazer migration segura. Use como
template para suas próprias mudanças de schema.**

**Próxima leitura**: `02-DATA-MODEL.md` (schema atual)

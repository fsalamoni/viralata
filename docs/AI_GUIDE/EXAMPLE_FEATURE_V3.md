# EXAMPLE: Adicionando Nova Feature V3 (Exemplo Real)

> **Atualizado em 2026-07-24**
>
> Walkthrough de um exemplo real: adicionar feature "Pet Adoção
> Compartilhada" (botão de compartilhar com QR code). Mostra como
> aplicar todo o workflow documentado.

## §1. Contexto

User pediu: "Quero poder compartilhar um pet com um amigo via QR code
ou link, para que o amigo veja o pet e possa manifestar interesse".

## §2. Análise Inicial

### §2.1. O que sei (ler docs)

1. `01-ARCHITECTURE.md` — service layer + Firestore
2. `02-DATA-MODEL.md` — collection `pets/{petId}` + `interests/{id}`
3. `05-DESIGN-SYSTEM.md` — cores, ícones, tokens
4. `modules/01-PETS.md` — módulo de pets

### §2.2. O que vou criar

- Botão "Compartilhar" em `PetDetailV3.jsx`
- Modal com QR code + link copiável
- Hook `usePetShare` que gera dados de share
- Service `petShareService.js` (lógica)
- Runtime test para o modal
- Schema Zod para validação

### §2.3. Decisões a tomar

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Usar lib de QR? | `qrcode.react` | Leve, bem mantida |
| Onde gerar QR? | Client-side | Não precisa de Cloud Function |
| Link permanente? | Sim (com `pet_seq`) | D-PET-SEQ-IMMUTABLE |
| Track shares? | Apenas impression/click | LGPD (sem PII) |

## §3. Implementação

### §3.1. Adicionar lib

```bash
npm install qrcode.react
# ou
# Apenas o necessário:
npm install qrcode
```

### §3.2. Criar schema

```js
// src/modules/pets/domain/petShare.js
import { z } from 'zod';

export const petShareSchema = z.object({
  pet_id: z.string().min(1),
  pet_seq: z.number().int().positive(),
  share_method: z.enum(['link', 'qr', 'social']),
  shared_by: z.string().min(1),  // uid
  shared_at: z.number().int(),
});

export function buildShareLink(pet) {
  if (!pet?.pet_seq) return '';
  return `${window.location.origin}/pet/${pet.id}`;
}
```

### §3.3. Criar service

```js
// src/modules/pets/services/petShareService.js
import { db } from '@/core/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function trackShare({ petId, method, actor }) {
  if (!db) return;
  await addDoc(collection(db, 'pet_share_events'), {
    pet_id: petId,
    method,
    actor_uid: actor.uid,
    created_at: serverTimestamp(),
  });
}

export function generateQRPayload(pet) {
  return {
    type: 'pet_share',
    pet_id: pet.id,
    pet_seq: pet.pet_seq,
    timestamp: Date.now(),
  };
}
```

### §3.4. Criar hook

```js
// src/modules/pets/hooks/usePetShare.js
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { trackShare } from '../services/petShareService';
import { buildShareLink } from '../domain/petShare';
import { logger } from '@/core/lib/logger';

export function usePetShare(pet) {
  const shareLink = pet ? buildShareLink(pet) : '';
  
  const trackMutation = useMutation({
    mutationFn: ({ method }) => trackShare({
      petId: pet.id,
      method,
      actor: { uid: 'current-user' },  // get from auth
    }),
  });
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      trackMutation.mutate({ method: 'link' });
      logger.info('pet_share_link_copied', { petId: pet.id });
    } catch (err) {
      logger.error('pet_share_copy_failed', { error: err.message });
    }
  }, [shareLink, pet?.id, trackMutation]);
  
  return {
    shareLink,
    handleCopy,
    trackShare: trackMutation.mutate,
  };
}
```

### §3.5. Criar componente

```jsx
// src/modules/pets/components/PetShareDialog.jsx
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePetShare } from '../hooks/usePetShare';

export default function PetShareDialog({ pet, open, onOpenChange }) {
  const { shareLink, handleCopy } = usePetShare(pet);
  const [copied, setCopied] = useState(false);
  
  const onCopy = async () => {
    await handleCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhar {pet?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center bg-white p-4 rounded-md">
            {shareLink && <QRCodeSVG value={shareLink} size={200} />}
          </div>
          
          {/* Link */}
          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md bg-muted"
              data-testid="pet-share-link"
            />
            <Button onClick={onCopy} variant="outline" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          {copied && (
            <p className="text-sm text-primary text-center">
              Link copiado!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### §3.6. Adicionar botão em PetDetailV3

```jsx
// src/modules/pets/pages/PetDetailV3.jsx
import { Share2 } from 'lucide-react';
import { useState } from 'react';
import PetShareDialog from '../components/PetShareDialog';

export default function PetDetailV3() {
  const [shareOpen, setShareOpen] = useState(false);
  const { data: pet } = usePet(/* ... */);
  
  return (
    <div>
      {/* ... conteúdo existente ... */}
      
      <Button
        onClick={() => setShareOpen(true)}
        variant="outline"
        className="gap-2"
        data-testid="pet-share-button"
      >
        <Share2 className="w-4 h-4" />
        Compartilhar
      </Button>
      
      <PetShareDialog
        pet={pet}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
```

### §3.7. Criar runtime test

```jsx
// src/modules/pets/components/PetShareDialog.runtime.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', display_name: 'Alice' },
    isAuthenticated: true,
  })),
}));

import PetShareDialog from './PetShareDialog';

const mockPet = {
  id: 'p1',
  pet_seq: 42,
  name: 'Rex',
  photo_url: 'https://example.com/rex.jpg',
};

describe('PetShareDialog — runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing when open=true', () => {
    expect(() => {
      render(
        <PetShareDialog pet={mockPet} open={true} onOpenChange={() => {}} />
      );
    }).not.toThrow();
  });

  it('displays pet name in title', () => {
    render(
      <PetShareDialog pet={mockPet} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText(/Compartilhar Rex/)).toBeInTheDocument();
  });

  it('shows share link', () => {
    render(
      <PetShareDialog pet={mockPet} open={true} onOpenChange={() => {}} />
    );
    const input = screen.getByTestId('pet-share-link');
    expect(input.value).toContain('/pet/p1');
  });

  it('handles missing pet', () => {
    expect(() => {
      render(
        <PetShareDialog pet={null} open={true} onOpenChange={() => {}} />
      );
    }).not.toThrow();
  });
});
```

### §3.8. Adicionar Firestore Rule

```js
// firestore.rules
match /pet_share_events/{eventId} {
  allow read: if isPlatformAdmin();
  allow create: if isAuth() &&
    request.resource.data.actor_uid == request.auth.uid;
  allow update, delete: if false;  // IMMUTABLE
}
```

### §3.9. Adicionar índice (se necessário)

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "pet_share_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "pet_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## §4. Validação

```bash
# 1. Tests
npx vitest run src/modules/pets/components/PetShareDialog.runtime.test.jsx

# 2. Build
npx vite build

# 3. Validar imports lucide (Share2 e Copy)
node scripts/validate-lucide-imports.mjs

# 4. Auditoria
node scripts/audit-docs.mjs
```

## §5. Atualizar Docs

### §5.1. `02-DATA-MODEL.md`

Adicionar seção:

```md
### §2.10. `pet_share_events/{eventId}`

```typescript
{
  pet_id: string,
  method: 'link' | 'qr' | 'social',
  actor_uid: string,
  created_at: timestamp,
}
```
```

### §5.2. `07-FIRESTORE-RULES.md`

Adicionar match block de `pet_share_events`.

### §5.3. `15-RECENT-FIXES.md` (NEW ENTRY)

```md
### §X. Pet Share Dialog (2026-07-25)

**Data**: 2026-07-25
**Severidade**: N/A (feature)
**Descrição**: Adicionado botão "Compartilhar" em PetDetailV3 com
QR code e link copiável.
**Arquivos**:
- src/modules/pets/components/PetShareDialog.jsx (NEW)
- src/modules/pets/services/petShareService.js (NEW)
- src/modules/pets/hooks/usePetShare.js (NEW)
- src/modules/pets/domain/petShare.js (NEW)
- src/modules/pets/pages/PetDetailV3.jsx (modified)
- firestore.rules (modified)
- src/modules/pets/components/PetShareDialog.runtime.test.jsx (NEW)
```

### §5.4. `modules/01-PETS.md`

Adicionar à lista de componentes:

```md
| `PetShareDialog.jsx` | Dialog de compartilhamento com QR |
```

### §5.5. `13-DECISIONS.md` (se houver decisão importante)

```md
### D-PET-SHARE-IMPL (2026-07-25)

**Decisão**: Pet Share é client-side (gera link, QR, copy).
Tracking é best-effort (Falha silenciosa).

**Motivo**: Não precisa de Cloud Function. Latência baixa.
LGPD-compliant (sem coleta de IP).
```

## §6. Deploy

```bash
# 1. Validar
npx vitest run
npx vite build
node scripts/audit-docs.mjs

# 2. Bump SW
# vite.config.js: sw-v74 → sw-v75
# registerPwa.js: sw-v74 → sw-v75
# cleanupStaleCaches.js: adicionar sw-v74

# 3. Commit
git add .
git commit -m "feat(pets): add share dialog with QR code and link (sw-v75)"

# 4. Push
git push origin main

# 5. Monitorar deploy
# (GitHub Actions roda)

# 6. Validar em produção
curl https://viralata.web.app/sw-v75.js | head -3

# 7. SCRUM sync
node .harness/sync.cjs --fix
git add .harness/ public/
git commit -m "chore(scrum): sync after pet-share (TASK-XXX)"
git push
```

## §7. Pós-Deploy

- [ ] Validar bundle deployed
- [ ] Validar SW deployed
- [ ] Smoke test em `/pet/:id`
- [ ] Clicar em "Compartilhar" → modal aparece
- [ ] QR code aparece
- [ ] Clicar em "Copiar" → "Link copiado!"
- [ ] Verificar que Firestore tem `pet_share_events/{id}`
- [ ] Verificar que funciona em mobile

## §8. Lições Aprendidas

(preencher após deploy)

- Lição 1
- Lição 2

---

**Este exemplo mostra como aplicar o workflow documentado na
prática. Use como template para suas próprias features.**

**Próxima leitura**: `12-CODING-STANDARDS.md` (padrões de código)

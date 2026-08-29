/**
 * @fileoverview Componente: ExhibitionsManagerV2 (Fase 5 — SHELTER_EXHIBITION_OPS_V1).
 *
 * Torna a lista de vitrines FUNCIONAL no painel do abrigo. Só é renderizado
 * quando a flag `SHELTER_EXHIBITION_OPS_V1` está ligada (o painel V3 faz o swap;
 * com a flag OFF, `ExhibitionsList` é renderizado exatamente como antes — hoje
 * sem `onSelect`/`onCreate`, portanto somente leitura).
 *
 * Reaproveita, sem modificá-los:
 *  - `ExhibitionsList`  → lista + ações de status (agora com selecionar/criar);
 *  - `ExhibitionForm`   → criação de vitrine (autocontido);
 *  - `ExhibitionDetails`→ pets, escala de voluntários e log pós-evento;
 * e injeta o novo `ExhibitionOpsPanel` (planejamento/logística/mutirão/adoção)
 * abaixo do detalhe. Nenhuma escrita nova fora do campo aditivo `ops`.
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { ExhibitionsList } from '@/modules/shelter/components/ExhibitionsList';
import { ExhibitionForm } from '@/modules/shelter/components/ExhibitionForm';
import { ExhibitionDetails } from '@/modules/shelter/components/ExhibitionDetails';
import { ExhibitionOpsPanel } from '@/modules/shelter/components/ExhibitionOpsPanel';

export function ExhibitionsManagerV2({ shelterClubId, actor }) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_OPS_V1);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  if (!enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;

  if (selectedId) {
    return (
      <div className="space-y-6">
        <ExhibitionDetails
          shelterClubId={shelterClubId}
          exhibitionId={selectedId}
          actor={actor}
          onBack={() => setSelectedId(null)}
        />
        <ExhibitionOpsPanel
          shelterClubId={shelterClubId}
          exhibitionId={selectedId}
          actor={actor}
        />
      </div>
    );
  }

  return (
    <>
      <ExhibitionsList
        shelterClubId={shelterClubId}
        actor={actor}
        onSelect={(ex) => setSelectedId(ex.id)}
        onCreate={() => setCreating(true)}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova vitrine</DialogTitle>
            <DialogDescription>
              Crie o evento e depois planeje logística, mutirão de saúde, escala de voluntários e tratativas de adoção.
            </DialogDescription>
          </DialogHeader>
          <ExhibitionForm
            shelterClubId={shelterClubId}
            actor={actor}
            onCreated={(r) => { setCreating(false); if (r?.id) setSelectedId(r.id); }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExhibitionsManagerV2;

/**
 * @fileoverview ShelterPetScopedTab — wrapper para abas que operam no
 * escopo de um pet individual dentro do painel do abrigo.
 *
 * Componentes como `MedicalRecordsList`, `MedicationsList` e
 * `TimelineList` exigem `petId`. Para que apareçam no painel do abrigo
 * (rota `/organizacoes/:orgId/admin`), este wrapper lista os pets do
 * abrigo e, ao selecionar, renderiza o componente certo.
 *
 * Props:
 *  - clubId: id do abrigo
 *  - kind: 'medical' | 'medications' | 'timeline'
 */

import React, { useMemo, useState } from 'react';
import { PawPrint, ChevronRight, Stethoscope, Pill, Clock } from 'lucide-react';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { MedicalRecordsList } from '@/modules/shelter/components/MedicalRecordsList';
import { MedicationsList } from '@/modules/shelter/components/MedicationsList';
import { TimelineList } from '@/modules/shelter/components/TimelineList';

const KIND_META = {
  medical: { icon: Stethoscope, title: 'Prontuário médico', label: 'prontuário' },
  medications: { icon: Pill, title: 'Medicação', label: 'medicação' },
  timeline: { icon: Clock, title: 'Linha do tempo', label: 'histórico' },
};

export function ShelterPetScopedTab({ clubId, kind = 'medical' }) {
  const meta = KIND_META[kind] || KIND_META.medical;
  const { data: pets = [], isLoading } = useMyPets(clubId);
  const [selectedPetId, setSelectedPetId] = useState(null);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId],
  );

  if (!clubId) {
    return (
      <EmptyState
        icon={PawPrint}
        title="Abrigo não especificado"
        description="Não foi possível identificar o abrigo para esta seção."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <EmptyState
        icon={PawPrint}
        title="Nenhum pet cadastrado"
        description={`Cadastre um pet na aba "Animais" para acessar o ${meta.label}.`}
      />
    );
  }

  // Lista de pets — usuário seleciona um para ver prontuário
  if (!selectedPetId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <meta.icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{meta.title}</h2>
          <Badge className="rounded-full">{pets.length} pets</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione um pet para ver o {meta.label} individual.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <section
              key={pet.id}
              className="arena-section-card cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => setSelectedPetId(pet.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedPetId(pet.id);
                }
              }}
              data-testid={`pet-card-${pet.id}`}
            >
              <div className="arena-section-card-header">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PawPrint className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="arena-section-card-title">{pet.name || 'Sem nome'}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {pet.species || '—'} · {pet.breed || '—'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  // Pet selecionado — renderiza o componente específico
  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSelectedPetId(null)}
        data-testid="back-to-pet-list"
      >
        ← Voltar para a lista de pets
      </Button>
      <div className="flex items-center gap-2">
        <PawPrint className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{selectedPet?.name || 'Pet'}</h2>
        <Badge className="rounded-full" variant="secondary">
          {meta.title}
        </Badge>
      </div>
      {kind === 'medical' && (
        <MedicalRecordsList
          petId={selectedPetId}
          shelterClubId={clubId}
          canEdit
        />
      )}
      {kind === 'medications' && (
        <MedicationsList
          petId={selectedPetId}
          shelterClubId={clubId}
          canEdit
        />
      )}
      {kind === 'timeline' && (
        <TimelineList
          petId={selectedPetId}
          shelterClubId={clubId}
          canEdit
        />
      )}
    </div>
  );
}

export default ShelterPetScopedTab;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { useMyPets, useUpdatePet } from '@/modules/pets/hooks/usePets';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_process', label: 'Em processo' },
  { value: 'adopted', label: 'Adotado' },
];

const VACCINATED_OPTIONS = [
  { value: 'yes', label: 'Vacinado' },
  { value: 'partial', label: 'Parcial' },
  { value: 'no', label: 'Não vacinado' },
];

/**
 * Planilha de gestão de pets de uma organização: edição rápida de status,
 * vacinação e idade sem abrir o cadastro completo de cada animal.
 * Reaproveita petService.updatePet (via useUpdatePet) — sem coleção nova.
 */
export default function ClubPetsDataGrid({ clubId }) {
  const { data: pets = [], isLoading } = useMyPets(clubId);
  const updatePet = useUpdatePet();
  const [savingId, setSavingId] = useState(null);

  async function handleFieldChange(petId, field, value) {
    setSavingId(petId);
    try {
      await updatePet.mutateAsync({ petId, updates: { [field]: value } });
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (pets.length === 0) {
    return (
      <EmptyState
        title="Nenhum pet cadastrado por esta organização"
        description="Cadastre o primeiro pet em nome desta organização."
        action={(
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link to="/pets/new"><PlusCircle className="w-4 h-4 mr-2" /> Cadastrar Pet</Link>
          </Button>
        )}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
          <Link to="/pets/new"><PlusCircle className="w-4 h-4 mr-1.5" /> Novo pet</Link>
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vacinação</TableHead>
              <TableHead>Idade (meses)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pets.map((pet) => (
              <TableRow key={pet.id}>
                <TableCell className="font-medium">
                  <Link to={`/pets/${pet.id}`} className="hover:text-orange-600 hover:underline">
                    {pet.title || pet.name || 'Sem título'}
                  </Link>
                </TableCell>
                <TableCell>
                  <Select
                    value={pet.status}
                    onValueChange={(v) => handleFieldChange(pet.id, 'status', v)}
                    disabled={savingId === pet.id}
                  >
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={pet.vaccinated}
                    onValueChange={(v) => handleFieldChange(pet.id, 'vaccinated', v)}
                    disabled={savingId === pet.id}
                  >
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VACCINATED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    min="0"
                    defaultValue={pet.age_months ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      if (v !== (pet.age_months ?? null)) handleFieldChange(pet.id, 'age_months', v);
                    }}
                    disabled={savingId === pet.id}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

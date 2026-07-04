import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyPets, useDeletePet, useInterestsByPet } from '../hooks/usePets';
import { Button } from '@/components/ui/button';
import { PlusCircle, PawPrint, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/core/lib/utils';

const STATUS_STYLE = {
  available: { label: 'Disponível', className: 'bg-secondary text-secondary-foreground' },
  in_process: { label: 'Em processo', className: 'bg-highlight/20 text-highlight-foreground' },
  adopted: { label: 'Adotado', className: 'bg-[hsl(150,38%,36%,0.12)] text-[hsl(150,38%,26%)]' },
};

function PetRow({ pet, onDelete, deleting }) {
  const navigate = useNavigate();
  const { data: interests = [] } = useInterestsByPet(pet.id);
  const status = STATUS_STYLE[pet.status] || STATUS_STYLE.available;

  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-white bg-card p-3.5 shadow-[0_16px_38px_-28px_hsl(20_40%_20%/0.4)]">
      <button
        type="button"
        onClick={() => navigate(`/pets/${pet.id}`)}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)]"
      >
        {pet.photos?.[0] ? (
          <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <PawPrint className="h-[26px] w-[26px] text-white/45" />
        )}
      </button>
      <button type="button" onClick={() => navigate(`/pets/${pet.id}`)} className="min-w-0 flex-1 text-left">
        <div className="truncate font-['Sora'] text-[15px] font-bold text-foreground">{pet.name || pet.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', status.className)}>{status.label}</span>
          <span className="text-[11.5px] text-muted-foreground">{interests.length} interessados</span>
        </div>
      </button>
      <div className="flex shrink-0 gap-1.5">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full">
          <Link to={`/pets/${pet.id}/edit`}><Pencil className="h-[17px] w-[17px]" /></Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-[hsl(9,62%,85%)] text-[hsl(9,62%,46%)]"
          onClick={() => onDelete(pet.id)}
          disabled={deleting}
        >
          <Trash2 className="h-[17px] w-[17px]" />
        </Button>
      </div>
    </div>
  );
}

export default function MyPets() {
  const { user } = useAuth();
  const { data: pets = [], isLoading } = useMyPets(user?.uid);
  const deletePet = useDeletePet();

  async function handleDelete(petId) {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;
    try {
      await deletePet.mutateAsync(petId);
      toast.success('Pet removido.');
    } catch {
      toast.error('Erro ao remover pet.');
    }
  }

  return (
    <div className="arena-page mx-auto max-w-3xl px-5 pb-16 pt-5.5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-['Sora'] text-[22px] font-extrabold text-foreground">Meus Pets</h1>
        <Button asChild>
          <Link to="/pets/new"><PlusCircle className="mr-2 h-4 w-4" /> Novo</Link>
        </Button>
      </div>
      {isLoading && (
        <div className="space-y-3.5">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-[20px] bg-secondary" />)}
        </div>
      )}
      {!isLoading && pets.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          Você ainda não cadastrou nenhum pet.
        </div>
      )}
      {!isLoading && pets.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {pets.map((pet) => (
            <PetRow key={pet.id} pet={pet} onDelete={handleDelete} deleting={deletePet.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

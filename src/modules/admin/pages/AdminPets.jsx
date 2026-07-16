import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { confirmDialog } from '@/components/ui/confirm-provider';

export default function AdminPets() {
  const { isPlatformAdmin } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-4 py-6');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    getDocs(query(collection(db, 'pets'), orderBy('created_at', 'desc')))
      .then((snap) => setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  async function handleDelete(petId) {
    if (!(await confirmDialog({ title: 'Remover este pet?' }))) return;
    await deleteDoc(doc(db, 'pets', petId));
    setPets((p) => p.filter((x) => x.id !== petId));
    toast.success('Pet removido.');
  }

  if (!isPlatformAdmin) return null;

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Pets"
        title="Gerenciar Pets"
        description="Visualize, edite e remova pets cadastrados na plataforma. Apenas o admin master tem acesso."
      />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {pets.map((pet) => (
            <div key={pet.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <img src={pet.photos?.[0] || '/placeholder-pet.svg'} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" decoding="async" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{pet.title || pet.name}</p>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-xs">{pet.species}</Badge>
                  <Badge variant={pet.status === 'available' ? 'default' : 'secondary'} className="text-xs">{pet.status}</Badge>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/pets/${pet.id}`}><Eye className="w-3.5 h-3.5" /></Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(pet.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

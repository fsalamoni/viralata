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
import PageContainer from '@/components/PageContainer';

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
    <PageContainer className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Gerenciar Pets</h1>
      {loading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {pets.map((pet) => (
            <div key={pet.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <img src={pet.photos?.[0] || '/placeholder-pet.svg'} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
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
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(pet.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listClubs, deleteClub } from '@/modules/organizations/services/clubService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Eye } from 'lucide-react';

export default function AdminOrganizations() {
  const { user, isPlatformAdmin } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    listClubs()
      .then(setClubs)
      .finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  async function handleDelete(club) {
    if (!confirm(`Excluir a organização "${club.name}"? Isso remove eventos, posts e membros associados.`)) return;
    try {
      await deleteClub(club.id, user);
      setClubs((prev) => prev.filter((c) => c.id !== club.id));
      toast.success('Organização removida.');
    } catch (e) {
      toast.error('Erro ao remover organização.');
    }
  }

  if (!isPlatformAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Gerenciar Organizações</h1>
      {loading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {clubs.map((club) => (
            <div key={club.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <img src={club.logo_url || '/placeholder-pet.svg'} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{club.name}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {(club.city || club.state) && (
                    <Badge variant="secondary" className="text-xs">{[club.city, club.state].filter(Boolean).join(', ')}</Badge>
                  )}
                  {club.cnpj && <Badge variant="outline" className="text-xs">CNPJ: {club.cnpj}</Badge>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/organizacoes/${club.id}`}><Eye className="w-3.5 h-3.5" /></Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(club)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {clubs.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma organização cadastrada.</p>}
        </div>
      )}
    </div>
  );
}

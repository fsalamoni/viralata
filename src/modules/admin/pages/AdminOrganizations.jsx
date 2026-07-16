import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Eye, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { listAdminClubs, updateAdminClub } from '@/modules/admin/services/adminService';
import { useAdminCommunities } from '@/modules/communities/hooks/useCommunities';
import { CLUB_DIRECTORY_STATUS, CLUB_DIRECTORY_STATUS_LABELS, sortCommunities } from '@/modules/communities/domain/directory';

const STATUS_OPTIONS = Object.values(CLUB_DIRECTORY_STATUS);

export default function AdminOrganizations() {
  const { user, isPlatformAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const wrapperClass = useArenaPageClasses('arena-page mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6');

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['admin-clubs'],
    queryFn: listAdminClubs,
    enabled: isPlatformAdmin,
  });
  const { data: communities = [] } = useAdminCommunities();

  const updateClubMutation = useMutation({
    mutationFn: ({ clubId, updates }) => updateAdminClub(clubId, updates, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clubs'] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });

  const sortedCommunities = useMemo(() => sortCommunities(communities), [communities]);

  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clubs.filter((club) => {
      const matchesTerm = !term || [
        club.name,
        club.description,
        club.city,
        club.state,
        club.community_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all' || (club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) === statusFilter;
      const matchesCommunity = communityFilter === 'all'
        || (communityFilter === 'none' ? !club.community_id : club.community_id === communityFilter);

      return matchesTerm && matchesStatus && matchesCommunity;
    });
  }, [clubs, communityFilter, search, statusFilter]);

  async function handleClubUpdate(club, updates, successMessage) {
    try {
      await updateClubMutation.mutateAsync({ clubId: club.id, updates });
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar a organização.');
    }
  }

  if (!isPlatformAdmin) return null;

  const clubsInReview = clubs.filter((club) => (club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) === CLUB_DIRECTORY_STATUS.REVIEW).length;
  const clubsSuspended = clubs.filter((club) => (club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) === CLUB_DIRECTORY_STATUS.SUSPENDED).length;
  const featuredClubs = clubs.filter((club) => club.featured).length;

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
        <div className="arena-section-card-body space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_220px_220px]">
            <Input
              placeholder="Buscar organização, cidade ou comunidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{CLUB_DIRECTORY_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
            >
              <option value="all">Todas as comunidades</option>
              <option value="none">Sem comunidade</option>
              {sortedCommunities.map((community) => (
                <option key={community.id} value={community.id}>{community.name}</option>
              ))}
            </select>
          </div>

          {loadingClubs ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando organizações...</p>
          ) : (
            <div className="space-y-3">
              {filteredClubs.map((club) => (
                <div key={club.id} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/20">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      {club.logo_url ? (
                        <img src={club.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-primary/10 object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Building2 className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground">{club.name}</h4>
                          {club.featured && <Badge variant="warning" className="h-5 px-1.5 text-[10px] uppercase tracking-wider">Destaque</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[club.city, club.state].filter(Boolean).join(' / ') || 'Local não informado'}
                          {' • '}
                          {club.member_count || 1} membros
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="h-8 rounded border border-input bg-background px-2 text-xs"
                          value={club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE}
                          onChange={(e) => handleClubUpdate(club, { directory_status: e.target.value }, 'Status atualizado.')}
                          disabled={updateClubMutation.isPending}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{CLUB_DIRECTORY_STATUS_LABELS[status]}</option>
                          ))}
                        </select>
                        <select
                          className="h-8 max-w-[200px] rounded border border-input bg-background px-2 text-xs"
                          value={club.community_id || 'none'}
                          onChange={(e) => {
                            const newId = e.target.value === 'none' ? null : e.target.value;
                            const newName = newId ? sortedCommunities.find((c) => c.id === newId)?.name : null;
                            handleClubUpdate(club, { community_id: newId, community_name: newName }, 'Comunidade vinculada.');
                          }}
                          disabled={updateClubMutation.isPending}
                        >
                          <option value="none">Sem comunidade vinculada</option>
                          {sortedCommunities.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex w-full gap-2 md:w-auto md:justify-end">
                        <Button
                          type="button"
                          variant={club.featured ? 'secondary' : 'outline'}
                          className="flex-1"
                          onClick={() => handleClubUpdate(club, { featured: !club.featured }, club.featured ? 'Abrigo removido dos destaques.' : 'Abrigo marcado como destaque.')}
                          disabled={updateClubMutation.isPending}
                        >
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          {club.featured ? 'Em destaque' : 'Destacar'}
                        </Button>
                        <Button asChild variant="outline" size="icon">
                          <Link to={`/organizacoes/${club.id}`} aria-label={`Abrir ${club.name}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredClubs.length === 0 && (
                <EmptyState
                  icon={Building2}
                  title="Nenhuma organização encontrada"
                  description="Tente ajustar os filtros de busca ou crie uma nova organização."
                />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-body flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </section>
  );
}

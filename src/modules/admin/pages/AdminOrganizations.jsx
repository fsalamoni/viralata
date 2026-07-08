import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Eye, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageHero from '@/components/PageHero';
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
    <div className="arena-page mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="mb-1.5 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar ao Painel</Link>
        </Button>
      </div>

      <PageHero
        eyebrow="Admin"
        title="Organizações"
        description="Controle editorial do diretório, vínculos entre comunidades e organizações, publicação e destaques globais."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <ShieldCheck className="h-3.5 w-3.5" /> Curadoria global
          </span>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Building2} label="Organizações" value={clubs.length} />
        <SummaryCard icon={Sparkles} label="Destaques" value={featuredClubs} />
        <SummaryCard icon={ShieldCheck} label="Pendências" value={clubsInReview + clubsSuspended} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moderação do diretório</CardTitle>
          <CardDescription>Defina publicação, destaque e vínculo comunitário de cada organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                        <img src={club.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-primary/10 object-cover" />
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
                          onClick={() => handleClubUpdate(club, { featured: !club.featured }, club.featured ? 'Organização removida dos destaques.' : 'Organização marcada como destaque.')}
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
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma organização encontrada com os filtros atuais.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Eye, FolderTree, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import PageHero from '@/components/PageHero';
import { listAdminClubs, updateAdminClub } from '@/modules/admin/services/adminService';

import { COMMUNITY_VISIBILITY, COMMUNITY_VISIBILITY_LABELS } from '@/modules/communities/domain/constants';
import { CLUB_DIRECTORY_STATUS, CLUB_DIRECTORY_STATUS_LABELS, sortCommunities } from '@/modules/communities/domain/directory';

const COMMUNITY_INITIAL = {
  name: '',
  description: '',
  city: '',
  state: '',
  cover_url: '',
  featured: false,
  priority: 0,
  visibility: COMMUNITY_VISIBILITY.PUBLIC,
};

const STATUS_OPTIONS = Object.values(CLUB_DIRECTORY_STATUS);

export default function AdminOrganizations() {
  const { user, isPlatformAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [communityForm, setCommunityForm] = useState(COMMUNITY_INITIAL);

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['admin-clubs'],
    queryFn: listAdminClubs,
    enabled: isPlatformAdmin,
  });
  const { data: communities = [], isLoading: loadingCommunities } = useAdminCommunities();
  const createCommunity = useCreateCommunity();
  const deleteCommunity = useDeleteCommunity();
  const updateClubMutation = useMutation({
    mutationFn: ({ clubId, updates }) => updateAdminClub(clubId, updates, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clubs'] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });

  const sortedCommunities = useMemo(() => sortCommunities(communities), [communities]);
  const communityCounts = useMemo(() => clubs.reduce((acc, club) => {
    if (club.community_id) acc[club.community_id] = (acc[club.community_id] || 0) + 1;
    return acc;
  }, {}), [clubs]);

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

  async function handleCommunityCreate(event) {
    event.preventDefault();
    try {
      await createCommunity.mutateAsync(communityForm);
      setCommunityForm(COMMUNITY_INITIAL);
      toast.success('Comunidade criada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível criar a comunidade.');
    }
  }

  async function handleDeleteCommunity(community) {
    if (!window.confirm(`Excluir a comunidade "${community.name}"? As organizações vinculadas ficarão sem comunidade.`)) return;
    try {
      await deleteCommunity.mutateAsync(community.id);
      toast.success('Comunidade removida.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover a comunidade.');
    }
  }

  if (!isPlatformAdmin) return null;

  const clubsInReview = clubs.filter((club) => (club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) === CLUB_DIRECTORY_STATUS.REVIEW).length;
  const clubsSuspended = clubs.filter((club) => (club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) === CLUB_DIRECTORY_STATUS.SUSPENDED).length;
  const featuredClubs = clubs.filter((club) => club.featured).length;

  return (
    <div className="arena-page mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <PageHero
        eyebrow="Admin"
        title="Comunidades e organizações"
        description="Controle editorial do diretório, vínculos entre comunidades e organizações, publicação e destaques globais."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <ShieldCheck className="h-3.5 w-3.5" /> Curadoria global
          </span>
        )}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={Building2} label="Organizações" value={clubs.length} />
        <SummaryCard icon={FolderTree} label="Comunidades" value={communities.length} />
        <SummaryCard icon={Sparkles} label="Destaques" value={featuredClubs} />
        <SummaryCard icon={Users} label="Pendências" value={clubsInReview + clubsSuspended} />
      </div>

      <Tabs defaultValue="organizations" className="w-full">
        <TabsList className="arena-tab-bar">
          <TabsTrigger value="organizations" className="arena-tab-pill">Organizações</TabsTrigger>
          <TabsTrigger value="communities" className="arena-tab-pill">Comunidades</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-6">
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

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{filteredClubs.length} organização(ões)</Badge>
                <Badge variant="outline">{clubsInReview} em revisão</Badge>
                <Badge variant="outline">{clubsSuspended} suspensa(s)</Badge>
              </div>

              {loadingClubs ? (
                <p className="text-sm text-muted-foreground">Carregando organizações...</p>
              ) : (
                <div className="space-y-3">
                  {filteredClubs.map((club) => (
                    <div key={club.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {club.logo_url ? (
                            <img src={club.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-primary/10 object-cover" />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Building2 className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-foreground">{club.name}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">{CLUB_DIRECTORY_STATUS_LABELS[club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE]}</Badge>
                              {club.community_name && <Badge variant="outline">{club.community_name}</Badge>}
                              {club.featured && <Badge variant="warning">Destaque</Badge>}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {[club.city, club.state].filter(Boolean).join(' / ') || 'Localização não informada'}
                              {' · '}
                              {club.member_count || 0} membro(s)
                            </p>
                          </div>
                        </div>

                        <div className="grid flex-1 gap-3 md:grid-cols-3">
                          <label className="space-y-1 text-xs font-medium text-muted-foreground">
                            <span>Status</span>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE}
                              onChange={(e) => handleClubUpdate(club, { directory_status: e.target.value }, 'Status da organização atualizado.')}
                              disabled={updateClubMutation.isPending}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>{CLUB_DIRECTORY_STATUS_LABELS[status]}</option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1 text-xs font-medium text-muted-foreground">
                            <span>Comunidade</span>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={club.community_id || ''}
                              onChange={(e) => {
                                const nextCommunityId = e.target.value;
                                const selected = nextCommunityId
                                  ? sortedCommunities.find((item) => item.id === nextCommunityId)
                                  : null;
                                handleClubUpdate(
                                  club,
                                  { community_id: nextCommunityId, community_name: selected?.name || '' },
                                  'Comunidade da organização atualizada.',
                                );
                              }}
                              disabled={updateClubMutation.isPending}
                            >
                              <option value="">Sem comunidade</option>
                              {sortedCommunities.map((community) => (
                                <option key={community.id} value={community.id}>{community.name}</option>
                              ))}
                            </select>
                          </label>

                          <div className="space-y-1 text-xs font-medium text-muted-foreground">
                            <span>Ações</span>
                            <div className="flex gap-2">
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
                                <Link to={`/comunidade/${club.id}`} aria-label={`Abrir ${club.name}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
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
        </TabsContent>

        <TabsContent value="communities" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova comunidade</CardTitle>
                <CardDescription>Crie editorias ou agrupadores próprios para organizar ONGs, protetores e frentes locais.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCommunityCreate}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Capa</label>
                    <ImageUpload
                      value={communityForm.cover_url}
                      onChange={(url) => setCommunityForm((prev) => ({ ...prev, cover_url: url }))}
                      folder="communities"
                      label="Enviar capa"
                      hint="Imagem opcional para destacar a comunidade no diretório."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nome</label>
                    <Input value={communityForm.name} onChange={(e) => setCommunityForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Descrição</label>
                    <Textarea value={communityForm.description} onChange={(e) => setCommunityForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Cidade</label>
                      <Input value={communityForm.city} onChange={(e) => setCommunityForm((prev) => ({ ...prev, city: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">UF</label>
                      <Input value={communityForm.state} onChange={(e) => setCommunityForm((prev) => ({ ...prev, state: e.target.value }))} maxLength={2} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1.5 text-sm font-medium text-foreground">
                      <span>Visibilidade</span>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={communityForm.visibility}
                        onChange={(e) => setCommunityForm((prev) => ({ ...prev, visibility: e.target.value }))}
                      >
                        {Object.values(COMMUNITY_VISIBILITY).map((visibility) => (
                          <option key={visibility} value={visibility}>{COMMUNITY_VISIBILITY_LABELS[visibility]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-foreground">
                      <span>Prioridade</span>
                      <Input
                        type="number"
                        value={communityForm.priority}
                        onChange={(e) => setCommunityForm((prev) => ({ ...prev, priority: Number.parseInt(e.target.value, 10) || 0 }))}
                      />
                    </label>
                    <label className="flex items-end gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={communityForm.featured}
                        onChange={(e) => setCommunityForm((prev) => ({ ...prev, featured: e.target.checked }))}
                      />
                      Destacar no diretório
                    </label>
                  </div>
                  <Button type="submit" disabled={createCommunity.isPending}>
                    {createCommunity.isPending ? 'Criando...' : 'Criar comunidade'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {loadingCommunities ? (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando comunidades...</CardContent></Card>
              ) : sortedCommunities.length === 0 ? (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma comunidade criada ainda.</CardContent></Card>
              ) : (
                sortedCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    organizationCount={communityCounts[community.id] || 0}
                    onDelete={() => handleDeleteCommunity(community)}
                  />
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
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

function CommunityCard({ community, organizationCount, onDelete }) {
  const [form, setForm] = useState(community);
  const updateCommunity = useUpdateCommunity(community.id);

  useEffect(() => {
    setForm(community);
  }, [community]);

  async function handleSave() {
    try {
      await updateCommunity.mutateAsync(form);
      toast.success('Comunidade atualizada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a comunidade.');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{community.name}</CardTitle>
            <CardDescription>{organizationCount} organização(ões) vinculada(s)</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={community.featured ? 'warning' : 'secondary'}>
              {community.featured ? 'Destaque' : 'Normal'}
            </Badge>
            <Badge variant="outline">{COMMUNITY_VISIBILITY_LABELS[community.visibility || COMMUNITY_VISIBILITY.PUBLIC]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.cover_url && (
          <img src={form.cover_url} alt="" className="h-36 w-full rounded-2xl border border-primary/10 object-cover" />
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Capa</label>
          <ImageUpload
            value={form.cover_url}
            onChange={(url) => setForm((prev) => ({ ...prev, cover_url: url }))}
            folder="communities"
            label="Alterar capa"
            hint="Opcional. Ajuda a dar identidade visual à comunidade."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <Input value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Prioridade</label>
            <Input
              type="number"
              value={form.priority ?? 0}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: Number.parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Descrição</label>
          <Textarea value={form.description || ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Cidade</label>
            <Input value={form.city || ''} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">UF</label>
            <Input value={form.state || ''} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} maxLength={2} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Visibilidade</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.visibility || COMMUNITY_VISIBILITY.PUBLIC}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
            >
              {Object.values(COMMUNITY_VISIBILITY).map((visibility) => (
                <option key={visibility} value={visibility}>{COMMUNITY_VISIBILITY_LABELS[visibility]}</option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.featured)}
              onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
            />
            Destacar
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={updateCommunity.isPending}>
            {updateCommunity.isPending ? 'Salvando...' : 'Salvar comunidade'}
          </Button>
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderTree, Users, Trash2, Eye, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useAdminCommunities, useCreateCommunity, useDeleteCommunity, useUpdateCommunity } from '@/modules/communities/hooks/useCommunities';
import { COMMUNITY_VISIBILITY, COMMUNITY_VISIBILITY_LABELS } from '@/modules/communities/domain/constants';
import { sortCommunities } from '@/modules/communities/domain/directory';
import { confirmDialog } from '@/components/ui/confirm-provider';

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

export default function AdminCommunities() {
  const { isPlatformAdmin } = useAuth();
  const [communityForm, setCommunityForm] = useState(COMMUNITY_INITIAL);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-6');

  const { data: communities = [], isLoading } = useAdminCommunities();
  const createCommunity = useCreateCommunity();
  const deleteCommunity = useDeleteCommunity();

  const sortedCommunities = useMemo(() => sortCommunities(communities), [communities]);

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
    if (!(await confirmDialog({ title: `Excluir a comunidade "${community.name}"? As organizações vinculadas ficarão sem comunidade.` }))) return;
    try {
      await deleteCommunity.mutateAsync(community.id);
      toast.success('Comunidade removida.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover a comunidade.');
    }
  }

  if (!isPlatformAdmin) return null;

  return (
    <div className={wrapperClass}>
      <div className="mb-1.5 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar ao Painel</Link>
        </Button>
      </div>
      
      <PageHero
        eyebrow="Admin"
        title="Moderação de Comunidades"
        description="Gerencie os agrupamentos globais da plataforma, crie editorias, destaque comunidades."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" /> Moderação Ativa
          </span>
        )}
      />

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
                <Input value={communityForm.name} onChange={(e) => setCommunityForm((prev) => ({ ...prev, name: e.target.value }))} required />
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
          {isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando comunidades...</CardContent></Card>
          ) : sortedCommunities.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma comunidade criada ainda.</CardContent></Card>
          ) : (
            sortedCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                organizationCount={0}
                onDelete={() => handleDeleteCommunity(community)}
              />
            ))
          )}
        </div>
      </div>
    </div>
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
            <CardDescription>{community.member_count || 0} membro(s) vinculados</CardDescription>
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
            <Input value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
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

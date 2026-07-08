import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Trash2, Eye, ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageHero from '@/components/PageHero';
import { useAdminCommunities, useDeleteCommunity, useUpdateCommunity } from '@/modules/communities/hooks/useCommunities';
import { COMMUNITY_VISIBILITY_LABELS } from '@/modules/communities/domain/constants';
import PageContainer from '@/components/PageContainer';

export default function AdminCommunities() {
  const { isPlatformAdmin } = useAuth();
  const { data: communities = [], isLoading } = useAdminCommunities();
  const deleteCommunity = useDeleteCommunity();
  const updateCommunity = useUpdateCommunity();

  const handleDelete = async (community) => {
    if (!confirm(`Excluir DEFINITIVAMENTE a comunidade "${community.name}" e todos os seus posts e fóruns?`)) return;
    try {
      await deleteCommunity.mutateAsync(community.id);
      toast.success('Comunidade excluída');
    } catch (e) {
      toast.error('Erro ao excluir comunidade');
    }
  };

  const handleToggleVisibility = async (community) => {
    const newVisibility = community.visibility === 'public' ? 'private' : 'public';
    try {
      await updateCommunity.mutateAsync({ ...community, visibility: newVisibility });
      toast.success('Visibilidade alterada');
    } catch (e) {
      toast.error('Erro ao alterar');
    }
  };

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="mb-1.5 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar ao Painel</Link>
        </Button>
      </div>
      
      <PageHero
        eyebrow="Admin"
        title="Moderação de Comunidades"
        description="Gerencie os grupos de usuários da plataforma. Exclua comunidades abusivas ou altere a visibilidade para mitigar violações de regras."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" /> Moderação Ativa
          </span>
        )}
      />

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : communities.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">Nenhuma comunidade criada.</Card>
        ) : (
          communities.map(community => (
            <Card key={community.id} className="overflow-hidden">
              <CardContent className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {community.cover_url ? (
                      <img src={community.cover_url} className="w-full h-full object-cover rounded-xl" alt="" />
                    ) : (
                      <Users className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{community.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{community.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{community.member_count || 1} membros</Badge>
                      <Badge variant={community.visibility === 'public' ? 'secondary' : 'warning'}>
                        {COMMUNITY_VISIBILITY_LABELS[community.visibility] || community.visibility}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleToggleVisibility(community)}>
                    {community.visibility === 'public' ? 'Tornar Privada' : 'Tornar Pública'}
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/comunidade/${community.id}`} target="_blank">
                      <Eye className="w-4 h-4 mr-2" /> Inspecionar
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(community)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

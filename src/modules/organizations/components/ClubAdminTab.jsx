import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/core/lib/useClipboard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useRegenerateInviteCode,
  useDeleteClub,
} from '@/modules/organizations/hooks/useClubs';
import ClubThemingSection from './ClubThemingSection';

/**
 * Aba "Configurações" do painel de administração da organização.
 *
 * Após a consolidação, esta aba é dedicada a configurações estruturais
 * da ONG que NÃO estão duplicadas em "Geral":
 *  - Código de convite (com regen)
 *  - Exclusão definitiva (zona de risco)
 *  - Personalização visual (cores de cards, botões, textos)
 *
 * As informações de identidade, localização, contatos, CNPJ, link de
 * doação, história e chat habilitado são editadas exclusivamente na aba
 * "Geral" (`ClubGeneralAdminTab`), através do mesmo `useUpdateClub` e do
 * mesmo `normalizeClubInput`. Remover a duplicação aqui não afeta o banco
 * nem outros pontos do front-end.
 *
 * Acesso: somente o proprietário (admin_only). Membros sem a maior
 * permissão não veem esta aba — ela é filtrada em `visibleAdminTabs`.
 */
export default function ClubAdminTab({ club }) {
  const navigate = useNavigate();
  const { copy, copied } = useClipboard();
  const regenerate = useRegenerateInviteCode(club.id);
  const deleteClub = useDeleteClub(club.id);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRegenerate = async () => {
    try {
      const code = await regenerate.mutateAsync();
      toast.success(`Novo código gerado: ${code}`);
      setConfirmRegen(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar novo código.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClub.mutateAsync();
      toast.success('Organização excluída.');
      navigate('/organizacoes');
    } catch (err) {
      toast.error(err.message || 'Não foi possível excluir a organização.');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base">Código de convite</CardTitle>
          <CardDescription>Compartilhe este código para que novos membros ingressem na organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-primary/10 bg-secondary/40 px-4 py-2 text-lg font-bold tracking-[0.25em] text-foreground">
              {club.invite_code}
            </code>
            <Button variant="outline" size="sm" onClick={() => copy(club.invite_code, 'Código copiado!')}>
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />} Copiar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmRegen(true)} disabled={regenerate.isPending}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Gerar novo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ao gerar um novo código, o anterior deixa de funcionar imediatamente.
          </p>
        </CardContent>
      </Card>

      <ClubThemingSection club={club} />

      <Card className="rounded-xl border-destructive/30">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
          <CardDescription>A exclusão da organização remove membros, eventos e mural. Não pode ser desfeita.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 sm:p-7 sm:pt-0">
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={deleteClub.isPending}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir organização
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Gerar novo código"
        description="O código atual deixará de funcionar. Deseja continuar?"
        confirmLabel="Gerar novo"
        loading={regenerate.isPending}
        onConfirm={handleRegenerate}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir organização"
        description={`Tem certeza que deseja excluir "${club.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleteClub.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

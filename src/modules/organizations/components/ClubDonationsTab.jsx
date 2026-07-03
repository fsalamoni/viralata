import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, CheckCircle2, HandCoins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  useClubCampaigns, useCreateClubCampaign, useUpdateClubCampaign,
} from '@/modules/organizations/hooks/useClubs';
import { CAMPAIGN_STATUS } from '@/modules/organizations/domain/constants';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPTY_FORM = { title: '', description: '', goal: '', deadline: '' };

export default function ClubDonationsTab({ clubId }) {
  const { data: campaigns = [], isLoading } = useClubCampaigns(clubId);
  const createCampaign = useCreateClubCampaign(clubId);
  const updateCampaign = useUpdateClubCampaign(clubId);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addFundsFor, setAddFundsFor] = useState(null);
  const [amount, setAmount] = useState('');

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCampaign.mutateAsync(form);
      toast.success('Chamado de doação criado.');
      setForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível criar o chamado.');
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!addFundsFor || !value || value <= 0) return;
    const nextRaised = Number(addFundsFor.raised || 0) + value;
    try {
      await updateCampaign.mutateAsync({ campaignId: addFundsFor.id, updates: { raised: nextRaised } });
      toast.success('Arrecadação atualizada.');
      setAddFundsFor(null);
      setAmount('');
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar a arrecadação.');
    }
  };

  const handleConclude = async (campaign) => {
    try {
      await updateCampaign.mutateAsync({ campaignId: campaign.id, updates: { status: CAMPAIGN_STATUS.CONCLUDED } });
      toast.success('Chamado marcado como concluído.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir o chamado.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo chamado de doação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={HandCoins} title="Nenhum chamado de doação ativo" description="Crie um chamado para arrecadar fundos para esta organização." />
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const pct = campaign.goal > 0 ? Math.min(100, (Number(campaign.raised || 0) / campaign.goal) * 100) : 0;
            const concluded = campaign.status === CAMPAIGN_STATUS.CONCLUDED;
            return (
              <Card key={campaign.id} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{campaign.title}</h3>
                    {concluded ? (
                      <Badge variant="success" className="shrink-0 rounded-full">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concluída
                      </Badge>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {campaign.deadline ? `Até ${campaign.deadline}` : 'Sem prazo definido'}
                      </span>
                    )}
                  </div>
                  {campaign.description && (
                    <p className="mb-3 text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--highlight)))]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span><strong>{brl(campaign.raised)}</strong> arrecadados de {brl(campaign.goal)}</span>
                    {!concluded && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setAddFundsFor(campaign); setAmount(''); }}>
                          Registrar valor
                        </Button>
                        {pct >= 100 && (
                          <Button size="sm" onClick={() => handleConclude(campaign)} disabled={updateCampaign.isPending}>
                            Marcar como concluída
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo chamado de doação</DialogTitle>
            <DialogDescription>Crie uma campanha de arrecadação para esta organização.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp_title">Título *</Label>
              <Input id="camp_title" value={form.title} onChange={setField('title')} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp_description">Descrição</Label>
              <Textarea id="camp_description" value={form.description} onChange={setField('description')} maxLength={1000} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="camp_goal">Meta (R$) *</Label>
                <Input id="camp_goal" type="number" min="1" step="0.01" value={form.goal} onChange={setField('goal')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp_deadline">Prazo</Label>
                <Input id="camp_deadline" type="date" value={form.deadline} onChange={setField('deadline')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? 'Criando…' : 'Criar chamado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addFundsFor} onOpenChange={(v) => !v && setAddFundsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar valor arrecadado</DialogTitle>
            <DialogDescription>{addFundsFor?.title}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFunds} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp_amount">Valor recebido (R$)</Label>
              <Input id="camp_amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateCampaign.isPending}>Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

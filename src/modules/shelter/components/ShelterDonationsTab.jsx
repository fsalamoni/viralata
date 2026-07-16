/**
 * ShelterDonationsTab.jsx — TASK-790
 *
 * Aba "Chamados de Doação" do painel do abrigo.
 *
 * CRUD completo de campanhas de doação específicas do abrigo:
 *  - Criar/editar/excluir campanhas
 *  - Item type (ração / veterinário / medicamento / outros)
 *  - Meta de valor + progresso
 *  - Prazo + status
 *  - Registrar valor arrecadado
 *  - Comprovantes (envio + gestão)
 *
 * Gated pela feature flag SHELTER_DONATIONS.
 */

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, CheckCircle2, HandCoins, Edit2, Trash2, Image as ImageIcon, FileText,
  X, Receipt as ReceiptIcon, Eye, Package, Trash, Clock, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageUpload } from '@/components/ui/image-upload';
import { useClipboard } from '@/core/lib/useClipboard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useShelterDonations,
  useCreateShelterDonation,
  useUpdateShelterDonation,
  useAddShelterDonationFunds,
  useDeleteShelterDonation,
  useAllShelterDonationReceipts,
  useUpdateShelterReceiptStatus,
  useDeleteShelterDonationReceipt,
} from '../hooks/useShelterDonations';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { createAuditLog } from '@/core/services/auditService';
import { uploadImage } from '@/core/services/storageService';
import {
  SHELTER_DONATION_STATUS,
  SHELTER_DONATION_STATUS_LABELS,
  SHELTER_DONATION_ITEM_TYPE,
  SHELTER_DONATION_ITEM_LABELS,
  SHELTER_RECEIPT_STATUS,
  SHELTER_RECEIPT_STATUS_LABELS,
} from '../services/shelterDonationService';
import { confirmDialog } from '@/components/ui/confirm-provider';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPTY_DONATION = {
  title: '',
  description: '',
  item_type: SHELTER_DONATION_ITEM_TYPE.OTHER,
  goal: '',
  deadline: '',
  quantity_goal: '',
  quantity_unit: '',
  enable_receipt_upload: true,
};

const EMPTY_RECEIPT = {
  file_url: '',
  file_name: '',
  file_type: '',
  file_size: 0,
  note: '',
};

/* ============================== Item type badge colors ============================== */

function itemTypeVariant(itemType) {
  switch (itemType) {
    case SHELTER_DONATION_ITEM_TYPE.FOOD: return 'warning';
    case SHELTER_DONATION_ITEM_TYPE.VETERINARY: return 'secondary';
    case SHELTER_DONATION_ITEM_TYPE.MEDICATION: return 'success';
    default: return 'outline';
  }
}

function itemTypeIcon(itemType) {
  switch (itemType) {
    case SHELTER_DONATION_ITEM_TYPE.FOOD: return '🍖';
    case SHELTER_DONATION_ITEM_TYPE.VETERINARY: return '🏥';
    case SHELTER_DONATION_ITEM_TYPE.MEDICATION: return '💊';
    default: return '📦';
  }
}

/* ============================== Status badge ============================== */

function statusVariant(status) {
  switch (status) {
    case SHELTER_DONATION_STATUS.ACTIVE: return 'success';
    case SHELTER_DONATION_STATUS.CONCLUDED: return 'secondary';
    case SHELTER_DONATION_STATUS.PAUSED: return 'warning';
    case SHELTER_DONATION_STATUS.CANCELLED: return 'destructive';
    default: return 'outline';
  }
}

/* ============================== Main tab ============================== */

export function ShelterDonationsTab({ clubId, canManage = false }) {
  const { data: donations = [], isLoading } = useShelterDonations(clubId);
  const deleteDonation = useDeleteShelterDonation(clubId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [addFundsFor, setAddFundsFor] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova campanha
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : donations.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhuma campanha de doação"
          description="Crie sua primeira campanha para receber contribuições da comunidade."
        />
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <ShelterDonationCard
              key={d.id}
              donation={d}
              canManage={canManage}
              onEdit={() => { setEditing(d); setCreateOpen(true); }}
              onDelete={() => setConfirmDelete(d)}
              onAddFunds={() => { setAddFundsFor(d); setFundAmount(''); }}
            />
          ))}
        </div>
      )}

      {/* Comprovantes — seção unificada */}
      {canManage && <ShelterReceiptsSection clubId={clubId} />}

      <ShelterDonationEditorDialog
        open={createOpen}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditing(null); } }}
        clubId={clubId}
        donation={editing}
      />

      <ShelterAddFundsDialog
        donation={addFundsFor}
        onOpenChange={(v) => { if (!v) { setAddFundsFor(null); setFundAmount(''); } }}
        amount={fundAmount}
        setAmount={setFundAmount}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir campanha"
        description={`Tem certeza que deseja excluir "${confirmDelete?.title}"?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          try {
            await deleteDonation.mutateAsync(confirmDelete.id);
            toast.success('Campanha excluída.');
            setConfirmDelete(null);
          } catch (err) {
            toast.error(err?.message || 'Não foi possível excluir.');
          }
        }}
      />
    </div>
  );
}

/* ============================== Campaign card ============================== */

function ShelterDonationCard({ donation, canManage, onEdit, onDelete, onAddFunds }) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const pct = donation.goal > 0 ? Math.min(100, (Number(donation.raised || 0) / donation.goal) * 100) : 0;
  const concluded = donation.status === SHELTER_DONATION_STATUS.CONCLUDED;
  const active = donation.status === SHELTER_DONATION_STATUS.ACTIVE;
  const isOverdue = donation.deadline && new Date(donation.deadline) < new Date() && active;

  return (
    <section className="arena-section-card rounded-2xl">
      <div className="arena-section-card-body space-y-5 p-6 pt-6 sm:p-7 sm:pt-7">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg" aria-hidden>{itemTypeIcon(donation.item_type)}</span>
            <h3 className="text-base font-semibold">{donation.title}</h3>
            <Badge variant={itemTypeVariant(donation.item_type)} className="rounded-full text-[10px]">
              {SHELTER_DONATION_ITEM_LABELS[donation.item_type] || donation.item_type}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(donation.status)} className="rounded-full text-[10px]">
              {SHELTER_DONATION_STATUS_LABELS[donation.status] || donation.status}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="rounded-full text-[10px]">
                <AlertCircle className="mr-1 h-3 w-3" /> Prazo vencido
              </Badge>
            )}
            {donation.receipts_count > 0 && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {donation.receipts_count} comprov.{donation.receipts_count === 1 ? '' : 's'}
              </Badge>
            )}
            {canManage && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} aria-label="Editar">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} aria-label="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Descrição */}
        {donation.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{donation.description}</p>
        )}

        {/* Barra de progresso */}
        {donation.goal > 0 && (
          <div>
            <div className="mb-1 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--highlight)))]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>{brl(donation.raised)}</strong> de {brl(donation.goal)}
                <span className="ml-2 text-xs text-muted-foreground">({Math.round(pct)}%)</span>
              </span>
              {canManage && active && (
                <Button size="sm" variant="outline" onClick={onAddFunds}>
                  <Plus className="mr-1 h-3 w-3" /> Registrar valor
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Meta em quantidade */}
        {donation.quantity_goal && donation.quantity_unit && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>Meta: <strong>{donation.quantity_goal} {donation.quantity_unit}</strong></span>
          </div>
        )}

        {/* Prazo */}
        {donation.deadline && (
          <div className={cn(
            'flex items-center gap-2 text-xs',
            isOverdue ? 'text-destructive' : 'text-muted-foreground',
          )}>
            <Clock className="h-3.5 w-3.5" />
            {isOverdue ? 'Prazo vencido' : `Prazo: ${donation.deadline}`}
          </div>
        )}

        {/* Enviar comprovante (público) */}
        {!concluded && donation.status !== SHELTER_DONATION_STATUS.CANCELLED && donation.enable_receipt_upload !== false && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Contribuiu? Envie seu comprovante.
            </p>
            <Button size="sm" variant="outline" onClick={() => setReceiptOpen(true)}>
              <ReceiptIcon className="mr-1.5 h-4 w-4" /> Comprovante
            </Button>
          </div>
        )}

        <ShelterReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          donation={donation}
        />
      </div>
    </section>
  );
}

/* ============================== Editor de campanha ============================== */

function ShelterDonationEditorDialog({ open, onOpenChange, clubId, donation }) {
  const createDonation = useCreateShelterDonation(clubId);
  const updateDonation = useUpdateShelterDonation(clubId);
  const [form, setForm] = useState(EMPTY_DONATION);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      if (donation) {
        setForm({
          title: donation.title || '',
          description: donation.description || '',
          item_type: donation.item_type || SHELTER_DONATION_ITEM_TYPE.OTHER,
          goal: donation.goal || '',
          deadline: donation.deadline || '',
          quantity_goal: donation.quantity_goal || '',
          quantity_unit: donation.quantity_unit || '',
          enable_receipt_upload: donation.enable_receipt_upload !== false,
        });
      } else {
        setForm(EMPTY_DONATION);
      }
    }
  }, [open, donation]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setBool = (key) => (v) => setForm((p) => ({ ...p, [key]: v === true }));
  const setSelect = (key) => (v) => setForm((p) => ({ ...p, [key]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (donation) {
        await updateDonation.mutateAsync({ donationId: donation.id, updates: form });
        toast.success('Campanha atualizada.');
      } else {
        await createDonation.mutateAsync(form);
        toast.success('Campanha criada.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const isPending = createDonation.isPending || updateDonation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{donation ? 'Editar campanha' : 'Nova campanha de doação'}</DialogTitle>
          <DialogDescription>
            Defina o tipo de item, valor meta, prazo e outras configurações da campanha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Tipo de item */}
          <div className="space-y-2">
            <Label>Tipo de item *</Label>
            <Select value={form.item_type} onValueChange={setSelect('item_type')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectLabel>Selecione</SelectLabel>
                {Object.entries(SHELTER_DONATION_ITEM_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {itemTypeIcon(value)} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="sd_title">Título *</Label>
            <Input
              id="sd_title"
              value={form.title}
              onChange={setField('title')}
              maxLength={120}
              placeholder="Ex.: Campanha de ração julho/2026"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="sd_description">Descrição</Label>
            <Textarea
              id="sd_description"
              value={form.description}
              onChange={setField('description')}
              maxLength={500}
              rows={3}
              placeholder="Descreva a campanha e como as contribuições ajudarão."
            />
          </div>

          {/* Meta em valor + prazo */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sd_goal">Meta em R$ *</Label>
              <Input
                id="sd_goal"
                type="number"
                min="1"
                step="0.01"
                value={form.goal}
                onChange={setField('goal')}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd_deadline">Prazo</Label>
              <Input
                id="sd_deadline"
                type="date"
                value={form.deadline}
                onChange={setField('deadline')}
              />
            </div>
          </div>

          {/* Meta em quantidade (opcional) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sd_qty_goal">Meta em quantidade</Label>
              <Input
                id="sd_qty_goal"
                type="number"
                min="1"
                value={form.quantity_goal}
                onChange={setField('quantity_goal')}
                placeholder="Ex.: 500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd_qty_unit">Unidade</Label>
              <Input
                id="sd_qty_unit"
                value={form.quantity_unit}
                onChange={setField('quantity_unit')}
                placeholder="Ex.: kg, unidades, sachês"
                maxLength={30}
              />
            </div>
          </div>

          {/* Status (só editar) */}
          {donation && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={donation.status || SHELTER_DONATION_STATUS.ACTIVE}
                onValueChange={setSelect('status')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHELTER_DONATION_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Aceitar comprovantes */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Aceitar comprovantes</Label>
              <p className="text-[11px] text-muted-foreground">
                Permite que colaboradores enviem comprovantes de contribuição.
              </p>
            </div>
            <Switch
              checked={form.enable_receipt_upload}
              onCheckedChange={setBool('enable_receipt_upload')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || isPending}>
              {saving ? 'Salvando…' : (donation ? 'Salvar alterações' : 'Criar campanha')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Adicionar valor ============================== */

function ShelterAddFundsDialog({ donation, onOpenChange, amount, setAmount }) {
  const addFunds = useAddShelterDonationFunds(donation?.club_id);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addFunds.mutateAsync({ donationId: donation.id, amount: Number(amount) });
      toast.success('Valor registrado.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível atualizar.');
    }
  };
  return (
    <Dialog open={!!donation} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar valor arrecadado</DialogTitle>
          <DialogDescription>{donation?.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sd_amount">Valor recebido (R$)</Label>
            <Input
              id="sd_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addFunds.isPending}>Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Diálogo comprovante ============================== */

function ShelterReceiptDialog({ open, onOpenChange, donation }) {
  const { isAuthenticated, user } = useAuth();
  const createReceipt = useCreateShelterDonationReceipt(donation?.club_id, donation?.id);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_RECEIPT);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (open) { setForm(EMPTY_RECEIPT); }
  }, [open]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10 MB).');
      return;
    }
    setUploading(true);
    try {
      const meta = await uploadImage(file, { uid: donation.club_id, folder: 'shelter_donation_receipts' });
      setForm((p) => ({
        ...p,
        file_url: meta.url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      }));
    } catch (err) {
      toast.error(err?.message || 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.file_url) {
      toast.error('Anexe o comprovante antes de enviar.');
      return;
    }
    setSending(true);
    try {
      await createReceipt.mutateAsync(form);
      toast.success('Comprovante enviado. O abrigo ira analizar.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Nao foi possivel enviar.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar comprovante</DialogTitle>
          <DialogDescription>{donation?.title}</DialogDescription>
        </DialogHeader>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">Faça login para enviar um comprovante.</p>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Comprovante *</Label>
              {form.file_url ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2">
                  {form.file_type?.startsWith('image/') ? (
                    <img src={form.file_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                  ) : (
                    <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{form.file_name}</p>
                    <a href={form.file_url} target="_blank" rel="noreferrer" className="text-[11px] text-highlight hover:underline">Visualizar</a>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setForm(EMPTY_RECEIPT)} aria-label="Limpar">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-xs text-muted-foreground hover:bg-secondary/40"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Plus className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {uploading ? 'Enviando…' : 'Clique para anexar (imagem ou PDF)'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sd_r_note">Observação (opcional)</Label>
              <Textarea
                id="sd_r_note"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                rows={2}
                maxLength={300}
                placeholder="Ex.: 'Doação da família Silva'"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={sending || uploading || !form.file_url}>
                {sending ? 'Enviando…' : 'Enviar comprovante'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Seção de comprovantes (admin) ============================== */

function useCreateShelterDonationReceipt(clubId, donationId) {
  const createFn = useCreateShelterReceipt(clubId, donationId);
  return createFn;
}

function ShelterReceiptsSection({ clubId }) {
  const { data: receipts = [], isLoading } = useAllShelterDonationReceipts(clubId);
  const updateStatus = useUpdateShelterReceiptStatus(clubId);
  const deleteReceipt = useDeleteShelterDonationReceipt(clubId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const filtered = statusFilter === 'all' ? receipts : receipts.filter((r) => r.status === statusFilter);

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;

  return (
    <section className="arena-section-card rounded-2xl">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2 text-base">
          <ReceiptIcon className="h-4 w-4 text-primary" /> Comprovantes recebidos
        </h3>
        <p className="arena-section-card-description">
          {receipts.length} comprov.{receipts.length === 1 ? '' : 's'} enviados.
        </p>
      </div>
      <div className="arena-section-card-body space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
        {/* Filtro de status */}
        <div className="flex flex-wrap gap-2">
          {['all', ...Object.values(SHELTER_RECEIPT_STATUS)].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                statusFilter === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
              )}
            >
              {s === 'all' ? 'Todos' : SHELTER_RECEIPT_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nenhum comprovante{statusFilter !== 'all' ? ' com esse status' : ''}.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {filtered.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                {r.user_photo ? (
                  <img src={r.user_photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
                    {(r.user_name || 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.user_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.file_name} · {formatDistanceToNow(new Date(r.created_at_ms || 0), { addSuffix: true, locale: ptBR })}
                  </p>
                  {r.note && <p className="mt-0.5 text-[11px] text-foreground/80">&ldquo;{r.note}&rdquo;</p>}
                </div>
                <a href={r.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-highlight hover:underline">
                  <Eye className="h-3 w-3" /> Ver
                </a>
                <Badge variant={
                  r.status === SHELTER_RECEIPT_STATUS.CONFIRMED ? 'success'
                  : r.status === SHELTER_RECEIPT_STATUS.REJECTED ? 'destructive'
                  : r.status === SHELTER_RECEIPT_STATUS.REVIEWED ? 'warning'
                  : 'outline'
                } className="rounded-full">
                  {SHELTER_RECEIPT_STATUS_LABELS[r.status]}
                </Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(r)} aria-label="Editar status">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={async () => {
                    if (!(await confirmDialog({ title: 'Excluir este comprovante?' }))) return;
                    try {
                      await deleteReceipt.mutateAsync(r.id);
                      toast.success('Comprovante excluído.');
                    } catch (err) {
                      toast.error(err?.message || 'Não foi possível excluir.');
                    }
                  }}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <ShelterReceiptStatusDialog
          receipt={editing}
          onClose={() => setEditing(null)}
          onSave={async (status, note) => {
            try {
              await updateStatus.mutateAsync({ receiptId: editing.id, status, adminNote: note });
              toast.success('Status atualizado.');
              setEditing(null);
            } catch (err) {
              toast.error(err?.message || 'Não foi possível atualizar.');
            }
          }}
        />
      </div>
    </section>
  );
}

function ShelterReceiptStatusDialog({ receipt, onClose, onSave }) {
  const [status, setStatus] = useState(SHELTER_RECEIPT_STATUS.PENDING);
  const [note, setNote] = useState('');
  React.useEffect(() => {
    if (receipt) {
      setStatus(receipt.status || SHELTER_RECEIPT_STATUS.PENDING);
      setNote(receipt.admin_note || '');
    }
  }, [receipt]);
  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Status do comprovante</DialogTitle>
          <DialogDescription>{receipt?.user_name} — {receipt?.file_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(SHELTER_RECEIPT_STATUS).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                    status === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
                  )}
                >
                  {SHELTER_RECEIPT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_rs_note">Nota interna (opcional)</Label>
            <Textarea
              id="sd_rs_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Anotação da equipe (não é exibida ao público)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(status, note)}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

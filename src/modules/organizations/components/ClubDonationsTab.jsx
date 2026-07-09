import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, CheckCircle2, HandCoins, QrCode, Copy, Edit2, Trash2, Image as ImageIcon, FileText,
  X, Receipt as ReceiptIcon, ExternalLink, Eye, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn } from '@/core/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useClubDonations,
  useCreateClubDonation,
  useUpdateClubDonation,
  useAddDonationFunds,
  useDeleteClubDonation,
  useDonationReceipts,
  useAllClubReceipts,
  useCreateReceipt,
  useUpdateReceiptStatus,
  useDeleteReceipt,
} from '../hooks/useClubDonations';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { uploadImage } from '@/core/services/storageService';
import { CAMPAIGN_STATUS, RECEIPT_STATUS, RECEIPT_STATUS_LABELS, ORG_DONATION_LIMITS } from '../domain/constants';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPTY_DONATION = {
  title: '',
  description: '',
  goal: '',
  deadline: '',
  pix_key: '',
  pix_qr_url: '',
  bank_info: '',
  enable_receipt_upload: true,
};

const EMPTY_RECEIPT = {
  file_url: '',
  file_name: '',
  file_type: '',
  file_size: 0,
  note: '',
};

/**
 * Aba "Chamados de Doação" da ONG.
 *
 * Modos:
 *  - Público: visualiza a lista de doações e, em cada uma, vê:
 *      * Título, descrição, meta, valor arrecadado
 *      * Chave PIX / QR Code / dados bancários
 *      * Botão "Informar contribuição" — abre diálogo para enviar comprovante
 *  - Admin: além do público, pode:
 *      * Criar/editar/excluir doações
 *      * Registrar valor arrecadado
 *      * Ver e gerenciar os comprovantes enviados (status, nota interna)
 *
 * Separação:
 *  - Aba atual: lista de doações (este arquivo)
 *  - "Comprovantes" é uma subseção dentro do admin (abaixo da lista).
 */
export default function ClubDonationsTab({ clubId, isAdmin = false }) {
  const { data: donations = [], isLoading } = useClubDonations(clubId);
  const deleteDonation = useDeleteClubDonation(clubId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null); // donation sendo editada
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [addFundsFor, setAddFundsFor] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo chamado de doação
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : donations.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhum chamado de doação ativo"
          description="A ONG ainda não abriu uma campanha de arrecadação."
        />
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <DonationCard
              key={d.id}
              donation={d}
              isAdmin={isAdmin}
              onEdit={() => { setEditing(d); setCreateOpen(true); }}
              onDelete={() => setConfirmDelete(d)}
              onAddFunds={() => { setAddFundsFor(d); setFundAmount(''); }}
            />
          ))}
        </div>
      )}

      {/* Comprovantes (só admin) — embaixo da lista de doações */}
      {isAdmin && <ClubReceiptsSection clubId={clubId} />}

      <DonationEditorDialog
        open={createOpen}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditing(null); } }}
        donation={editing}
      />

      <AddFundsDialog
        donation={addFundsFor}
        onOpenChange={(v) => { if (!v) { setAddFundsFor(null); setFundAmount(''); } }}
        amount={fundAmount}
        setAmount={setFundAmount}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir chamado de doação"
        description={`Tem certeza que deseja excluir "${confirmDelete?.title}"? Os comprovantes vinculados serão preservados (mas o vínculo com o chamado será perdido).`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          try {
            await deleteDonation.mutateAsync(confirmDelete.id);
            toast.success('Chamado excluído.');
            setConfirmDelete(null);
          } catch (err) {
            toast.error(err?.message || 'Não foi possível excluir.');
          }
        }}
      />
    </div>
  );
}

/* ============================== Card de doação ============================== */

function DonationCard({ donation, isAdmin, onEdit, onDelete, onAddFunds }) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const pct = donation.goal > 0 ? Math.min(100, (Number(donation.raised || 0) / donation.goal) * 100) : 0;
  const concluded = donation.status === CAMPAIGN_STATUS.CONCLUDED;
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{donation.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {concluded ? (
              <Badge variant="success" className="rounded-full">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concluída
              </Badge>
            ) : donation.deadline ? (
              <span className="text-xs text-muted-foreground">Até {donation.deadline}</span>
            ) : (
              <Badge variant="warning" className="rounded-full">Aberta</Badge>
            )}
            {isAdmin && (
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

        {donation.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{donation.description}</p>
        )}

        {/* Barra de progresso */}
        <div>
          <div className="mb-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--highlight)))]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <strong>{brl(donation.raised)}</strong> arrecadados de {brl(donation.goal)}
              <span className="ml-2 text-xs text-muted-foreground">({Math.round(pct)}%)</span>
            </span>
            {isAdmin && !concluded && (
              <Button size="sm" variant="outline" onClick={onAddFunds}>
                Registrar valor
              </Button>
            )}
          </div>
        </div>

        {/* Dados para doar */}
        {(donation.pix_key || donation.pix_qr_url || donation.bank_info) && (
          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Como contribuir</p>
            {donation.pix_key && <PixKeyBlock pixKey={donation.pix_key} />}
            {donation.pix_qr_url && (
              <div className="flex items-center gap-2">
                <a href={donation.pix_qr_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={donation.pix_qr_url} alt="QR Code PIX" className="h-20 w-20 rounded-md border border-border bg-white object-contain p-1" />
                </a>
                <a href={donation.pix_qr_url} target="_blank" rel="noreferrer" className="text-xs text-highlight hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Abrir QR em tamanho real
                </a>
              </div>
            )}
            {donation.bank_info && (
              <p className="whitespace-pre-wrap text-xs text-foreground/90">{donation.bank_info}</p>
            )}
          </div>
        )}

        {/* Botão "Informar contribuição" (público) */}
        {!concluded && donation.enable_receipt_upload !== false && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Já contribuiu? Envie seu comprovante para a ONG registrar.
            </p>
            <Button size="sm" onClick={() => setReceiptOpen(true)}>
              <ReceiptIcon className="mr-1.5 h-4 w-4" /> Informar contribuição
            </Button>
          </div>
        )}

        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          donation={donation}
        />
      </CardContent>
    </Card>
  );
}

function PixKeyBlock({ pixKey }) {
  const { copy, copied } = useClipboard();
  return (
    <div className="flex items-center gap-2">
      <QrCode className="h-4 w-4 shrink-0 text-primary" />
      <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1 text-xs">{pixKey}</code>
      <Button size="sm" variant="outline" onClick={() => copy(pixKey, 'Chave PIX copiada!')}>
        {copied ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        Copiar
      </Button>
    </div>
  );
}

/* ============================== Editor de doação (criar/editar) ============================== */

function DonationEditorDialog({ open, onOpenChange, donation }) {
  const createDonation = useCreateClubDonation(donation?.club_id || '');
  const updateDonation = useUpdateClubDonation(donation?.club_id || '');
  const [form, setForm] = useState(EMPTY_DONATION);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      if (donation) {
        setForm({
          title: donation.title || '',
          description: donation.description || '',
          goal: donation.goal || '',
          deadline: donation.deadline || '',
          pix_key: donation.pix_key || '',
          pix_qr_url: donation.pix_qr_url || '',
          bank_info: donation.bank_info || '',
          enable_receipt_upload: donation.enable_receipt_upload !== false,
        });
      } else {
        setForm(EMPTY_DONATION);
      }
    }
  }, [open, donation]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setBool = (key) => (v) => setForm((p) => ({ ...p, [key]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (donation) {
        await updateDonation.mutateAsync({ donationId: donation.id, updates: form });
        toast.success('Chamado atualizado.');
      } else {
        await createDonation.mutateAsync(form);
        toast.success('Chamado criado.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{donation ? 'Editar chamado' : 'Novo chamado de doação'}</DialogTitle>
          <DialogDescription>
            Defina o objetivo, valor meta, dados para pagamento e, se quiser, permita que o público envie comprovantes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="d_title">Título *</Label>
            <Input id="d_title" value={form.title} onChange={setField('title')} maxLength={ORG_DONATION_LIMITS.TITLE_MAX} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_description">Descrição</Label>
            <Textarea id="d_description" value={form.description} onChange={setField('description')} maxLength={ORG_DONATION_LIMITS.DESCRIPTION_MAX} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d_goal">Meta (R$) *</Label>
              <Input id="d_goal" type="number" min="1" step="0.01" value={form.goal} onChange={setField('goal')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d_deadline">Prazo</Label>
              <Input id="d_deadline" type="date" value={form.deadline} onChange={setField('deadline')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_pix_key">Chave PIX</Label>
            <Input id="d_pix_key" value={form.pix_key} onChange={setField('pix_key')} maxLength={ORG_DONATION_LIMITS.PIX_KEY_MAX} placeholder="email@exemplo.com, CPF, telefone ou chave aleatória" />
          </div>
          <div className="space-y-2">
            <Label>QR Code PIX (imagem)</Label>
            <ImageUpload
              value={form.pix_qr_url}
              onChange={(url) => setField('pix_qr_url')({ target: { value: url } })}
              folder="donations"
              label="Enviar QR Code"
              hint="Imagem do QR Code PIX. Os doadores podem abrir em tamanho real para escanear."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_bank_info">Dados bancários</Label>
            <Textarea
              id="d_bank_info"
              value={form.bank_info}
              onChange={setField('bank_info')}
              maxLength={ORG_DONATION_LIMITS.BANK_INFO_MAX}
              rows={3}
              placeholder={'Banco: 001\nAgência: 1234-5\nConta: 67890-1\nTitular: ONG X'}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Aceitar comprovantes do público</Label>
              <p className="text-[11px] text-muted-foreground">
                Se ativado, qualquer usuário poderá enviar um comprovante para esta campanha.
              </p>
            </div>
            <Switch
              checked={form.enable_receipt_upload}
              onCheckedChange={setBool('enable_receipt_upload')}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : (donation ? 'Salvar alterações' : 'Criar chamado')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Adicionar valor arrecadado ============================== */

function AddFundsDialog({ donation, onOpenChange, amount, setAmount }) {
  const addFunds = useAddDonationFunds(donation?.club_id || '');
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addFunds.mutateAsync({ donationId: donation.id, amount: Number(amount) });
      toast.success('Arrecadação atualizada.');
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
            <Label htmlFor="d_amount">Valor recebido (R$)</Label>
            <Input id="d_amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addFunds.isPending}>Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== Diálogo de enviar comprovante ============================== */

function ReceiptDialog({ open, onOpenChange, donation }) {
  const { isAuthenticated } = useAuth();
  const createReceipt = useCreateReceipt(donation?.id);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_RECEIPT);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (open) setForm(EMPTY_RECEIPT);
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
      const meta = await uploadImage(file, { uid: donation.club_id, folder: 'donation_receipts' });
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
      toast.success('Comprovante enviado. A ONG irá analisar.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Informar contribuição</DialogTitle>
          <DialogDescription>
            Envie o comprovante de pagamento para {donation?.title}. A ONG recebe e registra internamente.
          </DialogDescription>
        </DialogHeader>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">
            Você precisa estar logado para enviar um comprovante.
          </p>
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
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setForm(EMPTY_RECEIPT)}>
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
                  {uploading ? <Plus className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  {uploading ? 'Enviando…' : 'Clique para anexar o comprovante (imagem ou PDF)'}
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
              <Label htmlFor="r_note">Observação (opcional)</Label>
              <Textarea
                id="r_note"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                rows={2}
                maxLength={ORG_DONATION_LIMITS.RECEIPT_NOTE_MAX}
                placeholder="Ex.: 'Doação feita em nome da família Silva'"
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

function ClubReceiptsSection({ clubId }) {
  const { data: receipts = [], isLoading } = useAllClubReceipts(clubId);
  const updateStatus = useUpdateReceiptStatus(clubId);
  const deleteReceipt = useDeleteReceipt(clubId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const filtered = statusFilter === 'all' ? receipts : receipts.filter((r) => r.status === statusFilter);

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptIcon className="h-4 w-4 text-primary" /> Comprovantes recebidos
        </CardTitle>
        <CardDescription>
          Total de {receipts.length} {receipts.length === 1 ? 'comprovante' : 'comprovantes'} enviados pelo público.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex flex-wrap gap-2">
          {['all', ...Object.values(RECEIPT_STATUS)].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                statusFilter === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
              )}
            >
              {s === 'all' ? 'Todos' : RECEIPT_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Nenhum comprovante {statusFilter !== 'all' ? 'com esse status' : ''}.</p>
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
                  r.status === RECEIPT_STATUS.CONFIRMED ? 'success'
                  : r.status === RECEIPT_STATUS.REJECTED ? 'destructive'
                  : r.status === RECEIPT_STATUS.REVIEWED ? 'warning'
                  : 'outline'
                } className="rounded-full">
                  {RECEIPT_STATUS_LABELS[r.status]}
                </Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(r)} aria-label="Editar status">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={async () => {
                    if (!confirm('Excluir este comprovante?')) return;
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

        <ReceiptStatusDialog
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
      </CardContent>
    </Card>
  );
}

function ReceiptStatusDialog({ receipt, onClose, onSave }) {
  const [status, setStatus] = useState(RECEIPT_STATUS.PENDING);
  const [note, setNote] = useState('');
  React.useEffect(() => {
    if (receipt) {
      setStatus(receipt.status || RECEIPT_STATUS.PENDING);
      setNote(receipt.admin_note || '');
    }
  }, [receipt]);
  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar status do comprovante</DialogTitle>
          <DialogDescription>
            {receipt?.user_name} — {receipt?.file_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(RECEIPT_STATUS).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                    status === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
                  )}
                >
                  {RECEIPT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rs_note">Nota interna (opcional)</Label>
            <Textarea
              id="rs_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={ORG_DONATION_LIMITS.RECEIPT_NOTE_MAX}
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

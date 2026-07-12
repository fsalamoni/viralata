/**
 * @fileoverview BanUserSection — workflow de banimento de usuários
 * (TASK-178) + timeline de auditoria por usuário (TASK-179).
 *
 * Montado no AdminUserManagement (/admin/admins). Fluxo:
 *  - Banir: dialog com motivo obrigatório (min 5 chars) + prazo
 *    (perpétuo / 7 / 30 / 90 dias). Grava banned_until + audit_log.
 *  - Desbanir: confirmação + audit_log.
 *  - Histórico: dialog com AuditLogTable filtrado pelo usuário
 *    (mostra bans, promoções de role, alterações — TASK-179).
 *
 * Recurso do usuário banido: o BannedNotice orienta contato via
 * e-mail (o recurso é analisado por humano; notificação por e-mail
 * automática fica para a Cloud Function de e-mail — TASK-222/229).
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Ban, History, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { AuditLogTable } from '@/components/AuditLogTable';
import { banUser, unbanUser } from '../services/adminService';

const DURATIONS = [
  { value: '', label: 'Perpétuo' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

export function BanUserSection({ users, actor, onChanged }) {
  const [search, setSearch] = useState('');
  const [banTarget, setBanTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = (users || []).filter((u) => u.role !== 'platform_admin');
    if (!term) return list.filter((u) => u.banned).concat(list.filter((u) => !u.banned).slice(0, 0));
    return list.filter((u) =>
      (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
  }, [users, term]);

  const openBan = (u) => { setBanTarget(u); setReason(''); setDuration(''); };

  const handleBan = async () => {
    if (reason.trim().length < 5) {
      toast.error('Informe o motivo (mínimo 5 caracteres).');
      return;
    }
    setSaving(true);
    try {
      const bannedUntil = duration
        ? new Date(Date.now() + Number(duration) * 86_400_000).toISOString()
        : null;
      await banUser(banTarget.id, reason.trim(), actor, bannedUntil);
      toast.success(`${banTarget.full_name || banTarget.email} banido${duration ? ` por ${duration} dias` : ' (perpétuo)'}.`);
      setBanTarget(null);
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível banir.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnban = async (u) => {
    if (!(await confirmDialog({
      title: `Remover banimento de ${u.full_name || u.email}?`,
      description: 'O usuário volta a acessar a plataforma imediatamente.',
      destructive: false,
      confirmLabel: 'Desbanir',
    }))) return;
    try {
      await unbanUser(u.id, actor);
      toast.success('Banimento removido.');
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível desbanir.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="h-4.5 w-4.5 text-destructive" /> Banimento de usuários
        </CardTitle>
        <CardDescription>
          Busque um usuário para banir (motivo + prazo), ou gerencie os banidos abaixo.
          Toda ação fica no audit log; o usuário banido vê o motivo e o prazo, e pode
          recorrer pelo e-mail de contato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Buscar usuário por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {visible.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            {term ? 'Nenhum usuário encontrado.' : 'Nenhum usuário banido. Busque acima para banir.'}
          </p>
        )}
        <ul className="space-y-2">
          {visible.slice(0, 20).map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={u.photo_url} />
                <AvatarFallback>{(u.full_name || u.email || '?')[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name || 'Sem nome'}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                {u.banned && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="destructive" className="text-[10px]">
                      Banido{u.banned_until ? ` até ${new Date(u.banned_until).toLocaleDateString('pt-BR')}` : ' (perpétuo)'}
                    </Badge>
                    {u.banned_reason && (
                      <span className="truncate text-[11px] text-muted-foreground">{u.banned_reason}</span>
                    )}
                  </div>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(u)}>
                <History className="mr-1 h-3.5 w-3.5" /> Histórico
              </Button>
              {u.banned ? (
                <Button size="sm" variant="outline" onClick={() => handleUnban(u)}>
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Desbanir
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openBan(u)}>
                  <Ban className="mr-1 h-3.5 w-3.5" /> Banir
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Dialog de banimento (TASK-178) */}
      <Dialog open={Boolean(banTarget)} onOpenChange={(o) => { if (!o) setBanTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir {banTarget?.full_name || banTarget?.email}</DialogTitle>
            <DialogDescription>
              O usuário perde o acesso imediatamente e vê o motivo na tela de bloqueio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ban_reason">Motivo * (visível ao usuário)</Label>
              <Textarea
                id="ban_reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: violação do Código de Conduta — conteúdo abusivo no mural."
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.value}
                    type="button"
                    size="sm"
                    variant={duration === d.value ? 'default' : 'outline'}
                    onClick={() => setDuration(d.value)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBan} disabled={saving || reason.trim().length < 5}>
              {saving ? 'Banindo…' : 'Confirmar banimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline de auditoria por usuário (TASK-179) */}
      <Dialog open={Boolean(historyTarget)} onOpenChange={(o) => { if (!o) setHistoryTarget(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de {historyTarget?.full_name || historyTarget?.email}</DialogTitle>
            <DialogDescription>
              Trilha de auditoria do usuário: banimentos, mudanças de papel e demais ações registradas.
            </DialogDescription>
          </DialogHeader>
          {historyTarget && (
            <AuditLogTable
              title="Eventos do usuário"
              description=""
              userId={historyTarget.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default BanUserSection;

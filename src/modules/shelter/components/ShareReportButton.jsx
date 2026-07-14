/**
 * @fileoverview ShareReportButton — modal para criar link de compartilhamento
 * seguro de relatório (TASK-155).
 *
 * **UX**:
 * 1. Admin clica "Compartilhar"
 * 2. Modal abre com form (período, expiração, max_views, nota)
 * 3. Sistema gera token + URL
 * 4. Modal mostra o link com botão "Copiar"
 * 5. Audit log registra a criação
 *
 * **Segurança visível**:
 *  - Mostra "Expira em X horas" + "Max N visualizações"
 *  - Avisa que cada acesso é auditado
 *  - Avisa que o link pode ser revogado
 */

import React, { useState } from 'react';
import { Share2, Copy, Check, Clock, Eye, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { createReportShare, DEFAULT_EXPIRATION_HOURS } from '../services/reportShareService';

const EXPIRATION_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 6, label: '6 horas' },
  { value: 24, label: '24 horas (padrão)' },
  { value: 72, label: '3 dias' },
  { value: 168, label: '7 dias' },
  { value: 720, label: '30 dias (máx)' },
];

/**
 * @param {object} props
 * @param {string} props.shelterClubId
 * @param {string} [props.shelterName]
 * @param {string} props.reportType
 * @param {object} [props.reportParams]
 * @param {string} props.periodType
 * @param {object} props.actor — { uid, displayName }
 */
export function ShareReportButton({
  shelterClubId,
  shelterName,
  reportType,
  reportParams = {},
  periodType = 'month',
  actor,
  variant = 'outline',
}) {
  const [open, setOpen] = useState(false);
  const [expiresHours, setExpiresHours] = useState(DEFAULT_EXPIRATION_HOURS);
  const [maxViews, setMaxViews] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null); // { url, expiresAt, ... }
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input) => createReportShare(input, actor),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Link de compartilhamento criado!');
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleOpen = () => {
    if (!actor?.uid) {
      toast.error('Você precisa estar logado para compartilhar relatórios.');
      return;
    }
    setResult(null);
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      report_type: reportType,
      report_params: reportParams,
      period_type: periodType,
      shelter_club_id: shelterClubId,
      shelter_name: shelterName,
      expires_in_hours: expiresHours,
      max_views: maxViews ? Number(maxViews) : undefined,
      note: note || undefined,
    });
  };

  const handleCopy = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      void e;
      toast.error('Erro ao copiar');
    }
  };

  const expiresAtLabel = result?.expiresAt
    ? new Date(result.expiresAt).toLocaleString('pt-BR')
    : '';

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={handleOpen}
        aria-label="Compartilhar relatório"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Compartilhar relatório
            </DialogTitle>
            <DialogDescription>
              Gere um link público com expiração. Cada acesso é auditado.
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiration">Expiração</Label>
                  <select
                    id="expiration"
                    value={expiresHours}
                    onChange={(e) => setExpiresHours(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {EXPIRATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="max-views">Máx. visualizações (opcional)</Label>
                  <Input
                    id="max-views"
                    type="number"
                    min="1"
                    placeholder="Ilimitado"
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="note">Nota interna (opcional)</Label>
                <Textarea
                  id="note"
                  rows={2}
                  placeholder="Ex.: Enviado para Dra. Maria (veterinária) — para análise clínica"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-amber-900">
                  <p className="font-medium">Lembrete de segurança</p>
                  <p className="text-xs mt-0.5">
                    Qualquer pessoa com o link pode visualizar este relatório.
                    Você pode revogar o acesso a qualquer momento.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Gerando...' : 'Gerar link'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {result && (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-sm font-medium text-emerald-900 mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Link criado com sucesso
                </p>
                <div className="flex gap-2">
                  <input
                    value={result.url}
                    readOnly
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-mono"
                  />
                  <Button onClick={handleCopy} variant="outline" className="shrink-0">
                    {copied ? <><Check className="h-4 w-4 mr-1" />Copiado</> : <><Copy className="h-4 w-4 mr-1" />Copiar</>}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-800">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Expira em {expiresAtLabel}
                  </Badge>
                  {maxViews && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Máx. {maxViews} visualizações
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Cada acesso é registrado em <code>audit_log</code> com IP e timestamp</p>
                <p>✓ Você pode revogar o acesso a qualquer momento</p>
                <p>✓ O link é gerado com 192 bits de entropia (impossível adivinhar)</p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
                <Button asChild>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Testar link
                  </a>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShareReportButton;

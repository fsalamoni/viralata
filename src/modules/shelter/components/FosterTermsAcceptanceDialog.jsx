/**
 * @fileoverview FosterTermsAcceptanceDialog — modal de aceite do
 * Termo de Lar Temporário (TASK-134).
 *
 * Modal 1-passo:
 *  1. Ler o termo integral (scroll-to-end obrigatório)
 *  2. Marcar checkbox de aceitação
 *  3. Inserir nome completo (assinatura)
 *  4. Confirmar
 *
 * Grava em `clubs/{clubId}/fosters/{fosterId}` os campos:
 *  - foster_terms_accepted_at
 *  - foster_terms_version
 *  - foster_signature_text
 *  - foster_terms_document_hash (SHA-256 do texto)
 *  - foster_terms_ip + foster_terms_user_agent (audit)
 *
 * Audit log automático via createAuditLog com action='foster_terms_accepted'.
 */

import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogClose,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollText, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { FOSTER_TERMS_VERSION, FOSTER_TERMS_TEXT } from '@/modules/shelter/domain/legal/fosterTerms';
import { createAuditLog } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';

async function computeSha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return null;
}

export function FosterTermsAcceptanceDialog({
  open,
  onOpenChange,
  fosterId,
  shelterClubId,
  onAccept,
}) {
  const { toast } = useToast();
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const termsLabel = `Termo de Lar Temporário v${FOSTER_TERMS_VERSION}`;

  const canSubmit = useMemo(
    () => termsRead && termsAccepted && signature.trim().length >= 3 && !submitting,
    [termsRead, termsAccepted, signature, submitting],
  );

  const handleScroll = (e) => {
    const t = e.currentTarget;
    if (t.scrollHeight - (t.scrollTop + t.clientHeight) < 30) {
      setTermsRead(true);
    }
  };

  const reset = () => {
    setTermsRead(false);
    setTermsAccepted(false);
    setSignature('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = (o) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const documentHash = await computeSha256Hex(FOSTER_TERMS_TEXT);
      const acceptance = {
        foster_terms_accepted_at: new Date().toISOString(),
        foster_terms_version: FOSTER_TERMS_VERSION,
        foster_signature_text: signature.trim(),
        foster_terms_document_hash: documentHash,
        foster_terms_ip: null, // preenchido server-side se possível
        foster_terms_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      };

      // Audit log best-effort
      try {
        await createAuditLog({
          action: 'foster_terms_accepted',
          actor: { uid: fosterId },
          details: {
            terms_version: FOSTER_TERMS_VERSION,
            document_hash: documentHash,
            signature_length: signature.trim().length,
            shelter_club_id: shelterClubId,
          },
        });
      } catch (auditErr) {
        logger.warn('FosterTermsAcceptance: audit log failed', auditErr);
      }

      if (onAccept) await onAccept(acceptance);
      toast({
        title: 'Termo aceito!',
        description: `${termsLabel} foi registrado com sucesso.`,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      logger.error('FosterTermsAcceptance: failed', err);
      setError(err.message || 'Erro ao registrar aceite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="foster-terms-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            {termsLabel}
          </DialogTitle>
          <DialogDescription>
            Lei 14.063/2020 (assinatura eletrônica nível básico) · LGPD Art. 7º V.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed"
          tabIndex={0}
          aria-label="Termo de Lar Temporário"
          data-testid="foster-terms-scroll"
        >
          {FOSTER_TERMS_TEXT.split('\n').map((p, i) => (
            <p key={i} className="mb-2 whitespace-pre-wrap">{p}</p>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {termsRead ? '✓ Você leu o termo até o final' : 'Role até o final para habilitar a aceitação'}
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={termsAccepted}
              disabled={!termsRead}
              onCheckedChange={(v) => setTermsAccepted(Boolean(v))}
              data-testid="foster-terms-accept"
            />
            <span className={termsRead ? '' : 'text-muted-foreground'}>
              Li e aceito o {termsLabel} integralmente
            </span>
          </label>

          <div>
            <Label htmlFor="foster-signature" className="text-sm">
              <ShieldCheck className="h-3 w-3 inline-block mr-1" />
              Assinatura eletrônica (nome completo)
            </Label>
            <Input
              id="foster-signature"
              placeholder="Seu nome completo"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              maxLength={120}
              disabled={!termsRead || !termsAccepted}
              data-testid="foster-signature-input"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Esta assinatura tem validade jurídica (Lei 14.063/2020).
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:space-x-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>Cancelar</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="foster-terms-submit"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Registrando...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar aceite</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FosterTermsAcceptanceDialog;

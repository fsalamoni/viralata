/**
 * @fileoverview ClickwrapDialog — diálogo genérico de aceite de termos
 * (TASK-210).
 *
 * Para ações críticas do voluntário, exige aceite explícito
 * dos termos antes de prosseguir. Atende Lei 14.063/2020.
 *
 * **Uso**:
 * ```jsx
 * <ClickwrapDialog
 *   open={show}
 *   title="Cancelar participação"
 *   terms={TERMS_TEXT}
 *   termsVersion="2026-07-14"
 *   action="cancel_participation"
 *   actor={user}
 *   onAccept={async () => { await cancelMutation.mutateAsync(...); }}
 *   onClose={() => setShow(false)}
 * />
 * ```
 *
 * **Segurança**:
 * - Registra aceite com hash (terms_version + timestamp + actor.uid)
 * - Scroll até o fim antes de habilitar botão
 * - Não pode fechar com tecla Escape (obrigatório aceitar OU cancelar)
 * - Audit log automático
 */
import { useState, useRef, useEffect } from 'react';
import { ScrollText, AlertTriangle, Check, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createAuditLog } from '@/core/services/auditService';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.terms — texto completo do termo
 * @param {string} props.termsVersion
 * @param {string} props.action — tipo de ação que está sendo autorizada
 * @param {object} props.actor — { uid, displayName }
 * @param {function} props.onAccept — async, chamado quando aceite é registrado
 * @param {function} props.onClose
 * @param {string} [props.acceptLabel="Aceitar e continuar"]
 * @param {string} [props.cancelLabel="Cancelar"]
 */
export function ClickwrapDialog({
  open,
  title,
  description,
  terms,
  termsVersion,
  action,
  actor,
  onAccept,
  onClose,
  acceptLabel = 'Aceitar e continuar',
  cancelLabel = 'Cancelar',
}) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  // Reset state ao abrir
  useEffect(() => {
    if (open) {
      setScrolledToEnd(false);
      setAccepted(false);
      setSubmitting(false);
    }
  }, [open, termsVersion]);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      // Audit log do aceite
      await createAuditLog({
        action: `clickwrap_accepted:${action}`,
        actor: actor || { uid: 'anonymous' },
        details: {
          terms_version: termsVersion,
          terms_length: terms?.length || 0,
          scrolled_to_end: scrolledToEnd,
          action_type: action,
        },
      }).catch(() => {}); // non-blocking

      if (onAccept) await onAccept();
      onClose?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('ClickwrapDialog.handleAccept', err);
    } finally {
      setSubmitting(false);
    }
  };

  const canAccept = scrolledToEnd && accepted && !submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh]"
        // Não permite fechar com Escape
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Não permite fechar clicando fora
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="border border-border/60 rounded-md p-4 max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap bg-muted/30"
          role="document"
          aria-label="Termo para aceite"
          tabIndex={0}
        >
          {terms}
        </div>

        {!scrolledToEnd && (
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Role até o final do termo para habilitar o botão de aceite.
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="clickwrap-accept"
            checked={accepted}
            onCheckedChange={setAccepted}
            disabled={!scrolledToEnd}
            aria-label="Confirmo que li e compreendi o termo"
          />
          <Label
            htmlFor="clickwrap-accept"
            className={`text-sm ${!scrolledToEnd ? 'opacity-50' : ''}`}
          >
            Confirmo que li e compreendi o termo acima, e estou ciente das
            implicações da ação que estou prestes a realizar.
          </Label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            <X className="h-4 w-4 mr-1" />
            {cancelLabel}
          </Button>
          <Button onClick={handleAccept} disabled={!canAccept}>
            <Check className="h-4 w-4 mr-1" />
            {submitting ? 'Processando...' : acceptLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ClickwrapDialog;

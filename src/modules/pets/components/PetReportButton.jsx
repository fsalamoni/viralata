/**
 * @fileoverview PetReportButton — reportar conteúdo impróprio (V3, TASK-V3-PET-DETAIL-6).
 *
 * Modal com radio de motivo + textarea. Submete para Cloud Function
 * `reportContent` (a ser criada) ou cria doc em `reports/{id}`.
 *
 * Tokens: `bg-card`, `text-foreground`, `border-border`. Sem cores hard-coded.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Reportar"
 */
import { useState, useRef, useEffect } from 'react';
import { Flag, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toast } from 'sonner';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

const REASONS = [
  { value: 'fake', label: 'Fotos ou informações falsas' },
  { value: 'abuse', label: 'Suspeita de maus-tratos' },
  { value: 'scam', label: 'Golpe ou fraude' },
  { value: 'duplicate', label: 'Pet duplicado' },
  { value: 'other', label: 'Outro motivo' },
];

export function PetReportButton({ petId, petName, className }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);

  // Foco no dialog quando abre
  useEffect(() => {
    if (open && dialogRef.current) {
      const first = dialogRef.current.querySelector('input,textarea,button');
      first?.focus();
    }
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleSubmit() {
    if (!user?.uid) {
      toast.info('Faça login para reportar.');
      return;
    }
    if (!reason) {
      toast.error('Selecione um motivo.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      toast.error('Descreva o motivo.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'pet',
        target_id: petId,
        target_name: petName || '',
        reporter_uid: user.uid,
        reason,
        details: details.trim() || null,
        status: 'pending',
        created_at: serverTimestamp(),
      });
      toast.success('Denúncia enviada. Obrigado por ajudar a manter a plataforma segura.');
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (err) {
      toast.error('Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Reportar este pet"
        title="Reportar"
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors',
          'hover:border-destructive/40 hover:text-destructive',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        data-testid="pet-report-button"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pet-report-title"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="pet-report-title" className="text-[17px] font-bold text-foreground">
                  Reportar pet
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {petName ? `Sobre ${petName}` : 'Conteúdo impróprio'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <fieldset className="mb-4 space-y-2">
              <legend className="mb-1 text-[12.5px] font-semibold text-foreground">Motivo</legend>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors',
                    reason === r.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-[13px] text-foreground">{r.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="mb-1 block text-[12.5px] font-semibold text-foreground" htmlFor="report-details">
              Detalhes (opcional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Conte o que aconteceu..."
              rows={3}
              maxLength={500}
              className="mb-4 w-full resize-none rounded-xl border border-border bg-background p-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !reason}
                aria-busy={submitting}
                className="flex-1"
              >
                {submitting ? 'Enviando...' : 'Enviar denúncia'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

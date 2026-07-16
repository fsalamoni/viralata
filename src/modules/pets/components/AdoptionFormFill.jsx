import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/core/lib/utils';
import {
  FORM_LIMITS, fieldOptions, normalizeForm, validateAnswers,
} from '../domain/adoptionForm';
import SingleAcceptanceDialog from '@/modules/shelter/components/legal/SingleAcceptanceDialog';
import {
  ADOPTION_TERMS_TEXT,
  ADOPTION_TERMS_VERSION,
} from '@/modules/shelter/domain/legal/adoptionTerms';

/**
 * Diálogo em duas etapas para o adotante:
 *  1. Responder ao formulário de adoção (campos dinâmicos configurados pelo abrigo)
 *  2. Aceitar o Termo de Adoção Responsável (clickwrap)
 *
 * O aceite do termo vira no callback onSubmit(answers, termsAcceptance), onde
 * `termsAcceptance` tem {signature, documentHash, documentVersion, acceptedAt}.
 * Aí o caller (PetDetail) passa isso como `terms_signature_text` no
 * `submitAdoptionApplication` — que grava no doc da application.
 *
 * Guias de Implementação Legal v2 (10/07/2026) §4.1 + Lei 14.063/2020.
 */
export default function AdoptionFormFill({
  open,
  onOpenChange,
  form,
  petTitle,
  submitting = false,
  onSubmit,
  prefillSignature = '',
}) {
  const fields = useMemo(() => normalizeForm(form).fields, [form]);
  const [step, setStep] = useState('form'); // 'form' | 'terms'
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  }

  function handleFormSubmit() {
    const result = validateAnswers(form, answers);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    // Avança para o step do termo de adoção
    setStep('terms');
  }

  function handleTermAccept(termsAcceptance) {
    onSubmit({ answers, termsAcceptance });
    // Reset pro próximo uso
    setStep('form');
    setAnswers({});
    setErrors({});
  }

  function handleTermCancel() {
    // Volta para o formulário (não fecha o modal)
    setStep('form');
  }

  function handleClose(open) {
    onOpenChange(open);
    if (!open) {
      setStep('form');
      setAnswers({});
      setErrors({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Formulário de adoção</DialogTitle>
              <DialogDescription>
                {petTitle
                  ? `Responda para demonstrar interesse em ${petTitle}.`
                  : 'Responda para demonstrar interesse na adoção.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-[13px]">
                    {field.label}
                    {field.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>

                  {field.type === 'long_text' && (
                    <Textarea
                      rows={3}
                      maxLength={FORM_LIMITS.ANSWER_MAX}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                    />
                  )}

                  {field.type === 'short_text' && (
                    <Input
                      maxLength={FORM_LIMITS.ANSWER_MAX}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                    />
                  )}

                  {(field.type === 'yes_no' || field.type === 'single_choice') && (
                    <div className="flex flex-wrap gap-2">
                      {fieldOptions(field).map((opt) => {
                        const active = answers[field.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswer(field.id, opt)}
                            className={cn(
                              'rounded-full border-2 px-4 py-1.5 text-[13px] font-bold transition-colors',
                              active
                                ? 'border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)]'
                                : 'border-border bg-card text-foreground/75 hover:border-primary/40',
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {errors[field.id] && <p className="text-xs text-destructive">{errors[field.id]}</p>}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleFormSubmit} disabled={submitting}>
                Continuar para o Termo de Adoção
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'terms' && (
          <SingleAcceptanceDialog
            open
            onOpenChange={(open) => { if (!open) handleTermCancel(); }}
            title="Termo de Adoção Responsável"
            description={`Você está prestes a formalizar o interesse em adotar ${petTitle || 'este animal'}. O termo abaixo é obrigatório e será assinado eletronicamente, com registro em audit_log (hash do documento + IP + data + versão).`}
            documentText={ADOPTION_TERMS_TEXT}
            documentVersion={ADOPTION_TERMS_VERSION}
            prefillSignature={prefillSignature}
            acceptButtonLabel="Aceitar e enviar interesse"
            onAccept={handleTermAccept}
            // Não usa onOpenChange para fechar — o caller gerencia
            // via onSubmit + handleClose
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

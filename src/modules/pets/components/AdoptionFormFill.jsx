import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/core/lib/utils';
import {
  FORM_LIMITS, fieldOptions, normalizeForm, validateAnswers,
} from '../domain/adoptionForm';

/**
 * Diálogo em que o adotante responde ao formulário de doação/adoção montado na
 * plataforma antes de registrar o interesse (item 5). As respostas validadas
 * são devolvidas ao chamador, que as grava no interesse de adoção.
 */
export default function AdoptionFormFill({ open, onOpenChange, form, petTitle, submitting, onSubmit }) {
  const fields = useMemo(() => normalizeForm(form).fields, [form]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  }

  function handleSubmit() {
    const result = validateAnswers(form, answers);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.answers);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar e demonstrar interesse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

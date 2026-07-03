import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import {
  FIELD_TYPE_LABELS, FIELD_TYPES, FORM_LIMITS, createField,
} from '../domain/adoptionForm';

/**
 * Construtor visual do formulário de doação/adoção montado na própria
 * plataforma (item 5). O responsável pelo pet adiciona perguntas, escolhe o
 * tipo, marca obrigatoriedade e, para escolha única, define as opções.
 *
 * Estado controlado pelo pai (`CreatePet`): `value` é `{ fields: [...] }` e
 * `onChange` recebe o novo objeto. A normalização/sanitização final acontece
 * no domínio (`normalizeForm`) na hora de gravar.
 */
export default function AdoptionFormBuilder({ value, onChange }) {
  const fields = Array.isArray(value?.fields) ? value.fields : [];

  function setFields(next) {
    onChange({ fields: next });
  }

  function addField() {
    if (fields.length >= FORM_LIMITS.MAX_FIELDS) return;
    setFields([...fields, createField('short_text')]);
  }

  function updateField(id, patch) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id) {
    setFields(fields.filter((f) => f.id !== id));
  }

  function moveField(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  function changeType(id, type) {
    const patch = { type };
    if (type === 'single_choice') {
      const current = fields.find((f) => f.id === id);
      patch.options = current?.options?.length >= 2 ? current.options : ['', ''];
    } else {
      patch.options = [];
    }
    updateField(id, patch);
  }

  function updateOption(id, optIndex, text) {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const options = [...(field.options || [])];
    options[optIndex] = text;
    updateField(id, { options });
  }

  function addOption(id) {
    const field = fields.find((f) => f.id === id);
    if (!field || (field.options?.length || 0) >= FORM_LIMITS.MAX_OPTIONS) return;
    updateField(id, { options: [...(field.options || []), ''] });
  }

  function removeOption(id, optIndex) {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    updateField(id, { options: (field.options || []).filter((_, i) => i !== optIndex) });
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-3.5 py-4 text-center text-[12.5px] text-muted-foreground">
          Nenhuma pergunta ainda. Crie um formulário para conhecer melhor os
          interessados (ex.: tipo de moradia, rotina, experiência com pets).
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
              Pergunta {index + 1}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => moveField(index, -1)} disabled={index === 0} aria-label="Mover para cima">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} aria-label="Mover para baixo">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                onClick={() => removeField(field.id)} aria-label="Remover pergunta">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            <Input
              value={field.label}
              maxLength={FORM_LIMITS.LABEL_MAX}
              placeholder="Escreva a pergunta (ex.: Qual seu tipo de moradia?)"
              onChange={(e) => updateField(field.id, { label: e.target.value })}
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="min-w-[160px] flex-1">
                <Select value={field.type} onValueChange={(t) => changeType(field.id, t)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground/85">
                <Switch checked={Boolean(field.required)}
                  onCheckedChange={(v) => updateField(field.id, { required: v })} />
                Obrigatória
              </label>
            </div>

            {field.type === 'single_choice' && (
              <div className="space-y-2 rounded-xl bg-secondary/30 p-2.5">
                <Label className="text-[11.5px] text-muted-foreground">Opções de resposta</Label>
                {(field.options || []).map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      maxLength={FORM_LIMITS.OPTION_MAX}
                      placeholder={`Opção ${optIndex + 1}`}
                      className="h-8"
                      onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeOption(field.id, optIndex)}
                      disabled={(field.options || []).length <= 2} aria-label="Remover opção">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {(field.options?.length || 0) < FORM_LIMITS.MAX_OPTIONS && (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-primary"
                    onClick={() => addOption(field.id)}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar opção
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {fields.length < FORM_LIMITS.MAX_FIELDS && (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={addField}>
          <Plus className="h-4 w-4" /> Adicionar pergunta
        </Button>
      )}
    </div>
  );
}

/**
 * @fileoverview DocumentFormBuilder (Fase 6 — SHELTER_DOCUMENTS_V1).
 *
 * Editor de esquema de formulário in-app (ex.: formulário de adoção). Permite
 * adicionar/editar/remover campos com tipo, rótulo, obrigatoriedade e opções.
 * É controlado: recebe `fields` e emite `onChange(nextFields)`. Toda a
 * sanitização de rótulos/opções ocorre no domínio ao normalizar/salvar.
 */

import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FIELD_TYPE, FIELD_TYPE_LABELS, fieldTypeHasOptions, DOC_LIMITS } from '@/modules/shelter/domain/documents/shelterDocuments';

const NEEDS_OPTIONS = { has: (t) => fieldTypeHasOptions(t) };

function newField() {
  return { key: `f_${Date.now().toString(36)}`, label: '', type: FIELD_TYPE.TEXT, required: false, options: [] };
}

export function DocumentFormBuilder({ fields = [], onChange, disabled = false }) {
  const [draft, setDraft] = useState(newField());

  const emit = (next) => { if (typeof onChange === 'function') onChange(next); };

  const addField = () => {
    if (!draft.label.trim()) return;
    if (fields.length >= DOC_LIMITS.FIELDS_MAX) return;
    emit([...fields, draft]);
    setDraft(newField());
  };

  const updateField = (idx, patch) => {
    emit(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx) => emit(fields.filter((_, i) => i !== idx));

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = fields.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    emit(next);
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {fields.map((field, idx) => (
          <li key={field.key || idx} className="rounded-lg border border-olive-200 bg-cream-50 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Label className="text-xs">Rótulo</Label>
                <Input
                  value={field.label || ''}
                  disabled={disabled}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                  placeholder="Ex.: Nome completo"
                />
              </div>
              <div className="sm:col-span-4">
                <Label className="text-xs">Tipo</Label>
                <Select value={field.type} disabled={disabled} onValueChange={(v) => updateField(idx, { type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(FIELD_TYPE).map((t) => (
                      <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 sm:col-span-3">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!field.required}
                    disabled={disabled}
                    onCheckedChange={(v) => updateField(idx, { required: !!v })}
                  />
                  Obrigatório
                </label>
              </div>
              {NEEDS_OPTIONS.has(field.type) && (
                <div className="sm:col-span-12">
                  <Label className="text-xs">Opções (uma por linha)</Label>
                  <textarea
                    className="min-h-[64px] w-full rounded-md border border-olive-200 bg-white p-2 text-sm"
                    value={(field.options || []).join('\n')}
                    disabled={disabled}
                    onChange={(e) => updateField(idx, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    placeholder={'Opção A\nOpção B'}
                  />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1">
              <Button type="button" size="icon" variant="ghost" disabled={disabled || idx === 0} onClick={() => move(idx, -1)} aria-label="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" disabled={disabled || idx === fields.length - 1} onClick={() => move(idx, 1)} aria-label="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={() => removeField(idx)} aria-label="Remover campo"><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          </li>
        ))}
      </ul>

      {fields.length === 0 && (
        <p className="text-sm text-olive-600">Nenhum campo ainda. Adicione o primeiro campo do formulário abaixo.</p>
      )}

      {!disabled && (
        <div className="rounded-lg border border-dashed border-olive-300 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <Label className="text-xs">Novo campo — rótulo</Label>
              <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Ex.: Telefone de contato" />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(FIELD_TYPE).map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button type="button" className="w-full" onClick={addField} disabled={!draft.label.trim() || fields.length >= DOC_LIMITS.FIELDS_MAX}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          {fields.length >= DOC_LIMITS.FIELDS_MAX && (
            <p className="mt-2 text-xs text-amber-700">Limite de {DOC_LIMITS.FIELDS_MAX} campos atingido.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Pré-visualização somente-leitura de um esquema de formulário. */
export function DocumentFormPreview({ fields = [] }) {
  if (!fields.length) return <p className="text-sm text-olive-600">Formulário sem campos.</p>;
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      {fields.map((field, idx) => (
        <div key={field.key || idx} className="space-y-1">
          <Label className="text-sm">
            {field.label}{field.required ? <span className="text-red-600"> *</span> : null}
          </Label>
          {field.type === FIELD_TYPE.TEXTAREA ? (
            <textarea className="min-h-[72px] w-full rounded-md border border-olive-200 p-2 text-sm" disabled />
          ) : field.type === FIELD_TYPE.CHECKBOX ? (
            <div className="space-y-1">
              {(field.options || []).map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-olive-700">
                  <input type="checkbox" disabled /> {opt}
                </label>
              ))}
            </div>
          ) : NEEDS_OPTIONS.has(field.type) ? (
            <Select disabled>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt, i) => <SelectItem key={i} value={String(i)}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input type={field.type === FIELD_TYPE.NUMBER ? 'number' : field.type === FIELD_TYPE.DATE ? 'date' : field.type === FIELD_TYPE.EMAIL ? 'email' : 'text'} disabled />
          )}
        </div>
      ))}
    </form>
  );
}

export default DocumentFormBuilder;

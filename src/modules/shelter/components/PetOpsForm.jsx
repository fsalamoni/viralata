/**
 * @fileoverview PetOpsForm — formulário genérico de registro para as
 * tabelas operacionais do abrigo (SHELTER_PET_OPS_TABLES_V1).
 *
 * Dirigido pelo config (petOpsConfigs): seletor de pet + campos declarados
 * + seção de AGENDAMENTO ("Agendar para data futura"). Ao agendar, o
 * registro recebe `scheduled_for = <campo de data>` e passa a ser tratado
 * como agendado (com alerta de proximidade na tabela).
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof value?.toDate === 'function') {
    try { return value.toDate().toISOString().slice(0, 10); } catch { return ''; }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * Rótulo do ID imutável do pet (#000001), com o mesmo padrão da tabela
 * operacional e do painel admin. Fallback: pet_code ou docId curto.
 */
function petSeqLabel(pet) {
  const seq = pet?.pet_seq;
  if (typeof seq === 'number' && Number.isFinite(seq) && seq > 0) {
    return `#${String(seq).padStart(6, '0')}`;
  }
  return pet?.pet_code || `#${String(pet?.id || '').slice(0, 6)}`;
}

function buildInitial(config, record) {
  const values = {};
  for (const f of config.fields) {
    if (record && record[f.name] != null) {
      values[f.name] = f.type === 'date' ? toDateInput(record[f.name]) : record[f.name];
    } else if (f.type === 'date') {
      values[f.name] = f.required ? todayISO() : '';
    } else {
      values[f.name] = f.defaultValue ?? '';
    }
  }
  return values;
}

export function PetOpsForm({ config, pets = [], record = null, defaultPetId = '', onSubmit, onCancel, submitting = false }) {
  const isEdit = Boolean(record);
  const [petId, setPetId] = useState(record?._petId || defaultPetId || (pets.length === 1 ? pets[0].id : ''));
  const [values, setValues] = useState(() => buildInitial(config, record));
  const [scheduled, setScheduled] = useState(Boolean(record?.scheduled_for && !record?.completed_at));
  const [errors, setErrors] = useState({});

  const sortedPets = useMemo(
    () => [...pets].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')),
    [pets],
  );

  const setField = (name, v) => setValues((prev) => ({ ...prev, [name]: v }));

  function validate() {
    const errs = {};
    if (!petId) errs.petId = 'Selecione o pet.';
    for (const f of config.fields) {
      if (f.required && !String(values[f.name] ?? '').trim()) {
        errs[f.name] = 'Obrigatório.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const data = {};
    for (const f of config.fields) {
      const raw = values[f.name];
      // Não envia strings vazias em campos opcionais (evita sujar o doc).
      if (raw === '' && !f.required) continue;
      data[f.name] = typeof raw === 'string' ? raw.trim() : raw;
    }
    // Agendamento: marca scheduled_for = data do campo de data; limpa completed_at.
    if (scheduled) {
      data.scheduled_for = values[config.dateField] || todayISO();
      data.completed_at = null;
    } else if (isEdit) {
      // Editar removendo o agendamento → realiza.
      data.scheduled_for = null;
    }
    onSubmit(petId, data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Seletor de pet */}
      <div className="space-y-1.5">
        <Label htmlFor="petops-pet">Pet *</Label>
        <Select value={petId} onValueChange={setPetId} disabled={isEdit}>
          <SelectTrigger id="petops-pet" aria-invalid={Boolean(errors.petId)}>
            <SelectValue placeholder="Selecione o pet…" />
          </SelectTrigger>
          <SelectContent>
            {sortedPets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name || p.title || 'Sem nome'}
                <span className="ml-1.5 text-xs text-muted-foreground">{petSeqLabel(p)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.petId && <p className="text-xs text-red-600">{errors.petId}</p>}
      </div>

      {/* Campos do config */}
      {config.fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={`petops-${f.name}`}>{f.label}{f.required ? ' *' : ''}</Label>
          {f.type === 'textarea' ? (
            <Textarea
              id={`petops-${f.name}`}
              value={values[f.name] ?? ''}
              onChange={(e) => setField(f.name, e.target.value)}
              placeholder={f.placeholder}
              rows={3}
            />
          ) : f.type === 'select' ? (
            <Select value={values[f.name] ?? ''} onValueChange={(v) => setField(f.name, v)}>
              <SelectTrigger id={`petops-${f.name}`}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {(f.options || []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`petops-${f.name}`}
              type={f.type === 'date' ? 'date' : 'text'}
              value={values[f.name] ?? ''}
              onChange={(e) => setField(f.name, e.target.value)}
              placeholder={f.placeholder}
              aria-invalid={Boolean(errors[f.name])}
            />
          )}
          {errors[f.name] && <p className="text-xs text-red-600">{errors[f.name]}</p>}
        </div>
      ))}

      {/* Agendamento */}
      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox checked={scheduled} onCheckedChange={(v) => setScheduled(Boolean(v))} className="mt-0.5" />
          <span className="text-sm">
            <span className="font-semibold">Agendar para data futura</span>
            <span className="block text-xs text-muted-foreground">
              Marque para tratar como agendamento. A data de <strong>{config.dateLabel.toLowerCase()}</strong> acima
              será a data prevista, e o gestor verá alertas de proximidade na tabela.
            </span>
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando…' : (isEdit ? 'Salvar' : 'Registrar')}
        </Button>
      </div>
    </form>
  );
}

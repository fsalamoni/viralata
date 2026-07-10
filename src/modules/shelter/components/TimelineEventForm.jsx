/**
 * @fileoverview Formulário para adicionar evento na timeline (Fase 2).
 *
 * Form dinâmico: muda os campos do payload conforme o `type` escolhido.
 * Validação client-side via Zod (defesa em profundidade — o service também
 * valida, e o Firestore rule).
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TIMELINE_EVENT_TYPES, TIMELINE_EVENT_LABELS } from '@/modules/shelter/domain/core/timeline';

export function TimelineEventForm({ onSubmit, onCancel, isSubmitting = false }) {
  const [type, setType] = useState('note');
  const [eventDate, setEventDate] = useState(_nowInput());
  const [data, setData] = useState({});
  const [error, setError] = useState(null);

  const payloadFields = useMemo(() => _fieldsForType(type), [type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = _buildPayload(type, data, eventDate);
      onSubmit(payload);
    } catch (err) {
      setError(String(err?.message || err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border p-4 bg-muted/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipo de evento</Label>
          <select
            id="type"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(e) => { setType(e.target.value); setData({}); }}
          >
            {TIMELINE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{TIMELINE_EVENT_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="event_date">Quando</Label>
          <Input
            id="event_date"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {payloadFields.map((f) => (
          <div key={f.name}>
            <Label htmlFor={`f-${f.name}`}>
              {f.label}
              {f.required ? ' *' : ''}
            </Label>
            {f.type === 'textarea' ? (
              <Textarea
                id={`f-${f.name}`}
                value={data[f.name] || ''}
                onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.value }))}
                required={f.required}
                rows={f.rows || 3}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
              />
            ) : f.type === 'select' ? (
              <select
                id={`f-${f.name}`}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={data[f.name] || f.default || ''}
                onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.value }))}
                required={f.required}
              >
                <option value="">—</option>
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <Input
                id={`f-${f.name}`}
                type="number"
                step={f.step || '0.01'}
                min={f.min}
                max={f.max}
                value={data[f.name] ?? ''}
                onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.value ? Number(e.target.value) : null }))}
                required={f.required}
                placeholder={f.placeholder}
              />
            ) : f.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  id={`f-${f.name}`}
                  type="checkbox"
                  checked={Boolean(data[f.name])}
                  onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.checked }))}
                />
                {f.checkboxLabel || f.label}
              </label>
            ) : (
              <Input
                id={`f-${f.name}`}
                type={f.type || 'text'}
                value={data[f.name] || ''}
                onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.value }))}
                required={f.required}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function _nowInput() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

const STATUSES = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_treatment', label: 'Em tratamento' },
  { value: 'fostered', label: 'Em lar temporário' },
  { value: 'adopted', label: 'Adotado' },
  { value: 'deceased', label: 'Óbito' },
  { value: 'returned', label: 'Devolvido' },
];

const ASILOMAR = [
  { value: 'healthy', label: 'Saudável' },
  { value: 'treatable_rehabilitatable', label: 'Tratável e reabilitável' },
  { value: 'treatable_manageable', label: 'Tratável com manejo' },
  { value: 'unhealthy_untreatable', label: 'Doente sem tratamento' },
  { value: 'undetermined', label: 'Não avaliado' },
];

const INTAKE_TYPES = [
  { value: 'rescue', label: 'Resgate' },
  { value: 'born', label: 'Nascido no abrigo' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'surrender', label: 'Entregue pelo tutor' },
  { value: 'purchase', label: 'Compra' },
];

function _fieldsForType(type) {
  switch (type) {
    case 'vaccine':
      return [
        { name: 'vaccine_name', label: 'Vacina', required: true, maxLength: 120, placeholder: 'V10, antirrábica…' },
        { name: 'manufacturer', label: 'Fabricante', maxLength: 80 },
        { name: 'batch_number', label: 'Lote', maxLength: 40 },
        { name: 'next_dose_date', label: 'Próxima dose', type: 'datetime-local' },
        { name: 'administered_by', label: 'Aplicado por', maxLength: 120, placeholder: 'Dr(a) …' },
      ];
    case 'deworming':
      return [
        { name: 'product_name', label: 'Produto', required: true, maxLength: 120 },
        { name: 'dose_mg', label: 'Dose (mg)', type: 'number', step: '0.1', min: 0 },
        { name: 'next_dose_date', label: 'Próxima dose', type: 'datetime-local' },
      ];
    case 'weight_measurement':
      return [
        { name: 'weight_kg', label: 'Peso (kg)', type: 'number', required: true, step: '0.01', min: 0, max: 500 },
        { name: 'notes', label: 'Observações', type: 'textarea', rows: 2, maxLength: 280 },
      ];
    case 'vet_visit':
      return [
        { name: 'clinic_name', label: 'Clínica', maxLength: 120 },
        { name: 'reason', label: 'Motivo', required: true, maxLength: 280 },
        { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea', rows: 2, maxLength: 1000 },
        { name: 'treatment', label: 'Tratamento', type: 'textarea', rows: 2, maxLength: 1000 },
        { name: 'attended_by', label: 'Atendido por', maxLength: 120 },
        { name: 'cost_cents', label: 'Custo (centavos)', type: 'number', min: 0 },
      ];
    case 'medication':
      return [
        { name: 'medication_name', label: 'Medicamento', required: true, maxLength: 120 },
        { name: 'dose', label: 'Dose', maxLength: 80, placeholder: '1cp 12/12h' },
        { name: 'administered_at', label: 'Administrado em', type: 'datetime-local' },
        { name: 'notes', label: 'Observações', type: 'textarea', rows: 2, maxLength: 500 },
      ];
    case 'status_change':
      return [
        { name: 'from_status', label: 'De', type: 'select', required: true, options: STATUSES },
        { name: 'to_status', label: 'Para', type: 'select', required: true, options: STATUSES },
        { name: 'reason', label: 'Motivo', type: 'textarea', rows: 2, maxLength: 500 },
      ];
    case 'transfer':
      return [
        { name: 'from_club_id', label: 'Abrigo de origem (ID)', required: true, maxLength: 128 },
        { name: 'to_club_id', label: 'Abrigo de destino (ID)', required: true, maxLength: 128 },
        { name: 'to_club_name', label: 'Nome do abrigo de destino', maxLength: 120 },
        { name: 'reason', label: 'Motivo', type: 'textarea', rows: 2, maxLength: 500 },
        { name: 'documentation_url', label: 'Link do documento', type: 'text', placeholder: 'https://…' },
      ];
    case 'microchip_registered':
      return [
        { name: 'microchip_id', label: 'ID do microchip (15 dígitos)', required: true, maxLength: 15, pattern: '^[0-9]{15}$' },
        { name: 'implant_location', label: 'Local do implante', maxLength: 80 },
        { name: 'implanted_by', label: 'Implantado por', maxLength: 120 },
      ];
    case 'note':
      return [
        { name: 'text', label: 'Anotação', type: 'textarea', required: true, rows: 3, maxLength: 2000 },
        { name: 'visibility', label: 'Visibilidade', type: 'select', required: true, default: 'internal', options: [
          { value: 'internal', label: 'Interna (só abrigo)' },
          { value: 'public', label: 'Pública (visível no perfil do pet)' },
        ] },
      ];
    case 'asilomar_assessment':
      return [
        { name: 'to_status', label: 'Novo status Asilomar', type: 'select', required: true, options: ASILOMAR },
        { name: 'reason', label: 'Justificativa', type: 'textarea', rows: 2, maxLength: 500 },
      ];
    case 'deceased':
      return [
        { name: 'cause', label: 'Causa', required: true, maxLength: 280 },
        { name: 'necropsy', label: 'Houve necropsia?', type: 'checkbox' },
        { name: 'reported_by', label: 'Reportado por', maxLength: 120 },
      ];
    case 'returned':
      return [
        { name: 'return_reason', label: 'Motivo da devolução', required: true, maxLength: 500 },
        { name: 'custody_returned_at', label: 'Data de retorno', type: 'datetime-local', required: true },
      ];
    case 'intake':
      return [
        { name: 'intake_type', label: 'Tipo de entrada', type: 'select', required: true, default: 'rescue', options: INTAKE_TYPES },
        { name: 'source', label: 'Origem', maxLength: 280 },
      ];
    case 'photo_added':
      return [
        { name: 'photo_url', label: 'URL da foto', type: 'text', required: true, placeholder: 'https://…' },
        { name: 'caption', label: 'Legenda', maxLength: 280 },
      ];
    default:
      return [];
  }
}

function _buildPayload(type, data, eventDate) {
  const iso = eventDate ? new Date(eventDate).toISOString() : new Date().toISOString();
  return {
    type,
    event_date: iso,
    data,
  };
}

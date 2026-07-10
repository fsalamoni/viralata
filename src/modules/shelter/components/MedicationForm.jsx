/**
 * @fileoverview Componente: MedicationForm (Fase 9).
 *
 * Formulário para criar uma medicação. Subcomponente do MedicationsList.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  MEDICATION_FREQUENCIES,
  MEDICATION_FREQUENCY_LABELS,
} from '@/modules/shelter/domain/clinical/medication';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function MedicationForm({ onSubmit, onCancel, isSubmitting = false }) {
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('every_8h');
  const [customHours, setCustomHours] = useState('');
  const [timesText, setTimesText] = useState('08:00, 16:00, 00:00');
  const [durationDays, setDurationDays] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Parse times
    const times = timesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => TIME_PATTERN.test(s));

    onSubmit({
      medication,
      dosage: dosage || undefined,
      frequency,
      custom_frequency_hours: customHours ? parseInt(customHours, 10) : undefined,
      times: times.length > 0 ? times : undefined,
      duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-4 bg-zinc-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Medicação</label>
          <Input
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="ex: Dipirona 500mg"
            maxLength={200}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Dosagem</label>
          <Input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="ex: 1 comprimido, 0.5ml"
            maxLength={80}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Frequência</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            {MEDICATION_FREQUENCIES.map((f) => (
              <option key={f} value={f}>{MEDICATION_FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </div>
        {frequency === 'custom' && (
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Intervalo customizado (h)
            </label>
            <Input
              type="number"
              min="1"
              max="168"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              placeholder="ex: 6"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Horários (HH:MM, vírgula)
          </label>
          <Input
            value={timesText}
            onChange={(e) => setTimesText(e.target.value)}
            placeholder="08:00, 16:00, 00:00"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Duração (dias)
          </label>
          <Input
            type="number"
            min="1"
            max="365"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="ex: 7"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Observações</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Após refeições, guardar em geladeira, etc."
            maxLength={2000}
            rows={2}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Registrar medicação'}
        </Button>
      </div>
    </form>
  );
}

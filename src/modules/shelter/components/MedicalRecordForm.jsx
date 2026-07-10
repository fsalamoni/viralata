/**
 * @fileoverview Componente: MedicalRecordForm (Fase 8).
 *
 * Formulário para adicionar um registro médico. Subcomponente do
 * MedicalRecordsList.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  MEDICAL_RECORD_TYPES,
  MEDICAL_RECORD_LABELS,
} from '@/modules/shelter/domain/clinical/medicalRecords';

export function MedicalRecordForm({ onSubmit, onCancel, isSubmitting = false }) {
  const [type, setType] = useState('consultation');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 16));
  const [vetName, setVetName] = useState('');
  const [vetCrmv, setVetCrmv] = useState('');
  const [chief, setChief] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');
  const [cost, setCost] = useState('');
  const [paidBy, setPaidBy] = useState('shelter');
  const [nextVisit, setNextVisit] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type,
      exam_date: new Date(examDate).toISOString(),
      vet_name: vetName || undefined,
      vet_crmv: vetCrmv || undefined,
      chief_complaint: chief || undefined,
      diagnosis: diagnosis || undefined,
      treatment: treatment || undefined,
      prescription: prescription || undefined,
      cost_cents: cost ? Math.round(parseFloat(cost) * 100) : undefined,
      paid_by: paidBy,
      next_visit_date: nextVisit ? new Date(nextVisit).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-4 bg-zinc-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            {MEDICAL_RECORD_TYPES.map((t) => (
              <option key={t} value={t}>{MEDICAL_RECORD_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Data</label>
          <Input
            type="datetime-local"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Veterinário(a)</label>
          <Input
            value={vetName}
            onChange={(e) => setVetName(e.target.value)}
            placeholder="Nome do(a) vet"
            maxLength={120}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">CRMV</label>
          <Input
            value={vetCrmv}
            onChange={(e) => setVetCrmv(e.target.value)}
            placeholder="ex: CRMV-SP 12345"
            maxLength={40}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Queixa principal</label>
          <Input
            value={chief}
            onChange={(e) => setChief(e.target.value)}
            placeholder="Motivo da consulta"
            maxLength={500}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Diagnóstico</label>
          <Textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="O que o veterinário constatou"
            maxLength={2000}
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Tratamento</label>
          <Textarea
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="Procedimentos, medicação, dieta"
            maxLength={2000}
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Prescrição</label>
          <Textarea
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            placeholder="Receita, doses, frequência"
            maxLength={2000}
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Custo (R$)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Pago por</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="shelter">Abrigo</option>
            <option value="foster">Lar temporário</option>
            <option value="adopter">Adotante</option>
            <option value="donation">Doação</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Próximo retorno</label>
          <Input
            type="datetime-local"
            value={nextVisit}
            onChange={(e) => setNextVisit(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar registro'}
        </Button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { AlertTriangle, Shield, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';

export const VICES_REDIBITORIOS = [
  { key: 'parvovirose', label: 'Parvovirose', description: 'Doença viral grave que pode acometer cães não vacinados.' },
  { key: 'giardiase', label: 'Giardíase', description: 'Infecção intestinal por protozoário. Transmissível para humanos.' },
  { key: 'cinomose', label: 'Cinomose', description: 'Doença viral multissistêmica. Pode deixar sequelas neurológicas.' },
  { key: 'leishmaniose', label: 'Leishmaniose', description: 'Doença grave transmitida por mosquito. Sem cura definitiva.' },
  { key: 'erliquiose', label: 'Erliquiose', description: 'Infecção bacteriana transmitida por carrapatos.' },
  { key: 'fiv_felv', label: 'FIV / FeLV', description: 'Imunodeficiência viral felina e leucemia felina. Incuráveis.' },
  { key: 'comportamental', label: 'Questões comportamentais', description: 'Reatividade, medo, agressividade, marcação urinária.' },
  { key: 'custos_vet', label: 'Custos veterinários', description: 'Vacinas, vermifugação, ração, exames. R$ 200-500/mês.' },
];

export function AdoptionDisclaimers({ vices = VICES_REDIBITORIOS, value = {}, onChange, required = true, className, testId = 'adoption-disclaimers' }) {
  const accepted = value || {};
  const allAccepted = vices.every((v) => accepted[v.key]);
  const toggle = (key) => onChange?.({ ...accepted, [key]: !accepted[key] });

  return (
    <aside className={cn('rounded-xl border-2 border-amber-300 bg-amber-50 p-5', className)} data-testid={testId} role="region" aria-label="Disclaimers de vícios redibitórios">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full bg-amber-200 p-2 text-amber-900"><AlertTriangle className="h-5 w-5" /></div>
        <div>
          <h3 className="text-[15px] font-bold text-amber-900">Ciência de vícios redibitórios</h3>
          <p className="text-[12.5px] text-amber-800">Antes de prosseguir, você deve estar ciente{required && ' (todos os checkboxes são obrigatórios)'}:</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {vices.map((v) => {
          const checked = !!accepted[v.key];
          return (
            <li key={v.key} className={cn('rounded-lg border bg-white p-3', checked ? 'border-emerald-300' : 'border-amber-200')}>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                <input type="checkbox" checked={checked} onChange={() => toggle(v.key)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-amber-300 text-emerald-600" data-testid={`${testId}-checkbox-${v.key}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {checked ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-amber-600" />}
                    {v.label}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{v.description}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center gap-2 border-t border-amber-200 pt-3 text-[12px]">
        <Shield className="h-4 w-4 text-amber-700" />
        <span className="text-amber-900">Sua aceitação é registrada no termo (Lei 14.063/2020) com IP, user-agent e timestamp.</span>
      </div>
      {!allAccepted && required && <p className="mt-3 text-[11.5px] font-semibold text-amber-900" data-testid={`${testId}-warning`}>⚠️ Marque todos os checkboxes para prosseguir.</p>}
    </aside>
  );
}

export default AdoptionDisclaimers;

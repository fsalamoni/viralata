/**
 * @fileoverview SchedulingFields — bloco reutilizável de "Agendar para data
 * futura" para os formulários médicos/operacionais do pet.
 *
 * Compartilha o MESMO modelo de agendamento das tabelas operacionais do
 * abrigo (domain/operational/petOpsScheduling): ao marcar, o registro
 * recebe `scheduled_for = <campo de data do form>` e passa a ser tratado
 * como agendado (com alerta de proximidade onde for exibido). Assim, um
 * agendamento feito na página do pet aparece também nas tabelas do abrigo
 * — tudo vinculado à mesma subcoleção `pets/{petId}/...`.
 */
import { Checkbox } from '@/components/ui/checkbox';

export function SchedulingFields({ scheduled, onScheduledChange, dateLabel = 'data', disabled = false }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          checked={scheduled}
          onCheckedChange={(v) => onScheduledChange(Boolean(v))}
          disabled={disabled}
          className="mt-0.5"
          aria-label="Agendar para data futura"
        />
        <span className="text-sm">
          <span className="font-semibold">Agendar para data futura</span>
          <span className="block text-xs text-muted-foreground">
            Marque para tratar como agendamento. A {dateLabel} acima será a data prevista,
            e os gestores verão alertas de proximidade.
          </span>
        </span>
      </label>
    </div>
  );
}

export default SchedulingFields;

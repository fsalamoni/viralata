/**
 * @fileoverview Componente: MedicalRecordsList (Fase 8).
 *
 * Lista cronológica reversa de registros médicos do animal. Filtra por
 * tipo, mostra badges, custo, retorno agendado.
 *
 * Feature flag: `shelter_health_records` (default OFF).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  MEDICAL_RECORD_TYPES,
  MEDICAL_RECORD_LABELS,
  needsFollowUp,
  formatCost,
} from '@/modules/shelter/domain/clinical/medicalRecords';
import {
  useMedicalRecords,
  useCreateMedicalRecord,
  useDeleteMedicalRecord,
} from '@/modules/shelter/hooks/useMedicalRecords';
import { MedicalRecordForm } from './MedicalRecordForm';
import { confirmDialog } from '@/components/ui/confirm-provider';

export function MedicalRecordsList({ petId, shelterClubId, canEdit = false, actor }) {
  const [typeFilter, setTypeFilter] = useState(null);
  const { data: records = [], isLoading } = useMedicalRecords(petId, shelterClubId, {
    type: typeFilter,
  });
  const createMutation = useCreateMedicalRecord(petId, shelterClubId);
  const deleteMutation = useDeleteMedicalRecord(petId, shelterClubId);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  if (!petId || !shelterClubId) {
    return <p className="text-sm text-muted-foreground">Pet/abrigo não definidos.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando prontuário…</p>;

  const handleSubmit = async (input) => {
    try {
      await createMutation.mutateAsync({ input, actor });
      toast({ title: 'Registro médico adicionado.' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async (recordId) => {
    if (!(await confirmDialog({ title: 'Remover este registro?' }))) return;
    try {
      await deleteMutation.mutateAsync({ recordId, actor });
      toast({ title: 'Registro removido.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  // Filtrar soft-deleted
  const visible = records.filter((r) => !r.deleted_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Prontuário Médico</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {visible.length} registro(s) {typeFilter ? `(${MEDICAL_RECORD_LABELS[typeFilter]})` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant={typeFilter === null ? 'default' : 'outline'} onClick={() => setTypeFilter(null)}>
              Todos
            </Button>
            {MEDICAL_RECORD_TYPES.slice(0, 6).map((t) => (
              <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)}>
                {MEDICAL_RECORD_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {canEdit && (
          <div className="mb-4">
            <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
              {showForm ? 'Cancelar' : '+ Adicionar registro'}
            </Button>
            {showForm && (
              <div className="mt-3">
                <MedicalRecordForm
                  onSubmit={handleSubmit}
                  onCancel={() => setShowForm(false)}
                  isSubmitting={createMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum registro {typeFilter ? `(${MEDICAL_RECORD_LABELS[typeFilter]})` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {visible.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="secondary">
                        {MEDICAL_RECORD_LABELS[r.type] || r.type}
                      </Badge>
                      <time className="text-xs text-muted-foreground">
                        {new Date(r.exam_date).toLocaleString('pt-BR')}
                      </time>
                      {needsFollowUp(r) && (
                        <Badge variant="outline" className="text-blue-700">
                          ↪ Retorno: {new Date(r.next_visit_date).toLocaleDateString('pt-BR')}
                        </Badge>
                      )}
                      {r.cost_cents != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatCost(r.cost_cents)}
                        </span>
                      )}
                    </div>
                    {r.chief_complaint && (
                      <p className="text-sm text-foreground">
                        <strong>Queixa:</strong> {r.chief_complaint}
                      </p>
                    )}
                    {r.diagnosis && (
                      <p className="text-sm text-foreground">
                        <strong>Diagnóstico:</strong> {r.diagnosis}
                      </p>
                    )}
                    {r.treatment && (
                      <p className="text-sm text-foreground">
                        <strong>Tratamento:</strong> {r.treatment}
                      </p>
                    )}
                    {r.prescription && (
                      <p className="text-sm text-foreground">
                        <strong>Prescrição:</strong> {r.prescription}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{r.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      por {r.vet_name || r.vet_uid?.slice(0, 8) || '?'}
                      {r.vet_crmv && ` (${r.vet_crmv})`}
                    </p>
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                      Remover
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

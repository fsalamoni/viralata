/**
 * @fileoverview PetOpsTab — container de uma sub-aba operacional do abrigo
 * (SHELTER_PET_OPS_TABLES_V1).
 *
 * Une: useShelterPetRecords (agregação por-pet) + PetOpsTable (tabela) +
 * modal com PetOpsForm (registro/edição com agendamento). Dirigido pelo
 * `variant` (chave em PET_OPS_CONFIGS). CRUD via as funções de serviço do
 * config; "marcar como realizada" limpa o agendamento.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { useShelterPetRecords } from '@/modules/shelter/hooks/useShelterPetRecords';
import { PetOpsTable } from './PetOpsTable';
import { PetOpsForm } from './PetOpsForm';
import { PET_OPS_CONFIGS } from '@/modules/shelter/domain/operational/petOpsConfigs';

export function PetOpsTab({ variant, shelterClubId, canManage = false, actor }) {
  const config = PET_OPS_CONFIGS[variant];
  const { toast } = useToast();
  const { data: pets = [] } = useMyPets(shelterClubId);
  const { records, isLoading, isError, refetch } = useShelterPetRecords(shelterClubId, config || { key: variant, listFn: async () => [] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!config) {
    return <p className="text-sm text-muted-foreground">Configuração não encontrada.</p>;
  }

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r) => { setEditing(r); setFormOpen(true); };

  const handleSubmit = async (petId, data) => {
    setSubmitting(true);
    try {
      // Carimba shelter_club_id: mantém os registros ligados ao abrigo
      // (medicações aparecem também na aba do pet, que filtra por
      // shelter_club_id) e prepara futura agregação por collectionGroup.
      const payload = shelterClubId ? { shelter_club_id: shelterClubId, ...data } : data;
      if (editing) {
        await config.updateFn(petId, editing.id, payload, actor);
        toast({ title: 'Registro atualizado.' });
      } else {
        await config.createFn(petId, payload, actor);
        toast({ title: 'Registro criado.' });
      }
      setFormOpen(false);
      setEditing(null);
      await refetch();
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r) => {
    if (!(await confirmDialog({ title: 'Excluir este registro?', description: 'Esta ação não pode ser desfeita.' }))) return;
    try {
      await config.deleteFn(r._petId, r.id, actor);
      toast({ title: 'Registro excluído.' });
      await refetch();
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async (r) => {
    try {
      await config.updateFn(r._petId, r.id, { scheduled_for: null, completed_at: new Date().toISOString() }, actor);
      toast({ title: 'Marcado como realizado.' });
      await refetch();
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <>
      <PetOpsTable
        title={config.title}
        records={records}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        dateField={config.dateField}
        dateLabel={config.dateLabel}
        columns={config.columns}
        canManage={canManage}
        emptyIcon={config.icon}
        emptyHint={config.emptyHint}
        onAdd={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onComplete={canManage ? handleComplete : undefined}
      />

      {canManage && (
        <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Editar — ${config.title}` : `Novo registro — ${config.title}`}</DialogTitle>
              <DialogDescription>
                Registre {config.title.toLowerCase()} de um pet do abrigo. Você pode agendar para uma data futura.
              </DialogDescription>
            </DialogHeader>
            <PetOpsForm
              config={config}
              pets={pets}
              record={editing}
              onSubmit={handleSubmit}
              onCancel={() => { setFormOpen(false); setEditing(null); }}
              submitting={submitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default PetOpsTab;

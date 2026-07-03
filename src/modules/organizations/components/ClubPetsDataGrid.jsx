import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusCircle, Download, Upload, Trash2, UploadCloud } from 'lucide-react';
import { useMyPets, useUpdatePet, useCreatePet, useDeletePet } from '@/modules/pets/hooks/usePets';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  PET_IMPORT_HEADERS, buildPetImportWorkbook, readImportFile, validateAndMapRows,
} from '@/modules/organizations/domain/petImport';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_process', label: 'Em processo' },
  { value: 'adopted', label: 'Adotado' },
];

const VACCINATED_OPTIONS = [
  { value: 'yes', label: 'Vacinado' },
  { value: 'partial', label: 'Parcial' },
  { value: 'no', label: 'Não vacinado' },
];

/**
 * Planilha de gestão de pets de uma organização: edição rápida inline
 * (status/vacinação/idade), exclusão em linha, e importação/exportação em
 * massa via .xlsx/.csv/.json (`domain/petImport.js`). Cadastro individual
 * completo (fotos, saúde, temperamento) continua no wizard `/pets/new` —
 * reaproveitado aqui em vez de duplicado numa "linha em branco" da tabela.
 */
export default function ClubPetsDataGrid({ clubId }) {
  const { data: pets = [], isLoading } = useMyPets(clubId);
  const updatePet = useUpdatePet();
  const createPet = useCreatePet();
  const deletePetMutation = useDeletePet();
  const [savingId, setSavingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleFieldChange(petId, field, value) {
    setSavingId(petId);
    try {
      await updatePet.mutateAsync({ petId, updates: { [field]: value } });
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deletePetMutation.mutateAsync(confirmDelete.id);
      toast.success('Animal removido.');
      setConfirmDelete(null);
    } catch {
      toast.error('Não foi possível remover o animal.');
    }
  }

  async function handleDownloadTemplate() {
    try {
      const XLSX = await import('xlsx');
      const workbook = buildPetImportWorkbook(XLSX, pets);
      XLSX.writeFile(workbook, `viralata-animais-${clubId}.xlsx`);
    } catch (err) {
      toast.error('Não foi possível gerar a planilha.');
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParsing(true);
    try {
      const XLSX = file.name.toLowerCase().endsWith('.xlsx') ? await import('xlsx') : null;
      const rawRows = await readImportFile(file, XLSX);
      const result = validateAndMapRows(rawRows, pets);
      setPreview(result);
    } catch (err) {
      toast.error(err.message || 'Não foi possível ler o arquivo.');
    } finally {
      setParsing(false);
    }
  }

  function setDuplicateAction(row, action) {
    setPreview((prev) => ({
      ...prev,
      duplicates: prev.duplicates.map((d) => (d.row === row ? { ...d, action } : d)),
    }));
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      let inserted = 0;
      let replaced = 0;
      for (const item of preview.toInsert) {
        await createPet.mutateAsync({ ...item.petData, photos: [], owner_id: clubId, owner_type: 'organization' });
        inserted += 1;
      }
      for (const dup of preview.duplicates) {
        if (dup.action === 'replace') {
          await updatePet.mutateAsync({ petId: dup.id, updates: dup.petData });
          replaced += 1;
        }
      }
      toast.success(`Importação concluída: ${inserted} novo(s), ${replaced} atualizado(s).`);
      setPreview(null);
      setImportOpen(false);
    } catch (err) {
      toast.error(err.message || 'Falha ao concluir a importação.');
    } finally {
      setImporting(false);
    }
  }

  function closeImport() {
    setImportOpen(false);
    setPreview(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-sm text-xs text-muted-foreground">
          Edite os animais diretamente na tabela ou importe um arquivo em massa.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar planilha modelo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> Importar planilha
          </Button>
          <Button asChild size="sm">
            <Link to="/pets/new"><PlusCircle className="mr-1.5 h-4 w-4" /> Novo pet</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : pets.length === 0 ? (
        <EmptyState
          title="Nenhum pet cadastrado por esta organização"
          description="Cadastre o primeiro pet em nome desta organização ou importe uma planilha."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vacinação</TableHead>
                <TableHead>Idade (meses)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pets.map((pet) => (
                <TableRow key={pet.id}>
                  <TableCell className="font-medium">
                    <Link to={`/pets/${pet.id}`} className="hover:text-primary hover:underline">
                      {pet.title || pet.name || 'Sem título'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={pet.status}
                      onValueChange={(v) => handleFieldChange(pet.id, 'status', v)}
                      disabled={savingId === pet.id}
                    >
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={pet.vaccinated}
                      onValueChange={(v) => handleFieldChange(pet.id, 'vaccinated', v)}
                      disabled={savingId === pet.id}
                    >
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VACCINATED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min="0"
                      defaultValue={pet.age_months ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        if (v !== (pet.age_months ?? null)) handleFieldChange(pet.id, 'age_months', v);
                      }}
                      disabled={savingId === pet.id}
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(pet)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      title="Excluir animal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir animal"
        description={confirmDelete ? `Tem certeza que deseja excluir "${confirmDelete.title || confirmDelete.name}"?` : ''}
        confirmLabel="Excluir"
        destructive
        loading={deletePetMutation.isPending}
        onConfirm={handleDelete}
      />

      <Dialog open={importOpen} onOpenChange={(v) => !v && closeImport()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar planilha de animais</DialogTitle>
            <DialogDescription>
              Aceita .xlsx, .csv ou .json seguindo o modelo padrão da plataforma ({PET_IMPORT_HEADERS.join(', ')}).
            </DialogDescription>
          </DialogHeader>

          {!preview && (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-secondary/40">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {parsing ? 'Lendo arquivo…' : 'Clique para selecionar o arquivo (.xlsx, .csv, .json)'}
              </span>
              <input type="file" accept=".xlsx,.csv,.json" className="hidden" disabled={parsing} onChange={handleFileSelected} />
            </label>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" className="rounded-full">{preview.toInsert.length} novos</Badge>
                <Badge variant="warning" className="rounded-full">{preview.duplicates.length} já cadastrados</Badge>
                <Badge variant="destructive" className="rounded-full">{preview.errors.length} com erro</Badge>
              </div>

              {preview.duplicates.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold">Animais já cadastrados — o que fazer?</h4>
                  <div className="space-y-2">
                    {preview.duplicates.map((dup) => (
                      <div key={dup.row} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-xs">
                        <span className="flex-1">Linha {dup.row} — <strong>{dup.name}</strong></span>
                        <Button
                          type="button"
                          size="sm"
                          variant={dup.action === 'keep' ? 'default' : 'outline'}
                          onClick={() => setDuplicateAction(dup.row, 'keep')}
                        >
                          Manter atual
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={dup.action === 'replace' ? 'default' : 'outline'}
                          onClick={() => setDuplicateAction(dup.row, 'replace')}
                        >
                          Substituir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.errors.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold">Erros encontrados</h4>
                  <div className="space-y-1.5">
                    {preview.errors.map((err, i) => (
                      <div key={i} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                        Linha {err.row} ({err.field}): {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleConfirmImport}
                disabled={importing || (preview.toInsert.length === 0 && preview.duplicates.every((d) => d.action !== 'replace'))}
              >
                {importing ? 'Importando…' : 'Confirmar importação'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

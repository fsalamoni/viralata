import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { PlusCircle, Download, Upload, Trash2, UploadCloud, Camera, LayoutGrid, List, RotateCcw } from 'lucide-react';
import { useMyPets, useUpdatePet, useCreatePet, useDeletePet } from '@/modules/pets/hooks/usePets';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { uploadImage } from '@/core/services/storageService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/core/lib/utils';
import PetCard from '@/modules/pets/components/PetCard';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import PetsOpsTable from './PetsOpsTable';
import {
  PET_IMPORT_HEADERS, buildPetImportWorkbook, readImportFile, validateAndMapRows,
} from '@/modules/organizations/domain/petImport';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Cachorro' }, { value: 'cat', label: 'Gato' }, { value: 'rabbit', label: 'Coelho' },
  { value: 'bird', label: 'Pássaro' }, { value: 'other', label: 'Outro' },
];
const SIZE_OPTIONS = [
  { value: 'mini', label: 'Mini' }, { value: 'small', label: 'Pequeno' }, { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' }, { value: 'giant', label: 'Gigante' },
];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_process', label: 'Em processo' },
  { value: 'adopted', label: 'Adotado' },
];

const STATUS_BADGE_CLASS = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  in_process: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  adopted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function PhotoCell({ pet, clubId, uid, canManage }) {
  const inputRef = useRef(null);
  const updatePet = useUpdatePet();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, { uid: uid || clubId, folder: 'pets' });
      await updatePet.mutateAsync({ petId: pet.id, updates: { photos: [url, ...(pet.photos || []).slice(1)] } });
    } catch {
      toast.error('Erro ao enviar foto.');
    } finally {
      setUploading(false);
    }
  }

  const [hover, setHover] = useState(false);

  if (!canManage) {
    return (
      <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-sm">
        {pet.photos?.[0] ? <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" /> : <Camera className="h-[16px] w-[16px]" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-sm transition-all hover:shadow-md"
    >
      {pet.photos?.[0] ? <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" /> : <Camera className="h-[16px] w-[16px]" />}
      {hover && (
        <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
          <Camera className="h-4 w-4" />
          <span className="mt-0.5 text-[9px] font-medium">Alterar</span>
        </span>
      )}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50">
          <RotateCcw className="h-4 w-4 animate-spin text-white" />
        </span>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  );
}

/**
 * Planilha de gestão de pets de uma organização: edição inline (foto, nome,
 * espécie, porte, raça, cidade, status), "Nova linha" cria um pet em branco
 * direto na tabela, exclusão em linha, e importação/exportação em massa via
 * .xlsx/.csv/.json (`domain/petImport.js`).
 *
 * `canManage` controla a gestão: quando `false` (ex.: visitante do perfil
 * público da organização), a lista de animais fica visível em modo somente
 * leitura — sem baixar modelo, importar, criar linha, editar ou excluir.
 * Só usuários com a atribuição de animais na organização podem gerir.
 */
export default function ClubPetsDataGrid({ clubId, canManage = true }) {
  const { user } = useAuth();
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
  const [addingRow, setAddingRow] = useState(false);
  const [viewMode, setViewMode] = useState('ops'); // 'ops' (nova tabela) | 'table' (legada) | 'cards'

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

  async function handleAddRow() {
    setAddingRow(true);
    try {
      await createPet.mutateAsync({
        title: '', name: '', species: 'dog', size: 'mini', city: '', status: 'available', photos: [],
        owner_id: clubId, owner_type: 'organization',
      });
    } catch {
      toast.error('Não foi possível criar a linha.');
    } finally {
      setAddingRow(false);
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
    let inserted = 0;
    let replaced = 0;
    try {
      // Remove cada item da lista local (e do preview em tela) assim que a
      // escrita é confirmada — se uma linha mais adiante falhar, o retry só
      // reprocessa o que ainda não foi salvo, sem duplicar animais já
      // inseridos (que não têm ID para serem reconhecidos como duplicata).
      const remaining = [...preview.toInsert];
      while (remaining.length > 0) {
        const item = remaining[0];
        await createPet.mutateAsync({ ...item.petData, photos: [], owner_id: clubId, owner_type: 'organization' });
        inserted += 1;
        remaining.shift();
        setPreview((prev) => (prev ? { ...prev, toInsert: [...remaining] } : prev));
      }
      const toReplace = preview.duplicates.filter((d) => d.action === 'replace');
      for (const dup of toReplace) {
        await updatePet.mutateAsync({ petId: dup.id, updates: dup.petData });
        replaced += 1;
        setPreview((prev) => (prev
          ? { ...prev, duplicates: prev.duplicates.map((d) => (d.row === dup.row ? { ...d, action: 'keep' } : d)) }
          : prev));
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-sm text-muted-foreground">
          {canManage
            ? 'Edite os animais diretamente na planilha ou importe um arquivo em massa.'
            : 'Animais cadastrados por esta organização.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle — only when pets exist */}
          {!isLoading && pets.length > 0 && (
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('ops')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'ops'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Tabela operacional: ID + colunas funcionais"
              >
                <List className="h-3.5 w-3.5" /> Operacional
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Planilha editável"
              >
                <List className="h-3.5 w-3.5" /> Planilha
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </button>
            </div>
          )}
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-1.5 h-4 w-4" /> Baixar planilha modelo
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" /> Importar planilha
              </Button>
              <Button size="sm" onClick={handleAddRow} disabled={addingRow}>
                <PlusCircle className="mr-1.5 h-4 w-4" /> Nova linha
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === 'cards' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>
          {Array.from({ length: viewMode === 'cards' ? 6 : 3 }).map((_, i) =>
            viewMode === 'cards' ? (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ) : (
              <Skeleton key={i} className="h-12 w-full" />
            ),
          )}
        </div>
      ) : pets.length === 0 ? (
        <EmptyState
          title="Nenhum animal cadastrado"
          description={canManage ? 'Adicione uma linha ou importe uma planilha.' : 'Esta organização ainda não cadastrou animais.'}
        />
      ) : viewMode === 'ops' ? (
        // TASK-V3-PET-OPS-LOG: tabela operacional com ID + colunas funcionais
        <PetsOpsTable pets={pets} isLoading={false} canManage={canManage} search="" />
      ) : viewMode === 'cards' ? (
        // Card view — consistente com a aba pública (ClubPetsPublicTab)
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pets.map((pet) => (
            <div key={pet.id} className="relative group">
              <PetCard pet={pet} />
              {canManage && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-2xl bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(pet)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-destructive shadow-sm transition-transform hover:scale-110"
                    title="Excluir animal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Table view — a tabela original com PhotoCell polido
        <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-[0_14px_34px_-28px_hsl(20_40%_20%/0.4)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead className="w-14 px-4 py-3">Foto</TableHead>
                <TableHead className="px-4 py-3">Nome</TableHead>
                <TableHead className="px-4 py-3">Espécie</TableHead>
                <TableHead className="px-4 py-3">Porte</TableHead>
                <TableHead className="px-4 py-3">Raça</TableHead>
                <TableHead className="px-4 py-3">Cidade</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                {canManage && <TableHead className="w-10 px-4 py-3" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pets.map((pet) => (
                <TableRow key={pet.id} className={savingId === pet.id ? 'opacity-60' : ''}>
                  <TableCell className="px-4 py-3">
                    <PhotoCell pet={pet} clubId={clubId} uid={user?.uid} canManage={canManage} />
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        defaultValue={pet.name || ''}
                        placeholder="Nome"
                        readOnly={!canManage}
                        disabled={savingId === pet.id}
                        onBlur={canManage ? (e) => { if (e.target.value !== (pet.name || '')) handleFieldChange(pet.id, 'name', e.target.value); } : undefined}
                        className="h-9 w-32 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                      />
                      {savingId === pet.id && (
                        <RotateCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <Select value={pet.species} onValueChange={(v) => handleFieldChange(pet.id, 'species', v)} disabled={!canManage || savingId === pet.id}>
                      <SelectTrigger className="h-9 w-28 border-transparent bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>{SPECIES_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <Select value={pet.size} onValueChange={(v) => handleFieldChange(pet.id, 'size', v)} disabled={!canManage || savingId === pet.id}>
                      <SelectTrigger className="h-9 w-24 border-transparent bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>{SIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <Input
                      defaultValue={pet.breed || ''}
                      placeholder="Raça"
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { if (e.target.value !== (pet.breed || '')) handleFieldChange(pet.id, 'breed', e.target.value); } : undefined}
                      className="h-9 w-28 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <Input
                      defaultValue={pet.city || ''}
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { if (e.target.value !== (pet.city || '')) handleFieldChange(pet.id, 'city', e.target.value); } : undefined}
                      className="h-9 w-28 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_BADGE_CLASS[pet.status] || STATUS_BADGE_CLASS.available)}>
                      {STATUS_OPTIONS.find((o) => o.value === pet.status)?.label || '—'}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(pet)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        title="Excluir animal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  )}
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

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { PlusCircle, Download, Upload, Trash2, UploadCloud, Camera } from 'lucide-react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
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

  if (!canManage) {
    return (
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white">
        {pet.photos?.[0] ? <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" /> : <Camera className="h-[15px] w-[15px]" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white"
    >
      {pet.photos?.[0] ? <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" /> : <Camera className="h-[15px] w-[15px]" />}
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
        title: '', name: '', species: 'dog', size: 'mini', city: '', state: '', status: 'available', photos: [],
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-sm text-xs text-muted-foreground">
          {canManage
            ? 'Edite os animais diretamente na planilha ou importe um arquivo em massa.'
            : 'Animais cadastrados por esta organização.'}
        </p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" /> Baixar planilha modelo
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" /> Importar planilha
            </Button>
            <Button size="sm" onClick={handleAddRow} disabled={addingRow}>
              <PlusCircle className="mr-1.5 h-4 w-4" /> Nova linha
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : pets.length === 0 ? (
        <EmptyState
          title="Nenhum animal cadastrado"
          description={canManage ? 'Adicione uma linha ou importe uma planilha.' : 'Esta organização ainda não cadastrou animais.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-[0_14px_34px_-28px_hsl(20_40%_20%/0.4)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead className="w-11">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-9" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pets.map((pet) => (
                <TableRow key={pet.id}>
                  <TableCell className="p-1.5">
                    <PhotoCell pet={pet} clubId={clubId} uid={user?.uid} canManage={canManage} />
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Input
                      defaultValue={pet.name || ''}
                      placeholder="Nome"
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { if (e.target.value !== (pet.name || '')) handleFieldChange(pet.id, 'name', e.target.value); } : undefined}
                      className="h-8 w-32 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Select value={pet.species} onValueChange={(v) => handleFieldChange(pet.id, 'species', v)} disabled={!canManage || savingId === pet.id}>
                      <SelectTrigger className="h-8 w-28 border-transparent bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>{SPECIES_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Select value={pet.size} onValueChange={(v) => handleFieldChange(pet.id, 'size', v)} disabled={!canManage || savingId === pet.id}>
                      <SelectTrigger className="h-8 w-24 border-transparent bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>{SIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Input
                      defaultValue={pet.breed || ''}
                      placeholder="Raça"
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { if (e.target.value !== (pet.breed || '')) handleFieldChange(pet.id, 'breed', e.target.value); } : undefined}
                      className="h-8 w-28 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Input
                      defaultValue={pet.city || ''}
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { if (e.target.value !== (pet.city || '')) handleFieldChange(pet.id, 'city', e.target.value); } : undefined}
                      className="h-8 w-28 border-transparent bg-transparent text-sm focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Input
                      defaultValue={pet.state || ''}
                      placeholder="UF"
                      maxLength={2}
                      readOnly={!canManage}
                      disabled={savingId === pet.id}
                      onBlur={canManage ? (e) => { const v = e.target.value.toUpperCase(); if (v !== (pet.state || '')) handleFieldChange(pet.id, 'state', v); } : undefined}
                      className="h-8 w-14 border-transparent bg-transparent text-sm uppercase focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                  <TableCell className="p-0.5">
                    <Select value={pet.status} onValueChange={(v) => handleFieldChange(pet.id, 'status', v)} disabled={!canManage || savingId === pet.id}>
                      <SelectTrigger className="h-8 w-32 border-transparent bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  {canManage && (
                    <TableCell className="p-1.5 text-center">
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

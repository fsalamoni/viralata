/**
 * @fileoverview ShelterDocumentsCentral (Fase 6 — SHELTER_DOCUMENTS_V1).
 *
 * Central de documentos do abrigo: reúne, num só lugar, todos os
 * formulários/termos/contratos/políticas criados pelo abrigo (armazenados de
 * forma ADITIVA no campo `documents` do doc do clube) e referencia o catálogo
 * de documentos legais da plataforma. Inclui editor interno com versionamento
 * imutável (hash SHA-256), vínculos aos fluxos e aos legais existentes, e
 * analytics de aceite computados a partir de coleções legíveis pelo abrigo.
 *
 * Montado apenas quando a flag `SHELTER_DOCUMENTS_V1` está ligada (o wiring do
 * painel v3 já faz o gating; aqui há checagem defensiva). Com a flag OFF este
 * componente não é renderizado e o painel atual permanece idêntico.
 */

import { useMemo, useState } from 'react';
import {
  FileText, Plus, Pencil, Archive, ArchiveRestore, Trash2, Link2, BadgeCheck, ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { useToast } from '@/components/ui/use-toast';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  DOC_CATEGORY_LABELS, DOC_STATUS, DOC_STATUS_LABELS, DOC_AUDIENCE_LABELS,
} from '@/modules/shelter/domain/documents/shelterDocuments';
import {
  useShelterDocuments, useShelterDocumentMutations, useAcceptanceAnalytics,
} from '@/modules/shelter/hooks/useShelterDocuments';
import { DocumentEditorDialog } from './DocumentEditorDialog';

const STATUS_TONE = {
  [DOC_STATUS.DRAFT]: 'bg-amber-100 text-amber-900',
  [DOC_STATUS.PUBLISHED]: 'bg-green-100 text-green-900',
  [DOC_STATUS.ARCHIVED]: 'bg-zinc-200 text-zinc-600',
};

function SummaryCard({ label, value, hint }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-olive-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-olive-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-olive-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ShelterDocumentsCentral({ shelterClubId, actor }) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_DOCUMENTS_V1);
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { central, summary, isLoading } = useShelterDocuments(shelterClubId);
  const mutations = useShelterDocumentMutations(shelterClubId);
  const analyticsQuery = useAcceptanceAnalytics(shelterClubId);

  const shelterDocs = central?.shelter || [];
  const platformDocs = central?.platform || [];

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (doc) => { setEditing(doc); setEditorOpen(true); };

  const doArchive = async (doc) => {
    try { await mutations.archiveDocument.mutateAsync({ docId: doc.id, actor }); toast({ title: 'Documento arquivado.' }); }
    catch (err) { toast({ title: 'Falha ao arquivar', description: err?.message, variant: 'destructive' }); }
  };
  const doRestore = async (doc) => {
    try { await mutations.restoreDocument.mutateAsync({ docId: doc.id, actor }); toast({ title: 'Documento restaurado.' }); }
    catch (err) { toast({ title: 'Falha ao restaurar', description: err?.message, variant: 'destructive' }); }
  };
  const doDelete = async (doc) => {
    const ok = await confirmDialog({
      title: 'Excluir documento?',
      description: `“${doc.title}” será removido do abrigo. Versões já aceitas por terceiros permanecem registradas nos aceites. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try { await mutations.deleteDocument.mutateAsync({ docId: doc.id, actor }); toast({ title: 'Documento excluído.' }); }
    catch (err) { toast({ title: 'Falha ao excluir', description: err?.message, variant: 'destructive' }); }
  };

  const analytics = analyticsQuery.data;

  const busy = useMemo(() => Object.values(mutations).some((m) => m?.isPending), [mutations]);

  if (!enabled || !shelterClubId) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-olive-900">
            <FileText className="h-5 w-5 text-terracotta-600" /> Central de documentos
          </h2>
          <p className="text-sm text-olive-600">
            Formulários, termos, contratos e políticas do abrigo, com versionamento e vínculo aos documentos legais da plataforma.
          </p>
        </div>
        <Button onClick={openNew} disabled={busy}>
          <Plus className="mr-1 h-4 w-4" /> Novo documento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Documentos" value={summary.total} hint={`${summary.byStatus.published} publicado(s)`} />
        <SummaryCard label="Rascunhos" value={summary.byStatus.draft} />
        <SummaryCard label="Exigem aceite" value={summary.acceptanceRequired} />
        <SummaryCard label="Legais da plataforma" value={summary.platformLegalTotal} hint="Catálogo" />
      </div>

      <Tabs defaultValue="shelter" className="w-full">
        <TabsList>
          <TabsTrigger value="shelter">Documentos do abrigo</TabsTrigger>
          <TabsTrigger value="platform">Catálogo legal</TabsTrigger>
          <TabsTrigger value="analytics">Analytics de aceite</TabsTrigger>
        </TabsList>

        <TabsContent value="shelter" className="mt-4">
          {isLoading ? (
            <p className="text-sm text-olive-500">Carregando…</p>
          ) : shelterDocs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Nenhum documento ainda"
              description="Crie formulários de adoção, termos de responsabilidade, contratos e políticas do abrigo."
              buttons={[{ label: 'Criar primeiro documento', onClick: openNew }]}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-olive-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Legais</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shelterDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium text-olive-900">{doc.title || '—'}</div>
                        {doc.description ? <div className="text-xs text-olive-500">{doc.description}</div> : null}
                        {doc.acceptance_required ? (
                          <Badge variant="secondary" className="mt-1 gap-1"><BadgeCheck className="h-3 w-3" />Aceite exigido</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{DOC_CATEGORY_LABELS[doc.category] || doc.category}</TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[doc.status] || 'bg-zinc-100 text-zinc-700'}`}>
                          {DOC_STATUS_LABELS[doc.status] || doc.status}
                        </span>
                      </TableCell>
                      <TableCell>{doc.current_version > 0 ? `v${doc.current_version}` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(doc.audience || []).map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px]">{DOC_AUDIENCE_LABELS[a] || a}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(doc.linked_legal || []).length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-olive-600">
                            <Link2 className="h-3 w-3" />{doc.linked_legal.length}
                          </span>
                        ) : <span className="text-xs text-olive-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(doc)} aria-label="Editar" disabled={busy}><Pencil className="h-4 w-4" /></Button>
                          {doc.status === DOC_STATUS.ARCHIVED ? (
                            <Button size="icon" variant="ghost" onClick={() => doRestore(doc)} aria-label="Restaurar" disabled={busy}><ArchiveRestore className="h-4 w-4" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => doArchive(doc)} aria-label="Arquivar" disabled={busy}><Archive className="h-4 w-4" /></Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => doDelete(doc)} aria-label="Excluir" disabled={busy}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="platform" className="mt-4">
          <p className="mb-3 text-sm text-olive-600">
            Documentos legais mantidos pela plataforma. Vincule-os aos documentos do abrigo pelo editor.
          </p>
          <div className="overflow-x-auto rounded-lg border border-olive-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Aceite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformDocs.map((p) => (
                  <TableRow key={p.slug}>
                    <TableCell>
                      <div className="font-medium text-olive-900">{p.title}</div>
                      {p.description ? <div className="text-xs text-olive-500">{p.description}</div> : null}
                    </TableCell>
                    <TableCell>{p.version ? `v${p.version}` : '—'}</TableCell>
                    <TableCell>{p.acceptance_required ? <Badge variant="secondary">Requer</Badge> : <span className="text-xs text-olive-400">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {analyticsQuery.isLoading ? (
            <p className="text-sm text-olive-500">Carregando métricas…</p>
          ) : !analytics ? (
            <p className="text-sm text-olive-500">Sem dados de aceite disponíveis.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Total de aceites" value={analytics.totalAcceptances} />
                <SummaryCard label="Termos de adoção" value={analytics.adoption.termsAccepted} hint={`${analytics.adoption.totalApplications} candidatura(s)`} />
                <SummaryCard label="Contratos assinados" value={analytics.contracts.fullySigned} hint={`${analytics.contracts.total} contrato(s)`} />
                <SummaryCard label="Entrevistas" value={analytics.interviews.completed + analytics.interviews.evaluated} hint="concluídas/avaliadas" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Taxa de aceite de termos (adoção)</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-olive-900">{Math.round((analytics.adoption.acceptanceRate || 0) * 100)}%</p>
                  {analytics.lastAcceptanceAt ? (
                    <p className="mt-1 text-xs text-olive-500">Último aceite: {new Date(analytics.lastAcceptanceAt).toLocaleDateString('pt-BR')}</p>
                  ) : null}
                </CardContent>
              </Card>
              <p className="text-xs text-olive-500">
                As métricas são calculadas a partir de dados que o abrigo já pode ler (candidaturas, contratos e entrevistas). Nenhum dado pessoal é exposto aqui.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DocumentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        doc={editing}
        mutations={mutations}
        actor={actor}
      />
    </div>
  );
}

export default ShelterDocumentsCentral;

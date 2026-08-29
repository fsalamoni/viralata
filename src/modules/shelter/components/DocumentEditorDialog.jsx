/**
 * @fileoverview DocumentEditorDialog (Fase 6 — SHELTER_DOCUMENTS_V1).
 *
 * Editor interno de documentos do abrigo: metadados (título, descrição,
 * categoria, público/fluxo, vínculos aos legais da plataforma, exigência de
 * aceite), corpo em Markdown (termos/contratos/políticas) com pré-visualização
 * segura via `MarkdownContent` (react-markdown com `skipHtml`), ou construtor
 * de formulário (categoria "form"). A publicação cria uma versão imutável com
 * hash SHA-256 do conteúdo. Toda a sanitização anti-XSS acontece no domínio/
 * service ao normalizar/salvar.
 */

import { useEffect, useMemo, useState } from 'react';
import { Save, UploadCloud, Eye, PencilLine } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { useToast } from '@/components/ui/use-toast';
import {
  DOC_CATEGORY, DOC_CATEGORY_LABELS, DOC_AUDIENCE, DOC_AUDIENCE_LABELS,
  DOC_LIMITS, isBodyCategory, isAcceptanceCategory,
} from '@/modules/shelter/domain/documents/shelterDocuments';
import { LEGAL_PAGES } from '@/modules/shelter/domain/legal';
import { DocumentFormBuilder, DocumentFormPreview } from './DocumentFormBuilder';

function blankDraft() {
  return {
    id: null,
    category: DOC_CATEGORY.TERMS,
    title: '',
    description: '',
    audience: [],
    legal_slugs: [],
    acceptance_required: false,
    body: '',
    form_schema: { fields: [] },
  };
}

export function DocumentEditorDialog({ open, onOpenChange, doc, mutations, actor }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(blankDraft());
  const [previewBody, setPreviewBody] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const isNew = !doc?.id;

  useEffect(() => {
    if (!open) return;
    if (doc?.id) {
      setDraft({
        id: doc.id,
        category: doc.category,
        title: doc.title || '',
        description: doc.description || '',
        audience: Array.isArray(doc.audience) ? doc.audience : [],
        legal_slugs: Array.isArray(doc.legal_slugs) ? doc.legal_slugs : [],
        acceptance_required: !!doc.acceptance_required,
        body: doc.body || '',
        form_schema: doc.form_schema || { fields: [] },
      });
    } else {
      setDraft(blankDraft());
    }
    setPreviewBody(false);
    setChangeSummary('');
    setEffectiveDate('');
  }, [open, doc]);

  const bodyMode = isBodyCategory(draft.category);
  const acceptanceEligible = isAcceptanceCategory(draft.category);

  const busy = useMemo(
    () => Object.values(mutations || {}).some((m) => m?.isPending),
    [mutations],
  );

  const toggleAudience = (aud) => {
    setDraft((d) => ({
      ...d,
      audience: d.audience.includes(aud) ? d.audience.filter((a) => a !== aud) : [...d.audience, aud],
    }));
  };

  const toggleLegal = (slug) => {
    setDraft((d) => ({
      ...d,
      legal_slugs: d.legal_slugs.includes(slug) ? d.legal_slugs.filter((s) => s !== slug) : [...d.legal_slugs, slug],
    }));
  };

  const persist = async () => {
    if (!draft.title.trim()) {
      toast({ title: 'Informe o título do documento.', variant: 'destructive' });
      return null;
    }
    const meta = {
      title: draft.title,
      description: draft.description,
      audience: draft.audience,
      legal_slugs: draft.legal_slugs,
      acceptance_required: acceptanceEligible ? draft.acceptance_required : false,
    };
    try {
      let docId = draft.id;
      if (isNew) {
        const created = await mutations.createDocument.mutateAsync({
          input: { ...meta, category: draft.category, body: draft.body, form_schema: draft.form_schema },
          actor,
        });
        docId = created?.id;
        setDraft((d) => ({ ...d, id: docId }));
      } else {
        await mutations.updateDocumentMeta.mutateAsync({ docId, patch: meta, actor });
        if (bodyMode) {
          await mutations.saveBody.mutateAsync({ docId, body: draft.body, actor });
        } else {
          await mutations.saveFormSchema.mutateAsync({ docId, formSchema: draft.form_schema, actor });
        }
      }
      toast({ title: 'Documento salvo como rascunho.' });
      return docId;
    } catch (err) {
      toast({ title: 'Não foi possível salvar', description: err?.message || String(err), variant: 'destructive' });
      return null;
    }
  };

  const publish = async () => {
    const docId = await persist();
    if (!docId) return;
    try {
      await mutations.publishDocument.mutateAsync({
        docId,
        options: { change_summary: changeSummary, effective_date: effectiveDate || null },
        actor,
      });
      toast({ title: 'Documento publicado.', description: 'Uma versão imutável foi registrada.' });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Não foi possível publicar', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" ariaLabel="Editor de documento do abrigo">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo documento' : 'Editar documento'}</DialogTitle>
          <DialogDescription>
            Crie formulários, termos, contratos e políticas do abrigo. A publicação registra uma versão imutável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Categoria</Label>
              <Select value={draft.category} disabled={!isNew} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(DOC_CATEGORY).map((c) => (
                    <SelectItem key={c} value={c}>{DOC_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isNew && <p className="mt-1 text-xs text-olive-500">A categoria não muda após a criação.</p>}
            </div>
            <div>
              <Label htmlFor="doc-title">Título</Label>
              <Input id="doc-title" value={draft.title} maxLength={DOC_LIMITS.TITLE_MAX} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Ex.: Termo de responsabilidade de adoção" />
            </div>
          </div>

          <div>
            <Label htmlFor="doc-desc">Descrição</Label>
            <Input id="doc-desc" value={draft.description} maxLength={DOC_LIMITS.DESCRIPTION_MAX} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Resumo curto do documento" />
          </div>

          <div>
            <Label className="mb-1 block">Público / fluxo</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(DOC_AUDIENCE).map((aud) => {
                const active = draft.audience.includes(aud);
                return (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => toggleAudience(aud)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-sm transition ${active ? 'border-terracotta-500 bg-terracotta-100 text-terracotta-900' : 'border-olive-200 bg-white text-olive-700 hover:bg-cream-50'}`}
                  >
                    {DOC_AUDIENCE_LABELS[aud]}
                  </button>
                );
              })}
            </div>
          </div>

          {acceptanceEligible && (
            <label className="flex items-center gap-3 rounded-lg border border-olive-200 bg-cream-50 p-3">
              <Switch checked={draft.acceptance_required} onCheckedChange={(v) => setDraft((d) => ({ ...d, acceptance_required: !!v }))} />
              <span className="text-sm text-olive-800">Exigir aceite explícito (clickwrap) deste documento</span>
            </label>
          )}

          {bodyMode ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Conteúdo (Markdown)</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPreviewBody((p) => !p)}>
                  {previewBody ? <><PencilLine className="mr-1 h-4 w-4" />Editar</> : <><Eye className="mr-1 h-4 w-4" />Pré-visualizar</>}
                </Button>
              </div>
              {previewBody ? (
                <div className="min-h-[180px] rounded-md border border-olive-200 bg-white p-3">
                  <MarkdownContent>{draft.body || '_Sem conteúdo._'}</MarkdownContent>
                </div>
              ) : (
                <Textarea
                  value={draft.body}
                  maxLength={DOC_LIMITS.BODY_MAX}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  className="min-h-[180px] font-mono text-sm"
                  placeholder={'# Título\n\nTexto do termo…\n\n- item\n- item'}
                />
              )}
              <p className="mt-1 text-xs text-olive-500">HTML é removido automaticamente por segurança. Use Markdown.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Campos do formulário</Label>
              <DocumentFormBuilder
                fields={draft.form_schema?.fields || []}
                onChange={(fields) => setDraft((d) => ({ ...d, form_schema: { ...d.form_schema, fields } }))}
              />
              <details className="rounded-md border border-olive-200 bg-cream-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-olive-800">Pré-visualizar formulário</summary>
                <div className="mt-3"><DocumentFormPreview fields={draft.form_schema?.fields || []} /></div>
              </details>
            </div>
          )}

          <div>
            <Label className="mb-1 block">Vincular a documentos legais da plataforma</Label>
            <div className="flex flex-wrap gap-2">
              {LEGAL_PAGES.map((p) => {
                const active = draft.legal_slugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => toggleLegal(p.slug)}
                    aria-pressed={active}
                    className={`rounded-md border px-2 py-1 text-xs transition ${active ? 'border-olive-500 bg-olive-100 text-olive-900' : 'border-olive-200 bg-white text-olive-600 hover:bg-cream-50'}`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-olive-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="doc-summary">Resumo da alteração (para publicação)</Label>
                <Input id="doc-summary" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Ex.: Ajuste na cláusula 3" />
              </div>
              <div>
                <Label htmlFor="doc-effective">Vigência a partir de</Label>
                <Input id="doc-effective" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
            </div>
            {!isNew && Array.isArray(doc?.versions) && doc.versions.length > 0 && (
              <p className="mt-2 text-xs text-olive-600">
                Versão atual: <Badge variant="secondary">v{doc.current_version}</Badge> · {doc.versions.length} versão(ões) registrada(s).
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={persist} disabled={busy}>
            <Save className="mr-1 h-4 w-4" /> Salvar rascunho
          </Button>
          <Button type="button" onClick={publish} disabled={busy}>
            <UploadCloud className="mr-1 h-4 w-4" /> Publicar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentEditorDialog;

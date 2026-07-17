import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, AlertCircle, CheckCircle2, Info, RotateCcw, Save, Shield, Eye, Edit3 } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { cn } from '@/core/lib/utils';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import {
  getPlatformContent,
  setPlatformContent,
  DEFAULT_PLATFORM_CONTENT,
  PLATFORM_CONTENT_PAGES,
  PLATFORM_CONTENT_LABELS,
} from '@/core/services/platformContentService';

export default function AdminContentEditor() {
  const { user, isPlatformAdmin } = useAuth();
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');
  const [page, setPage] = useState(PLATFORM_CONTENT_PAGES.TERMOS);
  const [body, setBody] = useState(DEFAULT_PLATFORM_CONTENT[PLATFORM_CONTENT_PAGES.TERMOS]);
  const [editorMode, setEditorMode] = useState('edit'); // 'edit' | 'preview'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Baseline per page: tracks what was loaded from DB / default
  const baselineRef = useRef({});

  const baseline = baselineRef.current[page];
  const dirty = baseline !== undefined && body !== baseline;

  const pageClass = useArenaPageClasses('arena-page space-y-5');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    setLoading(true);
    getPlatformContent(page).then((content) => {
      if (!active) return;
      const initial = content?.body || DEFAULT_PLATFORM_CONTENT[page];
      setBody(initial);
      baselineRef.current[page] = initial;
      setLastSavedAt(null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [page, isPlatformAdmin]);

  // Track loaded value: only set on initial load (when loading→false transition).
  // DO NOT update on every body change — that would always make dirty=false.
  const prevLoadingRef = useRef(true);
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      // Loading just finished: this is the loaded value, mark it as baseline.
      baselineRef.current[page] = body;
    }
    prevLoadingRef.current = loading;
  }, [loading, body, page]);

  if (!isPlatformAdmin) {
    return (
      <div className={deniedClass}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva do administrador da plataforma.
        </p>
      </div>
    );
  }

  async function handleSave() {
    if (dirty) {
      setSaving(true);
      try {
        await setPlatformContent(page, body, user);
        baselineRef.current[page] = body;
        const now = new Date();
        setLastSavedAt(now);
        toast.success('Conteúdo salvo.');
      } catch (e) {
        toast.error('Erro ao salvar conteúdo.');
      } finally {
        setSaving(false);
      }
    }
  }

  function handleReset() {
    const saved = baselineRef.current[page];
    if (saved !== undefined) {
      setBody(saved);
    }
  }

  return (
    <div className={pageClass}>
      {/* Cabeçalho */}
      <section className="arena-section-card">
        <div className="arena-section-card-body flex flex-wrap items-center gap-3 p-6 sm:p-7">
          <FileText className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Conteúdo institucional</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Edite o texto exibido nas páginas de Termos de Uso, Política de Privacidade e Legislação. Enquanto
              uma página não for salva aqui, ela mostra o texto padrão da plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* Seletor de página */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <TabsList className="arena-admin-tabs">
          {Object.values(PLATFORM_CONTENT_PAGES).map((key) => (
            <TabsTrigger key={key} value={key} className="arena-admin-tab-trigger">
              {PLATFORM_CONTENT_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Editor */}
      <Tabs value={page} onValueChange={setPage}>
        {Object.values(PLATFORM_CONTENT_PAGES).map((key) => (
          <TabsContent key={key} value={key}>
            <section className="arena-section-card">
              <div className="arena-section-card-body space-y-4 p-6 pt-5 sm:p-7 sm:pt-6">
                {/* Header row: page label + character counter */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {PLATFORM_CONTENT_LABELS[key]}
                  </p>
                  {loading ? (
                    <Skeleton className="h-6 w-24 rounded-full" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {body.length.toLocaleString('pt-BR')} / 40.000 caracteres
                    </span>
                  )}
                </div>

                {loading ? (
                  <Skeleton className="h-64 w-full rounded-xl" />
                ) : (
                  <>
                    {/* Edit / Preview toggle */}
                <div className="flex items-center gap-1 border border-border rounded-lg p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    aria-pressed={editorMode === 'edit'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      editorMode === 'edit'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    aria-pressed={editorMode === 'preview'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      editorMode === 'preview'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar
                  </button>
                </div>

                {editorMode === 'edit' ? (
                  <MarkdownEditor value={body} onChange={setBody} rows={18} maxLength={40000} disabled={saving} />
                ) : (
                  <div className="rounded-xl border border-border bg-card p-6 min-h-[400px] prose prose-sm max-w-none">
                    {body.trim() ? (
                      <MarkdownContent>{body}</MarkdownContent>
                    ) : (
                      <p className="text-muted-foreground italic">Nenhum conteúdo para visualizar.</p>
                    )}
                  </div>
                )}

                {/* Sticky save bar com dirty indicator + Cancelar + Salvar */}
                    <div className="sticky bottom-4 z-20">
                      <div
                        className={cn(
                          'flex flex-col items-stretch gap-2 rounded-2xl border bg-white/95 p-3 shadow-[0_18px_42px_-12px_rgba(64,34,18,0.28)] backdrop-blur-xl transition-colors sm:flex-row sm:items-center sm:justify-between',
                          saving
                            ? 'border-border/70'
                            : dirty
                              ? 'border-amber-300/70 ring-2 ring-amber-100'
                              : lastSavedAt
                                ? 'border-emerald-300/60'
                                : 'border-border/70'
                        )}
                      >
                        <div className="flex items-center gap-2 text-[12.5px]">
                          {saving ? (
                            <>
                              <Skeleton className="h-3.5 w-3.5 rounded-full" />
                              <span className="text-muted-foreground">Salvando…</span>
                            </>
                          ) : dirty ? (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="font-semibold text-amber-800">Alterações não salvas</span>
                            </>
                          ) : lastSavedAt ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span className="text-emerald-800">
                                Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          ) : (
                            <>
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Sem edições pendentes</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={!dirty || saving}
                            className="gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={!dirty || saving}
                            className="min-w-[140px] gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {saving ? 'Salvando…' : 'Salvar alterações'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

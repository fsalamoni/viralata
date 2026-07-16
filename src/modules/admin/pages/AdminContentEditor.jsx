import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Save } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [page, setPage] = useState(PLATFORM_CONTENT_PAGES.TERMOS);
  const [body, setBody] = useState(DEFAULT_PLATFORM_CONTENT[PLATFORM_CONTENT_PAGES.TERMOS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pageClass = useArenaPageClasses('space-y-5');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    setLoading(true);
    getPlatformContent(page).then((content) => {
      if (!active) return;
      setBody(content?.body || DEFAULT_PLATFORM_CONTENT[page]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [page, isPlatformAdmin]);

  if (!isPlatformAdmin) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await setPlatformContent(page, body, user);
      toast.success('Conteúdo salvo.');
    } catch (e) {
      toast.error('Erro ao salvar conteúdo.');
    } finally {
      setSaving(false);
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
                    <MarkdownEditor value={body} onChange={setBody} rows={18} maxLength={40000} disabled={saving} />
                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar alterações'}
                      </Button>
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

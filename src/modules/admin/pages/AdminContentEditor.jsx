import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Conteúdo institucional</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Edite o texto exibido nas páginas de Termos de Uso, Política de Privacidade e Legislação. Enquanto uma
        página não for salva aqui, ela mostra o texto padrão da plataforma.
      </p>

      <Tabs value={page} onValueChange={setPage}>
        <TabsList>
          {Object.values(PLATFORM_CONTENT_PAGES).map((key) => (
            <TabsTrigger key={key} value={key}>{PLATFORM_CONTENT_LABELS[key]}</TabsTrigger>
          ))}
        </TabsList>

        {Object.values(PLATFORM_CONTENT_PAGES).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <MarkdownEditor value={body} onChange={setBody} rows={16} maxLength={40000} disabled={saving} />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

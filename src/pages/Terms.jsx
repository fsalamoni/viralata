import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { LegalPage } from '@/components/legal-page';
import { getPlatformContent, DEFAULT_PLATFORM_CONTENT, PLATFORM_CONTENT_PAGES } from '@/core/services/platformContentService';

export default function Terms() {
  const [body, setBody] = useState(DEFAULT_PLATFORM_CONTENT[PLATFORM_CONTENT_PAGES.TERMOS]);

  useEffect(() => {
    let active = true;
    getPlatformContent(PLATFORM_CONTENT_PAGES.TERMOS).then((content) => {
      if (active && content) setBody(content.body);
    });
    return () => { active = false; };
  }, []);

  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Termos de Uso"
      description="Condições para uso da plataforma Viralata por adotantes, doadores e organizações."
      meta={`Versão 1.0 — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}. Ao usar a plataforma, você declara ciência e aceitação destas condições.`}
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MarkdownContent>{body}</MarkdownContent>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

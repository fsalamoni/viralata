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
      title="Termos de Uso e Condições Gerais"
      description="Condições para uso da plataforma Viralata por adotantes, doadores, voluntários, lares temporários e organizações (abrigos/ONGs)."
      meta={`${VERSION_LABEL}. Ao usar a plataforma, você declara ciência e aceitação destas condições. Veja também a Política de Privacidade (LGPD) e os termos específicos de cada papel.`}
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MarkdownContent>{body}</MarkdownContent>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

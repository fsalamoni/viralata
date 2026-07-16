import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { LegalPage } from '@/components/legal-page';
import { getPlatformContent, DEFAULT_PLATFORM_CONTENT, PLATFORM_CONTENT_PAGES } from '@/core/services/platformContentService';

export default function PrivacyPolicy() {
  const [body, setBody] = useState(DEFAULT_PLATFORM_CONTENT[PLATFORM_CONTENT_PAGES.PRIVACIDADE]);

  useEffect(() => {
    let active = true;
    getPlatformContent(PLATFORM_CONTENT_PAGES.PRIVACIDADE).then((content) => {
      if (active && content) setBody(content.body);
    });
    return () => { active = false; };
  }, []);

  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Política de Privacidade"
      description="Como a Viralata coleta, usa, compartilha e protege os dados pessoais de adotantes, doadores, abrigos, voluntários e lares temporários, em conformidade com a LGPD (Lei 13.709/2018)."
      meta={`Versão 2.0 — 10 de julho de 2026. Esta política aplica-se a todos os produtos, sites, APIs e serviços da Viralata.`}
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MarkdownContent>{body}</MarkdownContent>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

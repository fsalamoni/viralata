import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { LegalPage } from '@/components/legal-page';
import { getPlatformContent, DEFAULT_PLATFORM_CONTENT, PLATFORM_CONTENT_PAGES } from '@/core/services/platformContentService';

export default function Legislation() {
  const [body, setBody] = useState(DEFAULT_PLATFORM_CONTENT[PLATFORM_CONTENT_PAGES.LEGISLACAO]);

  useEffect(() => {
    let active = true;
    getPlatformContent(PLATFORM_CONTENT_PAGES.LEGISLACAO).then((content) => {
      if (active && content) setBody(content.body);
    });
    return () => { active = false; };
  }, []);

  return (
    <LegalPage
      eyebrow="Conteúdo educativo"
      title="Legislação e Posse Responsável"
      description="Resumo não-jurídico sobre leis de proteção animal e boas práticas de posse responsável no Brasil. Não substitui orientação jurídica ou veterinária profissional."
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MarkdownContent>{body}</MarkdownContent>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

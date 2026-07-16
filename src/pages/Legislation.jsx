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
      eyebrow="Conteúdo educativo · base legal"
      title="Legislação Animal e Posse Responsável"
      description="Panorama da legislação brasileira de proteção animal, com referências para denúncias, adoção responsável, telemedicina veterinária e guarda de pets. Conteúdo educativo — não substitui orientação jurídica ou veterinária."
      meta="Última atualização: 10 de julho de 2026. Este conteúdo é informativo; consulte sempre as fontes oficiais e a legislação municipal/estadual da sua cidade."
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MarkdownContent>{body}</MarkdownContent>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

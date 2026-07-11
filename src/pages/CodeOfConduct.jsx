/**
 * @fileoverview Código de Conduta — Fase 19.
 *
 * Regras de convivência, tolerância zero a maus-tratos, discriminação
 * e assédio. Aplica-se a todos os usuários, em todos os canais
 * (chat, eventos, vitrines, redes sociais oficiais).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Gavel,
  Heart,
  ShieldAlert,
  MessageSquareWarning,
  Ban,
  Eye,
  Scale,
  ScrollText,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function CodeOfConduct() {
  return (
    <LegalPage
      eyebrow="Convivência · todos os usuários"
      title="Código de Conduta"
      description="Regras de convivência da plataforma Viralata. Aplica-se a todos os usuários (adotantes, doadores, voluntários, lares temporários, abrigos) em todos os canais: chat, eventos, vitrines, redes sociais oficiais."
      meta="Versão 2.0 · 10 de julho de 2026. Tolerância zero a maus-tratos, discriminação, assédio e qualquer forma de violência."
    >
      <LegalSection
        icon={Heart}
        title="1. Nosso compromisso"
        description="Por que este código existe."
      >
        <p>
          A Viralata é uma comunidade de pessoas unidas pelo amor aos animais. Para preservar um
          ambiente seguro, acolhedor e respeitoso para todos — humanos e pets —, este Código de
          Conduta estabelece as regras mínimas de convivência. Ao utilizá-la, você declara ciência
          e concordância com estas regras, e se compromete a respeitá-las.
        </p>
        <p>
          Em caso de violação, a Viralata pode aplicar medidas proporcionais que vão de advertência
          privada à suspensão permanente da conta, com ou sem aviso prévio, conforme gravidade.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldAlert}
        title="2. Tolerância zero a maus-tratos"
        description="A linha que não pode ser cruzada."
      >
        <p>
          Maus-tratos a qualquer animal — doméstico, domesticado ou silvestre — são <strong>crime</strong>{' '}
          no Brasil (Lei 9.605/98 Art. 32 e Lei 14.064/2020), e a Viralata adota{' '}
          <strong>tolerância zero</strong> a qualquer conduta que envolva:
        </p>
        <LegalList>
          <LegalListItem>Violência física, psicológica, sexual, mutilação, tortura, envenenamento ou qualquer forma de crueldade.</LegalListItem>
          <LegalListItem>Abandono, negligência, privação de água, alimento, abrigo ou cuidado veterinário.</LegalListItem>
          <LegalListItem>Rinhas, competições violentas, exposições a sofrimento.</LegalListItem>
          <LegalListItem>Uso de animais em experiências estéticas dolorosas (corte de cordas vocais, corte de unhas até o sabugo, etc.) sem indicação veterinária.</LegalListItem>
          <LegalListItem>Venda disfarçada de animais em situação de maus-tratos.</LegalListItem>
          <LegalListItem>Enriquecimento com reprodução indiscriminada (“criatório”, “canil”, “gatil”) sem responsabilidade.</LegalListItem>
        </LegalList>
        <p>
          Qualquer indício de maus-tratos reportado na plataforma é encaminhado ao abrigo parceiro e
          às autoridades competentes. O usuário envolvido pode ter sua conta suspensa imediatamente,
          com ou sem notificação prévia, sem prejuízo de eventual responsabilização civil e criminal.
        </p>
      </LegalSection>

      <LegalSection
        icon={MessageSquareWarning}
        title="3. Condutas proibidas no chat e nos canais"
        description="Comportamentos inaceitáveis em qualquer canal da plataforma."
      >
        <LegalList>
          <LegalListItem><strong>Assédio</strong>: contatos insistentes após bloqueio, mensagens de teor sexual não solicitado, stalking, perseguição.</LegalListItem>
          <LegalListItem><strong>Discriminação</strong>: qualquer tratamento diferenciado por raça, etnia, gênero, orientação sexual, religião, deficiência, condição socioeconômica, aparência, região de origem ou estado civil.</LegalListItem>
          <LegalListItem><strong>Discurso de ódio</strong>: apologia à violência, ao nazismo, ao racismo, à homofobia, à transfobia ou qualquer outro preconceito.</LegalListItem>
          <LegalListItem><strong>Ameaça</strong>: intimidação, chantagem, coação, ameaça de violência física, patrimonial ou moral.</LegalListItem>
          <LegalListItem><strong>Spam</strong>: mensagens em massa, divulgação não autorizada, propaganda, links externos não relacionados à adoção.</LegalListItem>
          <LegalListItem><strong>Falsidade ideológica</strong>: identidade falsa, perfil falso, apropriação de fotos ou identidade de terceiros.</LegalListItem>
          <LegalListItem><strong>Conteúdo inadequado</strong>: nudez, pornografia, gore, gore animal, choque, memes ofensivos.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Ban}
        title="4. Condutas proibidas na plataforma"
        description="Regras operacionais."
      >
        <LegalList>
          <LegalListItem>Cadastrar pets inexistentes, com dados falsos, com informações deliberadamente omitidas, ou pets que não estão sob sua responsabilidade.</LegalListItem>
          <LegalListItem>Cadastrar organizações (abrigos/ONGs) sem representação legal válida ou com documentos falsificados.</LegalListItem>
          <LegalListItem>Fornecer informações falsas em aplicações de adoção, em questionários, em home checks ou em qualquer fluxo da plataforma.</LegalListItem>
          <LegalListItem>Repassar, vender, alugar, doar em pagamento ou dar em garantia o animal adotado, sem comunicação ao abrigo.</LegalListItem>
          <LegalListItem>Praticar “adoção por procuração” — intermediar adoções em nome de terceiros sem registro formal.</LegalListItem>
          <LegalListItem>Manipular avaliações, depoimentos ou contadores de “match” para inflar reputação.</LegalListItem>
          <LegalListItem>Usar robôs, scrapers, scripts ou automação para acessar, copiar ou manipular a plataforma (Marco Civil Art. 7º).</LegalListItem>
          <LegalListItem>Realizar engenharia reversa, descompilar ou tentar descobrir código-fonte do software.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Scale}
        title="5. Boas práticas esperadas"
        description="Comportamentos que valorizamos."
      >
        <LegalList>
          <LegalListItem>Comunicar-se com cordialidade, mesmo em situações de conflito.</LegalListItem>
          <LegalListItem>Fornecer informações verdadeiras, completas e atualizadas.</LegalListItem>
          <LegalListItem>Respeitar os prazos de resposta combinados em aplicações e adoções.</LegalListItem>
          <LegalListItem>Tratar todos os animais com paciência, especialmente aqueles com traumas.</LegalListItem>
          <LegalListItem>Colaborar com mediação quando solicitado pela equipe Viralata ou pelo abrigo.</LegalListItem>
          <LegalListItem>Reportar condutas inadequadas de outros usuários (botão de denúncia).</LegalListItem>
          <LegalListItem>Respeitar a privacidade alheia — não publicar fotos ou dados sem consentimento.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Eye}
        title="6. Denúncias e moderação"
        description="Como reportar violações e o que acontece depois."
      >
        <p>
          A Viralata oferece botão de denúncia em todas as mensagens e perfis. Denúncias são
          analisadas pela equipe de moderação em até 72h, com possível mediação ou ação. Casos
          graves (maus-tratos, ameaça, discriminação) são tratados com prioridade e podem gerar
          suspensão imediata.
        </p>
        <p>
          Ao reportar, você declara, sob as penas da lei, que as informações são verdadeiras.
          Denúncias falsas ou realizadas de má-fé podem sujeitar o denunciante às mesmas sanções
          previstas para o denunciado.
        </p>
      </LegalSection>

      <LegalSection
        icon={Gavel}
        title="7. Sanções e medidas"
        description="Consequências proporcionais à gravidade."
      >
        <LegalList>
          <LegalListItem><strong>Advertência privada</strong>: notificação por e-mail com descrição da conduta e solicitação de cessação.</LegalListItem>
          <LegalListItem><strong>Advertência pública</strong>: notificação visível no perfil do usuário.</LegalListItem>
          <LegalListItem><strong>Suspensão temporária</strong>: bloqueio do uso da plataforma por 7, 15, 30 ou 90 dias, conforme reincidência.</LegalListItem>
          <LegalListItem><strong>Banimento permanente</strong>: encerramento da conta, sem possibilidade de recriação.</LegalListItem>
          <LegalListItem><strong>Comunicação às autoridades</strong>: em casos de crime (maus-tratos, ameaça, falsidade ideológica), a Viralata pode comunicar às autoridades competentes (Lei 9.605/98, CP).</LegalListItem>
          <LegalListItem><strong>Indenização</strong>: a Viralata pode buscar reparação civil por danos materiais e morais decorrentes de condutas abusivas (Art. 186 CC).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="8. Disposições finais"
      >
        <p>
          Este Código integra o <a href="/termos">Termo de Uso</a> e a{' '}
          <a href="/politica-privacidade">Política de Privacidade</a>, e sua aceitação é obrigatória
          para uso da plataforma. Dúvidas, sugestões e pedidos de mediação podem ser enviados para{' '}
          <a href="mailto:conduta@viralata.app">conduta@viralata.app</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

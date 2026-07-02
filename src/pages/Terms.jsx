import { Scale, Ban, HeartHandshake, MessagesSquare, Gavel } from 'lucide-react';
import { LegalList, LegalListItem, LegalPage, LegalSection } from '@/components/legal-page';

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Termos de Uso"
      description="Condições para uso da plataforma Viralata por adotantes, doadores e organizações."
      meta={`Versão 1.0 — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}. Ao usar a plataforma, você declara ciência e aceitação destas condições.`}
    >
      <LegalSection icon={Scale} title="Papel da plataforma" description="Intermediária facilitadora, não parte na adoção.">
        <p>
          O Viralata conecta pessoas e organizações que têm animais para doação com adotantes interessados. A
          plataforma <strong>não é responsável</strong> pelo comportamento dos usuários, pela saúde do animal após a
          adoção, pela veracidade das informações cadastradas ou por qualquer disputa entre as partes. Não há venda de
          animais nem intermediação de valores — eventuais doações financeiras a ONGs (Pix, vaquinha) são transações
          diretas entre doador e organização, fora da plataforma.
        </p>
      </LegalSection>

      <LegalSection icon={HeartHandshake} title="Responsabilidades do adotante e do doador">
        <LegalList>
          <LegalListItem>O doador é responsável pela veracidade dos dados do pet (saúde, temperamento, castração, vacinação).</LegalListItem>
          <LegalListItem>O adotante é responsável por verificar as condições do animal antes de concluir a adoção.</LegalListItem>
          <LegalListItem>Recomenda-se formalizar a adoção com um termo de responsabilidade entre as partes, fora da plataforma.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection icon={MessagesSquare} title="Uso do chat e conteúdo">
        <p>
          Apenas o responsável pelo pet pode iniciar uma conversa com um interessado, para manter a curadoria dos
          candidatos. É proibido o uso do chat para assédio, spam ou negociação de venda de animais. Fotos e
          descrições devem representar fielmente o animal anunciado.
        </p>
      </LegalSection>

      <LegalSection icon={Ban} title="Condutas proibidas e suspensão">
        <LegalList>
          <LegalListItem>Maus-tratos, abandono ou venda disfarçada de animais.</LegalListItem>
          <LegalListItem>Cadastros falsos de pets ou de organizações.</LegalListItem>
          <LegalListItem>Assédio, discriminação ou ofensas a outros usuários.</LegalListItem>
        </LegalList>
        <p>
          O descumprimento pode levar à suspensão da conta ou exclusão de anúncios pela administração da plataforma,
          sem aviso prévio em casos graves.
        </p>
      </LegalSection>

      <LegalSection icon={Gavel} title="Foro e legislação aplicável">
        <p>
          Estes termos são regidos pela legislação brasileira, incluindo a Lei Geral de Proteção de Dados (LGPD) e as
          normas de proteção animal vigentes. Dúvidas sobre tratamento de dados pessoais estão detalhadas na nossa
          Política de Privacidade.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

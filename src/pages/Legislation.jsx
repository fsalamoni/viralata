import { BookOpen, Syringe, Stethoscope, Home as HomeIcon, ScrollText } from 'lucide-react';
import { LegalList, LegalListItem, LegalPage, LegalSection } from '@/components/legal-page';

export default function Legislation() {
  return (
    <LegalPage
      eyebrow="Conteúdo educativo"
      title="Legislação e Posse Responsável"
      description="Resumo não-jurídico sobre leis de proteção animal e boas práticas de posse responsável no Brasil. Não substitui orientação jurídica ou veterinária profissional."
    >
      <LegalSection icon={ScrollText} title="Legislação de proteção animal" description="Panorama federal — consulte também leis estaduais e municipais da sua região.">
        <LegalList>
          <LegalListItem><strong>Lei Federal nº 9.605/1998 (Lei de Crimes Ambientais)</strong> — tipifica maus-tratos a animais como crime, com penas de detenção e multa.</LegalListItem>
          <LegalListItem><strong>Lei Federal nº 14.064/2020</strong> — aumentou as penas para maus-tratos a cães e gatos.</LegalListItem>
          <LegalListItem><strong>Decreto nº 24.645/1934</strong> — ainda referenciado em decisões judiciais como fundamento de proteção animal.</LegalListItem>
        </LegalList>
        <p className="text-xs text-muted-foreground">
          Este resumo é meramente informativo. Para uma denúncia formal, utilize o botão &ldquo;Fazer Denúncia&rdquo; da
          plataforma, que gera um relatório para encaminhamento à Polícia Civil ou órgão ambiental competente.
        </p>
      </LegalSection>

      <LegalSection icon={HomeIcon} title="Antes de adotar" description="Uma adoção responsável começa antes do pet chegar em casa.">
        <LegalList>
          <LegalListItem>Avalie se sua rotina, moradia e orçamento são compatíveis com as necessidades do animal (é exatamente o que o nosso questionário de perfil ajuda a mapear).</LegalListItem>
          <LegalListItem>Converse com todos os moradores da casa antes de decidir.</LegalListItem>
          <LegalListItem>Prepare o espaço: pet-proofing, telas de proteção em janelas/sacadas, remoção de plantas tóxicas.</LegalListItem>
          <LegalListItem>Planeje o orçamento mensal: ração, vacinas, vermífugo e uma reserva para imprevistos veterinários.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection icon={Syringe} title="Vacinação e castração">
        <p>
          Cães e gatos devem receber o protocolo de vacinas (V8/V10 ou quádrupla/quíntupla felina, antirrábica) e
          reforços anuais conforme orientação veterinária. A castração é a principal ferramenta de controle populacional
          e reduz riscos de saúde e comportamento — muitas prefeituras e ONGs oferecem castração gratuita ou
          subsidiada.
        </p>
      </LegalSection>

      <LegalSection icon={Stethoscope} title="Cuidados contínuos">
        <LegalList>
          <LegalListItem>Consultas veterinárias periódicas, mesmo sem sintomas aparentes.</LegalListItem>
          <LegalListItem>Vermifugação regular e controle de pulgas/carrapatos.</LegalListItem>
          <LegalListItem>Enriquecimento ambiental: brinquedos, passeios e estímulo mental, especialmente para pets que ficam sozinhos durante o dia.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection icon={BookOpen} title="Aviso legal">
        <p>
          Este conteúdo tem finalidade educativa e não substitui orientação jurídica, veterinária ou de um profissional
          de comportamento animal qualificado. A legislação pode mudar; consulte sempre as fontes oficiais e a
          legislação municipal/estadual da sua cidade.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

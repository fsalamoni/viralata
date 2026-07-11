/**
 * @fileoverview Legislação & Posse Responsável — Versão expandida (Fase 19).
 *
 * Conteúdo educativo baseado em:
 *  - Lei Federal 9.605/1998 (Lei de Crimes Ambientais) — Art. 32 e segs
 *  - Lei Federal 14.064/2020 (aumento de pena para cães e gatos)
 *  - Decreto 24.645/1934 (medidas de proteção)
 *  - Lei Federal 13.426/2017 (política de bem-estar animal)
 *  - Lei Federal 14.119/2021 (pagamento por serviços ambientais)
 *  - Lei Federal 14.063/2020 (assinatura eletrônica)
 *  - CFMV 1.465/2022 (telemedicina veterinária)
 *  - LGPD (Lei 13.709/2018)
 *  - Códigos estaduais (SP, RJ, MG, RS) — referências principais
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  BookOpen,
  Syringe,
  Stethoscope,
  Home as HomeIcon,
  ScrollText,
  Scale,
  Heart,
  AlertTriangle,
  Building2,
  GraduationCap,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function Legislation() {
  return (
    <LegalPage
      eyebrow="Conteúdo educativo · base legal"
      title="Legislação Animal e Posse Responsável"
      description="Panorama da legislação brasileira de proteção animal, com referências para denúncias, adoção responsável, telemedicina veterinária e guarda de pets. Conteúdo educativo — não substitui orientação jurídica ou veterinária."
      meta="Última atualização: 10 de julho de 2026. Este conteúdo é informativo; consulte sempre as fontes oficiais e a legislação municipal/estadual da sua cidade."
    >
      <LegalSection
        icon={Scale}
        title="1. Legislação federal"
        description="Leis de proteção animal em vigor no Brasil."
      >
        <LegalList>
          <LegalListItem><strong>Lei Federal 9.605/1998</strong> — Lei de Crimes Ambientais. Art. 32: praticar ato de abuso, maus-tratos, ferir ou mutilar animais silvestres, domésticos ou domesticados, nativos ou exóticos — pena de detenção de 3 meses a 1 ano, mais multa. §1º-A (incluído pela Lei 14.064/2020): pena de 2 a 5 anos, multa e proibição de guarda para cães e gatos.</LegalListItem>
          <LegalListItem><strong>Lei Federal 14.064/2020</strong> — alterou a Lei 9.605/98 para aumentar as penas de maus-tratos contra cães e gatos, reconhecendo a maior vulnerabilidade dessas espécies e a relação afetiva com a família.</LegalListItem>
          <LegalListItem><strong>Decreto 24.645/1934</strong> — define medidas de proteção aos animais e ainda é referenciado em decisões judiciais como fundamento de proteção, especialmente em ações civis públicas.</LegalListItem>
          <LegalListItem><strong>Lei Federal 13.426/2017</strong> — Política Nacional de Bem-Estar Animal, com princípios de proteção, respeito, responsabilidade e cuidado. Criou o Cadastro Nacional de Animais Domésticos.</LegalListItem>
          <LegalListItem><strong>Lei Federal 14.119/2021</strong> — Pagamento por Serviços Ambientais (PSA), que pode incluir serviços ecossistêmicos prestados por propriedades que conservam fauna e flora.</LegalListItem>
          <LegalListItem><strong>Lei Federal 14.063/2020</strong> — assinatura eletrônica: três modalidades (simples, avançada, qualificada). A Viralata adota a <strong>assinatura avançada</strong> para aceites legais (hash SHA-256 + IP + timestamp + liveness).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Building2}
        title="2. Legislação estadual (principais)"
        description="Cada estado pode ter leis mais protetivas."
      >
        <LegalList>
          <LegalListItem><strong>SP</strong>: Lei Estadual 11.977/2005 (trote com animais), Lei 13.131/2008 (registro de cães e gatos), Lei 16.119/2016 (criação de canil/gatil em condomínios), Decreto 59.626/2013 (cães-guia).</LegalListItem>
          <LegalListItem><strong>RJ</strong>: Lei 3.186/1999 (políticas de controle de zoonoses, posse responsável, esterilização), Lei 7.788/2017 (programa de castração).</LegalListItem>
          <LegalListItem><strong>MG</strong>: Lei 21.970/2016 (política de proteção animal), Lei 22.231/2016 (registro geral de animais — RGA).</LegalListItem>
          <LegalListItem><strong>RS</strong>: Lei 11.915/2003 (programa de controle populacional), Lei 13.193/2009 (esterilização gratuita), Lei 14.037/2012 (registro de RGA).</LegalListItem>
          <LegalListItem><strong>PR</strong>: Lei 17.426/2012 (Registro Geral Animal — RGA-PR).</LegalListItem>
          <LegalListItem><strong>SC</strong>: Lei 17.717/2019 (programa de castração e identificação).</LegalListItem>
        </LegalList>
        <p className="text-xs text-muted-foreground">
          Esta lista é não-exaustiva. Consulte a legislação do seu estado e município para obrigações específicas
          (taxa de posse, registro de RGA, restrições a condomínios, etc.).
        </p>
      </LegalSection>

      <LegalSection
        icon={Heart}
        title="3. Posse responsável: princípios"
        description="O que a legislação e a ética esperam de você."
      >
        <LegalList>
          <LegalListItem><strong>Alimentação adequada</strong>: ração de qualidade, água fresca sempre disponível, dieta balanceada conforme espécie, idade e condição de saúde.</LegalListItem>
          <LegalListItem><strong>Saúde preventiva</strong>: vacinas (V8/V10, antirrábica, quádrupla/quíntupla felina), vermifugação regular, controle de ectoparasitas, consultas periódicas ao veterinário.</LegalListItem>
          <LegalListItem><strong>Castração</strong>: a principal ferramenta de controle populacional. Muitas prefeituras oferecem castração gratuita ou a baixo custo.</LegalListItem>
          <LegalListItem><strong>Identificação</strong>: microchipagem é obrigatória em vários municípios. Coleira com plaqueta de identificação é sempre recomendada.</LegalListItem>
          <LegalListItem><strong>Enriquecimento ambiental</strong>: brinquedos, passeios, interação, estímulo mental — essencial para a saúde comportamental do pet.</LegalListItem>
          <LegalListItem><strong>Alojamento seguro</strong>: telas em janelas e sacadas, remoção de plantas tóxicas (lírio, azaleia, espada-de-são-jorge), espaço protegido do sol e chuva.</LegalListItem>
          <LegalListItem><strong>Comprometimento de longo prazo</strong>: cães e gatos podem viver 10–20 anos. Devolução ou abandono são crimes (Lei 9.605/98 Art. 32).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={HomeIcon}
        title="4. Antes de adotar"
        description="A adoção responsável começa antes do pet chegar em casa."
      >
        <LegalList>
          <LegalListItem>Avalie se sua rotina, moradia e orçamento são compatíveis com as necessidades do animal (é exatamente o que o questionário de perfil ajuda a mapear).</LegalListItem>
          <LegalListItem>Converse com todos os moradores da casa antes de decidir.</LegalListItem>
          <LegalListItem>Prepare o espaço: pet-proofing, telas em janelas e sacadas, remoção de plantas tóxicas, escolha de local para comedouro e caminhas.</LegalListItem>
          <LegalListItem>Planeje o orçamento mensal: ração, areia (gatos), vacinas, vermífugo, antipulgas e uma reserva para imprevistos veterinários (mínimo recomendado: 3 meses de custo).</LegalListItem>
          <LegalListItem>Identifique um veterinário de confiança próximo à sua residência antes de buscar o pet.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Syringe}
        title="5. Vacinação, castração e microchipagem"
        description="Cuidados preventivos essenciais."
      >
        <p>
          <strong>Vacinas</strong>: protocole as vacinas obrigatórias conforme a espécie (V8/V10 ou quádrupla/quíntupla
          felina, antirrábica) e mantenha os reforços anuais em dia. O prontuário veterinário do animal na
          plataforma registra cada aplicação com data, lote e profissional responsável.
        </p>
        <p>
          <strong>Castração</strong>: além de prevenir crias indesejadas, reduz significativamente o risco de
          tumores mamários, piometra, hiperplasia prostática e fugas motivadas por cio. É a principal
          ferramenta de política pública de controle populacional.
        </p>
        <p>
          <strong>Microchipagem</strong>: o microchip subcutâneo (ISO 11784/11785) é a forma mais segura de
          identificação. Em caso de perda, a leitura em qualquer clínica cadastrada permite localizar o tutor.
          Vários municípios já exigem a microchipagem para emissão do RGA.
        </p>
      </LegalSection>

      <LegalSection
        icon={Stethoscope}
        title="6. Telemedicina veterinária (CFMV 1.465/2022)"
        description="Regras específicas para teleconsulta."
      >
        <p>
          A Resolução CFMV 1.465/2022 regulamenta a telemedicina veterinária no Brasil. A Viralata opera
          como <strong>software inerte</strong> e segue as seguintes regras:
        </p>
        <LegalList>
          <LegalListItem>Não realiza teleconsulta inaugural — primeiro atendimento presencial é obrigatório.</LegalListItem>
          <LegalListItem>Módulos de telemedicina ficam bloqueados para emergências (encaminhamento presencial obrigatório).</LegalListItem>
          <LegalListItem>Renovação de receita remota limitada a 180 dias (após esse prazo, nova consulta presencial).</LegalListItem>
          <LegalListItem>Cada abrigo designa um Responsável Técnico (RT) com ART (Anotação de Responsabilidade Técnica) ativa.</LegalListItem>
          <LegalListItem>A Viralata <strong>não exerce ato médico veterinário</strong> — é ferramenta de registro e operação do RT.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="7. Denúncia de maus-tratos"
        description="Como e onde denunciar."
      >
        <p>
          Maus-tratos, abandono ou qualquer forma de violência contra animal é crime (Lei 9.605/98 Art. 32).
          Para denunciar:
        </p>
        <LegalList>
          <LegalListItem>Use o botão <strong>“Fazer Denúncia”</strong> na plataforma — geramos um relatório pronto para encaminhamento à autoridade competente.</LegalListItem>
          <LegalListItem>Disque 181 (Denúncia Anônima) ou disque 190 para flagrante.</LegalListItem>
          <LegalListItem>Registre Boletim de Ocorrência online ou em delegacia comum (a Lei 14.064/2020 equiparou maus-tratos a cães e gatos a crime com pena de 2–5 anos).</LegalListItem>
          <LegalListItem>Encaminhe documentos complementares ao Ministério Público, à Polícia Civil ou à Secretaria de Meio Ambiente do seu município.</LegalListItem>
          <LegalListItem>Em caráter de urgência (animal em risco imediato), contate a Polícia Militar (190) ou serviço veterinário de emergência.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={GraduationCap}
        title="8. Boas práticas de convivência urbana"
        description="Pequenos gestos que evitam conflitos e melhoram a vida do pet."
      >
        <LegalList>
          <LegalListItem><strong>Passeios</strong>: use guia curta em áreas públicas, recolha as fezes (Lei Municipal — pode ser autuação).</LegalListItem>
          <LegalListItem><strong>Latido</strong>: cães que latem excessivamente podem ser alvo de queixa por perturbação do sossego (Lei de Contravenções Penais Art. 42).</LegalListItem>
          <LegalListItem><strong>Condomínios</strong>: várias convenções condominiais impõem regras para animais. O Estatuto de Cidade e a Lei 6.969/1982 protegem o direito à habitação com animais.</LegalListItem>
          <LegalListItem><strong>Viagem</strong>: para transporte interestadual ou internacional, consulte a regulamentação do MAPA e da ANAC. Vacinação antirrábica é obrigatória para emissão de GTA (Guia de Trânsito Animal).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={BookOpen}
        title="9. Aviso legal"
        description="Conteúdo educativo — não é aconselhamento jurídico ou veterinário."
      >
        <p>
          Este conteúdo tem finalidade <strong>meramente educativa</strong> e não substitui orientação jurídica,
          veterinária ou de um profissional de comportamento animal qualificado. A legislação pode mudar; consulte
          sempre as fontes oficiais (planalto.gov.br, al.sp.gov.br, portal.anvisa.gov.br) e a legislação
          municipal/estadual da sua cidade. Em caso de dúvida jurídica, procure a Defensoria Pública ou a
          OAB da sua região.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

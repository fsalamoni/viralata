/**
 * @fileoverview Termo de Adoção (Fase 19).
 *
 * Termo individual exigido para todo adotante (Fase 3 + Fase 18).
 * Complementa o Termo de Uso Geral.
 *
 * Conformidade:
 *  - Art. 936 CC (responsabilidade do dono por ato do animal)
 *  - Lei 14.063/2020 (assinatura eletrônica avançada)
 *  - Lei 9.605/98 Art. 32 (maus-tratos)
 *  - CFMV 1.465/2022 (telemedicina veterinária)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Heart,
  ShieldAlert,
  PawPrint,
  Stethoscope,
  AlertTriangle,
  FileSignature,
  RefreshCcw,
  ScrollText,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function AdopterTerms() {
  return (
    <LegalPage
      eyebrow="Termo específico · adotantes"
      title="Termo de Adoção Responsável"
      description="Condições específicas do adotante no momento da formalização da adoção. Complementa o Termo de Uso Geral e é registrado por assinatura eletrônica avançada (Lei 14.063/2020)."
      meta="Versão 2.0 · 10 de julho de 2026. Aplicável a todas as adoções processadas a partir desta data."
    >
      <LegalSection
        icon={ScrollText}
        title="1. Partes e objeto"
        description="Quem é quem, e o que está sendo formalizado."
      >
        <p>
          Este Termo é celebrado entre o <strong>Doador</strong> (pessoa física ou abrigo/ONG
          responsável pelo animal) e o <strong>Adotante</strong> (pessoa física maior e capaz),
          com a interveniência da plataforma <strong>Viralata</strong>, e tem por objeto a
          transferência <strong>gratuita, definitiva e irrevogável</strong> da guarda e posse do
          animal a seguir identificado, no âmbito do Programa de Adoção Responsável da Viralata.
        </p>
        <p>
          O presente Termo <strong>não</strong> é contrato de compra e venda, cessão onerosa ou
          locação. A adoção é ato gratuito, animado pelo princípio da função social da propriedade
          animal e pelo bem-estar do animal (Art. 1.228 §1º CC).
        </p>
      </LegalSection>

      <LegalSection
        icon={PawPrint}
        title="2. Identificação do animal"
        description="Dados básicos que devem ser conferidos antes da assinatura."
      >
        <LegalList>
          <LegalListItem><strong>Nome</strong>: conforme cadastro (ou “a definir pelo adotante”).</LegalListItem>
          <LegalListItem><strong>Espécie / raça / pelagem</strong>: idem.</LegalListItem>
          <LegalListItem><strong>Sexo / idade estimada</strong>: idem.</LegalListItem>
          <LegalListItem><strong>Microchip</strong>: número (se existente) — transferido para o CPF do adotante junto ao cadastro do fabricante do transponder.</LegalListItem>
          <LegalListItem><strong>Estado de saúde declarado</strong>: vacinado, vermifugado, castrado (com data) ou pendências.</LegalListItem>
          <LegalListItem><strong>Comportamento</strong>: temperamento declarado, socialização com pessoas e outros animais, necessidades especiais.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Heart}
        title="3. Obrigações do adotante"
        description="Tudo o que você se compromete a fazer a partir da assinatura."
      >
        <LegalList>
          <LegalListItem>Prover alimentação, água fresca, abrigo, higiene e enriquecimento ambiental adequados à espécie, idade e porte.</LegalListItem>
          <LegalListItem>Manter as vacinas e vermifugação em dia, com acompanhamento veterinário regular (CFMV 1.465/2022).</LegalListItem>
          <LegalListItem>Promover a castração (se não castrado no momento da adoção) em até 90 dias, salvo orientação veterinária em contrário.</LegalListItem>
          <LegalListItem>Não abandonar, maltratar, submeter a rinhas, manter em condições insalubres ou praticar qualquer ato de crueldade (Lei 9.605/98 Art. 32 e Lei 14.064/2020).</LegalListItem>
          <LegalListItem>Manter o animal identificado (microchip + plaqueta) e atualizar o registro junto ao fabricante do transponder em até 30 dias.</LegalListItem>
          <LegalListItem>Não repassar, vender, alugar ou doar o animal a terceiros sem comunicação prévia ao doador e à plataforma.</LegalListItem>
          <LegalListItem>Permitir o contato de pós-adoção pelo abrigo responsável, conforme <a href="/termos-uso">Termos de Uso</a>.</LegalListItem>
          <LegalListItem>Comunicar imediatamente ao doador e à plataforma em caso de fuga, óbito ou mudança de endereço.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ShieldAlert}
        title="4. Cláusula de assunção de risco"
        description="O adotante declara ciência de todos os riscos envolvidos."
      >
        <p>
          O adotante declara estar ciente de que:
        </p>
        <LegalList>
          <LegalListItem>O animal pode apresentar alterações de comportamento durante o período de adaptação (insegurança, medo, marcação de território, vocalização).</LegalListItem>
          <LegalListItem>Podem surgir doenças pré-existentes ou latentes não diagnosticadas no momento da entrega, incluindo zoonoses.</LegalListItem>
          <LegalListItem>O animal pode causar danos materiais ou físicos a terceiros (mordidas, arranhões, alergias), hipótese em que o adotante responde civilmente (Art. 936 CC).</LegalListItem>
          <LegalListItem>A guarda do animal exige planejamento de longo prazo (10–20 anos) e a devolução antecipada é considerada descumprimento contratual.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Stethoscope}
        title="5. Disclaimer de vícios redibitórios"
        description="Importante para evitar surpresas — leia com atenção."
      >
        <p>
          O doador se exime de responsabilidade por <strong>vícios redibitórios biológicos</strong> que
          venham a se manifestar após a entrega, desde que não tenham sido dolosamente ocultados.
          Incluem-se nessa categoria: doenças congênitas ou hereditárias não diagnosticáveis no
          momento da entrega, alergias, displasias tardias, epilepsia idiopática, neoplasias e
          alterações comportamentais decorrentes do ambiente.
        </p>
        <p>
          Em caso de doença grave inesperada no primeiro mês de convivência, o doador e a plataforma
          podem, a seu critério, acolher o animal de volta e auxiliar na busca de um novo lar
          responsável, sem que isso constitua obrigação contratual.
        </p>
      </LegalSection>

      <LegalSection
        icon={RefreshCcw}
        title="6. Devolução e pós-adoção"
        description="O que acontece se não der certo."
      >
        <p>
          Se o adotante não puder manter o animal por motivo de força maior (mudança, doença,
          incompatibilidade comprovada), deve comunicar imediatamente ao doador para combinar
          devolução, transferência de guarda ou encaminhamento a outro adotante responsável. A
          devolução <strong>não</strong> exime o adotante do cumprimento das obrigações assumidas
          durante o período em que teve a guarda.
        </p>
        <p>
          O programa de pós-adoção prevê acompanhamento em 3 semanas, 3 meses, 1, 2 e 3 anos
          (vide <a href="/legislacao">Legislação</a> e módulo de pós-adoção). O não atendimento
          reiterado aos contatos pode gerar registro de não-conformidade e impactar futuras adoções.
        </p>
      </LegalSection>

      <LegalSection
        icon={FileSignature}
        title="7. Assinatura eletrônica avançada (Lei 14.063/2020)"
        description="Como o aceite é formalizado."
      >
        <p>
          A aceitação deste Termo é registrada por <strong>assinatura eletrônica avançada</strong>,
          conforme Lei 14.063/2020 Art. 4º, mediante:
        </p>
        <LegalList>
          <LegalListItem>Hash <strong>SHA-256</strong> do documento aceito (garantia de integridade).</LegalListItem>
          <LegalListItem>Timestamp de aceite (data e hora precisas em UTC).</LegalListItem>
          <LegalListItem>Endereço IP e user agent do dispositivo.</LegalListItem>
          <LegalListItem>Texto da assinatura digitada pelo titular (não-imita o manuscrito).</LegalListItem>
          <LegalListItem>Verificação de vivacidade (liveness check) opcional, conforme nível de segurança exigido pelo abrigo.</LegalListItem>
        </LegalList>
        <p>
          O registro do aceite é <strong>imutável</strong>: nenhuma das partes pode editar, apagar ou
          alterar o documento após a assinatura. Cópias podem ser solicitadas ao DPO a qualquer tempo.
        </p>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="8. Transferência de microchip"
        description="Procedimento administrativo essencial."
      >
        <p>
          Havendo microchip, a transferência do registro junto ao fabricante do transponder é
          obrigação do adotante, devendo ser providenciada em até 30 dias da assinatura deste
          Termo. A não-transferência pode dificultar o encontro do animal em caso de perda, e
          manter o titular anterior como responsável legal.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="9. Foro e disposições finais"
      >
        <p>
          Este Termo é regido pela legislação brasileira. Fica eleito o foro da Comarca de São
          Paulo/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais
          privilegiado que seja. As cláusulas deste Termo são independentes — a nulidade de uma
          não afeta a validade das demais.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

/**
 * @fileoverview Termo de Doação (Fase 19).
 *
 * Termo individual para doadores de valores financeiros à Viralata
 * ou aos abrigos parceiros. Cobre:
 *  - Natureza filantrópica irreversível
 *  - Não-substituto tributário
 *  - Regime estadual de ITCMD
 *  - Direito a recibo, dedução no IR (se aplicável)
 *  - Destinação dos recursos (transparência)
 *  - Cancelamento (em janelas específicas)
 *  - LGPD
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Coins,
  ScrollText,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  HeartHandshake,
  FileSignature,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function DonorTerms() {
  return (
    <LegalPage
      eyebrow="Termo específico · doadores"
      title="Termo de Doação"
      description="Condições para doações financeiras (Pix, cartão, boleto) à Viralata ou aos abrigos parceiros. Cobre natureza filantrópica irreversível, regime tributário (ITCMD), transparência e LGPD."
      meta="Versão 2.0 · 10 de julho de 2026. Aplicável a todas as doações registradas a partir desta data."
    >
      <LegalSection
        icon={ScrollText}
        title="1. Natureza da doação"
        description="Filantrópica, gratuita e irreversível."
      >
        <p>
          A doação financeira realizada pelo <strong>Doador</strong> à <strong>Viralata</strong> ou
          a um <strong>Abrigo Parceiro</strong> é ato de liberalidade, gratuito, anônimo (quando
          assim desejado), filantrópico e <strong>irreversível</strong>, nos termos dos Arts. 538 a
          564 do Código Civil Brasileiro. A doação não estabelece qualquer vínculo de sociedade,
          associação, mandato, representação ou trabalho.
        </p>
        <p>
          A Viralata é uma plataforma que conecta doadores e adotantes; ela mesma <strong>não</strong>{' '}
          é uma ONG e <strong>não</strong> capta doações para si. As doações financeiras captadas pela
          plataforma são repassadas integralmente (100%) ao Abrigo Parceiro indicado pelo Doador, ou,
          na ausência de indicação, rateadas entre os abrigos parceiros em proporção à demanda e à
          transparência de prestação de contas.
        </p>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="2. Disclaimer de não-substituto tributário"
        description="A Viralata não substitui o regime tributário de cada abrigo."
      >
        <p>
          Cada Abrigo Parceiro declara e é responsável por seu regime tributário próprio. A Viralata{' '}
          <strong>não é substituta tributária</strong> e <strong>não</strong> se responsabiliza por:
        </p>
        <LegalList>
          <LegalListItem>Emissão de recibos oficiais para fins de dedução no Imposto de Renda (Lei 9.250/1995 Art. 12), quando aplicável.</LegalListItem>
          <LegalListItem>Imunidade tributária do abrigo (CF Art. 150, VI, b e Lei 9.532/1997).</LegalListItem>
          <LegalListItem>Cumprimento de obrigações acessórias municipais, estaduais e federais do abrigo.</LegalListItem>
          <LegalListItem>Regularidade cadastral do abrigo junto ao CNEA, Receita Federal, Secretarias da Fazenda, etc.</LegalListItem>
        </LegalList>
        <p>
          O Doador declara estar ciente de que, caso deseje deduzir a doação do IR, deve verificar
          previamente se o Abrigo Parceiro é habilitado a emitir recibo e se a doação se enquadra
          nos limites legais (até 6% do IR devido para pessoas físicas, conforme Lei 9.250/95).
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="3. ITCMD — Imposto sobre Transmissão Causa Mortis e Doação"
        description="Cada estado tem sua regra de ITCMD sobre doações."
      >
        <p>
          Doações em dinheiro estão geralmente <strong>sujeitas ao ITCMD</strong> (Imposto sobre
          Transmissão Causa Mortis e Doação de Quaisquer Bens ou Direitos), com alíquotas e
          isenções definidas pela <strong>legislação estadual</strong> do domicílio do doador.
        </p>
        <LegalList>
          <LegalListItem><strong>São Paulo</strong>: Lei 10.705/2000 — alíquota de 4% sobre o valor da doação (pode haver isenção até limite definido pelo estado, atualizado anualmente).</LegalListItem>
          <LegalListItem><strong>Rio de Janeiro</strong>: Lei 1.427/1989 e Decreto 2.990/1981 — alíquota de 4% (verificar isenções).</LegalListItem>
          <LegalListItem><strong>Minas Gerais</strong>: Lei 14.941/2003 — alíquota de 5% (verificar isenções).</LegalListItem>
          <LegalListItem><strong>Rio Grande do Sul</strong>: Lei 8.821/1989 — alíquota de 3% (verificar isenções).</LegalListItem>
        </LegalList>
        <p>
          A Viralata <strong>não recolhe ITCMD</strong> em nome do doador. O doador declara estar ciente
          da obrigação de recolher o imposto diretamente na Secretaria da Fazenda do seu estado,
          salvo nos casos de isenção aplicáveis. A plataforma oferece link para a página da Sefaz
          estadual e documento explicativo, mas não presta assessoria tributária individual.
        </p>
      </LegalSection>

      <LegalSection
        icon={FileCheck2}
        title="4. Recibo e comprovante"
        description="O que você recebe após a doação."
      >
        <LegalList>
          <LegalListItem><strong>Comprovante de transação</strong>: emitido pelo gateway de pagamento (Pix, cartão, boleto) com valor, data, identificador de transação e recebedor.</LegalListItem>
          <LegalListItem><strong>Recibo do abrigo</strong>: o Abrigo Parceiro pode emitir recibo próprio para fins de dedução no IR, mediante solicitação do doador (Art. 12 Lei 9.250/95).</LegalListItem>
          <LegalListItem><strong>Relatório de destinação</strong>: a Viralata publica relatório anual de destinação dos recursos, por abrigo parceiro, na seção “Transparência”.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={HeartHandshake}
        title="5. Destinação dos recursos (transparência)"
        description="Onde o dinheiro é aplicado."
      >
        <p>
          Os recursos doados são aplicados pelo Abrigo Parceiro em suas atividades-fim, especialmente:
        </p>
        <LegalList>
          <LegalListItem>Alimentação, medicamentos e veterinária dos animais sob guarda.</LegalListItem>
          <LegalListItem>Castração, vacinação, vermifugação e microchipagem.</LegalListItem>
          <LegalListItem>Manutenção das instalações, materiais de higiene e limpeza.</LegalListItem>
          <LegalListItem>Eventos, feiras, vitrines e transporte de animais.</LegalListItem>
          <LegalListItem>Capacitação de voluntários e equipe.</LegalListItem>
          <LegalListItem>Campanhas de adoção responsável e educação comunitária.</LegalListItem>
        </LegalList>
        <p>
          A Viralata pode reter uma <strong>taxa operacional</strong> sobre doações captadas pela
          plataforma, claramente indicada antes da confirmação da doação, para custeio de
          infraestrutura tecnológica, gateway de pagamento e operação geral. Essa taxa é divulgada
          na tela de checkout.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="6. Cancelamento e estorno"
        description="Quando é possível cancelar a doação."
      >
        <p>
          Em razão da natureza <strong>irreversível</strong> da doação (Art. 555 CC), o estorno
          posterior é juridicamente complexo. A Viralata admite, no entanto, as seguintes hipóteses
          de cancelamento:
        </p>
        <LegalList>
          <LegalListItem><strong>Erro operacional</strong>: cancelamento em até 24h mediante solicitação ao suporte, com estorno integral via mesmo meio de pagamento.</LegalListItem>
          <LegalListItem><strong>Duplicidade</strong>: cancelamento de uma transação duplicada, mediante comprovação.</LegalListItem>
          <LegalListItem><strong>Coação ou vício de consentimento</strong>: cancelamento mediante análise caso a caso, com documentação.</LegalListItem>
        </LegalList>
        <p>
          Cancelamentos são processados em até 10 dias úteis, dependendo do meio de pagamento
          utilizado. Após o repasse ao Abrigo Parceiro, o estorno depende da devolução por parte
          do abrigo, não podendo a Viralata garanti-lo.
        </p>
      </LegalSection>

      <LegalSection
        icon={FileSignature}
        title="7. LGPD e proteção de dados do doador"
      >
        <p>
          Os dados pessoais do Doador (nome, CPF/CNPJ, e-mail, telefone, dados de pagamento) são
          tratados pela Viralata e pelo gateway de pagamento sob as bases legais de{' '}
          <strong>execução de contrato</strong> (Art. 7º V LGPD) e <strong>cumprimento de obrigação
          legal</strong> (Art. 7º II LGPD — retenção de comprovantes por no mínimo 5 anos, CC Art. 205).
        </p>
        <p>
          O Doador pode exercer seus direitos de acesso, correção, portabilidade e eliminação
          (Art. 18 LGPD) através do portal <a href="https://viralata.app/dpo">viralata.app/dpo</a>{' '}
          ou pelo e-mail <a href="mailto:dpo@viralata.app">dpo@viralata.app</a>.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="8. Foro e disposições finais"
      >
        <p>
          Este Termo é regido pela legislação brasileira, especialmente pelo Código Civil (Arts. 538
          a 564), pela LGPD e pela legislação tributária aplicável. Fica eleito o foro da Comarca
          de São Paulo/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por
          mais privilegiado que seja.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

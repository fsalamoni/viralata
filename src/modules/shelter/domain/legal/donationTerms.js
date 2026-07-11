/**
 * @fileoverview Política de Doações Financeiras (Crowdfunding Social)
 * — TEXTO INTEGRAL (Fase 19 / Bloco 6).
 *
 * Texto exibido na tela de checkout de doação, ANTES de o usuário
 * confirmar a contribuição financeira. Baseado em
 * `06_Politica_Doacoes.md` do pacote documental v2
 * (10/07/2026).
 *
 * LGPD (Lei 13.709/2018): consentimento para comunicações de
 * marketing e tratamento dos dados do doador.
 * Lei 14.063/2020: assinatura eletrônica nível básico.
 * Código Civil art. 538: natureza jurídica da doação civil.
 * Lei 9.250/1995: dedução no IR (quando aplicável).
 * Lei 13.797/2019: imunidade tributária para OSCs.
 *
 * Aceite gravado em `donations/{donationId}` (a ser criado quando
 * a feature de doações entrar no roadmap):
 *   - donation_terms_accepted_at
 *   - donation_terms_version
 *   - donation_signature_text
 *   - donation_terms_document_hash
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 6)
 * @see .tmp-legal-docs/06_Politica_Doacoes.md
 */

export const DONATION_TERMS_VERSION = '2026-07-10';

/**
 * Texto integral da Política de Doações Financeiras (v1).
 */
export const DONATION_TERMS_TEXT = `POLÍTICA DE DOAÇÕES FINANCEIRAS (CROWDFUNDING SOCIAL) — VERSÃO 2026-07-10
Plataforma Viralata

═══════════════════════════════════════════════════════════════

PREÂMBULO

A Plataforma Viralata disponibiliza ferramentas para que Abrigos e
ONGs cadastrados criem campanhas de arrecadação de fundos
(Crowdfunding) para custear resgates, tratamentos veterinários,
alimentação e infraestrutura. Ao realizar uma doação financeira
através da Plataforma, o Doador declara ciência e concordância
com as regras descritas neste documento.

═══════════════════════════════════════════════════════════════

1. NATUREZA JURÍDICA DA DOAÇÃO

As contribuições financeiras realizadas na Plataforma têm natureza
jurídica de DOAÇÃO CIVIL (Art. 538 do Código Civil Brasileiro),
caracterizando-se pela transferência de patrimônio por
liberalidade, sem exigência de contraprestação (produtos ou
serviços).

1.1. IRREVERSIBILIDADE E INAPLICABILIDADE DO CDC: Por se tratar
     de um ato de liberalidade filantrópica, as doações são
     DEFINITIVAS E IRREVERSÍVEIS. NÃO se aplica o "direito de
     arrependimento" previsto no Art. 49 do Código de Defesa do
     Consumidor, uma vez que NÃO há relação de consumo.
     Solicitações de estorno (chargeback) junto à operadora
     de cartão de crédito sob a alegação de "desacordo
     comercial" são INDEVIDAS.

═══════════════════════════════════════════════════════════════

2. RESPONSABILIDADE TRIBUTÁRIA (ITCMD)

A Viralata atua apenas como FACILITADORA TECNOLÓGICA. O Doador e
a ONG/Abrigo recebedor são os únicos responsáveis pela apuração,
declaração e recolhimento de eventuais tributos incidentes sobre
a doação, em especial o Imposto sobre Transmissão Causa Mortis e
Doação (ITCMD), conforme a legislação do Estado de domicílio das
partes. A Viralata está ISENTA de qualquer responsabilidade
solidária tributária.

═══════════════════════════════════════════════════════════════

3. DESTINAÇÃO E PRESTAÇÃO DE CONTAS

3.1. TRANSPARÊNCIA: Os Abrigos são obrigados, pelo Código de
     Conduta da Plataforma, a aplicar 100% dos recursos
     arrecadados na finalidade descrita na campanha.

3.2. ISENÇÃO DA PLATAFORMA: A Viralata NÃO audita contas
     bancárias, NÃO fiscaliza in loco e NÃO garante que os
     fundos serão utilizados conforme prometido pelo Abrigo.
     O Doador realiza a contribuição por sua própria conta
     e risco. Recomendamos verificar a reputação do Abrigo,
     seu histórico na Plataforma e o painel de Prestação de
     Contas (Ledger) antes de doar.

═══════════════════════════════════════════════════════════════

4. TAXAS DE PROCESSAMENTO

A Viralata NÃO cobra comissões sobre as doações. No entanto, o
gateway de pagamento terceirizado (ex: Stripe, Mercado Pago)
poderá descontar taxas operacionais (taxa de cartão de crédito
ou boleto) antes do repasse do valor líquido ao Abrigo. O Doador
será informado sobre essas taxas de terceiros na tela de
checkout, ANTES da confirmação.

═══════════════════════════════════════════════════════════════

5. TRATAMENTO DE DADOS PESSOAIS (LGPD)

5.1. Controlador dos dados do Doador: o Abrigo recebedor.
     Operadora: Viralata, nos termos do DPA embutido no
     Termo de Adesão do Abrigo (Cap. III).

5.2. Dados coletados: identificação do Doador (nome, CPF, e-mail),
     valor doado, data/hora, método de pagamento (sem armazenar
     dados completos do cartão — responsabilidade do gateway).

5.3. Finalidades: emissão de recibo, prestação de contas,
     comunicação sobre o destino da doação, cumprimento de
     obrigações legais (ex: declaração no IR).

5.4. Base legal: consentimento (art. 7º, I, LGPD) para
     comunicações de marketing; execução de contrato (art. 7º, V)
     para emissão de recibo e prestação de contas.

5.5. Retenção: 5 (cinco) anos após a doação, para fins de
     auditoria e cumprimento de obrigações fiscais.

5.6. Direitos do Titular: vide Política de Privacidade da
     Plataforma. Solicitações devem ser feitas ao DPO do Abrigo
     Parceiro ou a dpo@viralata.org.

═══════════════════════════════════════════════════════════════

DECLARAÇÃO DE ACEITE

"Declaro, para todos os fins de direito, que LI INTEGRALMENTE
esta Política de Doações v1 (versão 2026-07-10), que COMPREENDO
que a doação é definitiva e irreversível (art. 538 CC), que
NÃO se aplica o direito de arrependimento do CDC, que sou
responsável pela apuração de eventuais tributos (ITCMD), e que
CONCORDO com tudo o que nela está escrito. Minha assinatura
eletrônica abaixo, datada eletronicamente, tem validade
jurídica conforme a Lei 14.063/2020."

[campo de assinatura: nome completo]
[carimbo de data/hora UTC]
[UID do Doador]
[valor da doação]
[id da campanha]
[hash do nome (sig_xxxxxxxx)]

═══════════════════════════════════════════════════════════════

Versão: 2026-07-10
Data de publicação: 10/07/2026
Data de entrada em vigor: 10/07/2026
`;

export const DONATION_TERMS_SHORT_LABEL = 'Política de Doações Financeiras';

export function getDonationTermsLabel() {
  return `${DONATION_TERMS_SHORT_LABEL} (versão ${DONATION_TERMS_VERSION})`;
}

export function isCurrentDonationTermsVersion(acceptedVersion) {
  return acceptedVersion === DONATION_TERMS_VERSION;
}

/**
 * Helper: constrói o payload dos campos de aceite para gravar no
 * doc da doação (a ser criado quando a feature entrar no
 * roadmap).
 *
 * @param {string} signatureText - nome completo do Doador
 * @param {object} context - contexto da doação
 * @param {string} context.campaign_id
 * @param {number} context.amount
 * @returns {{
 *   donation_terms_accepted_at: string,
 *   donation_terms_version: string,
 *   donation_signature_text: string,
 *   donation_campaign_id: string,
 *   donation_amount: number,
 * }}
 */
export function buildDonationTermsAcceptance(signatureText, context = {}) {
  if (!signatureText || typeof signatureText !== 'string' || signatureText.trim().length < 3) {
    throw new Error('Assinatura (signature_text) deve ter no mínimo 3 caracteres.');
  }
  if (!context.campaign_id) {
    throw new Error('campaign_id é obrigatório.');
  }
  if (typeof context.amount !== 'number' || context.amount <= 0) {
    throw new Error('amount deve ser um número positivo.');
  }
  return {
    donation_terms_accepted_at: new Date().toISOString(),
    donation_terms_version: DONATION_TERMS_VERSION,
    donation_signature_text: signatureText.trim(),
    donation_campaign_id: context.campaign_id,
    donation_amount: context.amount,
  };
}

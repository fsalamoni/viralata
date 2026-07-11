/**
 * @fileoverview Texto integral — Política de Doações Financeiras (Crowdfunding Social) (Documento v2).
 *
 * Texto exibido em /legal/politica-doacoes. Gerado a partir do arquivo
 * '06_Politica_Doacoes.md' do pacote
 * `Viralata_Documentos_Legais_Completos_v2.zip`
 * (10/07/2026) e convertido em template string pelo script
 * `scripts/import-legal-docs-v2.mjs`.
 *
 * IMPORTANTE: este texto é a base operacional da plataforma.
 * A versão definitiva deve passar por revisão jurídica humana
 * (vide SCRUM_TASKS.json — TASK-006/007/008). O texto v2 é
 * o que vai para produção hoje; correções jurídicas serão
 * aplicadas em v3 com changelog.
 *
 * Marco legal: Marco Civil da Internet (Lei 12.965/2014), LGPD
 * (Lei 13.709/2018), Lei 14.063/2020 (assinatura eletrônica),
 * Decreto 24.645/34, Lei 9.605/98 (crimes ambientais), Lei
 * 14.064/2020 (Lei Sansão), Resolução CFMV 1.236/2018 e
 * 1.465/2022, ANPD Resolução CD/ANPD 15/2024 e 32/2026.
 */


export const DONATION_POLICY_VERSION = '2026-07-10';

export const DONATION_POLICY_TEXT = `# POLÍTICA DE DOAÇÕES FINANCEIRAS (CROWDFUNDING SOCIAL)

**Aceite obrigatório ao realizar uma doação.**

A Plataforma Viralata disponibiliza ferramentas para que Abrigos e ONGs cadastrados criem campanhas de arrecadação de fundos (Crowdfunding) para custear resgates, tratamentos veterinários, alimentação e infraestrutura.

Ao realizar uma doação financeira através da Plataforma, o Doador declara ciência e concordância com as seguintes regras:

## 1. NATUREZA JURÍDICA DA DOAÇÃO

As contribuições financeiras realizadas na Plataforma têm natureza jurídica de doação civil (Art. 538 do Código Civil Brasileiro), caracterizando-se pela transferência de patrimônio por liberalidade, sem exigência de contraprestação (produtos ou serviços).

**1.1. Irreversibilidade e Inaplicabilidade do CDC:** Por se tratar de um ato de liberalidade filantrópica, as doações são definitivas e irreversíveis. Não se aplica o "direito de arrependimento" previsto no Art. 49 do Código de Defesa do Consumidor, uma vez que não há relação de consumo. Solicitações de estorno (*chargeback*) junto à operadora de cartão de crédito sob a alegação de "desacordo comercial" são indevidas.

## 2. RESPONSABILIDADE TRIBUTÁRIA (ITCMD)

A Viralata atua apenas como facilitadora tecnológica. O Doador e a ONG/Abrigo recebedor são os únicos responsáveis pela apuração, declaração e recolhimento de eventuais tributos incidentes sobre a doação, em especial o Imposto sobre Transmissão Causa Mortis e Doação (ITCMD), conforme a legislação do Estado de domicílio das partes. A Viralata está isenta de qualquer responsabilidade solidária tributária.

## 3. DESTINAÇÃO E PRESTAÇÃO DE CONTAS

**3.1. Transparência:** Os Abrigos são obrigados, pelo Código de Conduta da Plataforma, a aplicar 100% dos recursos arrecadados na finalidade descrita na campanha.
**3.2. Isenção da Plataforma:** A Viralata não audita contas bancárias, não fiscaliza *in loco* e não garante que os fundos serão utilizados conforme prometido pelo Abrigo. O Doador realiza a contribuição por sua própria conta e risco. Recomendamos verificar a reputação do Abrigo, seu histórico na Plataforma e o painel de Prestação de Contas (Ledger) antes de doar.

## 4. TAXAS DE PROCESSAMENTO

A Viralata não cobra comissões sobre as doações. No entanto, o gateway de pagamento terceirizado (ex: Stripe, Mercado Pago) poderá descontar taxas operacionais (taxa de cartão de crédito ou boleto) antes do repasse do valor líquido ao Abrigo. O Doador será informado sobre essas taxas de terceiros na tela de checkout.
`;

/**
 * @fileoverview Texto integral — Política de Cookies e Legislação
 * Aplicável (Fase 19 / Bloco 2).
 *
 * Texto exibido em /legal/cookies e referenciado pelo
 * `CookieBanner` no momento do consentimento. Listagem dos cookies
 * utilizados, finalidades, terceiros envolvidos, base legal e
 * possibilidade de revogação.
 *
 * Marco legal: LGPD (Lei 13.709/2018, art. 7º, I e IX, art. 9º),
 * Marco Civil da Internet (Lei 12.965/2014, art. 7º, III e IX),
 * Deliberação ANPD/CD/ANPD Nº 4/2023 (boas práticas para
 * cookies).
 *
 * `CONSENT_VERSION` é a chave versionada gravada em
 * `localStorage.cookie_consent.version`. A UI do banner só
 * esconde o aviso se a versão gravada bater com a atual.
 */

export const CONSENT_VERSION = '2026-07-10';

export const COOKIE_POLICY_TEXT = `POLÍTICA DE COOKIES — VERSÃO 2026-07-10
Plataforma Viralata

═══════════════════════════════════════════════════════════════

1. O QUE SÃO COOKIES

1.1. Cookies são pequenos arquivos de texto armazenados no seu
     navegador (browser) quando você visita um site. Eles servem
     para que o site "lembre" das suas ações e preferências por
     um período determinado, e são uma das tecnologias mais
     utilizadas para autenticação, personalização e análise de
     uso.

1.2. Tecnologias semelhantes incluem: localStorage, sessionStorage,
     IndexedDB, Web Beacons (pixels), ETags, e SDKs de terceiros.
     Para fins desta Política, todas essas tecnologias são
     chamadas coletivamente de "cookies".

═══════════════════════════════════════════════════════════════

2. BASE LEGAL

2.1. O tratamento de cookies que contenham Dados Pessoais é
     regulado pela Lei Geral de Proteção de Dados (LGPD, Lei
     13.709/2018), em particular pelos art. 7º (bases legais) e
     art. 9º (informação ao titular), e pelo Marco Civil da
     Internet (Lei 12.965/2014), em particular pelo art. 7º,
     incisos III e IX (inviolabilidade da intimidade e
     privacidade, e proteção de registros).

2.2. Para cookies NÃO ESSENCIAIS, a base legal é o CONSENTIMENTO
     (art. 7º, I, da LGPD), coletado via banner na primeira
     visita, conforme item 3 abaixo.

2.3. Para cookies ESSENCIAIS (autenticação, segurança, prevenção
     a fraudes), a base legal é o legítimo interesse (art. 7º,
     IX, da LGPD) e a execução do contrato (art. 7º, V), sendo
     dispensado consentimento.

═══════════════════════════════════════════════════════════════

3. COMO FUNCIONA O BANNER DE CONSENTIMENTO

3.1. Na sua primeira visita à Plataforma, um banner pergunta
     se você ACEITA ou RECUSA cookies não essenciais.

3.2. Sua escolha é gravada em localStorage, com:
     a) carimbo de data/hora da decisão;
     b) versão do consentimento (atual: ${`2026-07-10`});
     c) identificação do navegador (user-agent);
     d) sinal de aceite (+) ou recusa (-).

3.3. Enquanto você não aceitar ou recusar, o banner permanece
     visível. Cookies não essenciais NÃO são carregados sem
     consentimento.

3.4. Você pode REVOGAR o consentimento a qualquer tempo, com
     efeito imediato, em "Configurações > Privacidade" no
     rodapé da Plataforma, ou limpando o localStorage do
     navegador.

3.5. Atualizações desta Política invalidam a versão gravada e
     o banner reaparece. Você não precisa aceitar novamente
     se mantiver a mesma escolha, mas é informado das
     mudanças.

═══════════════════════════════════════════════════════════════

4. COOKIES UTILIZADOS

4.1. COOKIES ESSENCIAIS (não requerem consentimento):
     a) firebaseAuth — autenticação de usuários (Firebase
        Authentication, provido pelo Google LLC).
        Finalidade: identificar o usuário logado. Retenção:
        até o logout + 30 dias.
     b) firestoreClientCache — cache local de documentos do
        Firestore (provido pelo Google LLC). Finalidade:
        performance e operação offline. Retenção: até
        limpeza manual do cache.
     c) csrf_token — proteção contra Cross-Site Request
        Forgery. Finalidade: segurança. Retenção: sessão
        (apagado ao fechar o navegador).
     d) cookie_consent — registro do seu consentimento para
        cookies não essenciais. Finalidade: lembrar da sua
        escolha. Retenção: 1 ano.

4.2. COOKIES NÃO ESSENCIAIS (requerem consentimento):
     a) NENHUM no momento. A Plataforma optou por NÃO
        utilizar cookies analíticos, publicitários ou de
        marketing até o momento, para minimizar a coleta
        de Dados Pessoais.

4.3. TECNOLOGIAS SEMELHANTES (localStorage):
     a) feature_flags — guarda as preferências de
        funcionalidades (ligado/desligado). Finalidade:
        personalização. Retenção: 1 ano.
     b) arena-page-layout — guarda o estado de UI
        (sidebar aberta, tema). Finalidade: UX.
        Retenção: 1 ano.

═══════════════════════════════════════════════════════════════

5. COMPARTILHAMENTO COM TERCEIROS

5.1. Os cookies ESSENCIAIS utilizam o provedor Firebase, do
     Google LLC, que pode ter acesso aos dados estritamente
     para execução do serviço, sob contrato com cláusulas
     de proteção de dados (art. 39 da LGPD).

5.2. NÃO compartilhamos seus dados com redes de anúncios,
     plataformas de marketing ou terceiros para fins
     comerciais.

5.3. Em caso de venda, fusão ou reorganização societária da
     operadora, os dados podem ser transferidos ao sucessor,
     sob as mesmas condições desta Política, com comunicação
     prévia aos titulares (art. 33 da LGPD).

═══════════════════════════════════════════════════════════════

6. SEUS DIREITOS

6.1. Conforme art. 18 da LGPD, Você tem direito a:
     a) saber quais cookies estão sendo utilizados e por quê;
     b) revogar o consentimento a qualquer tempo;
     c) solicitar eliminação de dados derivados desses
        cookies (onde aplicável);
     d) apresentar reclamação à ANPD
        (https://www.gov.br/anpd).

6.2. Solicitações devem ser feitas pelo e-mail
     dpo@viralata.org e serão respondidas em até 15 (quinze)
     dias úteis.

═══════════════════════════════════════════════════════════════

7. LEGISLAÇÃO APLICÁVEL

7.1. Lei 13.709/2018 — Lei Geral de Proteção de Dados (LGPD)
7.2. Lei 12.965/2014 — Marco Civil da Internet
7.3. Decreto 4.654/2003 — Dispõe sobre o envio de
     comunicações eletrônicas não solicitadas
7.4. Lei 14.063/2020 — Lei das Assinaturas Eletrônicas
7.5. Deliberação ANPD/CD/ANPD Nº 4/2023 — Boas práticas para
     cookies

═══════════════════════════════════════════════════════════════

8. CONTATO

8.1. Encarregado (DPO): dpo@viralata.org
8.2. Operadora: [Razão Social da Operadora], CNPJ
     [XX.XXX.XXX/0001-XX]
8.3. Atualizações desta Política: 10/07/2026 (versão
     2026-07-10)

═══════════════════════════════════════════════════════════════

TODO(JURÍDICO): Revisão jurídica recomendada. Campos entre
colchetes devem ser preenchidos pela operadora antes da
publicação definitiva. A listagem de cookies deve ser revisada
a cada 6 meses ou quando novos terceiros forem integrados.
`;

/**
 * Helper: payload padrão gravado em localStorage quando o usuário
 * consente. Mantido aqui para centralizar o formato e permitir
 * migração de versão no futuro.
 */
export function buildConsentRecord(accepted, userAgent) {
  return {
    consent: accepted ? 'accepted' : 'rejected',
    version: CONSENT_VERSION,
    at: new Date().toISOString(),
    userAgent: userAgent || null,
  };
}

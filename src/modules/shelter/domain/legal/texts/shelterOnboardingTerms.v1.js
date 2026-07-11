/**
 * @fileoverview Texto integral — Termo de Adesão do Abrigo
 * Parceiro com DPA embutido (Fase 19 / Bloco 5).
 *
 * Este termo é exibido no cadastro do abrigo (antes da
 * criação do doc do clube) e estabelece a relação jurídica
 * entre o Abrigo (Controlador dos dados dos seus
 * adotantes, LTs, voluntários, doadores) e a Viralata
 * (Operadora / Operador de dados, art. 5º, VII, da LGPD).
 *
 * Estrutura:
 *  PARTE I — TERMO DE ADESÃO
 *   1. Identificação das partes
 *   2. Objeto
 *   3. Elegibilidade do Abrigo
 *   4. Obrigações do Abrigo
 *   5. Obrigações da Operadora
 *   6. Preço e condições
 *   7. SLA e suporte
 *   8. Suspensão e cancelamento
 *   9. Propriedade intelectual
 *  10. Confidencialidade
 *  11. Tratamento de Dados Pessoais (LGPD)
 *  12. Segurança da informação
 *  13. Incidentes de segurança
 *  14. Transferência internacional
 *  15. Limitação de responsabilidade
 *  16. Rescisão
 *  17. Disposições gerais
 *  18. Foro
 *  19. Assinatura
 *
 * Marco legal: LGPD (Lei 13.709/2018, especialmente art. 33,
 * 39, 46 e 48), Lei 14.063/2020, Marco Civil da Internet
 * (Lei 12.965/2014).
 */

export const SHELTER_ONBOARDING_TERMS_TEXT_V1 = `TERMO DE ADESÃO E DATA PROCESSING AGREEMENT (DPA) — VERSÃO 2026-07-10
Plataforma Viralata

═══════════════════════════════════════════════════════════════

PARTE I — TERMO DE ADESÃO

═══════════════════════════════════════════════════════════════

1. IDENTIFICAÇÃO DAS PARTES

1.1. OPERADORA. Viralata, operada por [RAZÃO SOCIAL DA
     OPERADORA], CNPJ [XX.XXX.XXX/0001-XX], doravante
     "Operadora" ou "Viralata".

1.2. ABRIGO PARCEIRO. Organização da Sociedade Civil
     (OSC) que adere a este Termo, identificada pelo
     CNPJ [YY.YYY.YYY/0001-YY] e pelo representante
     legal [NOME DO REPRESENTANTE LEGAL], CPF
     [ZZZ.ZZZ.ZZZ-ZZ], doravante "Abrigo" ou
     "Controlador".

═══════════════════════════════════════════════════════════════

2. OBJETO

2.1. Este Termo regula a relação entre Operadora e
     Abrigo para uso da Plataforma Viralata, incluindo:

     a) uso das funcionalidades de gestão (animais,
        adoções, lares temporários, voluntários,
        vitrines, saúde, etc.);
     b) hospedagem de dados na infraestrutura da
        Operadora (Firebase / Google LLC);
     c) suporte técnico e operacional;
     d) atualizações e novas funcionalidades.

2.2. A PARTE II deste documento é o Acordo de
     Processamento de Dados (DPA) exigido pelo art. 39
     da LGPD, aplicável sempre que o Abrigo tratar Dados
     Pessoais por meio da Plataforma.

═══════════════════════════════════════════════════════════════

3. ELEGIBILIDADE DO ABRIGO

3.1. Para aderir à Plataforma, o Abrigo deve:
     a) ser pessoa jurídica regularmente constituída
        (associação, OSC, fundação, etc.), com CNPJ
        ativo;
     b) ter objeto social relacionado à proteção
        animal, adoção responsável ou causa
        correlata;
     c) ter Responsável Técnico (RT) veterinário
        com CRMV ativo, quando manter animais;
     d) ter representação legal válida (estatuto
        atualizado, ata de eleição da diretoria
        vigente);
     e) ter, no mínimo, 1 (um) representante
        cadastrado na Plataforma com poderes de
        administração.

3.2. A Operadora pode recusar, suspender ou cancelar
     a adesão de Abrigos que:
     a) não atendam aos requisitos de elegibilidade;
     b) prestem informações falsas;
     c) tenham histórico de maus-tratos, abandono
        ou outras violações à Lei 9.605/1998;
     d) estejam inadimplentes com a Operadora ou
        com a legislação fiscal/trabalhista.

═══════════════════════════════════════════════════════════════

4. OBRIGAÇÕES DO ABRIGO

O Abrigo se compromete a:

4.1. FORNECER INFORMAÇÕES VERDADEIRAS no cadastro e
     mantê-las atualizadas (CNPJ, endereço, dados
     do RT, dados do representante legal, dados
     bancários, etc.).

4.2. CADASTRAR ANIMAIS com informações precisas
     (nome, idade, raça, sexo, porte, histórico de
     saúde, temperamento). NÃO cadastrar animais
     traficados, resultantes de maus-tratos, ou
     cuja procedência seja irregular.

4.3. MANTER O RESPONSÁVEL TÉCNICO (RT) veterinário
     com CRMV ativo e atualizar a Plataforma sempre
     que houver troca.

4.4. TRATAR OS DADOS PESSOAIS DOS USUÁRIOS (adotantes,
     LTs, voluntários, doadores) como CONTROLADOR,
     conforme art. 5º, VI, da LGPD, sendo integralmente
     responsável por:
     a) definir finalidades e bases legais;
     b) obter consentimentos quando necessário;
     c) atender direitos dos titulares (art. 18, LGPD);
     d) manter registro das operações de tratamento
        (art. 37, LGPD);
     e) comunicar a Operadora sobre eventuais
        inconsistências ou solicitações de titulares
        que dependam de ação técnica.

4.5. REPORTAR INCIDENTES DE SEGURANÇA à Operadora
     em até 24 (vinte e quatro) horas do conhecimento.

4.6. CUMPRIR A LEGISLAÇÃO APLICÁVEL (LGPD, Lei
     9.605/1998, legislação animal, tributária,
     trabalhista, sanitária, etc.).

4.7. PAGAR A MENSALIDADE (se aplicável) até a data
     de vencimento, sob pena de suspensão do
     serviço.

4.8. UTILIZAR A PLATAFORMA apenas para os fins a
     que se destina, sendo VEDADO:
     a) tentar acessar dados de outros Abrigos ou
        Usuários sem autorização;
     b) utilizar a Plataforma para fins ilegais ou
        não relacionados à causa animal;
     c) engenharia reversa, scraping, ou
        sobrecarga proposital da infraestrutura;
     d) repasse de credenciais a terceiros.

═══════════════════════════════════════════════════════════════

5. OBRIGAÇÕES DA OPERADORA

A Operadora se compromete a:

5.1. DISPONIBILIZAR A PLATAFORMA em condições razoáveis
     de funcionamento, conforme SLA (item 7 abaixo).

5.2. ATUALIZAR A PLATAFORMA periodicamente, com
     melhorias, correções de segurança e novas
     funcionalidades.

5.3. TRATAR OS DADOS PESSOAIS HOSPEDADOS pelo Abrigo
     estritamente conforme as instruções do Abrigo
     (Controlador) e o disposto no DPA (Parte II),
     sendo OPERADORA nos termos do art. 5º, VII, da
     LGPD.

5.4. COMUNICAR AO ABRIGO, em até 24 (vinte e quatro)
     horas:
     a) qualquer incidente de segurança com impacto
        potencial aos dados do Abrigo;
     b) qualquer solicitação direta de titular de
        dados que dependa de ação do Abrigo;
     c) qualquer alteração substancial nos serviços
        subcontratados (Firebase, gateways, etc.)
        que possa afetar a proteção de dados.

5.5. FORNECER SUPORTE TÉCNICO conforme item 7 abaixo.

5.6. COOPERAR COM O ABRIGO no atendimento aos
     titulares de dados (LGPD, art. 18) e com a
     ANPD, quando necessário.

5.7. EXCLUIR OS DADOS DO ABRIGO em até 30 (trinta)
     dias após o término deste Termo, ressalvada a
     retenção legal (vide item 5.6.2 do DPA).

═══════════════════════════════════════════════════════════════

6. PREÇO E CONDIÇÕES

6.1. PLANO GRATUITO. O Plano Gratuito inclui o uso
     da Plataforma com funcionalidades básicas,
     limitado a [NÚMERO] de animais ativos e [NÚMERO]
     de Usuários simultâneos. Sujeito a termos
     específicos do plano gratuito.

6.2. PLANO PAGO. Planos pagos incluem funcionalidades
     adicionais (sem limite ou com limites maiores,
     relatórios avançados, suporte prioritário,
     integrações). Preços e condições no site da
     Operadora (https://viralata.org/planos).

6.3. COBRANÇA. Mensal, via boleto, PIX ou cartão
     de crédito, conforme escolha do Abrigo. Atraso
     de 30 (trinta) dias pode acarretar suspensão
     do serviço.

6.4. REAJUSTE. Anualmente, pelo IPCA acumulado dos
     12 meses anteriores, ou por índice substituto.

6.5. IMPOSTOS. Todos os impostos incidentes estão
     inclusos nos preços, salvo disposição em
     contrário.

═══════════════════════════════════════════════════════════════

7. SLA E SUPORTE

7.1. DISPONIBILIDADE. 99,5% (noventa e nove vírgula
     cinco por cento) ao mês, excluídos:
     a) manutenções programadas (comunicadas com
        48h de antecedência);
     b) casos fortuitos ou de força maior
        (catástrofes naturais, ataques cibernéticos
        massivos, falhas de provedores de
        infraestrutura fora do controle da
        Operadora);
     c) falhas de equipamentos do Abrigo.

7.2. SUPORTE TÉCNICO.
     a) Plano Gratuito: por e-mail, com resposta em
        até 5 (cinco) dias úteis.
     b) Plano Pago: por e-mail e chat, com resposta
        em até 24 (vinte e quatro) horas úteis, e
        suporte telefônico para casos urgentes
        (incidentes de segurança, indisponibilidade
        total).

7.3. COMPENSAÇÃO. Em caso de indisponibilidade
     superior a 1% (um por cento) no mês, a
     Operadora concederá crédito na mensalidade
     seguinte, proporcional ao tempo de
     indisponibilidade, mediante solicitação do
     Abrigo em até 30 dias.

═══════════════════════════════════════════════════════════════

8. SUSPENSÃO E CANCELAMENTO

8.1. SUSPENSÃO. A Operadora pode suspender o
     serviço em caso de:
     a) inadimplência superior a 30 (trinta) dias;
     b) violação deste Termo;
     c) ordem judicial ou requisição de autoridade
        competente;
     d) risco à segurança da Plataforma.

8.2. CANCELAMENTO PELA OPERADORA. Mediante aviso
     prévio de 30 (trinta) dias, em caso de
     descumprimento contratual não sanado, ou de
     imediato em caso de violação grave
     (maus-tratos comprovados, fraude, atividades
     ilegais).

8.3. CANCELAMENTO PELO ABRIGO. A qualquer tempo,
     sem necessidade de justificativa, com efeito
     imediato. Dados serão tratados conforme item
     5.7 das Obrigações da Operadora.

═══════════════════════════════════════════════════════════════

9. PROPRIEDADE INTELECTUAL

9.1. A Plataforma, o software, o design e a marca
     "Viralata" são de propriedade da Operadora
     ou licenciados a ela, protegidos pela Lei
     9.610/1998 e Lei 9.279/1996.

9.2. O Abrigo CONCEDE à Operadora licença não
     exclusiva, gratuita, mundial e por tempo
     indeterminado para:
     a) usar o nome, logotipo e marca do Abrigo
        em materiais institucionais da Operadora
        (ex.: "Abrigos Parceiros");
     b) hospedar e exibir o Conteúdo enviado
        pelo Abrigo na Plataforma;
     c) gerar estatísticas agregadas e
        anonimizadas sobre o uso da Plataforma
        (ex.: "X adoções em 2026"), desde que
        não identifiquem o Abrigo individualmente
        sem consentimento.

9.3. O Abrigo NÃO transfere à Operadora qualquer
     direito sobre o Conteúdo próprio (textos,
     fotos, vídeos, dados de animais, etc.),
     permanecendo titular.

═══════════════════════════════════════════════════════════════

10. CONFIDENCIALIDADE

10.1. As partes se comprometem a manter sigilo
      sobre informações trocadas em razão deste
      Termo, especialmente:
      a) dados pessoais de Usuários;
      b) informações financeiras e operacionais
         do Abrigo;
      c) código-fonte, algoritmos e detalhes
         técnicos da Plataforma;
      d) roadmap e planos de negócio.

10.2. O dever de sigilo permanece por 5 (cinco)
      anos após o término do Termo.

10.3. Excetua-se do sigilo a informação que:
      a) era pública antes da divulgação;
      b) se tornou pública sem culpa da parte
         receptora;
      c) foi obtida lícita e independentemente
         de terceiro sem dever de sigilo;
      d) é exigida por lei, ordem judicial ou
         autoridade reguladora.

═══════════════════════════════════════════════════════════════

11. TRATAMENTO DE DADOS PESSOAIS (LGPD)
    [Disposições gerais — detalhamento no DPA, Parte II]

11.1. Para os Dados Pessoais coletados pelo Abrigo
      na Plataforma, o Abrigo é o CONTROLADOR
      (art. 5º, VI, LGPD) e a Operadora é o
      OPERADOR (art. 5º, VII, LGPD).

11.2. A Operadora trata os Dados Pessoais
      estritamente conforme as instruções do
      Abrigo, conforme detalhado no DPA.

11.3. Direitos dos titulares (LGPD, art. 18) são
      atendidos pelo Abrigo, com apoio técnico da
      Operadora. Solicitações devem ser feitas a
      dpo@abrigo.org.br (encarregado do Abrigo) ou
      a dpo@viralata.org (encarregado da Operadora).

11.4. Em caso de conflito entre este Termo e a
      Política de Privacidade da Plataforma, prevalece
      este Termo para Abrigos Parceiros.

═══════════════════════════════════════════════════════════════

12. SEGURANÇA DA INFORMAÇÃO

12.1. A Operadora adota medidas técnicas e
      organizacionais razoáveis, conforme
      detalhado no DPA (Parte II, item 6).

12.2. O Abrigo também é responsável por medidas
      próprias: senhas fortes, MFA para admins,
      gestão de usuários, controle de acesso,
      treinamento de equipe.

═══════════════════════════════════════════════════════════════

13. INCIDENTES DE SEGURANÇA

13.1. Em caso de incidente com risco relevante aos
      titulares, a Operadora comunicará a ANPD em
      até 2 (dois) dias úteis e aos titulares
      afetados em até 72 (setenta e duas) horas
      (art. 48, LGPD), em colaboração com o Abrigo.

13.2. O Abrigo deve comunicar à Operadora
      incidentes detectados em sua operação em
      até 24 (vinte e quatro) horas do
      conhecimento.

═══════════════════════════════════════════════════════════════

14. TRANSFERÊNCIA INTERNACIONAL

14.1. Os dados hospedados na Plataforma são
      processados em data centers do Google LLC
      (Firebase), que podem estar localizados fora
      do Brasil.

14.2. A Operadora adota salvaguardas compatíveis
      com o art. 33 da LGPD, mediante cláusulas
      contratuais específicas com o Google LLC.

14.3. Detalhes sobre a localização dos data centers
      e as salvaguardas adotadas estão disponíveis
      em https://viralata.org/legal/privacidade
      e na Política de Privacidade.

═══════════════════════════════════════════════════════════════

15. LIMITAÇÃO DE RESPONSABILIDADE

15.1. Em nenhuma hipótese a Operadora será
      responsável por:
      a) danos indiretos, lucros cessantes, danos
         punitivos ou danos morais coletivos;
      b) obrigações assumidas diretamente entre
         Abrigo e terceiros (adotantes, LTs,
         voluntários, doadores);
      c) falhas de provedores fora do controle
         razoável da Operadora (Google, gateway
         de pagamento, etc.);
      d) uso indevido da Plataforma pelo Abrigo
         ou por sua equipe;
      e) perdas decorrentes de caso fortuito ou
         força maior.

15.2. A responsabilidade total da Operadora por
      danos diretos fica limitada, em qualquer
      cenário, ao valor efetivamente pago pelo
      Abrigo nos últimos 12 (doze) meses — que,
      no caso de Plano Gratuito, é ZERO.

═══════════════════════════════════════════════════════════════

16. RESCISÃO

16.1. O Termo pode ser rescindido:
      a) por acordo mútuo, a qualquer tempo;
      b) por qualquer das partes, mediante aviso
         prévio de 30 (trinta) dias, sem
         necessidade de justificativa;
      c) pela Operadora, em caso de violação
         contratual não sanada em 15 (quinze)
         dias do aviso;
      d) pela Operadora, de imediato, em caso de
         violação grave (maus-tratos, fraude,
         atividades ilegais);
      e) pelo Abrigo, em caso de descumprimento
         pela Operadora não sanado em 30
         (trinta) dias.

16.2. Em caso de rescisão:
      a) a Operadora manterá os dados do Abrigo
         por 30 (trinta) dias para download
         (export), após os quais serão
         eliminados;
      b) obrigações de sigilo, retenção legal e
         responsabilidade por atos pretéritos
         permanecem.

═══════════════════════════════════════════════════════════════

17. DISPOSIÇÕES GERAIS

17.1. Este Termo é regido pelas leis da República
      Federativa do Brasil.

17.2. A nulidade de qualquer cláusula não afeta
      a validade das demais.

17.3. Comunicações formais serão feitas por
      e-mail (cadastrado na Plataforma) ou por
      carta registrada.

17.4. Este Termo substitui quaisquer acordos
      anteriores entre as partes sobre o mesmo
      objeto.

17.5. Alterações neste Termo serão comunicadas
      com antecedência mínima de 30 (trinta)
      dias, entrando em vigor na data indicada
      na notificação.

═══════════════════════════════════════════════════════════════

18. FORO

18.1. Fica eleito o foro da Comarca de [CIDADE
      DA OPERADORA] / [ESTADO] para dirimir
      questões oriundas deste Termo, com renúncia
      a qualquer outro.

18.2. Antes de qualquer medida judicial, as
      partes se comprometem a tentar solução
      consensual, com prazo de 60 (sessenta) dias
      para resposta.

═══════════════════════════════════════════════════════════════

PARTE II — DATA PROCESSING AGREEMENT (DPA)
(Art. 39 da Lei 13.709/2018 — LGPD)

═══════════════════════════════════════════════════════════════

1. DEFINIÇÕES

1.1. "Dados Pessoais" — vide art. 5º, I, LGPD.

1.2. "Dados Pessoais Sensíveis" — vide art. 5º, II,
     LGPD. No contexto da Plataforma, inclui dados
     de saúde dos animais (associados a adotantes
     em processo), dados de crianças e adolescentes
     (quando aplicável), entre outros.

1.3. "Tratamento" — vide art. 5º, X, LGPD.

1.4. "Titular" — pessoa física a quem se referem
     os Dados Pessoais (adotantes, LTs, voluntários,
     doadores, equipe do Abrigo).

1.5. "Incidente" — qualquer ocorrência que
     comprometa a confidencialidade, integridade,
     disponibilidade ou autenticidade dos Dados
     Pessoais.

1.6. "Controlador" — o Abrigo Parceiro (define
     finalidades, bases legais, meios).

1.7. "Operador" — a Operadora Viralata e seus
     suboperadores (Google LLC, prestadores de
     e-mail, gateway de pagamento, auditoria).

═══════════════════════════════════════════════════════════════

2. OBJETO DO DPA

2.1. Este DPA estabelece as condições sob as quais
     a Operadora realiza Tratamento de Dados
     Pessoais em nome do Abrigo, em conformidade
     com o art. 39 da LGPD.

2.2. A Operadora trata Dados Pessoais APENAS para
     a operacionalização da Plataforma, conforme
     instruções do Abrigo. NÃO trata para finalidades
     próprias, exceto quando expressamente autorizado
     pelo Abrigo.

═══════════════════════════════════════════════════════════════

3. NATUREZA E FINALIDADE DO TRATAMENTO

3.1. NATUREZA: hospedagem de banco de dados
     (Firestore), autenticação (Firebase Auth),
     armazenamento de arquivos (Storage),
     computação serverless (Cloud Functions),
     envio de e-mails transacionais, hospedagem do
     site e do painel.

3.2. FINALIDADE: viabilizar a operação da
     Plataforma para o Abrigo, conforme Termo de
     Adesão (Parte I). Em nenhuma hipótese a
     Operadora utiliza os Dados Pessoais do Abrigo
     para finalidades próprias de marketing,
     publicidade ou treinamento de modelos de IA.

═══════════════════════════════════════════════════════════════

4. DADOS PESSOAIS TRATADOS

4.1. A Operadora trata, em nome do Abrigo, todos
     os Dados Pessoais por ele inseridos na
     Plataforma:
     a) dados de Usuários (adotantes, LTs,
        voluntários, doadores): nome, e-mail,
        telefone, CPF, endereço, dados
        socioeconômicos, dados de saúde animal;
     b) dados de animais: foto, prontuário,
        histórico, localização, estado de saúde;
     c) dados de equipe do Abrigo: nome, e-mail,
        perfil de acesso;
     d) dados de uso: logs, IPs, timestamps.

4.2. A Operadora NÃO acessa, visualiza ou trata
     esses dados para finalidades próprias, exceto:
     a) quando necessário para suporte técnico
        (mediante aprovação do Abrigo);
     b) quando exigido por lei, ordem judicial
        ou autoridade competente;
     c) para garantir a segurança da Plataforma
        (ex.: detecção de acessos anômalos).

═══════════════════════════════════════════════════════════════

5. BASES LEGAIS

5.1. O Abrigo, como Controlador, define as bases
     legais para o Tratamento (consentimento,
     execução de contrato, legítimo interesse,
     etc.), nos termos do art. 7º da LGPD.

5.2. A Operadora, como Operador, trata sob a
     base legal de "execução de contrato" (art.
     7º, V) — o presente Termo.

5.3. Para Dados Pessoais Sensíveis, a Operadora
     observa o art. 11 da LGPD, tratando apenas
     sob consentimento específico do Titular (art.
     11, I, "a") ou para o exercício regular de
     direitos em contrato (art. 11, II, "e").

═══════════════════════════════════════════════════════════════

6. MEDIDAS DE SEGURANÇA (ART. 46, LGPD)

A Operadora adota as seguintes medidas técnicas e
organizacionais:

6.1. CRIPTOGRAFIA:
     a) em trânsito: HTTPS/TLS 1.2+ para todas
        as comunicações;
     b) em repouso: AES-256 para Firestore,
        Storage, Cloud Functions;
     c) chaves geridas pelo Google Cloud KMS.

6.2. CONTROLE DE ACESSO:
     a) autenticação obrigatória (Firebase Auth);
     b) autorização baseada em papéis (RBAC) e
        em escopo (multi-tenant: cada Abrigo só
        acessa seus dados);
     c) MFA para Administradores da Plataforma;
     d) MFA recomendado para Administradores do
        Abrigo (funcionalidade disponível na
        Plataforma).

6.3. AUDITORIA:
     a) logs de acesso imutáveis (Cloud Audit
        Logs);
     b) registro de todas as ações de
        Administradores (audit log na Plataforma);
     c) retenção de logs por 6 (seis) meses
        (Marco Civil da Internet, art. 22) e por
        5 (cinco) anos para fins legais.

6.4. MONITORAMENTO:
     a) detecção de anomalias (Firebase
        Performance Monitoring, Cloud Logging);
     b) alertas de segurança em tempo real;
     c) testes de penetração periódicos (semestrais);
     d) varreduras de vulnerabilidades automatizadas
        (Dependabot, Snyk).

6.5. BACKUP E RECUPERAÇÃO:
     a) backups automáticos diários;
     b) retenção de 30 (trinta) dias;
     c) testes de restauração trimestrais.

6.6. TREINAMENTO:
     a) equipe da Operadora treinada em
        proteção de dados e segurança;
     b) atualizações anuais obrigatórias.

6.7. PLANO DE RESPOSTA A INCIDENTES:
     a) equipe de resposta 24/7;
     b) procedimento documentado;
     c) comunicação à ANPD em até 2 dias úteis
        (art. 48);
     d) comunicação aos Titulares afetados em
        até 72h (art. 48).

═══════════════════════════════════════════════════════════════

7. SUBOPERADORES

7.1. A Operadora pode contratar suboperadores
     (subcontratados) para realizar Tratamentos
     específicos, desde que sob contrato com
     cláusulas de proteção de dados equivalentes
     às deste DPA (art. 39, §1º, LGPD).

7.2. Lista atual de suboperadores:
     a) Google LLC — Firebase (Authentication,
        Firestore, Cloud Functions, Cloud
        Storage, Cloud Logging);
     b) [Provedor de e-mail transacional];
     c) [Gateway de pagamento, para Planos Pagos];
     d) [Outros, conforme aplicável].

7.3. A lista atualizada está disponível em
     https://viralata.org/legal/suboperadores.
     Alterações substanciais serão comunicadas
     com 30 (trinta) dias de antecedência.

7.4. O Abrigo pode objetar a novo suboperador,
     mediante aviso em até 15 (quinze) dias. Caso
     a Operadora mantenha a contratação, o Abrigo
     pode rescindir este Termo sem ônus.

═══════════════════════════════════════════════════════════════

8. TRANSFERÊNCIA INTERNACIONAL (ART. 33, LGPD)

8.1. Os dados podem ser processados em data
     centers do Google LLC fora do Brasil.

8.2. A Operadora garante que o Google LLC adota
     padrões compatíveis com a LGPD (art. 33, I)
     e com o Regulamento Europeu (GDPR), mediante
     cláusulas contratuais específicas (Data
     Processing Addendum do Google Cloud).

8.3. Detalhes sobre localização e salvaguardas
     estão em https://viralata.org/legal/privacidade.

═══════════════════════════════════════════════════════════════

9. DIREITOS DOS TITULARES

9.1. O Abrigo, como Controlador, é o ponto
     primário para atendimento dos direitos do
     Titular (LGPD, art. 18). Canal:
     dpo@abrigo.org.br (encarregado do Abrigo).

9.2. A Operadora apoia tecnicamente o Abrigo,
     fornecendo funcionalidades da Plataforma
     para:
     a) acesso e exportação de dados;
     b) correção de dados;
     c) eliminação de dados (sujeita à retenção
        legal);
     d) portabilidade (em formato CSV/JSON).

9.3. Solicitações de Titulares recebidas
     diretamente pela Operadora serão
     encaminhadas ao Abrigo em até 5 (cinco)
     dias úteis.

═══════════════════════════════════════════════════════════════

10. INCIDENTES DE SEGURANÇA (ART. 48, LGPD)

10.1. Em caso de Incidente com risco relevante
      aos Titulares, a Operadora:
      a) comunicará ao Abrigo em até 24 (vinte
         e quatro) horas do conhecimento;
      b) fornecerá todas as informações
         disponíveis para apoio à comunicação
         à ANPD e aos Titulares;
      c) colaborará na investigação e na
         mitigação.

10.2. A comunicação à ANPD será feita pelo
      Abrigo, com apoio da Operadora, em até 2
      (dois) dias úteis (art. 48, §1º).

10.3. A comunicação aos Titulares será feita
      em conjunto, em até 72 (setenta e duas)
      horas (art. 48, §1º), com linguagem clara
      e acessível.

═══════════════════════════════════════════════════════════════

11. RETENÇÃO E ELIMINAÇÃO

11.1. Os dados são retidos enquanto durar o
      Termo e por mais 30 (trinta) dias após o
      término, para download pelo Abrigo.

11.2. Após esse prazo, os dados são
      ELIMINADOS DEFINITIVAMENTE dos sistemas
      ativos, ressalvada a retenção legal:
      a) 5 (cinco) anos para fins fiscais e
         contratuais (CTN, CDC);
      b) 6 (seis) meses para logs de acesso
         (Marco Civil, art. 22);
      c) outros prazos legais aplicáveis.

11.3. Backups criptografados seguem rotação
      padrão (30 dias) e, após esse prazo, são
      sobrescritos.

═══════════════════════════════════════════════════════════════

12. RESPONSABILIDADES DO ABRIGO (CONTROLADOR)

12.1. O Abrigo é responsável por:
      a) obter consentimento dos Titulares quando
         necessário;
      b) informar aos Titulares sobre o
         Tratamento (Política de Privacidade do
         Abrigo);
      c) atender direitos dos Titulares (art.
         18);
      d) manter registro das operações de
         Tratamento (art. 37);
      e) comunicar à Operadora sobre qualquer
         inconsistência ou solicitação que
         dependa de ação técnica;
      f) reportar Incidentes detectados em sua
         operação em até 24h.

═══════════════════════════════════════════════════════════════

13. RESPONSABILIDADES DA OPERADORA (OPERADOR)

13.1. A Operadora é responsável por:
      a) tratar Dados Pessoais apenas conforme
         as instruções do Abrigo;
      b) garantir confidencialidade dos dados
         por parte de seus funcionários e
         suboperadores;
      c) implementar medidas de segurança
         adequadas;
      d) apoiar o Abrigo no atendimento aos
         Titulares;
      e) comunicar Incidentes em até 24h;
      f) eliminar dados ao término do Termo,
         ressalvada a retenção legal.

═══════════════════════════════════════════════════════════════

14. AUDITORIA

14.1. O Abrigo pode solicitar relatório de
      auditoria das medidas de segurança da
      Operadora, com periodicidade máxima anual.

14.2. Auditorias presenciais podem ser realizadas
      mediante acordo mútuo, com custos a cargo
      do Abrigo, e mediante aviso prévio de 60
      (sessenta) dias.

14.3. A Operadora pode fornecer certificações
      de terceiros (ISO 27001, SOC 2, PCI-DSS
      quando aplicável) em substituição à
      auditoria presencial, conforme
      disponibilidade.

═══════════════════════════════════════════════════════════════

15. DISPOSIÇÕES FINAIS DO DPA

15.1. Este DPA é parte integrante do Termo de
      Adesão (Parte I). Em caso de conflito,
      prevalece este DPA para matérias de
      proteção de dados.

15.2. Alterações neste DPA serão comunicadas
      com 30 (trinta) dias de antecedência,
      entrando em vigor na data indicada.

15.3. As Partes cooperam com a ANPD e com
      outras autoridades competentes, conforme
      necessário.

═══════════════════════════════════════════════════════════════

19. ASSINATURA

DECLARAÇÃO DE ACEITE PELO ABRIGO

"Eu, [NOME DO REPRESENTANTE LEGAL], [CARGO], CPF
[CPF], na qualidade de representante legal do
[RAZÃO SOCIAL DO ABRIGO], CNPJ [CNPJ], declaro,
para todos os fins de direito, que LI
INTEGRALMENTE este Termo de Adesão e Data
Processing Agreement (DPA) — Versão 2026-07-10,
que COMPREENDO todas as suas cláusulas, em
especial as relativas ao tratamento dos Dados
Pessoais dos Usuários (LGPD), às obrigações do
Abrigo e da Operadora, à segurança da informação,
aos incidentes e à transferência internacional,
e que CONCORDO com tudo o que nele está escrito.
Minha assinatura eletrônica abaixo, datada
eletronicamente, tem validade jurídica conforme
a Lei 14.063/2020, em nível básico (com CPF para
fins de verificação da representação legal)."

[campo de assinatura: nome completo do representante legal]
[carimbo de data/hora UTC]
[UID do usuário administrador]
[hash do nome (sig_xxxxxxxx)]
[CPF do representante legal]
[Cargo]
[CNPJ do abrigo]

═══════════════════════════════════════════════════════════════

Versão: 2026-07-10
Data de publicação: 10/07/2026
Data de entrada em vigor: 10/07/2026

TODO(JURÍDICO): Revisão jurídica recomendada. Campos
entre colchetes devem ser preenchidos pela operadora
antes da publicação definitiva.
`;

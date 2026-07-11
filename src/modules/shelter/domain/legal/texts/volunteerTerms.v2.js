/**
 * @fileoverview Texto integral do Termo de Voluntariado v2 (Fase 19).
 *
 * Texto legal exibido ao voluntário no momento do aceite. NÃO resumido
 * (a Lei 14.063/2020 art. 4º §1º exige que a manifestação de vontade
 * seja registrada de forma "clara e previamente informada"; a
 * jurisprudência brasileira entende que termos muito resumidos não
 * satisfazem o dever de informação do art. 9º da LGPD).
 *
 * Estrutura:
 *   1. Identificação das partes
 *   2. Definições
 *   3. Objeto
 *   4. Cadastro e aceite
 *   5. Direitos e deveres do voluntário
 *   6. Direitos e deveres da plataforma e dos abrigos
 *   7. Tratamento de dados pessoais (LGPD)
 *   8. Confidencialidade
 *   9. Responsabilidade civil
 *  10. Suspensão, encerramento e revogação
 *  11. Disposições gerais
 *  12. Foro
 *
 * Texto foi redigido pelo agente (Viralata Coder) seguindo LGPD
 * (Lei 13.709/2018), Lei 14.063/2020 (assinaturas eletrônicas),
 * Marco Civil da Internet (Lei 12.965/2014) e Código Civil/Processo
 * Civil brasileiros. DEVE passar por revisão jurídica antes de uso
 * em produção (vide TODO no fim do arquivo).
 *
 * IMPORTANTE: este arquivo contém uma string única exportada como
 * `VOLUNTEER_TERMS_TEXT_V2`. Para evitar problemas com acentos /
 * quebras de linha em template literals, usamos `\n` para quebras
 * e crases escapadas (`) onde necessário. A renderização em UI usa
 * `<pre className="whitespace-pre-wrap">` ou um parser markdown
 * simples.
 */

export const VOLUNTEER_TERMS_TEXT_V2 = `TERMO DE VOLUNTARIADO — VERSÃO 2026-07-10-v2
Plataforma Viralata

═══════════════════════════════════════════════════════════════

1. IDENTIFICAÇÃO DAS PARTES

1.1. PLATAFORMA. Viralata, plataforma digital de gestão e adoção de
     animais, operada por [RAZÃO SOCIAL DA OPERADORA], CNPJ
     [XX.XXX.XXX/0001-XX], doravante simplesmente "Plataforma".

1.2. ABRIGO. Organização da sociedade civil (OSC) parceira que
     utiliza a Plataforma para gerenciar seus animais, adoções,
     lares temporários e demais funcionalidades, doravante
     "Abrigo Parceiro".

1.3. VOLUNTÁRIO. Pessoa física, maior de 18 anos, cadastrada na
     Plataforma como voluntária, que aderiu livremente a este termo,
     doravante "Voluntário" ou "Você".

═══════════════════════════════════════════════════════════════

2. DEFINIÇÕES

2.1. "Atividade Voluntária" — qualquer ação realizada pelo Voluntário
     em favor de um Abrigo Parceiro, organizada ou não pela
     Plataforma, incluindo mas não se limitando a: passeio com cães,
     socialização de gatos, transporte de animais, tosquia, fotografia,
     participação em eventos (vitrines, feiras, mutirões de adoção),
     cuidado com a saúde e bem-estar dos animais e suporte
     administrativo ao Abrigo Parceiro.

2.2. "Perfil de Voluntário" — documento digital mantido em
     users/{uid}/volunteer_profile na Plataforma, contendo dados
     cadastrais, habilidades, disponibilidade, raio de atuação e
     aceite deste termo.

2.3. "Rostagem" — documento digital mantido em
     clubs/{clubId}/volunteers/{volunteerUid} no abrigo, registrando
     a relação de voluntariado entre o Voluntário e aquele abrigo
     específico, com status, datas e verificação de antecedentes
     (quando aplicável).

2.4. "Termo" — este Termo de Voluntariado, em sua versão vigente
     publicada na Plataforma.

2.5. "Dados Pessoais" — toda informação relacionada a pessoa
     física identificada ou identificável, conforme definido no
     art. 5º, I, da Lei 13.709/2018 (LGPD).

═══════════════════════════════════════════════════════════════

3. OBJETO

3.1. Este Termo regula a relação jurídica entre Você, a Plataforma e
     os Abrigos Parceiros para a realização de Atividades
     Voluntárias. Ao aderir, Você declara estar ciente e de acordo
     com as regras aqui estabelecidas.

3.2. O voluntariado aqui previsto é de natureza estritamente
     GRATUITA, ESPONTÂNEA, SEM VINCULAÇÃO EMPREGATÍCIA e SEM
     VINCULAÇÃO TRABALHISTA DE QUALQUER NATUREZA (CLT, estatutária
     ou temporária), nos termos do art. 1º da Lei 9.608/1998 e do
     art. 4º, VIII, do Decreto 4.657/1942 (LINDB). Em nenhuma
     hipótese o Voluntário será considerado empregado, estagiário,
     prestador de serviço ou sócio da Plataforma ou do Abrigo
     Parceiro.

3.3. A relação aqui estabelecida NÃO gera:
     a) direito a salário, contraprestação, bônus, participação
        em lucros ou qualquer remuneração;
     b) direito a férias, 13º, FGTS, INSS ou qualquer outro
        benefício trabalhista ou previdenciário;
     c) estabilidade de qualquer natureza;
     d) vínculo empregatício para qualquer fim legal, inclusive
        para fins de responsabilidade subsidiária, em qualquer
        hipótese, conforme reiterado entendimento do TST.

═══════════════════════════════════════════════════════════════

4. CADASTRO E ACEITE

4.1. Para se tornar Voluntário, Você deve:
     a) ser pessoa física, maior de 18 anos, plenamente capaz
        nos termos do Código Civil;
     b) possuir conta ativa na Plataforma com e-mail e telefone
        validados;
     c) preencher o Perfil de Voluntário com dados verdadeiros,
        atuais e completos (habilidades, disponibilidade, raio
        de atuação, transporte, contato);
     d) ler integralmente este Termo (em sua versão mais recente)
        e marcar expressamente o aceite eletrônico, com
        assinatura eletrônica (seu nome completo), conforme
        Lei 14.063/2020;
     e) aceitar a Política de Privacidade da Plataforma.

4.2. O aceite eletrônico é registrado com:
     a) carimbo de data/hora (UTC);
     b) versão do termo aceita;
     c) hash não-criptográfico do nome digitado como assinatura
        (para fins de auditoria, sem armazenar o nome em
        claro no log);
     d) identificador do usuário (UID) que aceitou.

4.3. A Plataforma se reserva o direito de recusar, suspender ou
     cancelar o cadastro de qualquer Voluntário que:
     a) preste informações falsas, enganosas ou incompletas;
     b) descumpra este Termo, a Política de Privacidade ou o
        Código de Conduta;
     c) pratique atos de crueldade, maus-tratos, abandono ou
        negligência contra qualquer animal;
     d) tenha comportamento agressivo, discriminatório,
        ameaçador ou inadequado para com outros voluntários,
        funcionários do Abrigo, adotantes, animais ou equipe
        da Plataforma;
     e) esteja inadimplente com a Plataforma em obrigações
        financeiras (aplicável apenas a doadores que também
        sejam voluntários).

4.4. Alterações neste Termo serão comunicadas por e-mail e/ou
     notificação na Plataforma com antecedência mínima de 30
     (trinta) dias, entrando em vigor na data indicada na
     notificação. Caso Você não concorde com as alterações,
     poderá revogar o consentimento e cancelar seu Perfil de
     Voluntário até a data de vigência das mudanças, sem
     qualquer ônus.

═══════════════════════════════════════════════════════════════

5. DIREITOS E DEVERES DO VOLUNTÁRIO

5.1. São DIREITOS do Voluntário:
     a) realizar Atividades Voluntárias em Abrigos Parceiros,
        observadas as regras do abrigo e da Plataforma;
     b) ter seu Perfil de Voluntário e Rostagem por abrigo
        geridos com transparência (status, datas, observações);
     c) revogar o consentimento e cancelar seu cadastro a
        qualquer tempo, sem necessidade de justificativa;
     d) solicitar acesso, correção, portabilidade e eliminação
        dos seus Dados Pessoais, conforme art. 18 da LGPD;
     e) recusar atividades que considere inadequadas, sem
        sofrer qualquer represália ou penalização;
     f) ser tratado com respeito, equidade e não discriminação
        por gênero, raça, etnia, orientação sexual, religião,
        deficiência ou qualquer outra condição protegida por
        lei;
     g) participar de capacitações oferecidas pela Plataforma
        ou pelos Abrigos Parceiros (quando oferecidas).

5.2. São DEVERES do Voluntário:
     a) manter seus dados cadastrais sempre atualizados;
     b) agir com urbanidade, ética e respeito aos animais e a
        todos os envolvidos (equipe do abrigo, adotantes,
        outros voluntários, equipe da Plataforma);
     c) cumprir as orientações de segurança, higiene e bem-estar
        animal repassadas pelo Abrigo Parceiro;
     d) reportar incidentes, acidentes, doenças de animais ou
        qualquer ocorrência relevante ao responsável pelo
        Abrigo Parceiro em até 24 (vinte e quatro) horas;
     e) zelar pela integridade física dos animais sob seus
        cuidados durante a Atividade Voluntária, abstendo-se
        de práticas que possam causar sofrimento, estresse
        excessivo ou risco à saúde do animal;
     f) NÃO administrar medicamentos, aplicar vacinas, realizar
        procedimentos cirúrgicos ou qualquer ato que constitua
        exercício ilegal da medicina veterinária (Lei 5.517/1968
        e Decreto 64.704/1969);
     g) NÃO fotografar, filmar ou publicar imagens de animais,
        Abrigos Parceiros ou adotantes sem autorização expressa;
     h) manter sigilo sobre dados sensíveis (saúde, localização
        exata, situação financeira) de adotantes e do Abrigo
        Parceiro, conforme a LGPD e o Código de Conduta;
     i) arcar com seus próprios custos de deslocamento,
        alimentação e quaisquer outros necessários à
        Atividade Voluntária, salvo quando expressamente
        ressarcido pelo Abrigo Parceiro (mediante recibo e
        dentro dos limites do orçamento do abrigo);
     j) portar documento de identidade durante a Atividade
        Voluntária, quando solicitado pelo Abrigo Parceiro.

═══════════════════════════════════════════════════════════════

6. DIREITOS E DEVERES DA PLATAFORMA E DOS ABRIGOS PARCEIROS

6.1. São deveres da PLATAFORMA:
     a) manter a infraestrutura técnica da Plataforma em
        condições razoáveis de funcionamento, segurança e
        disponibilidade;
     b) tratar os Dados Pessoais do Voluntário conforme a
        LGPD e a Política de Privacidade;
     c) manter registro auditável dos aceites, com versão do
        termo, data/hora e identificador do usuário;
     d) comunicar alterações deste Termo com antecedência
        mínima de 30 (trinta) dias;
     e) disponibilizar canal de suporte (e-mail
        voluntarios@viralata.org) para dúvidas, reclamações
        e solicitações de direitos do titular;
     f) cooperar com autoridades fiscalizadoras (ANPD,
        Procon, Ministério Público) sempre que legalmente
        demandada.

6.2. São deveres do ABRIGO PARCEIRO:
     a) fornecer ao Voluntário orientações claras de segurança,
        higiene e bem-estar animal antes do início das
        atividades;
     b) disponibilizar material, equipamento e infraestrutura
        mínima necessária para a Atividade Voluntária (coleira,
        guia, sacola, água, etc.);
     c) NÃO transferir ao Voluntário responsabilidades que
        configurem relação de emprego ou exijam mão de obra
        especializada paga (veterinária, limpeza pesada,
        manutenção predial);
     d) respeitar a decisão do Voluntário de recusar qualquer
        atividade, sem represália;
     e) reportar à Plataforma qualquer comportamento
        inadequado do Voluntário em até 30 (trinta) dias
        da ocorrência.

6.3. A Plataforma NÃO se responsabiliza por:
     a) danos materiais, pessoais ou morais decorrentes de
        condutas do Voluntário ou do Abrigo Parceiro fora
        do estrito controle da Plataforma;
     b) acidentes ocorridos durante o trajeto entre a
        residência do Voluntário e o Abrigo Parceiro, salvo
        se o transporte for organizado e pago pela Plataforma;
     c) quaisquer obrigações trabalhistas, previdenciárias,
        fiscais ou cíveis que eventualmente sejam imputadas
        por terceiros ao Abrigo Parceiro em razão de
        interpretação equivocada deste Termo — em tais
        hipóteses, o Abrigo Parceiro responderá
        integralmente e de forma isolada, eximindo a
        Plataforma de qualquer responsabilidade.

═══════════════════════════════════════════════════════════════

7. TRATAMENTO DE DADOS PESSOAIS (LGPD)

7.1. CONTROLADOR. Para os dados do Perfil de Voluntário e da
     Rostagem, o controlador é a Plataforma Viralata.

7.2. ENCARREGADO (DPO). O encarregado pelo tratamento de dados
     pessoais (Data Protection Officer) pode ser contatado pelo
     e-mail dpo@viralata.org.

7.3. DADOS TRATADOS. São tratados os seguintes Dados Pessoais:
     a) dados cadastrais: nome completo, e-mail, telefone,
        data de nascimento, CPF (opcional, para ressarcimento
        de despesas), endereço/região de atuação;
     b) dados do perfil: habilidades, disponibilidade
        semanal, raio máximo de deslocamento, tipo de
        transporte, foto (opcional);
     c) dados de uso: registros de participação em eventos
        (data, tipo, função, horas, observação);
     d) dados de verificação de antecedentes (background
        check): status e data, jamais o conteúdo bruto do
        check, quando aplicável;
     e) dados de auditoria: IP, user-agent, timestamps de
        aceite, versão do termo.

7.4. FINALIDADES. Os dados são tratados para:
     a) cadastro e manutenção do Perfil de Voluntário
        (execução do contrato, art. 7º, V);
     b) convocação para Atividades Voluntárias compatíveis
        com o perfil e a disponibilidade (execução do
        contrato, art. 7º, V);
     c) comunicação operacional entre Plataforma, Abrigos
        Parceiros e Voluntário (legítimo interesse, art. 7º,
        IX, e art. 10);
     d) emissão de declarações de horas de voluntariado,
        quando solicitado pelo Voluntário (execução do
        contrato, art. 7º, V);
     e) cumprimento de obrigações legais e fiscais (art. 7º,
        II);
     f) prevenção a fraudes, abusos e uso indevido da
        Plataforma (legítimo interesse, art. 7º, IX);
     g) melhoria dos serviços, em forma agregada e
        anonimizada (legítimo interesse, art. 7º, IX).

7.5. BASES LEGAIS. O tratamento se fundamenta no consentimento
     (art. 7º, I) — para tratamento do Perfil de Voluntário
     além do estritamente necessário — e na execução deste
     Termo (art. 7º, V) — para finalidades operacionais
     essenciais.

7.6. COMPARTILHAMENTO. Os dados do Perfil de Voluntário são
     compartilhados com os Abrigos Parceiros nos quais o
     Voluntário ingressa na Rostagem, observada a necessidade
     (princípio da necessidade, art. 6º, III). NÃO são
     compartilhados com terceiros para fins comerciais ou
     publicitários. Eventuais prestadores de serviço
     (provedor de hospedagem, e-mail transacional, auditoria
     de segurança) podem ter acesso aos dados estritamente
     para execução dos serviços, sob contrato com cláusulas
     de proteção de dados (art. 39).

7.7. RETENÇÃO. Os dados são retidos enquanto durar a relação
     de voluntariado e por mais 5 (cinco) anos após o
     término, para fins de auditoria e cumprimento de
     obrigações legais (art. 16, Decreto 4.657/1942, e
     legislação tributária). Dados anonimizados podem ser
     retidos por prazo indeterminado para fins estatísticos.

7.8. DIREITOS DO TITULAR. Conforme art. 18 da LGPD, Você tem
     direito a:
     a) confirmação da existência de tratamento;
     b) acesso aos dados;
     c) correção de dados incompletos, inexatos ou
        desatualizados;
     d) anonimização, bloqueio ou eliminação de dados
        desnecessários, excessivos ou tratados em
        desconformidade;
     e) portabilidade;
     f) eliminação dos dados tratados com consentimento,
        exceto nas hipóteses de retenção legal;
     g) revogação do consentimento;
     h) informação sobre entidades públicas e privadas com
        as quais houve compartilhamento.
     Solicitações devem ser feitas pelo e-mail
     dpo@viralata.org e serão respondidas em até 15 (quinze)
     dias úteis.

7.9. COOKIES. A Plataforma utiliza cookies e tecnologias
     semelhantes, conforme detalhado na Política de Cookies,
     em conformidade com a LGPD e o Marco Civil da Internet
     (Lei 12.965/2014, art. 7º, III). O consentimento para
     cookies não essenciais é coletado via banner na primeira
     visita.

═══════════════════════════════════════════════════════════════

8. CONFIDENCIALIDADE

8.1. O Voluntário se compromete a manter sigilo absoluto sobre:
     a) informações financeiras do Abrigo Parceiro
        (receitas, despesas, doadores, patrocínios);
     b) dados pessoais de adotantes (nome completo, CPF, RG,
        endereço, contato, dados financeiros);
     c) local exato e esquemas de segurança de Abrigos
        Parceiros, lares temporários e adotantes;
     d) histórico de saúde detalhado de animais atendidos;
     e) informações privilegiadas da Plataforma que não sejam
        públicas.

8.2. O dever de sigilo permanece por 5 (cinco) anos após o
     término da relação de voluntariado, sob pena de
     responsabilização civil e criminal (art. 153 do Código
     Penal, divulgação de segredo).

═══════════════════════════════════════════════════════════════

9. RESPONSABILIDADE CIVIL

9.1. O Voluntário responderá civilmente, nos termos do art. 186
     e 927 do Código Civil, por dolo ou culpa, por danos
     materiais, pessoais ou morais que causar a animais, a
     pessoas ou ao patrimônio do Abrigo Parceiro ou de
     terceiros durante a Atividade Voluntária.

9.2. A Plataforma e o Abrigo Parceiro não respondem por
     perdas, danos ou lesões sofridos pelo Voluntário em
     razão de conduta imprudente, negligente ou imperita do
     próprio Voluntário.

9.3. A Plataforma mantém seguro de responsabilidade civil
     cobrindo apenas condutas estritamente alinhadas a este
     Termo e às orientações do Abrigo Parceiro, até o limite
     da apólice (informações em
     https://viralata.org/legal/seguros). Condutas fora
     desse escopo não estão cobertas.

9.4. Em nenhuma hipótese a Plataforma será responsável por
     danos indiretos, lucros cessantes, danos punitivos ou
     danos morais coletivos.

═══════════════════════════════════════════════════════════════

10. SUSPENSÃO, ENCERRAMENTO E REVOGAÇÃO

10.1. Você pode ENCERRAR seu cadastro a qualquer tempo, sem
      necessidade de justificativa, com efeito imediato,
      mediante solicitação pelo e-mail
      voluntarios@viralata.org ou pelo próprio painel de
      configurações da Plataforma.

10.2. O Abrigo Parceiro pode PAUSAR ou REMOVER o Voluntário de
      sua Rostagem, com justificativa, observados os limites
      do art. 5º, I, "d" deste Termo (vedação a represália
      por exercício regular de direito).

10.3. A Plataforma pode SUSPENDER ou CANCELAR o cadastro do
      Voluntário nas hipóteses do item 4.3, mediante
      notificação prévia de 7 (sete) dias corridos, exceto
      em casos de urgência (maus-tratos comprovados, ameaça
      à integridade física de outrem), em que a suspensão é
      imediata.

10.4. Em qualquer hipótese de encerramento, os Dados Pessoais
      serão tratados conforme item 7.7 (retenção legal por
      5 anos) e depois eliminados ou anonimizados.

═══════════════════════════════════════════════════════════════

11. DISPOSIÇÕES GERAIS

11.1. Este Termo é regido pelas leis da República Federativa
      do Brasil.

11.2. A nulidade de qualquer cláusula não afeta a validade das
      demais.

11.3. O não exercício de qualquer direito aqui previsto não
      constitui renúncia.

11.4. Comunicações formais entre as partes serão feitas por
      e-mail (cadastrado no Perfil de Voluntário) ou por
      notificação na própria Plataforma, com confirmação de
      leitura. Comunicações por carta registrada são
      admitidas em caso de falha reiterada dos meios
      eletrônicos.

11.5. Este Termo é disponibilizado em formato que pode ser
      salvo e impresso pelo Voluntário, conforme art. 4º
      da Lei 14.063/2020.

═══════════════════════════════════════════════════════════════

12. FORO

12.1. Fica eleito o foro da Comarca de [CIDADE DA OPERADORA] /
      [ESTADO] para dirimir quaisquer questões oriundas deste
      Termo, com renúncia a qualquer outro, por mais
      privilegiado que seja.

12.2. Antes de qualquer medida judicial, as partes se
      comprometem a tentar solução consensual pelo canal
      voluntarios@viralata.org, com prazo de 60 (sessenta)
      dias para resposta.

═══════════════════════════════════════════════════════════════

DECLARAÇÃO DE ACEITE

"Declaro, para todos os fins de direito, que LI INTEGRALMENTE
este Termo de Voluntariado v2 (versão 2026-07-10-v2), que
COMPREENDO todas as suas cláusulas, em especial as relativas
ao tratamento dos meus Dados Pessoais (LGPD), à ausência de
vínculo empregatício, e aos meus direitos e deveres, e que
CONCORDO com tudo o que nele está escrito. Minha assinatura
eletrônica abaixo, datada eletronicamente, tem validade
jurídica conforme a Lei 14.063/2020."

[campo de assinatura: nome completo]
[carimbo de data/hora UTC]
[UID]
[hash do nome (sig_xxxxxxxx)]
[endereço IP + user-agent (registrado apenas no log de auditoria)]

═══════════════════════════════════════════════════════════════

Versão: 2026-07-10-v2
Data de publicação: 10/07/2026
Data de entrada em vigor: 10/07/2026
Operadora: [Razão Social da Operadora]
Encarregado (DPO): dpo@viralata.org

TODO(JURÍDICO): Este texto foi redigido pelo agente Viralata Coder
seguindo a legislação brasileira aplicável. DEVE passar por revisão
de advogado(a) especializado(a) em direito digital e proteção de
dados antes de uso definitivo em produção. Campos entre colchetes
[RAZÃO SOCIAL], [CNPJ], [CIDADE] devem ser preenchidos pela
operadora antes da publicação.
`;

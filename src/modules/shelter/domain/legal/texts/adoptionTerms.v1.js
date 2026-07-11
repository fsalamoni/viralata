/**
 * @fileoverview Texto integral do Termo de Adoção Responsável
 * (Fase 19 / Bloco 4).
 *
 * Texto exibido ao adotante antes do submit da application.
 * Estrutura:
 *  1. Identificação das partes
 *  2. Definições
 *  3. Objeto
 *  4. Obrigações do Adotante
 *  5. Obrigações do Abrigo
 *  6. Condições da adoção (cláusulas especiais)
 *  7. Devolução
 *  8. Tratamento de Dados Pessoais
 *  9. Responsabilidade
 * 10. Disposições gerais
 * 11. Foro
 *
 * Marco legal: Lei 9.605/1998 (art. 32, maus-tratos), Código
 * Civil, CDC quando aplicável, LGPD, Lei 14.063/2020.
 *
 * IMPORTANTE: o aceite é gravado em
 * `clubs/{clubId}/adoption_workflow/{applicationId}` (campos
 * `terms_accepted_at` + `terms_version` + `signature_text`).
 * Esses campos são IMUTÁVEIS após o submit (a regra do
 * firestore.rules os protege; vide PR desta fase).
 */

export const ADOPTION_TERMS_TEXT_V1 = `TERMO DE ADOÇÃO RESPONSÁVEL — VERSÃO 2026-07-10
Plataforma Viralata

═══════════════════════════════════════════════════════════════

1. IDENTIFICAÇÃO DAS PARTES

1.1. ADOTANTE. Você, pessoa física que está submetendo esta
     application, identificada pelo UID de login e
     confirmada pelos dados do formulário de aplicação.

1.2. ABRIGO. Organização da Sociedade Civil (OSC) parceira
     responsável pelo Animal objeto desta application,
     identificada pelo clubId e pelo responsável legal
     cadastrado na Plataforma.

1.3. PLATAFORMA. Viralata, que opera a Plataforma e
     registra este Termo em nome do Abrigo.

1.4. ANIMAL. Cão ou gato cadastrado na Plataforma,
     mantido pelo Abrigo, objeto desta application,
     identificado pelo pet_id.

═══════════════════════════════════════════════════════════════

2. DEFINIÇÕES

2.1. "Adoção" — ato pelo qual o Adotante recebe o Animal
     do Abrigo, assumindo responsabilidade integral por
     sua guarda, cuidado, saúde e bem-estar.

2.2. "Adoção Responsável" — adoção que observa os
     princípios de bem-estar animal (5 Liberdades),
     legislação aplicável (Lei 9.605/1998, Decreto
     24.645/1934) e as condições deste Termo.

2.3. "Período de Adaptação" — primeiros 30 (trinta)
     dias após a entrega do Animal, durante o qual o
     Adotante tem o direito (e o dever) de comunicar
     ao Abrigo qualquer dificuldade, e o Abrigo tem o
     dever de oferecer orientação e suporte.

2.4. "Pós-Adoção" — acompanhamento realizado pelo
     Abrigo nos prazos definidos na plataforma
     (3 semanas, 3 meses, 1, 2 e 3 anos após a adoção),
     via Plataforma ou por telefone.

═══════════════════════════════════════════════════════════════

3. OBJETO

3.1. Este Termo regula a relação entre Adotante, Abrigo
     e Plataforma para a ADOÇÃO RESPONSÁVEL do Animal
     identificado na application.

3.2. O Adotante declara, ao aceitar este Termo, que:
     a) tem capacidade civil para assumir as
        obrigações aqui previstas (maior de 18 anos
        ou emancipado);
     b) possui condições financeiras, físicas e
        emocionais para garantir o cuidado adequado
        ao Animal;
     c) reside em local que permite a guarda do
        Animal, observada a legislação local e as
        regras do condomínio (quando aplicável);
     d) concorda com a vistoria prévia (home visit)
        e com o acompanhamento pós-adoção.

═══════════════════════════════════════════════════════════════

4. OBRIGAÇÕES DO ADOTANTE

O Adotante se compromete a:

4.1. FORNECER AO ANIMAL:
     a) alimentação adequada e em quantidade
        suficiente, conforme orientação do Abrigo
        e do médico veterinário;
     b) água limpa e fresca, à vontade;
     c) abrigo seguro, arejado, protegido de
        intempéries e de outros animais
        agressivos;
     d) assistência veterinária preventiva e
        curativa, com médico veterinário
        regularmente inscrito no CRMV;
     e) medicação, quando prescrita por
        veterinário;
     f) castração, salvo se houver contraindicação
        médica documentada.

4.2. MANTER O ANIMAL:
     a) dentro do perímetro de sua residência
        (não permitir acesso à rua sem
        supervisão);
     b) com identificação (microchip ou coleira
        com placa), conforme legislação local;
     c) em condições de higiene, saúde e bem-
        estar compatíveis com as 5 Liberdades;
     d) com vacinas e vermifugação em dia,
        conforme calendário veterinário.

4.3. NÃO PRATICAR, EM HIPÓTESE ALGUMA:
     a) qualquer ato de abuso, maus-tratos,
        agressão, mutilação, abandono ou
        negligência, sob pena de rescisão
        imediata deste Termo e responsabilização
        civil e criminal (Lei 9.605/1998, art.
        32, com pena de detenção de 3 meses a 1
        ano, ou reclusão de 2 a 5 anos se
        resultar morte — Lei 14.064/2020);
     b) repasse do Animal a terceiros (pessoa
        física ou jurídica) sem autorização
        prévia e por escrito do Abrigo;
     c) uso do Animal em experimentos,
        espetáculos, rinhas, competições
        violentas, trabalho forçado ou qualquer
        fim que viole a legislação ou a
        dignidade animal;
     d) eutanásia do Animal, salvo em
        situação clínica terminal atestada
        por médico veterinário, com
        comunicação prévia ao Abrigo.

4.4. COMUNICAR AO ABRIGO:
     a) mudança de endereço, em até 30 (trinta)
        dias;
     b) qualquer alteração relevante na
        composição familiar ou nas condições
        de guarda;
     c) doença, acidente, fuga ou óbito do
        Animal, em até 7 (sete) dias;
     d) intenção de devolver o Animal, em até
        15 (quinze) dias após a decisão, com
        devolução efetiva em até 30 (trinta)
        dias.

4.5. PERMITIR VISTORIAS E CONTATOS:
     a) vistoria prévia à adoção (home visit),
        em data e horário agendados com
        antecedência mínima de 7 (sete) dias;
     b) visitas de acompanhamento pós-adoção,
        conforme item 7 deste Termo;
     c) contatos telefônicos e por mensagem
        da equipe do Abrigo ou da Plataforma,
        com resposta em até 48 (quarenta e
        oito) horas.

═══════════════════════════════════════════════════════════════

5. OBRIGAÇÕES DO ABRIGO

O Abrigo se compromete a:

5.1. Entregar o Animal:
     a) em boas condições de saúde e higiene;
     b) com castração realizada (quando
        aplicável) ou com encaminhamento para
        castração;
     c) com vacinas e vermifugação em dia;
     d) com microchipagem, quando aplicável;
     e) com cópia do prontuário médico.

5.2. Prestar orientação prévia sobre:
     a) cuidados com o Animal (alimentação,
        higiene, comportamento);
     b) castração e vacinas;
     c) integração com outros animais da
        casa;
     d) sinais de alerta de doenças
        comportamentais.

5.3. Realizar o acompanhamento pós-adoção
     nos prazos definidos (3 semanas, 3 meses,
     1, 2 e 3 anos), via Plataforma ou telefone.

5.4. Em caso de devolução, recolher o Animal
     sem cobrança de taxa, mantendo o Adotante
     sem ônus (a taxa de adoção eventualmente
     paga NÃO é reembolsável, salvo acordo em
     contrário).

5.5. Tratar os Dados Pessoais do Adotante
     conforme a LGPD, a Política de Privacidade
     e a finalidade deste Termo.

═══════════════════════════════════════════════════════════════

6. CONDIÇÕES ESPECIAIS

6.1. TAXA DE ADOÇÃO. Quando o Abrigo cobrar taxa
     de adoção, o valor e a destinação serão
     informados ANTES do submit da application.
     A taxa é fixada e revertida INTEGRALMENTE
     ao Abrigo, com destinação declarada a
     castração, vacinas, alimentação e demais
     despesas veterinárias. A Plataforma NÃO
     retém qualquer percentual.

6.2. ADOÇÃO À DISTÂNCIA. Para adoções em que o
     Animal é transportado para cidade/estado
     diverso do Adotante, o transporte será
     combinado caso a caso, com custos a
     cargo do Adotante, salvo se o Abrigo
     oferecer gratuitamente.

6.3. ANIMAIS COM NECESSIDADES ESPECIAIS. Animais
     com doenças crônicas, deficiências físicas
     ou idade avançada podem ter condições
     adicionais, informadas antes do aceite.

6.4. VISTORIA PRÉVIA. O Abrigo pode condicionar
     a entrega do Animal à vistoria prévia da
     residência do Adotante, com consentimento
     expresso deste (LGPD, art. 7º, V).

═══════════════════════════════════════════════════════════════

7. DEVOLUÇÃO

7.1. O Adotante pode devolver o Animal a qualquer
     tempo, sem necessidade de justificativa,
     mediante comunicação ao Abrigo.

7.2. A devolução deve ser efetiva em até 30
     (trinta) dias após a comunicação, com
     entrega do Animal nas dependências do
     Abrigo ou em local acordado.

7.3. A taxa de adoção NÃO é reembolsável, salvo
     acordo em contrário entre Adotante e
     Abrigo, ou salvo se o Abrigo for o
     responsável pela incompatibilidade (ex.:
     omissão de informação relevante sobre o
     Animal).

7.4. Em caso de devolução repetida (mais de 2
     adoções com devolução), o Adotante pode ter
     seu cadastro de adotante suspenso para
     novas adoções, a critério do Abrigo.

7.5. Em caso de ABANDONO (não devolução dentro
     do prazo, sem comunicação), o Abrigo pode:
     a) adotar as medidas judiciais cabíveis
        (busca e apreensão do Animal, ação
        por perdas e danos);
     b) comunicar às autoridades competentes
        (Lei 9.605/1998, art. 32).

═══════════════════════════════════════════════════════════════

8. TRATAMENTO DE DADOS PESSOAIS (LGPD)

8.1. Para os Dados Pessoais coletados nesta
     adoption, o Abrigo Parceiro é o CONTROLADOR.

8.2. Dados coletados: identificação do Adotante
     (nome, CPF, RG, endereço, contato),
     composição familiar, condições de moradia,
     referências pessoais e veterinárias, e
     histórico de adoções.

8.3. Finalidades: avaliação da candidatura,
     contato durante o processo, vistoria
     prévia, entrega do Animal, acompanhamento
     pós-adoção, cumprimento de obrigações
     legais.

8.4. Base legal: execução de contrato (art. 7º,
     V, da LGPD) e legítimo interesse (art.
     7º, IX) para pós-adoção.

8.5. Retenção: enquanto durar a relação e por
     mais 5 (cinco) anos após a conclusão do
     processo, para fins de auditoria.

8.6. Direitos do Titular: vide Política de
     Privacidade da Plataforma. Solicitações
     devem ser feitas ao DPO do Abrigo
     Parceiro (informado no momento do
     aceite) ou a dpo@viralata.org.

8.7. Compartilhamento: o Abrigo NÃO compartilha
     os dados do Adotante com terceiros, exceto
     prestadores de serviço essenciais (veterinário,
     transportador) sob cláusula de
     confidencialidade.

═══════════════════════════════════════════════════════════════

9. RESPONSABILIDADE

9.1. O Adotante responde civil e criminalmente por
     atos de maus-tratos, abandono, negligência
     ou qualquer outra violação à Lei 9.605/1998,
     art. 32, durante a guarda do Animal.

9.2. O Abrigo responde por omissão de informações
     relevantes sobre o Animal (doenças, histórico
     de comportamento) que tenham sido
     determinante para a adoção.

9.3. A Plataforma atua como intermediária técnica,
     nos termos do item 7 dos Avisos Legais
     (/legal/avisos-legais), e não assume
     responsabilidade direta pela relação entre
     Adotante e Abrigo.

9.4. Danos materiais, pessoais ou morais
     decorrentes de mordeduras, arranhões,
     alergias, transmissão de zoonoses ou outras
     situações envolvendo o Animal NÃO são de
     responsabilidade do Abrigo ou da Plataforma,
     salvo em caso de dolo ou culpa comprovada
     do Abrigo (ex.: omissão de informação sobre
     histórico agressivo do Animal).

═══════════════════════════════════════════════════════════════

10. DISPOSIÇÕES GERAIS

10.1. Este Termo é celebrado por meio eletrônico,
      com aceite registrado na Plataforma
      (carimbo de data/hora, versão, hash do
      nome digitado, UID do adotante), nos
      termos da Lei 14.063/2020, em nível
      básico.

10.2. A versão aceita fica gravada
      IMUTAVELMENTE no doc da application
      (\`terms_version\` + \`terms_accepted_at\` +
      \`signature_text\`) para fins de auditoria.

10.3. Alterações neste Termo serão comunicadas
      com antecedência mínima de 30 (trinta)
      dias, entrando em vigor para novas
      applications na data indicada.

10.4. A nulidade de qualquer cláusula não afeta
      a validade das demais.

10.5. Este Termo é regido pelas leis da
      República Federativa do Brasil.

═══════════════════════════════════════════════════════════════

11. FORO

11.1. Fica eleito o foro da Comarca do
      [MUNICÍPIO DO ABRIGO] / [ESTADO] para
      dirimir questões oriundas deste Termo,
      com renúncia a qualquer outro.

11.2. Antes de qualquer medida judicial, as
      partes se comprometem a tentar solução
      consensual pelo canal
      adocoes@abrigo.org.br, com prazo de 60
      (sessenta) dias para resposta.

═══════════════════════════════════════════════════════════════

DECLARAÇÃO DE ACEITE

"Declaro, para todos os fins de direito, que LI
INTEGRALMENTE este Termo de Adoção Responsável
v1 (versão 2026-07-10), que COMPREENDO todas as
suas cláusulas, em especial as relativas ao
tratamento dos meus Dados Pessoais (LGPD), à
guarda responsável do Animal, à vedação a
maus-tratos e abandono, e às condições de
devolução, e que CONCORDO com tudo o que nele
está escrito. Minha assinatura eletrônica
abaixo, datada eletronicamente, tem validade
jurídica conforme a Lei 14.063/2020."

[campo de assinatura: nome completo]
[carimbo de data/hora UTC]
[UID]
[hash do nome (sig_xxxxxxxx)]

═══════════════════════════════════════════════════════════════

Versão: 2026-07-10
Data de publicação: 10/07/2026
Data de entrada em vigor: 10/07/2026

TODO(JURÍDICO): Revisão jurídica recomendada. O campo
[MUNICÍPIO DO ABRIGO] / [ESTADO] deve ser preenchido pelo
Abrigo no momento do aceite (UI captura esses dados do
perfil do abrigo).
`;

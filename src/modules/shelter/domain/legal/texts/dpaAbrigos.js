/**
 * @fileoverview Texto integral — DPA (Data Processing Agreement)
 * para Abrigos e ONGs (Fase 19 / Bloco 5).
 *
 * Texto exibido em /legal/dpa-abrigos. Gerado a partir do arquivo
 * `07_DPA_Abrigos.md` do pacote
 * `Viralata_Documentos_Legais_Completos_v2.zip`
 * (10/07/2026) e convertido em template string pelo script
 * `scripts/import-legal-docs-v2.mjs`.
 *
 * IMPORTANTE: este texto é a base operacional da plataforma.
 * A versão definitiva deve passar por revisão jurídica humana
 * (vide SCRUM_TASKS.json — TASK-006/007/008). O texto v1 é
 * o que vai para produção hoje; correções jurídicas serão
 * aplicadas em v2 com changelog.
 *
 * Marco legal: LGPD (Lei 13.709/2018, art. 33, 39, 46, 48),
 * Lei 14.063/2020 (assinatura eletrônica), Marco Civil da
 * Internet (Lei 12.965/2014).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 5)
 * @see src/modules/shelter/domain/legal/dpaAbrigos.js
 */

export const DPA_ABRIGOS_VERSION = '2026-07-10';

/**
 * Texto integral do DPA para Abrigos e ONGs (v1).
 */
export const DPA_ABRIGOS_TEXT = `DATA PROCESSING AGREEMENT (DPA) — ACORDO DE TRATAMENTO DE DADOS
VERSÃO 2026-07-10
Plataforma Viralata

═══════════════════════════════════════════════════════════════

Anexo obrigatório aos Termos de Uso para perfis do tipo
"Abrigo/ONG". Aceite eletrônico no momento da criação do painel
administrativo do Abrigo.

Este Acordo de Tratamento de Dados (DPA) regulamenta o tratamento
de dados pessoais realizado pela Viralata (Operadora) em nome do
Abrigo/ONG (Controlador), em cumprimento às exigências da Lei
Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).

═══════════════════════════════════════════════════════════════

1. PAPÉIS E ESCOPO

1.1. Ao utilizar o "Sistema de Gestão do Abrigo" (módulo SaaS da
     Viralata) para registrar adotantes, voluntários, lares
     temporários e manter prontuários veterinários, o Abrigo
     atua como Controlador dos dados, pois é ele quem toma as
     decisões sobre a finalidade e a base legal do tratamento.

1.2. A Viralata atua como Operadora, limitando-se a fornecer a
     infraestrutura de software e armazenamento em nuvem para que
     o Abrigo realize a gestão.

1.3. O presente DPA aplica-se a TODOS os tratamentos de dados
     pessoais realizados pela Viralata em nome do Abrigo no
     contexto do módulo SaaS, incluindo: dados de adotantes,
     voluntários, lares temporários, doadores, veterinários,
     animais e terceiros inseridos pelo Abrigo no sistema.

═══════════════════════════════════════════════════════════════

2. OBRIGAÇÕES DA VIRALATA (OPERADORA)

A Viralata compromete-se a:

2.1. TRATAMENTO RESTRITO: Tratar os dados pessoais inseridos
     no painel do Abrigo exclusivamente de acordo com as
     instruções lícitas do Abrigo e para a finalidade de
     fornecer o software SaaS.

2.2. SEGURANÇA: Implementar medidas técnicas e organizacionais
     adequadas (criptografia, controle de acesso) para proteger
     os dados contra vazamentos, acessos não autorizados ou
     perda.

2.3. SUBOPERADORES: O Abrigo autoriza a Viralata a contratar
     suboperadores de infraestrutura em nuvem (ex: Google Cloud,
     Firebase, AWS) para a hospedagem dos dados, desde que estes
     ofereçam garantias de conformidade com a LGPD ou GDPR
     (no caso de transferência internacional).

2.4. ASSISTÊNCIA AO CONTROLADOR: Auxiliar o Abrigo, na medida
     do possível, a responder requisições de titulares de dados
     (adotantes/voluntários) que exerçam seus direitos previstos
     no Art. 18 da LGPD (acesso, correção, exclusão).

2.5. NOTIFICAÇÃO DE INCIDENTES: Notificar o Abrigo imediatamente,
     e em até 48 horas, caso tenha ciência de qualquer incidente
     de segurança que afete os dados controlados pelo Abrigo.

2.6. REGISTRO DE OPERAÇÕES: Manter registro das operações de
     tratamento realizadas em nome do Abrigo, nos termos do
     Art. 37 da LGPD.

2.7. EXCLUSÃO/DEVOLUÇÃO DE DADOS: Ao término do contrato,
     devolver ou excluir todos os dados pessoais do Abrigo,
     conforme orientação deste, no prazo de 30 (trinta) dias
     úteis, ressalvadas as hipóteses de retenção legal.

═══════════════════════════════════════════════════════════════

3. OBRIGAÇÕES DO ABRIGO (CONTROLADOR)

O Abrigo compromete-se a:

3.1. BASE LEGAL: Garantir que possui uma base legal válida
     (ex: consentimento, execução de contrato, legítimo
     interesse) para inserir dados de terceiros (adotantes,
     lares temporários, médicos-veterinários) na Plataforma
     Viralata.

3.2. INSTRUÇÕES LÍCITAS: Não utilizar a Plataforma para
     realizar tratamentos ilícitos, como envio de spam, venda
     de banco de dados ou discriminação abusiva. A Viralata
     isenta-se de responsabilidade caso o Abrigo realize
     operações ilegais utilizando o sistema.

3.3. GESTÃO DE ACESSOS: Gerenciar adequadamente os níveis de
     permissão dos seus voluntários no painel administrativo,
     revogando o acesso de voluntários desligados para evitar
     vazamentos internos.

3.4. AVISO AOS TITULARES: Informar aos titulares dos dados
     (adotantes, voluntários, LTs) sobre o tratamento realizado
     pela Viralata como Operadora, por meio da Política de
     Privacidade disponibilizada pela Plataforma.

3.5. RESPONDER REQUISIÇÕES: Receber e responder requisições de
     titulares de dados direcionadas ao Abrigo, utilizando os
     recursos disponibilizados pela Viralata para esse fim.

═══════════════════════════════════════════════════════════════

4. RETENÇÃO E EXCLUSÃO DE DADOS

4.1. Ao término da relação entre o Abrigo e a Viralata
     (exclusão da conta do Abrigo), a Viralata apagará ou
     anonimizará os dados pessoais controlados pelo Abrigo,
     exceto aqueles que precisem ser retidos para cumprimento
     de obrigação legal da própria Viralata (ex: logs do
     Marco Civil da Internet).

4.2. O Abrigo é responsável por exportar seus relatórios e
     prontuários antes da exclusão definitiva da conta.
     A Viralata não se responsabiliza pela perda de dados
     não exportados pelo Abrigo dentro do prazo disponível.

4.3. O prazo máximo de retenção dos dados é de 5 (cinco) anos
     após o encerramento da conta do Abrigo, salvo exigência
     legal em contrário.

═══════════════════════════════════════════════════════════════

5. SEGURANÇA DA INFORMAÇÃO

5.1. A Viralata implementa as seguintes medidas de segurança,
     a título exemplificativo: criptografia em trânsito (TLS),
     criptografia em repouso, controle de acesso baseado em
     função (RBAC), autenticação multifator para administradores,
     logs de auditoria, testes de penetração periódicos.

5.2. O Abrigo é responsável por: (i) manter suas credenciais
     de acesso em sigilo; (ii) utilizar conexão segura (HTTPS)
     ao acessar o sistema; (iii) reportar imediatamente
     qualquer suspeita de acesso não autorizado.

═══════════════════════════════════════════════════════════════

6. INCIDENTES DE SEGURANÇA (ART. 48 LGPD)

6.1. A Viralata notificará o Abrigo em até 48 (quarenta e
     oito) horas após tomar conhecimento de qualquer incidente
     de segurança que possa causar risco ou dano relevante aos
     titulares dos dados.

6.2. A notificação incluirá: descrição da natureza do
     incidente, dados potencialmente afetados, medidas
     adotadas e recomendações aos titulares.

6.3. O Abrigo, na qualidade de Controlador, é responsável por
     notificar a ANPD e os titulares afetados, quando
     aplicável, conforme o Art. 48 da LGPD.

═══════════════════════════════════════════════════════════════

7. TRANSFERÊNCIA INTERNACIONAL

7.1. Os dados poderão ser transferidos para suboperadores
     localizados no exterior (ex: Google LLC — Firebase),
     desde que: (i) o país de destino proporcione grau de
     proteção adequado; ou (ii) o Abrigo autorize a
     transferência mediante cláusulas contratuais padrão.

7.2. A Viralata mantém список atualizado de suboperadores
     e o disponibilizará ao Abrigo mediante solicitação.

═══════════════════════════════════════════════════════════════

8. DISPOSIÇÕES GERAIS

8.1. O presente DPA é parte integrante dos Termos de Uso da
     Plataforma Viralata e entra em vigor na data do aceite
     eletrônico pelo Abrigo.

8.2. Qualquer alteração neste DPA será comunicada ao Abrigo
     com antecedência mínima de 30 (trinta) dias. O silêncio
     do Abrigo após o prazo será considerado aceite da nova
     versão.

8.3. Para questões não previstas neste DPA, aplica-se a
     LGPD e a legislação brasileira vigente.

8.4. Este DPA não cria relação de emprego, sociedade,
     joint venture ou representação entre as partes.

═══════════════════════════════════════════════════════════════

DECLARAÇÃO DE ACEITE

"Ao clicar em 'Aceitar', o representante legal do Abrigo
declara que: (i) está autorizado a celebrar o presente DPA
em nome do Abrigo; (ii) compreende e concorda com as obrigações
de Controlador e Operadora descritas neste documento; (iii)
tem poderes para vincular o Abrigo aos termos aqui estabelecidos."

[Aceite eletrônico]
[Abrigo: nome fantasia]
[Responsável legal: nome completo]
[CPF do responsável]
[Data/hora UTC]
[ID do Abrigo na Plataforma]
[hash do aceite: dpa_sig_xxxxxxxx]

═══════════════════════════════════════════════════════════════

Versão: 2026-07-10
Data de publicação: 10/07/2026
Data de entrada em vigor: 10/07/2026
Controlador: Abrigo/ONG Parceiro
Operadora: Viralata
`;

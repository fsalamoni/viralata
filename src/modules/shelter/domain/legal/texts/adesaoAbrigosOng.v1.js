/**
 * @fileoverview Texto integral — Termo de Adesão para Abrigos e ONGs (inclui DPA) (Documento v2).
 *
 * Texto exibido em /legal/termo-adesao-abrigos-ong. Gerado a partir do arquivo
 * '12_Termo_Adesao_Abrigos_ONG.md' do pacote
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


export const SHELTER_ADHESION_VERSION = '2026-07-10';

export const SHELTER_ADHESION_TEXT = `# TERMO DE ADESÃO PARA ABRIGOS E ORGANIZAÇÕES DE PROTEÇÃO ANIMAL

**Aceite obrigatório no momento da criação do perfil de Abrigo/ONG na Plataforma. O sistema deve exigir aceite eletrônico (clickwrap) com registro de IP, timestamp e versão do documento no audit_log antes de liberar o painel administrativo.**

---

Pelo presente instrumento, a pessoa física ou jurídica que se cadastra como **ABRIGO, ONG ou PROTETOR INDEPENDENTE** na Plataforma Viralata (doravante denominado "ABRIGO") adere às condições estabelecidas neste Termo, que regulamenta a utilização do Sistema de Gestão SaaS da Plataforma Viralata (doravante denominada "VIRALATA"), incluindo o **Acordo de Tratamento de Dados (DPA)** constante do Capítulo III deste instrumento.

---

## CAPÍTULO I — ADESÃO E CONDIÇÕES DE USO DO SISTEMA DE GESTÃO

### CLÁUSULA 1ª — DO OBJETO

A VIRALATA concede ao ABRIGO uma licença de uso não exclusiva, intransferível e revogável do Sistema de Gestão SaaS, que compreende os módulos de:
- Cadastro Único do Animal e Linha do Tempo;
- Gestão de Adoções e Acompanhamento Pós-Adoção;
- Gestão de Lares Temporários;
- Prontuário Veterinário e Controle de Medicamentos;
- Galeria de Fotos e Documentos;
- Gestão de Vitrines (Eventos de Adoção);
- Gestão de Voluntários;
- Dashboard, Kanban de Tarefas e Relatórios;
- Campanhas de Doação e Ledger de Prestação de Contas;
- Busca Inteligente e demais funcionalidades disponíveis na Plataforma.

### CLÁUSULA 2ª — DAS OBRIGAÇÕES DO ABRIGO

O ABRIGO compromete-se a:

1. **Veracidade das Informações:** Inserir no sistema apenas informações verdadeiras, precisas e atualizadas sobre os animais, adotantes, voluntários e lares temporários. O ABRIGO é o único e exclusivo responsável civil e penal pela veracidade de todo o conteúdo inserido em seu painel administrativo.

2. **Uso Exclusivamente Filantrópico:** Utilizar a Plataforma exclusivamente para fins de proteção animal, adoção responsável e gestão de abrigo, sendo proibida qualquer forma de comercialização de animais, cruzamento comercial ou desvio dos recursos arrecadados nas campanhas de doação.

3. **Transparência Financeira:** Manter o módulo de Ledger (Prestação de Contas) atualizado com a destinação de todos os recursos arrecadados nas campanhas, garantindo transparência para os doadores.

4. **Gestão de Acessos:** Gerenciar com responsabilidade os níveis de permissão concedidos aos seus voluntários no painel administrativo, revogando imediatamente o acesso de voluntários desligados ou que apresentem comportamento inadequado.

5. **Cumprimento da Legislação Animal:** Garantir que todas as adoções realizadas através da Plataforma sejam precedidas de avaliação criteriosa do adotante, e que o acompanhamento pós-adoção seja realizado nos prazos estabelecidos pelo sistema, em conformidade com as boas práticas de bem-estar animal.

6. **Proibição de Spam:** Não utilizar os dados de adotantes, voluntários e lares temporários coletados através da Plataforma para envio de comunicações não solicitadas (spam), venda de banco de dados ou qualquer finalidade diversa da gestão do abrigo.

### CLÁUSULA 3ª — DAS OBRIGAÇÕES DA VIRALATA

A VIRALATA compromete-se a:

1. Manter o sistema disponível com os melhores esforços, comunicando previamente as manutenções programadas.
2. Garantir a segurança dos dados armazenados no sistema, implementando medidas técnicas adequadas (criptografia, controle de acesso, backups).
3. Notificar o ABRIGO em caso de incidente de segurança que afete os dados de seu painel, no prazo máximo de 48 horas após a ciência do ocorrido.
4. Não vender, alugar ou compartilhar os dados inseridos pelo ABRIGO com terceiros, exceto nas hipóteses previstas na Política de Privacidade e no Capítulo III (DPA) deste Termo.

### CLÁUSULA 4ª — DA LIMITAÇÃO DE RESPONSABILIDADE

**4.1.** A VIRALATA não se responsabiliza por danos decorrentes de informações falsas inseridas pelo ABRIGO no sistema (ex: prontuários incorretos, histórico de saúde omitido).

**4.2.** A VIRALATA não se responsabiliza por adoções malsucedidas, devoluções de animais, comportamento dos adotantes após a adoção ou qualquer litígio entre o ABRIGO e seus adotantes, voluntários ou lares temporários.

**4.3.** A VIRALATA não se responsabiliza por campanhas de arrecadação fraudulentas criadas pelo ABRIGO, sendo este o único responsável pela destinação dos recursos perante os doadores e as autoridades fiscais.

### CLÁUSULA 5ª — DA SUSPENSÃO E CANCELAMENTO

A VIRALATA reserva-se o direito de suspender ou cancelar o acesso do ABRIGO ao sistema, sem aviso prévio, nos seguintes casos:
- Inserção de informações falsas ou conteúdo que viole o Código de Conduta;
- Uso da Plataforma para comercialização de animais;
- Desvio comprovado de recursos de campanhas de doação;
- Descumprimento de qualquer cláusula deste Termo.

---

## CAPÍTULO II — TERMOS ESPECÍFICOS DO SISTEMA DE PRONTUÁRIOS VETERINÁRIOS

### CLÁUSULA 6ª — NATUREZA ADMINISTRATIVA DO PRONTUÁRIO

O módulo de Gestão de Saúde e Prontuários disponibilizado pela VIRALATA é uma ferramenta de **registro administrativo** para organização interna do ABRIGO. Ele não constitui prestação de serviço médico-veterinário, não pratica telemedicina (Resolução CFMV nº 1.465/2022) e não valida clinicamente as informações inseridas.

**6.1.** O ABRIGO é o único responsável pela veracidade das informações inseridas nos prontuários, incluindo diagnósticos, prescrições, datas de vacinas e protocolos de medicação.

**6.2.** A VIRALATA não responde por erros de dosagem, omissões de informações clínicas ou qualquer dano à saúde do animal decorrente de informações incorretas inseridas no sistema pelo ABRIGO ou por seus voluntários.

**6.3.** O ABRIGO declara ciência de que o acesso ao módulo de prontuários por voluntários sem formação veterinária é de sua exclusiva responsabilidade, devendo orientá-los adequadamente sobre os limites de suas atribuições.

---

## CAPÍTULO III — ACORDO DE TRATAMENTO DE DADOS PESSOAIS (DPA)

*Este capítulo regulamenta o tratamento de dados pessoais realizado pela VIRALATA em nome do ABRIGO, em cumprimento às exigências da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018) e, quando aplicável, do Regulamento Geral sobre a Proteção de Dados da União Europeia (GDPR — Regulamento UE 2016/679).*

### CLÁUSULA 7ª — DEFINIÇÃO DE PAPÉIS (CONTROLADOR E OPERADOR)

**7.1. O ABRIGO como Controlador:** Ao utilizar o Sistema de Gestão SaaS da VIRALATA para registrar dados de adotantes, voluntários, lares temporários e prontuários veterinários, o **ABRIGO atua como Controlador** dos dados pessoais, nos termos do Art. 5º, VI da LGPD. É o ABRIGO quem decide a finalidade, a base legal e a forma de tratamento desses dados.

**7.2. A VIRALATA como Operadora:** A **VIRALATA atua como Operadora** dos dados inseridos no painel do ABRIGO, nos termos do Art. 5º, VII da LGPD, limitando-se a fornecer a infraestrutura tecnológica de armazenamento e processamento conforme as instruções do ABRIGO.

**7.3.** Para os dados coletados diretamente pela VIRALATA para operação da Plataforma (ex: conta de usuário, logs de acesso, algoritmo de matching), a VIRALATA atua como **Controladora independente**, conforme descrito na Política de Privacidade.

### CLÁUSULA 8ª — DADOS PESSOAIS TRATADOS PELA VIRALATA EM NOME DO ABRIGO

Os dados pessoais inseridos pelo ABRIGO em seu painel administrativo e tratados pela VIRALATA como Operadora incluem, entre outros:

| Categoria de Dados | Titulares | Finalidade do Tratamento |
| :--- | :--- | :--- |
| Nome, CPF, RG, Telefone, E-mail, Instagram, Endereço | Adotantes | Gestão do processo de adoção e acompanhamento pós-adoção. |
| Nome, Telefone, E-mail, Endereço | Voluntários e Lares Temporários | Gestão de escalas, convocações e histórico de participação. |
| Histórico clínico, vacinas, medicações, fotos | Animais (dados do animal, não pessoais) | Prontuário veterinário e rastreabilidade do bem-estar animal. |
| Fotos e imagens de adotantes/voluntários | Adotantes e Voluntários | Identificação e registro histórico, quando inseridas pelo ABRIGO. |

### CLÁUSULA 9ª — OBRIGAÇÕES DA VIRALATA COMO OPERADORA

A VIRALATA compromete-se a:

1. **Tratamento Restrito:** Tratar os dados pessoais inseridos no painel do ABRIGO exclusivamente para a finalidade de fornecer o serviço SaaS contratado, não os utilizando para fins próprios, comerciais ou de qualquer outra natureza.
2. **Confidencialidade:** Garantir que apenas os colaboradores e sistemas estritamente necessários à operação do serviço tenham acesso aos dados do ABRIGO.
3. **Suboperadores Autorizados:** O ABRIGO autoriza a VIRALATA a contratar os seguintes suboperadores de infraestrutura para hospedagem e armazenamento dos dados: **Google Cloud / Firebase** (servidores de banco de dados, autenticação e armazenamento de arquivos). A VIRALATA garante que esses suboperadores possuem certificações de conformidade com a LGPD e/ou GDPR. Qualquer alteração relevante nos suboperadores será comunicada ao ABRIGO com antecedência mínima de 30 dias.
4. **Assistência ao Controlador:** Auxiliar o ABRIGO, na medida do tecnicamente possível, a responder requisições de titulares de dados (adotantes, voluntários) que exerçam seus direitos previstos no Art. 18 da LGPD (acesso, correção, portabilidade, exclusão), dentro dos prazos legais.
5. **Notificação de Incidentes:** Notificar o ABRIGO imediatamente, e em até 48 horas, caso a VIRALATA tenha ciência de qualquer incidente de segurança que afete os dados controlados pelo ABRIGO (ex: vazamento, acesso não autorizado).
6. **Relatório de Impacto:** Auxiliar o ABRIGO na elaboração do Relatório de Impacto à Proteção de Dados Pessoais (RIPD), quando solicitado e quando o tratamento realizado pelo ABRIGO exigir tal documento nos termos do Art. 38 da LGPD.

### CLÁUSULA 10ª — OBRIGAÇÕES DO ABRIGO COMO CONTROLADOR

O ABRIGO compromete-se a:

1. **Base Legal:** Garantir que possui uma base legal válida (ex: consentimento expresso do titular, execução de contrato, legítimo interesse) para inserir dados pessoais de terceiros — adotantes, voluntários, lares temporários — na Plataforma Viralata, antes de fazê-lo.
2. **Instruções Lícitas:** Não utilizar a Plataforma para realizar operações de tratamento ilícitas. A VIRALATA está isenta de qualquer responsabilidade caso o ABRIGO realize tratamentos ilegais utilizando o sistema (ex: discriminação abusiva de adotantes com base em dados sensíveis, venda de banco de dados).
3. **Informação aos Titulares:** Informar adequadamente os adotantes, voluntários e lares temporários sobre o tratamento de seus dados pessoais pelo ABRIGO, incluindo a utilização da Plataforma Viralata como ferramenta de gestão.
4. **Gestão de Acessos:** Gerenciar os níveis de permissão dos voluntários no painel administrativo, revogando imediatamente o acesso de voluntários desligados para evitar vazamentos internos.

### CLÁUSULA 11ª — TRANSFERÊNCIA INTERNACIONAL DE DADOS

Os dados armazenados na Plataforma Viralata são hospedados em servidores do Google Cloud, que podem estar localizados fora do Brasil. Essa transferência internacional é realizada com base nas garantias de conformidade do Google Cloud com a LGPD e o GDPR, e está amparada pela Resolução CD/ANPD nº 32/2026, que reconhece a União Europeia como organismo com grau de proteção de dados adequado ao previsto na LGPD.

### CLÁUSULA 12ª — RETENÇÃO E EXCLUSÃO DE DADOS

**12.1.** Ao término da relação entre o ABRIGO e a VIRALATA (exclusão da conta do ABRIGO), a VIRALATA apagará ou anonimizará os dados pessoais controlados pelo ABRIGO no prazo de 30 dias, exceto aqueles que precisem ser retidos para cumprimento de obrigação legal da própria VIRALATA (ex: logs de acesso pelo prazo mínimo de 6 meses, conforme o Marco Civil da Internet).

**12.2.** O ABRIGO é responsável por exportar seus relatórios, prontuários e históricos antes da exclusão definitiva da conta. A VIRALATA não se responsabiliza pela perda de dados após a exclusão da conta.

**12.3.** O histórico de adoções e os Termos de Adoção assinados eletronicamente serão mantidos pela VIRALATA pelo prazo prescricional de 5 (cinco) anos, para fins de exercício regular de direitos em eventuais litígios.

---

## CAPÍTULO IV — DISPOSIÇÕES FINAIS

### CLÁUSULA 13ª — VIGÊNCIA E ATUALIZAÇÃO

Este Termo entra em vigor na data do aceite eletrônico pelo ABRIGO e permanece válido enquanto durar a relação de uso da Plataforma. A VIRALATA poderá atualizar este Termo para adequação a novas funcionalidades ou legislações, notificando o ABRIGO com antecedência mínima de 15 dias. A continuidade do uso da Plataforma após a notificação implica na aceitação das novas condições.

### CLÁUSULA 14ª — FORO E LEGISLAÇÃO APLICÁVEL

Este Termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio da VIRALATA para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.

---

Por estar de acordo com todas as cláusulas deste instrumento, o ABRIGO aceita eletronicamente o presente Termo, cujo registro de IP, data e hora (*timestamp*) e ID do usuário, armazenados imutavelmente no sistema de auditoria da Plataforma Viralata, servem como prova de autoria, integridade e validade jurídica deste instrumento.
`;

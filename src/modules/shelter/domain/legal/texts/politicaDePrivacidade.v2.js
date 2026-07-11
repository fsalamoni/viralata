/**
 * @fileoverview Texto integral — Política de Privacidade e Proteção de Dados (LGPD) (Documento v2).
 *
 * Texto exibido em /legal/politica-de-privacidade. Gerado a partir do arquivo
 * '02_Politica_de_Privacidade.md' do pacote
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


export const PRIVACY_POLICY_VERSION = '2026-07-10';

export const PRIVACY_POLICY_TEXT = `# POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS - VIRALATA

**Última atualização:** 10 de julho de 2026

A Viralata valoriza a sua privacidade e está comprometida em proteger os seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e compartilhamos suas informações quando você utiliza nossa Plataforma, em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018) e o Regulamento Geral sobre a Proteção de Dados (GDPR).

Ao marcar a caixa "Li e concordo com a Política de Privacidade" no momento do cadastro, você declara estar ciente e de acordo com as práticas aqui descritas.

---

## 1. NOSSO PAPEL NO TRATAMENTO DE DADOS

A Plataforma Viralata possui uma arquitetura de Software as a Service (SaaS). Isso significa que nosso papel varia conforme a funcionalidade utilizada:

- **Controladora de Dados:** Somos controladores quando coletamos seus dados para criar sua conta de usuário, gerenciar o algoritmo de *matching* (combinação entre você e o pet ideal), processar doações financeiras para a plataforma e manter a segurança do sistema.
- **Operadora de Dados:** Somos operadores quando fornecemos o sistema para que um Abrigo/ONG gerencie seus próprios adotantes, voluntários e lares temporários. Nesses casos, o Abrigo é o Controlador e decide como e por que os dados serão usados, e nós apenas fornecemos a tecnologia de armazenamento seguro (nuvem).

## 2. DADOS QUE COLETAMOS E BASES LEGAIS

Coletamos apenas os dados estritamente necessários para o funcionamento da Plataforma.

| O que coletamos | Para que usamos (Finalidade) | Base Legal (LGPD) |
| :--- | :--- | :--- |
| **Dados de Cadastro:** Nome, E-mail, Senha, Foto de Perfil. | Criar e autenticar sua conta na Plataforma. | Execução de Contrato (Art. 7º, V). |
| **Dados de Perfil do Adotante:** CPF, RG, Telefone, Instagram, Endereço, Tipo de moradia, Rotina. | Preencher o formulário de adoção e permitir que os Abrigos avaliem seu perfil. | Execução de Contrato e Consentimento para envio ao Abrigo (Art. 7º, I e V). |
| **Dados de Saúde do Animal:** Prontuários, vacinas, medicações. | Manter o histórico clínico e de gestão do Abrigo. | Legítimo Interesse do Controlador (Abrigo) (Art. 7º, IX). |
| **Dados Técnicos e Logs:** Endereço IP, data/hora de acesso, cliques de aceite em contratos. | Garantir a segurança do sistema, auditar ações e cumprir obrigações legais do Marco Civil da Internet. | Obrigação Legal (Art. 7º, II) e Legítimo Interesse (Art. 7º, IX). |

## 3. COMPARTILHAMENTO DE DADOS

A Viralata não vende seus dados pessoais. Compartilhamos suas informações apenas nas seguintes situações:

- **Com Abrigos e ONGs:** Quando você demonstra interesse em adotar um animal ou se cadastra como voluntário/lar temporário, seus dados de perfil são compartilhados com o Abrigo responsável para avaliação.
- **Com Provedores de Tecnologia (Suboperadores):** Utilizamos serviços de infraestrutura em nuvem (ex: Firebase/Google Cloud) para hospedar a Plataforma e armazenar dados com segurança.
- **Com Autoridades Legais:** Podemos fornecer seus dados de cadastro e logs de acesso a autoridades policiais ou judiciais em caso de investigações sobre fraudes, crimes ambientais (maus-tratos) ou mediante ordem judicial.

## 4. TRANSFERÊNCIA INTERNACIONAL DE DADOS

Como utilizamos servidores em nuvem de provedores globais, seus dados podem ser armazenados fora do Brasil. Em conformidade com a Resolução CD/ANPD nº 32/2026, a transferência de dados para países da União Europeia é permitida e amparada por decisão de adequação, garantindo que o nível de proteção exigido pela LGPD seja mantido.

## 5. ARMAZENAMENTO E SEGURANÇA

Armazenamos seus dados apenas pelo tempo necessário para cumprir as finalidades descritas nesta Política ou para atender a exigências legais.
- **Logs de Acesso:** Mantidos por no mínimo 6 (seis) meses, conforme o Marco Civil da Internet.
- **Histórico de Adoção:** Mantido permanentemente (ou até solicitação de exclusão) para garantir a rastreabilidade do bem-estar animal.

Utilizamos criptografia, controle de acesso e firewalls para proteger seus dados contra acessos não autorizados, perda ou alteração. Em caso de qualquer incidente de segurança que possa gerar risco relevante, notificaremos você e a ANPD no prazo legal de 3 dias úteis (Resolução CD/ANPD nº 15/2024).

## 6. SEUS DIREITOS COMO TITULAR DOS DADOS

Você tem o direito de, a qualquer momento:
- Confirmar a existência de tratamento e acessar seus dados;
- Corrigir dados incompletos, inexatos ou desatualizados diretamente no seu perfil;
- Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;
- Revogar seu consentimento (quando aplicável);
- Solicitar a exclusão definitiva da sua conta.

**Atenção sobre a Exclusão de Conta:** Ao excluir sua conta, seus dados pessoais diretos serão apagados. No entanto, se você adotou um animal, o histórico da adoção e o Termo de Adoção assinado serão mantidos no banco de dados do Abrigo (como Controlador) para cumprimento de obrigação legal e exercício regular de direitos, garantindo a rastreabilidade do animal.

## 7. CONTATO E ENCARREGADO DE DADOS (DPO)

Se você tiver dúvidas sobre esta Política ou quiser exercer seus direitos, entre em contato com nosso Encarregado pelo Tratamento de Dados Pessoais (DPO) através do e-mail: privacidade@viralata.app.
`;

# GUIA DE IMPLEMENTAÇÃO LEGAL — PLATAFORMA VIRALATA

**Versão 2.0 — 10 de julho de 2026**

Este guia orienta como e onde cada documento legal deve ser implementado na plataforma Viralata, garantindo a validade jurídica dos aceites e a conformidade com o Marco Civil da Internet (Lei nº 12.965/2014), a LGPD (Lei nº 13.709/2018) e demais legislações pertinentes.

---

## 1. VISÃO GERAL — MAPA DE TODOS OS DOCUMENTOS

| # | Arquivo | Documento | Tipo | Quando Exigir |
| :--- | :--- | :--- | :--- | :--- |
| 01 | `01_Termos_de_Uso.md` | Termos e Condições Gerais de Uso | Aceite obrigatório | Cadastro de qualquer usuário |
| 02 | `02_Politica_de_Privacidade.md` | Política de Privacidade e Proteção de Dados (LGPD/GDPR) | Aceite obrigatório | Cadastro de qualquer usuário |
| 03 | `03_Avisos_Legais.md` | Avisos Legais e Disclaimers | Público (sem aceite separado) | Disponível no rodapé e no cabeçalho do módulo de prontuários |
| 04 | `04_Codigo_Conduta.md` | Código de Conduta e Tolerância Zero | Aceite obrigatório | Cadastro de qualquer usuário |
| 05 | `05_Termo_Adocao.md` | Termo de Responsabilidade e Adoção | Aceite obrigatório na ação | Etapa final de cada processo de adoção |
| 06 | `06_Politica_Doacoes.md` | Política de Doações Financeiras | Aceite obrigatório na ação | Antes de confirmar qualquer doação financeira |
| 07 | `07_DPA_Abrigos.md` | DPA — Acordo de Tratamento de Dados *(versão resumida)* | Referência técnica | **Ver item 3 abaixo — o DPA completo está embutido no documento 12** |
| 08 | `08_Termos_Voluntariado_LT.md` | Termo de Voluntariado *(versão resumida)* | Referência | **Ver documentos 11 e 12 para versões completas e independentes** |
| 09 | `09_Cookies_e_Legislacao.md` | Política de Cookies *(versão resumida)* | Banner + página | **Ver item 4 abaixo** |
| 10 | `10_Guia_Legislacao_Animal.md` | Guia de Legislação e Bem-Estar Animal | Público (sem aceite separado) | Página dedicada no menu ou rodapé |
| 11 | `11_Termo_Lar_Temporario.md` | Termo de Responsabilidade de Lar Temporário | Aceite obrigatório na ação | Ao aceitar receber um animal como LT |
| 12 | `12_Termo_Adesao_Abrigos_ONG.md` | Termo de Adesão para Abrigos e ONGs **(inclui DPA completo)** | Aceite obrigatório | Criação do perfil de Abrigo/ONG |

---

## 2. DOCUMENTOS DE ACEITE NO CADASTRO GERAL (ONBOARDING)

Estes três documentos devem ser apresentados na **tela de cadastro de qualquer usuário** (adotante, voluntário, visitante). Cada um exige um **checkbox separado**, desmarcado por padrão, com link para leitura do texto completo.

A tela deve conter:
> ☐ Li e aceito os [Termos e Condições Gerais de Uso] *(obrigatório)*
> ☐ Li e concordo com a [Política de Privacidade e Proteção de Dados] *(obrigatório)*
> ☐ Li e aceito o [Código de Conduta e Política de Tolerância Zero] *(obrigatório)*

O botão "Criar Conta" só deve ser habilitado quando os três checkboxes estiverem marcados.

**Documentos envolvidos:** `01_Termos_de_Uso.md`, `02_Politica_de_Privacidade.md`, `04_Codigo_Conduta.md`

---

## 3. TERMO DE ADESÃO PARA ABRIGOS E ONGS (INCLUI O DPA COMPLETO)

O documento `12_Termo_Adesao_Abrigos_ONG.md` é o instrumento mais completo da plataforma. Ele está dividido em quatro capítulos:

- **Capítulo I:** Condições de uso do Sistema de Gestão SaaS (obrigações do Abrigo e da Viralata, limitação de responsabilidade, suspensão).
- **Capítulo II:** Termos específicos do módulo de Prontuários Veterinários (disclaimer de responsabilidade pelo preenchimento).
- **Capítulo III:** **Data Processing Agreement (DPA)** — Define os papéis de Controlador (Abrigo) e Operadora (Viralata), as categorias de dados tratados, as obrigações de segurança, a gestão de suboperadores (Google Cloud/Firebase), a transferência internacional de dados (amparada pela Resolução ANPD nº 32/2026) e as regras de retenção e exclusão de dados.
- **Capítulo IV:** Disposições finais, vigência e foro.

**Como implementar:** Este documento deve ser exibido integralmente e exigir aceite eletrônico (*clickwrap*) **antes** de o usuário ter acesso ao painel administrativo do Abrigo. O aceite deve ser registrado no `audit_log` com: `user_id`, `IP`, `timestamp` e `document_version: "Termo_Adesao_Abrigos_v1.0"`.

---

## 4. DOCUMENTOS DE ACEITE EM AÇÕES ESPECÍFICAS

Estes documentos são exibidos apenas quando o usuário realiza uma ação específica na plataforma.

### 4.1. Termo de Responsabilidade e Adoção (`05_Termo_Adocao.md`)
- **Quando:** Na etapa final do processo de adoção, após o Abrigo aprovar o adotante.
- **Como:** O sistema deve gerar o documento dinamicamente, preenchendo automaticamente os campos: ID do Animal, Nome do Animal, Nome do Adotante, CPF, RG e data. O adotante deve clicar em "Li e assino eletronicamente este Termo" para concluir a adoção.
- **Registro:** `audit_log` com `user_id`, `animal_id`, `shelter_id`, `IP`, `timestamp`.

### 4.2. Termo de Responsabilidade de Lar Temporário (`11_Termo_Lar_Temporario.md`)
- **Quando:** No momento em que o usuário aceita receber um animal como Lar Temporário, após convite do Abrigo.
- **Como:** O sistema deve gerar o documento dinamicamente com os dados do LT, do Abrigo e do Animal. Aceite via *clickwrap*.
- **Registro:** `audit_log` com `user_id`, `animal_id`, `shelter_id`, `IP`, `timestamp`.

### 4.3. Política de Doações Financeiras (`06_Politica_Doacoes.md`)
- **Quando:** Na tela de checkout, antes de o usuário confirmar qualquer doação financeira.
- **Como:** Exibir um resumo com link para o texto completo e um checkbox: "Li e concordo com a Política de Doações e entendo que a doação é irrevogável."
- **Registro:** `audit_log` com `user_id`, `campaign_id`, `valor`, `IP`, `timestamp`.

### 4.4. Termo de Voluntariado (`08_Termos_Voluntariado_LT.md`)
- **Quando:** Ao se cadastrar como voluntário de um Abrigo.
- **Como:** Aceite via *clickwrap* antes de o perfil de voluntário ser ativado.
- **Registro:** `audit_log` com `user_id`, `shelter_id`, `IP`, `timestamp`.

---

## 5. DOCUMENTOS PÚBLICOS (SEM ACEITE SEPARADO)

Estes documentos devem estar sempre acessíveis a qualquer visitante, com links no **rodapé de todas as páginas**.

| Documento | Onde Exibir |
| :--- | :--- |
| `03_Avisos_Legais.md` | Rodapé + banner de aviso no cabeçalho do módulo de Prontuários Veterinários. |
| `10_Guia_Legislacao_Animal.md` | Página dedicada acessível pelo menu principal ou pelo rodapé. |
| `09_Cookies_e_Legislacao.md` (seção de Cookies) | Banner fixo no rodapé de todas as páginas públicas, com botões "Aceitar Todos" e "Configurar". |

---

## 6. REQUISITOS TÉCNICOS PARA VALIDADE JURÍDICA DOS ACEITES

Para que os aceites via *clickwrap* tenham validade em um tribunal brasileiro, o sistema de `audit_logs` (já existente no repositório Viralata como coleção imutável no Firestore) deve registrar obrigatoriamente os seguintes campos para cada clique de aceite:

| Campo | Descrição | Exemplo |
| :--- | :--- | :--- |
| `user_id` | ID único do usuário autenticado | `uid_abc123` |
| `action` | Tipo de aceite realizado | `"accepted_terms_of_use"` |
| `document_version` | Versão exata do documento aceito | `"Termos_de_Uso_v1.0"` |
| `ip_address` | Endereço IP do usuário no momento do aceite | `"189.xxx.xxx.xxx"` |
| `timestamp` | Data e hora exata com fuso horário | `2026-07-10T14:32:00-03:00` |
| `user_agent` | Navegador/dispositivo utilizado | `"Chrome/126 Mobile"` |

**Regra de atualização de documentos:** Sempre que um documento for atualizado (nova versão), o sistema deve forçar um novo aceite no próximo login do usuário, antes de liberar o acesso às funcionalidades. O aceite da versão anterior deve ser mantido no histórico.

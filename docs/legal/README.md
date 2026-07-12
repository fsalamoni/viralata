# 📜 Documentos Legais · Viralata

> **Última atualização:** 11 de julho de 2026
> **Status:** ✅ Migrado de `.tmp-legal-docs/` (worktree anterior) para cá — canônico.
> **Owner:** DPO / Jurídico · Viralata

Este diretório contém **todos os documentos legais oficiais** da plataforma Viralata.
São parte do **Termo de Adesão de Abrigos/ONGs** (TASK-376) e devem ser referenciados
em fluxos de aceite, footer do app, e processos de auditoria LGPD.

---

## 📋 Índice de Documentos

### Para usuários finais (público geral)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 01 | **Termos e Condições Gerais de Uso** | [`01_Termos_de_Uso.md`](01_Termos_de_Uso.md) | Todos os usuários | LGPD art. 9 |
| 02 | **Política de Privacidade** | [`02_Politica_de_Privacidade.md`](02_Politica_de_Privacidade.md) | Todos os usuários | LGPD art. 9, 18 |
| 03 | **Avisos Legais** | [`03_Avisos_Legais.md`](03_Avisos_Legais.md) | Todos os usuários | Provimento CNJ 96/2019 |
| 04 | **Código de Conduta** | [`04_Codigo_Conduta.md`](04_Codigo_Conduta.md) | Todos os usuários + voluntários | Cultura |
| 09 | **Cookies e Legislação Aplicável** | [`09_Cookies_e_Legislacao.md`](09_Cookies_e_Legislacao.md) | Todos os usuários | LGPD art. 16 |

### Para adotantes (fluxo de adoção)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 05 | **Termo de Adoção Responsável** | [`05_Termo_Adocao.md`](05_Termo_Adocao.md) | Adotantes (assinam) | Lei 13.140/2015 |

### Para doadores (fluxo de doação)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 06 | **Política de Doações** | [`06_Politica_Doacoes.md`](06_Politica_Doacoes.md) | Doadores | Lei 13.019/2014 (OSCIP) |

### Para abrigos e ONGs (adesão)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 07 | **DPA — Data Processing Agreement (Abrigos)** | [`07_DPA_Abrigos.md`](07_DPA_Abrigos.md) | Abrigos parceiros (assinam) | LGPD art. 39 |
| 12 | **Termo de Adesão de Abrigos/ONGs** | [`12_Termo_Adesao_Abrigos_ONG.md`](12_Termo_Adesao_Abrigos_ONG.md) | Abrigos (assinam) | Contrato |

### Para voluntários e lar temporário (foster)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 08 | **Termos de Voluntariado (Lares Temporários)** | [`08_Termos_Voluntariado_LT.md`](08_Termos_Voluntariado_LT.md) | Voluntários + Foster | CLT art. 9º-A |
| 11 | **Termo de Lar Temporário (Foster)** | [`11_Termo_Lar_Temporario.md`](11_Termo_Lar_Temporario.md) | Foster (assinam) | Responsabilidade civil |

### Documentos de referência interna (DPO / jurídico)

| # | Documento | Arquivo | Audiência | Regra |
|---|-----------|---------|-----------|-------|
| 00 | **Guia de Implementação Legal** | [`00_Guia_Implementacao_Legal.md`](00_Guia_Implementacao_Legal.md) | Devs + DPO | Procedimento |
| 10 | **Guia de Legislação Animal** | [`10_Guia_Legislacao_Animal.md`](10_Guia_Legislacao_Animal.md) | Devs + DPO + ONGs | Lei 9.605/98 (crimes ambientais) |

---

## ✅ LGPD Checklist (referência rápida)

| Princípio LGPD | Documento que atende | Status |
|---|---|---|
| Consentimento explícito (art. 7º, I) | `01`, `02` | ✅ |
| Finalidade (art. 6º, I) | `02` | ✅ |
| Necessidade (art. 6º, II) | `02`, `09` | ✅ |
| Livre acesso (art. 9º) | `02` | ✅ |
| Qualidade dos dados (art. 6º, V) | `02` | ✅ |
| Transparência (art. 6º, VI) | `01`, `02` | ✅ |
| Segurança (art. 6º, VII) | `07` (DPA), `02` | ✅ |
| Prevenção (art. 6º, VIII) | `07` (DPA) | ✅ |
| Não discriminação (art. 6º, IX) | `01`, `04` | ✅ |
| Responsabilização (art. 6º, X) | `00` (Guia) | ✅ |

**Direitos do titular (art. 18):** Export, delete, anonimização — cobertos em `02_Politica_de_Privacidade.md` §5.

---

## 🔗 Integração com a plataforma

### Onde cada doc é referenciado no app

| Documento | Aparece em | Implementação |
|---|---|---|
| `01_Termos_de_Uso.md` | Footer + signup | `src/components/legal/TermsPage.jsx` (TASK-059) |
| `02_Politica_de_Privacidade.md` | Footer + signup | `src/components/legal/PrivacyPage.jsx` (TASK-060) |
| `03_Avisos_Legais.md` | Footer | `src/components/legal/NoticesPage.jsx` (TASK-061) |
| `04_Codigo_Conduta.md` | Footer + signup | `src/components/legal/ConductPage.jsx` (TASK-062) |
| `05_Termo_Adocao.md` | Application flow | `src/components/legal/AdoptionTermsPage.jsx` (TASK-063) |
| `06_Politica_Doacoes.md` | Donation flow | `src/components/legal/DonationsPage.jsx` (TASK-064) |
| `07_DPA_Abrigos.md` | Shelter onboarding | `src/components/legal/ShelterDPAPage.jsx` (TASK-065) |
| `08_Termos_Voluntariado_LT.md` | Volunteer signup | `src/components/legal/VolunteerTermsPage.jsx` (TASK-066) |
| `09_Cookies_e_Legislacao.md` | Cookie banner | `src/components/legal/CookiesPage.jsx` (TASK-067) |
| `11_Termo_Lar_Temporario.md` | Foster signup | `src/components/legal/FosterTermsPage.jsx` (TASK-??) |
| `12_Termo_Adesao_Abrigos_ONG.md` | Shelter onboarding | `src/components/legal/ShelterOnboardPage.jsx` (TASK-??) |

> **Nota:** Tasks marcadas com `TASK-??` ainda precisam ser criadas no SCRUM. Ver TASK-376 no `SCRUM_TASKS.json`.

### Auditoria LGPD (Cloud Function)

Toda leitura destes documentos pelo usuário gera log em `audit_log`:
- `actor` (userId)
- `action` = `legal_doc.read`
- `target` = caminho do .md
- `timestamp` (server-side)
- `consent_context` (qual fluxo o usuário estava)

**Retention:** 5 anos (LGPD art. 16 + art. 37).

---

## 🛠️ Manutenção

### Versionamento

Cada documento segue **SemVer informal** baseado em data:
- **Major** (ex: 2026-07-11): mudança de substância jurídica (DPO + jurídico assinam)
- **Minor**: clarificações sem mudança de obrigação
- **Patch**: typos, formatação

Mudanças devem ser commitadas em **PR com tag `legal-change`** e **2 reviewers** (1 dev + 1 DPO/jurídico).

### Backup

Estes documentos são versionados em Git (`docs/legal/*.md`) — o backup é o próprio Git.
Cópia adicional: Storage do Firebase em `legal/yyyy-mm-dd/` para DPO offline.

### Revisão periódica

- **Trimestral:** DPO revisa se há mudanças legislativas aplicáveis
- **Semestral:** Jurídico revisa se há jurisprudência nova
- **Anual:** Revisão completa de todos os 13 documentos

---

## 📞 Contato DPO

**Encarregado de Proteção de Dados (DPO):**
- E-mail: dpo@viralata.org (placeholder — substituir quando definido)
- Canal: `pages/legal/contact` no app

---

> **LEMBRE-SE:** Qualquer mudança aqui é **BREAKING** para usuários.
> Mudanças exigem:
> 1. Revisão DPO + jurídico
> 2. Aviso prévio de 30 dias aos usuários ativos (LGPD art. 8º)
> 3. Versionamento no CHANGELOG.md
> 4. Entrada em `docs/AGENTS_CHANGELOG.md` (regra do AGENTS.md)

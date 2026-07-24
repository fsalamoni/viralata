# 25-LGPD.md — LGPD Compliance (Lei Geral de Proteção de Dados)

> **Atualizado em 2026-07-24**
>
> Lei 13.709/2018 (LGPD) + Lei 14.063/2020 (aceite de termos).
> Como o Viralata implementa conformidade.

## §1. Visão Geral da LGPD

A **LGPD** (Lei Geral de Proteção de Dados Pessoais) regulamenta
qualquer operação com dados pessoais no Brasil. Multas podem chegar
a 2% do faturamento (limitado a R$ 50 milhões por infração).

### §1.1. Princípios (Art. 6º)

- **Finalidade**: propósito claro e legítimo
- **Necessidade**: mínimo necessário
- **Segurança**: medidas técnicas e administrativas
- **Transparência**: claro ao titular
- **Não discriminação**: sem fins discriminatórios
- **Prevenção**: adotar medidas preventivas
- **Responsabilização**: demonstrar conformidade

### §1.2. Bases Legais (Art. 7º)

Para tratar dados pessoais, precisa de uma base legal:

| Base | Quando usar |
|------|-------------|
| I - Consentimento | Quando titular consentiu |
| II - Obrigação legal | Cumprir lei |
| III - Políticas públicas | Administração pública |
| IV - Pesquisa | Estudos (anonimizado) |
| V - Execução de contrato | User contratou conosco |
| VI - Exercício regular de direitos | Processo judicial |
| VII - Tutela da saúde | Saúde |
| VIII - Interesse legítimo | Nosso interesse vs direitos do titular |
| IX - Interesse público | Administração pública |

### §1.3. Direitos do Titular (Art. 18)

User tem direito a:
1. Confirmar a existência de tratamento
2. Acessar seus dados
3. Corrigir dados incompletos
4. Anonimizar, bloquear ou deletar dados desnecessários
5. Portabilidade
6. Deletar dados (consentimento)
7. Informação sobre entidades públicas
8. Revogar consentimento
9. Revisão de decisões automatizadas

## §2. Lei 14.063/2020 — Aceite de Termos

Regulamenta aceite eletrônico. Aplicável a:
- Termos de uso
- Política de privacidade
- Código de conduta
- Contratos

### §2.1. Requisitos

1. **Identificação**: do signatário e do signatário
2. **Liveness**: verificação de que é humano (opcional)
3. **Hash do documento**: SHA-256 do termo aceito
4. **Mecanismo de aceite**: explícito (checkbox + botão)
5. **Trilha de auditoria**: log imutável

### §2.2. Implementação no Viralata

```typescript
// terms_acceptances/{acceptanceId}
{
  user_uid: string,
  terms_type: 'general' | 'privacy' | 'conduct' | 'adopter' | 'shelter' | 'volunteer' | 'foster' | 'donor' | 'cookies',
  terms_version: string,  // ex: '2026-07-10' ou '2026-07-10-v2'
  document_hash: string,  // SHA-256 do documento
  signature_text: string,  // nome do user
  ip_address: string,
  user_agent: string,
  liveness_verified: boolean,
  legal_basis: 'LGPD Art. 7º I',
  accepted_at: timestamp,
}
```

**Regras Firestore**: append-only (imutável).

## §3. Termos do Viralata

### §3.1. Tipos de termos

| Tipo | Quem aceita | Quando |
|------|-------------|--------|
| `general` | Todos users | No signup |
| `privacy` | Todos users | No signup |
| `conduct` | Todos users | No signup |
| `adopter` | Adotantes | Antes de adotar |
| `shelter` | ONGs | Antes de criar ONG |
| `volunteer` | Voluntários | Antes de ser voluntário |
| `foster` | Lares temporários | Antes de ser foster |
| `donor` | Doadores | Antes de doar |
| `cookies` | Visitantes | Banner |

### §3.2. Versões

Cada termo tem `version` (string, ex: '2026-07-10-v2'). Quando o
termo é atualizado, version é incrementada e **todos os users devem
re-aceitar** (se ainda não aceitaram essa versão).

### §3.3. Implementação

```js
// src/modules/contracts/services/termsService.js
export async function getCurrentTermsVersion(termsType) {
  // Buscar versão atual em platform_settings
  const doc = await getDoc(doc(db, 'platform_settings', 'main'));
  return doc.data()?.[`terms_${termsType}_version`];
}

export async function hasAcceptedCurrentTerms(userUid, termsType) {
  const version = await getCurrentTermsVersion(termsType);
  const q = query(
    collection(db, 'terms_acceptances'),
    where('user_uid', '==', userUid),
    where('terms_type', '==', termsType),
    where('terms_version', '==', version)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
```

## §4. Direito ao Esquecimento

### §4.1. Quando user pede deleção

1. User solicita deleção em `/perfil/privacidade`
2. Plataforma agenda deleção (audit_log)
3. Admin aprova (LGPD compliance)
4. Cloud Function deleta:
   - `users/{uid}` (soft delete primeiro, hard delete após 30 dias)
   - `terms_acceptances/{id}` → mantém (prova legal, anonimiza PII)
   - `audit_logs/{id}` → mantém (prova legal)
   - Posts, comments, etc → soft delete

### §4.2. Soft delete (reversível por 30 dias)

```js
await updateDoc(doc(db, 'users', uid), {
  is_deleted: true,
  deleted_at: serverTimestamp(),
  scheduled_deletion_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
```

### §4.3. Hard delete (após 30 dias)

```js
// Cloud Function scheduled
exports.hardDeleteUsers = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = Date.now();
    const q = query(
      collection(db, 'users'),
      where('is_deleted', '==', true),
      where('scheduled_deletion_at', '<', now)
    );
    const snap = await getDocs(q);
    
    for (const userDoc of snap.docs) {
      const uid = userDoc.id;
      
      // Anonimizar audit_logs
      // (manter prova legal sem PII)
      
      // Deletar dados do user
      await deleteUserData(uid);
      
      // Log
      await admin.firestore().collection('audit_logs').add({
        action: 'user_hard_deleted',
        target: { collection: 'users', doc_id: uid },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
```

## §5. Anonimização

### §5.1. Quando aplicar

- Audit logs (após período de retenção)
- Analytics (ex: Google Analytics)
- Compartilhamento com terceiros
- Backup

### §5.2. Técnicas

```js
// Hash do uid
function anonymizeUid(uid) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid))
    .then(buf => Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );
}

// Email mascarado
function maskEmail(email) {
  const [user, domain] = email.split('@');
  const masked = user.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

// Phone mascarado
function maskPhone(phone) {
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
```

## §6. Direitos Específicos

### §6.1. Acesso (Art. 18, II)

User pode pedir todos os seus dados.

**Implementação**:
```js
export async function exportUserData(uid) {
  const data = {
    profile: await getUser(uid),
    pets: await getUserPets(uid),
    interests: await getUserInterests(uid),
    adoptions: await getUserAdoptions(uid),
    notifications: await getUserNotifications(uid),
    terms_acceptances: await getUserTermsAcceptances(uid),
    // etc
  };
  return data;
}
```

**Endpoint**: `/perfil/privacidade` → "Exportar meus dados" → gera JSON.

### §6.2. Correção (Art. 18, III)

User pode editar próprio perfil.

**Já implementado** em `/perfil/editar`.

### §6.3. Portabilidade (Art. 18, V)

JSON exportável (Art. 6.2.1).

### §6.4. Revogação de consentimento (Art. 18, IX)

User pode revogar consentimento a qualquer momento.

**Implementação**:
```js
export async function revokeConsent(userUid, termsType) {
  await addDoc(collection(db, 'terms_revocations'), {
    user_uid: userUid,
    terms_type: termsType,
    revoked_at: serverTimestamp(),
  });
  // Restringir uso dos dados após revogação
}
```

## §7. PII (Personally Identifiable Information)

### §7.1. Identificar PII

PII = qualquer dado que identifica pessoa:
- Nome, email, phone, CPF, RG
- Endereço (rua, número)
- IP (combinado com outros dados)
- Localização precisa
- Foto de rosto (biometria)
- User agent único

### §7.2. Coletar mínimo necessário

```js
// ❌ Ruim: coleta tudo
{
  full_name: string,
  email: string,
  phone: string,
  cpf: string,
  rg: string,
  address: string,
  birth_date: timestamp,
  // ...
}

// ✅ Bom: só o necessário
{
  display_name: string,
  email: string,
  // ... outros opcionais
}
```

### §7.3. Não compartilhar PII

- **Coleções denormalizadas** (`search_*`): NUNCA contêm PII
- **Analytics**: apenas agregado, anônimo
- **Logs**: nunca email, phone, name (usar uid)

## §8. Vazamento de Dados (Data Breach)

### §8.1. Plano de resposta

1. **Detectar**: monitoring detecta acesso anômalo
2. **Conter**: bloquear acesso, revogar chaves
3. **Avaliar**: scope (quantos users afetados)
4. **Notificar**:
   - **ANPD** (Autoridade Nacional): em até 2 dias úteis (Art. 48)
   - **Titulares**: se risco significativo (Art. 48, §1º)
5. **Documentar**: incident report
6. **Mitigar**: corrigir vulnerabilidade

### §8.2. Logs de auditoria

Tudo fica em `audit_logs` (imutável). Essencial para:
- Investigar breach
- Comprovar conformidade
- Responder a ANPD

## §9. DPO (Data Protection Officer)

### §9.1. Quando obrigatório

- Tratamento de dados sensíveis
- Grande volume de dados
- Exposição pública

### §9.2. Funções

- Aceitar reclamações
- Orientar funcionários
- Executar auditorias
- Ponto de contato com ANPD

### §9.3. Para Viralata

DPO: **fsalamoni** (pode ser alterado em `platform_settings/dpo`).

## §10. Medidas de Segurança

### §10.1. Técnicas

- ✅ Encryption at rest (Firebase default)
- ✅ Encryption in transit (HTTPS)
- ✅ Access controls (Firestore Rules)
- ✅ Audit logging
- ✅ LGPD-compliant data minimization
- ⚠️ Encryption em backups (configurar)

### §10.2. Administrativas

- ✅ Code review (PR + 1 approval)
- ✅ Documentação atualizada
- ✅ Treinamento da equipe
- ⚠️ Política interna de privacidade (em docs)
- ⚠️ Análise de impacto (DPIA quando aplicável)

## §11. ANPD — Penalidades

### §11.1. Tipos

- Advertência
- Multa (até 2% faturamento, max R$ 50M)
- Bloqueio de dados
- Eliminação de dados
- Proibição de tratamento

### §11.2. Como evitar

- Compliance contínuo
- Documentação completa
- Logs auditáveis
- Resposta rápida a incidentes

## §12. Checklist LGPD

Antes de deploy:

- [ ] Termos de uso atualizados
- [ ] Política de privacidade atualizada
- [ ] Aceite explícito (não pre-checked)
- [ ] Trilha de auditoria funcionando
- [ ] Direito ao esquecimento implementado
- [ ] Export de dados funcionando
- [ ] PII minimizado
- [ ] Logs sem PII
- [ ] DPO designado
- [ ] Plano de resposta a incidentes
- [ ] Documentação atualizada

## §13. Recursos

- [LGPD — Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Lei 14.063/2020 — Aceite Eletrônico](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm)
- [ANPD](https://www.gov.br/anpd)
- [Guia Orientativo ANPD](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-para-agentes-de-tratamento-de-dados-pessoais.pdf)

---

**Próxima leitura**: `20-FIRESTORE-SECURITY.md` (security best practices)

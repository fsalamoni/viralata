# Configuração DNS — viralata.app → Firebase Hosting

> **Status**: custom domain registrado no Firebase Hosting via API (`projects/viralata-4cf0b/sites/viralata/customDomains/viralata.app`).
> **Bloqueio restante**: DNS ainda aponta para Hostinger. Necessário atualizar registros DNS.

## Diagnóstico

Acessos atuais:
- `https://viralata.app/admin/flags` → **404** (servidor Hostinger estático)
- `https://viralata.web.app/admin/flags` → **200** (Firebase Hosting OK)

O domínio `viralata.app` está sendo servido por um servidor Hostinger estático (não tem SPA fallback). Já criamos o custom domain no Firebase Hosting via API; agora falta o DNS apontar para o Firebase.

## O que precisa ser feito

### Registros DNS a serem ADICIONADOS

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `viralata.app` | `199.36.158.100` | 300 |
| TXT | `viralata.app` | `hosting-site=viralata` | 300 |
| TXT | `_acme-challenge.viralata.app` | `Uvqsuuts4mdwJgoFGeKiMmAYiOF2FR-vbaEVtA1mIGc` | 300 |

### Registros DNS a serem REMOVIDOS

| Tipo | Nome | Valor |
|---|---|---|
| A | `viralata.app` | `147.79.79.175` |
| A | `viralata.app` | `88.223.87.193` |
| AAAA | `viralata.app` | `2a02:4780:4b:781e:8b4d:a052:83e1:3691` |
| AAAA | `viralata.app` | `2a02:4780:4c:1da7:295a:9ca:2ee6:d5ab` |
| TXT (opcional) | `viralata.app` | `v=spf1 include:_spf.mail.hostinger.com ~all` (manter se quiser SPF) |

## Como aplicar

### Opção 1 — Manual no Hostinger (recomendado)

1. Acessar hpanel.hostinger.com
2. Ir em **Domínios → viralata.app → DNS / Nameservers**
3. Adicionar os 3 novos registros acima
4. Remover os 4 registros antigos acima
5. Aguardar propagação (5 a 30 minutos)
6. Verificar com `dig viralata.app A` — deve retornar `199.36.158.100`

### Opção 2 — Migrar para Cloud DNS (Google)

Se quiser gerenciar via Google Cloud (recomendado para Firebase):
1. Criar zona DNS em Cloud DNS: `gcloud dns managed-zones create viralata-app --dns-name=viralata.app. --description="viralata.app zone"`
2. Atualizar nameservers no Hostinger para os do Cloud DNS
3. Adicionar registros via `gcloud dns record-sets create`
4. Documentação: https://cloud.google.com/dns/docs/quickstart

## Verificação após deploy DNS

```bash
# Verificar A record
dig viralata.app A +short
# Esperado: 199.36.158.100

# Verificar TXT de propriedade
dig viralata.app TXT +short
# Esperado: "hosting-site=viralata"

# Verificar TXT ACME
dig _acme-challenge.viralata.app TXT +short
# Esperado: "Uvqsuuts4mdwJgoFGeKiMmAYiOF2FR-vbaEVtA1mIGc"

# Testar o site
curl -I https://viralata.app/admin/flags
# Esperado: HTTP/2 200
```

## Automação implementada

- `.github/workflows/add-custom-domain.yml` — adiciona custom domain ao Firebase (idempotente)
- `.github/workflows/check-custom-domain.yml` — verifica status do custom domain
- `.github/workflows/update-dns.yml` — tenta atualizar DNS via Cloud DNS (se aplicável)
- `.github/scripts/*.sh` — scripts bash com auth JWT do Firebase

## Status atual (2026-07-11)

```
Custom domain: projects/viralata-4cf0b/sites/viralata/customDomains/viralata.app
hostState: HOST_MISMATCH         (DNS ainda em Hostinger)
ownershipState: OWNERSHIP_MISSING  (TXT ainda não verificado)
certState: CERT_VALIDATING         (Firebase está provisionando SSL)
```

Após atualizar DNS no Hostinger (5-30 min propagação), o Firebase vai:
1. Detectar novo A record → HOST_MISMATCH → HOST_ACTIVE
2. Detectar TXT de propriedade → OWNERSHIP_MISSING → OWNERSHIP_VERIFIED
3. Provisionar SSL → CERT_VALIDATING → CERT_ACTIVE
4. Servir o site em `https://viralata.app/*`

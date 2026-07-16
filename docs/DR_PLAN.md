# Disaster Recovery Plan — Viralata

> Runbook canônico de backup & restore. Última atualização: 2026-07-11.
> Owner: platform admin master. SLA de RPO: 7 dias (semanal). RTO alvo: < 4h.

## 1. Backup strategy

| Item | Valor |
|---|---|
| **Frequência** | Semanal — domingo 02:00 BRT (05:00 UTC) |
| **Trigger** | Cloud Function `scheduledFirestoreBackup` (`functions/backupCron.js`) |
| **Método** | `firestoreAdminClient.exportDocuments` (Firestore Admin SDK) |
| **Storage** | `gs://<BACKUP_BUCKET>/<YYYY-MM-DD>/` (GCS, region `southamerica-east1`) |
| **Bucket default** | `viralata-backups` (override via `BACKUP_BUCKET` env var) |
| **Lifecycle** | 90 dias (auto-delete via GCS Lifecycle Policy) |
| **Imutabilidade (WORM)** | Bucket-level IAM: apenas a service account do Cloud Functions tem `roles/storage.objectCreator`. Nenhum principal tem `roles/storage.objectDeleter` nem `storage.buckets.delete`. |
| **Formato** | Firestore native export (protobuf leveldb files) |
| **Metadados** | Doc em `backup_log/{autoId}` com `date`, `operation_name`, `bucket`, `folder`, `status`, `started_at` |

### 1.1 Schedule (cron)
```
'0 5 * * 0'  // 05:00 UTC = 02:00 BRT (America/Sao_Paulo UTC-3)
```
Coordena com a janela noturna dos outros crons:
- `auditLogPurgeCron` — diário 03:00 BRT (06:00 UTC)
- `materializePostAdoptionTasks` — diário 03:00 BRT
- `galleryPurgeCron` — diário 04:00 BRT (07:00 UTC)
- **`scheduledFirestoreBackup` — semanal domingo 05:00 UTC** (fora do horário de pico)

## 2. Restore procedure (runbook)

> **Quem pode executar**: apenas `platform_admin` com chave gcloud
> autenticada. Toda execução deve ser registrada em `audit_log` com
> `action = 'dr_restore_executed'`.

### 2.1 Listar backups disponíveis
```bash
gsutil ls gs://viralata-backups/ | sort
```

### 2.2 Identificar o backup alvo
Recomenda-se o mais recente ANTERIOR ao incidente. Verificar o doc em
`backup_log/` com `status: in_progress` ou `status: completed` para
saber o `operation_name` original (correlaciona com o status no GCS).

### 2.3 Dry-run em projeto isolado (recomendado)
```bash
# Cria projeto de teste (one-time)
gcloud projects create viralata-dr-test --name="Viralata DR Test"

# Aponta para o projeto de teste
gcloud config set project viralata-dr-test

# Importa (NÃO roda no projeto de produção!)
gcloud firestore import gs://viralata-backups/2026-07-05/
```

### 2.4 Restore em produção
```bash
# 1. Autenticar como platform_admin
gcloud auth login
gcloud config set project viralata-prod

# 2. CONFIRMAR com 2 colegas (Lei 14.063/2020 art. 6º — prova legal)

# 3. Import (sobrescreve documents com IDs iguais; NUNCA deleta)
gcloud firestore import gs://viralata-backups/<YYYY-MM-DD>/ --async
# output: operation name — guardar

# 4. Monitorar
gcloud firestore operations list
```

### 2.5 Verificação pós-restore
Rode em ordem (cada check incrementa o `audit_log` com `category: operational`):

1. **Contagens** — `/admin/saude` mostra contagens por collection; comparar com snapshot pré-incidente.
2. **Animais** — `/admin/animais?status=available` — confirmar 0 desaparecidos.
3. **Adoções** — `/admin/adocoes?status=approved` — workflow íntegro.
4. **Voluntários** — `/admin/voluntarios` — rosters preservados.
5. **Audit** — `/admin/auditoria` — entradas recentes acessíveis.
6. **Termos** — `/admin/auditoria?action=terms_accepted` — provas legais íntegras (Lei 14.063/2020).

### 2.6 Comunicação
Após restore validado, enviar notificação no canal `#viralata-platform`:
```
[DR] Restore concluído a partir de gs://viralata-backups/<YYYY-MM-DD>/
     - Executado por: <uid>
     - Início: <ts_inicio>
     - Fim: <ts_fim>
     - Operação: <operation_name>
     - Verificação: ✓ counts ✓ animals ✓ adoptions ✓ volunteers ✓ audit
```

## 3. Test schedule

| Teste | Frequência | Responsável | Procedimento |
|---|---|---|---|
| **Dry-run em projeto isolado** | Mensal (1º domingo) | platform_admin | §2.3 |
| **Restore full em staging** | Trimestral | platform_admin | §2.4 adaptado para projeto `viralata-staging` |
| **Auditoria de bucket policy** | Trimestral | security lead | `gsutil iam get gs://viralata-backups` — confirmar que ninguém tem `objectDelete` |
| **Verificação de lifecycle** | Trimestral | platform_admin | `gsutil lifecycle get gs://viralata-backups` — confirmar 90d |
| **Teste completo de desastre (game day)** | Anual | platform_admin + security | Simular deleção acidental de collection crítica; restore full em staging; medir RTO real |

## 4. Compliance

| Norma | Requisito | Como atendemos |
|---|---|---|
| **AGENTS.md §LGPD** | "Backup imutável (WORM) no GCS, lifecycle 90d" | §1, bucket policy + lifecycle 90d |
| **Lei 14.063/2020 art. 6º** | Prova de aceite íntegra em disaster | Restore preserva `terms_acceptance` audit logs (categoria `term_acceptance` retenção 5a) |
| **Marco Civil Art. 15** | 6 meses logs de acesso | Backup inclui `audit_log/`, `platform_health_snapshots/` |
| **LGPD Art. 48** | Breach notification em 48h à ANPD | Playbook separado em `docs/BREACH_PLAYBOOK.md` (TODO) |

## 5. Monitoring & alerting

### 5.1 Métricas expostas em `/admin/saude`
- `last_backup_date` — ISO date do último backup bem-sucedido
- `last_backup_status` — `in_progress` | `failed` | `missing`
- `last_backup_operation` — nome da operation
- `backup_count_30d` — quantos backups nos últimos 30 dias
- `backup_lag_days` — dias desde o último backup bem-sucedido

### 5.2 Alertas
- **Se `backup_lag_days > 8`** (esperado 7) → cria `platform_alert_events/{id}`
  com `severity=high, channel=admin_master_email` — disparado via
  `adminAlerts.js`.
- **Se último backup `status=failed`** → email imediato para admin_master.

## 6. WORM Configuration (TASK-038)

A configuração WORM no bucket `gs://viralata-backups` é mantida via scripts
automatizados em `scripts/gcs-worm-setup.sh` e verificada com
`scripts/gcs-worm-verify.sh`.

### 6.1 Setup (one-time — runbook)

```bash
# Requer: gcloud CLI autenticada + papel roles/storage.admin
chmod +x scripts/gcs-worm-setup.sh
./scripts/gcs-worm-setup.sh --project <gcp-project-id>   # dry-run padrão; tirar --dry-run para aplicar
```

O que o script configura:

| Configuração | Valor | Propósito |
|---|---|---|
| Object Versioning | Habilitado | Preserva versões históricas (WORM — nenhuma versão é sobrescrita) |
| Retention Policy | 90 dias | Objetos não podem ser sobrescritos/deletados antes de 90 dias |
| Lifecycle Rule | Delete noncurrent age=90 | Purga versões noncurrent após 90 dias (cleanup automático) |
| Uniform Bucket Level Access | Habilitado | ACLs granulares desabilitadas — acesso restrito via IAM bucket-level |

### 6.2 Verificação de conformidade (trimestral)

```bash
chmod +x scripts/gcs-worm-verify.sh
./scripts/gcs-worm-verify.sh --project <gcp-project-id>
# Exit 0 = WORM compliant | Exit 1 = não-conforme
```

Verificações realizadas:
1. Object Versioning habilitado
2. Retention Policy ≥ 90 dias
3. Lifecycle Rule: Delete noncurrent age=90 dias
4. Uniform Bucket Level Access habilitado
5. Nenhum principal não-serviço com `roles/storage.objectDeleter`
6. Logging de audit ativo (Lei 14.063/2020)

### 6.3 Comandos manuais (referência)

```bash
# Verificar versioning
gsutil versioning get gs://viralata-backups

# Verificar retention policy
gsutil retention get gs://viralata-backups

# Verificar lifecycle
gsutil lifecycle get gs://viralata-backups

# Verificar IAM (nenhum principal non-serviço com objectDeleter)
gsutil iam get gs://viralata-backups
```

## 7. Recovering from a corrupted or partial export

Se o export é parcialmente gravado (ex: backup de domingo anterior com
`<date>/all_collections/` mas faltando `<date>/all_collections/kind=audit_logs/`):

1. Não faça restore parcial — escolha o backup ANTERIOR completo.
2. Documente em `backup_log/{autoId}` com `status=incomplete` para
   que o painel `/admin/saude` sinalize o problema.
3. Acione security lead — investigar se houve race condition ou
   permissão revogada durante o export.

## 8. Referências

- [Firestore export/import docs](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [GCS lifecycle policy](https://cloud.google.com/storage/docs/lifecycle)
- [AGENTS.md §LGPD](../AGENTS.md)
- [TASK-240 no SCRUM](../.harness/SCRUM_TASKS.json) (id: TASK-240)
- [TASK-038 no SCRUM](../.harness/SCRUM_TASKS.json) (id: TASK-038) — WORM setup
- [Lei 14.063/2020 art. 6º](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm)

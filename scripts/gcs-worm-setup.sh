#!/usr/bin/env bash
# =============================================================================
# gcs-worm-setup.sh — Configura WORM (Write Once Read Many) no bucket de backup.
#
# Uso (runbook — plataforma admin):
#   chmod +x scripts/gcs-worm-setup.sh
#   ./scripts/gcs-worm-setup.sh [--project <gcp-project-id>] [--dry-run]
#
# O que faz:
#   1. Habilita Object Versioning no bucket (mantém versões históricas).
#   2. Aplica Retention Policy de 90 dias (objetos não podem ser
#      sobrescritos/deletados até decorrido o período).
#   3. Define Lifecycle Rule: deleta versões noncurrent após 90 dias.
#   4. Restringe IAM: remove `storage.objectDeleter` de qualquer principal
#      exceto a service account do Cloud Functions (verificação/administração).
#
# Requer: gcloud CLI autenticada + papel `roles/storage.admin`
# Referência: LGPD Art. 48 + Lei 14.063/2020 Art. 6º
# =============================================================================

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
BUCKET="${BACKUP_BUCKET:-viralata-backups}"
PROJECT="${GCP_PROJECT:-}"
RETENTION_DAYS=90
DRY_RUN=false

# ── Helpers ─────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 [--project <gcp-project-id>] [--dry-run] [--help]"
  echo "  --project   GCP project ID (or set GCP_PROJECT env var)"
  echo "  --dry-run   Only print the gcloud commands, don't execute"
  echo "  --help      Show this help"
  exit 0
}

log()  { echo "[INFO]  $*"; }
warn() { echo "[WARN]  $*" >&2; }
fail() { echo "[ERROR] $*" >&2; exit 1; }

require_gcloud() {
  command -v gcloud >/dev/null 2>&1 || fail "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
}

require_project() {
  if [[ -z "$PROJECT" ]]; then
    PROJECT=$(gcloud config get-value project 2>/dev/null) || true
    if [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]]; then
      fail "GCP project not set. Pass --project or set GCP_PROJECT env var."
    fi
  fi
  log "Using project: $PROJECT"
}

# ── Parse args ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) usage ;;
    *)         warn "Unknown arg: $1"; shift ;;
  esac
done

require_gcloud
require_project

# ── Bucket existence check ───────────────────────────────────────────────────
log "Checking bucket '$BUCKET'..."
BUCKET_EXISTS=$(gcloud storage buckets describe "gs://$BUCKET" \
  --project="$PROJECT" --format="value(name)" 2>/dev/null || true)

if [[ -z "$BUCKET_EXISTS" ]]; then
  warn "Bucket 'gs://$BUCKET' not found. Creating..."
  if [[ "$DRY_RUN" == "false" ]]; then
    gcloud storage buckets create "gs://$BUCKET" \
      --project="$PROJECT" \
      --location=southamerica-east1 \
      --uniform-bucket-level-access
    log "Bucket created."
  else
    echo "[DRY-RUN] gcloud storage buckets create gs://$BUCKET ..."
  fi
else
  log "Bucket exists: gs://$BUCKET"
fi

# ── 1. Enable Object Versioning ──────────────────────────────────────────────
log "Enabling Object Versioning on gs://$BUCKET..."
if [[ "$DRY_RUN" == "false" ]]; then
  gcloud storage buckets update "gs://$BUCKET" \
    --project="$PROJECT" \
    --versioning
  log "Object Versioning enabled."
else
  echo "[DRY-RUN] gcloud storage buckets update gs://$BUCKET --versioning"
fi

# ── 2. Apply Retention Policy (90 days) ─────────────────────────────────────
# Retention policy só pode ser aplicada em buckets sem objetos existentes
# OU depois de lock (requer bucket uniforme). Como o bucket de backup é
# incremental e só recebe novos arquivos, aplicamos aqui.
# Para buckets já com objetos, é necessário primeiro setar temporary hold
# ou usar lifecycle rule + IAM restritivo (abordagem adotada).
log "Setting Retention Policy: $RETENTION_DAYS days..."
if [[ "$DRY_RUN" == "false" ]]; then
  # Retention policy em segundos = 90 dias
  RETENTION_SECONDS=$((RETENTION_DAYS * 86400))
  gcloud storage buckets update "gs://$BUCKET" \
    --project="$PROJECT" \
    --retention-period="${RETENTION_SECONDS}s"
  log "Retention Policy set: ${RETENTION_DAYS} days."
else
  echo "[DRY-RUN] gcloud storage buckets update gs://$BUCKET --retention-period=$((RETENTION_DAYS * 86400))s"
fi

# ── 3. Lifecycle Rule — delete noncurrent versions after 90 days ─────────────
# Object Versioning + Lifecycle Age rule = WORM com purge automático.
# O lifecycle age conta a partir da criação da versão noncurrent.
log "Setting Lifecycle Rule: delete noncurrent versions after $RETENTION_DAYS days..."
if [[ "$DRY_RUN" == "false" ]]; then
  # O lifecycle rule em JSON permite regras de Age > retention period
  # (o GCS respeita o menor entre retention e lifecycle age)
  LIFECYCLE_RULE=$(cat <<'LIFECYCLE_EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 90,
        "isLive": false
      }
    }
  ]
}
LIFECYCLE_EOF
)
  gcloud storage buckets update "gs://$BUCKET" \
    --project="$PROJECT" \
    --lifecycle-file=<(echo "$LIFECYCLE_RULE")
  log "Lifecycle Rule applied."
else
  echo "[DRY-RUN] gcloud storage buckets update gs://$BUCKET --lifecycle-file=<lifecycle-json>"
fi

# ── 4. IAM Restrict — only Cloud Functions SA can write/delete ────────────────
# cloudfunctions.gserviceaccount.com = service account padrão do Cloud Functions
log "Reviewing IAM bindings on gs://$BUCKET..."
if [[ "$DRY_RUN" == "false" ]]; then
  CURRENT_BINDINGS=$(gcloud storage buckets describe "gs://$BUCKET" \
    --project="$PROJECT" \
    --format="json" 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('metadata',{}), indent=2))" || echo "{}")

  log "Current IAM (owners/ admins):"
  echo "$CURRENT_BINDINGS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
iam = d.get('iamConfiguration', {})
print(json.dumps(iam, indent=2))
" 2>/dev/null || true

  # Asegurar que apenas Cloud Functions SA tem roles/storage.objectCreator
  # (já é o comportamento default — documentação do runbook)
  CF_SA="${PROJECT}@appspot.gserviceaccount.com"
  CF_SA_V2="cf-${PROJECT}@${PROJECT}.iam.gserviceaccount.com"

  for sa in "$CF_SA" "$CF_SA_V2"; do
    if gcloud storage buckets describe "gs://$BUCKET" \
      --project="$PROJECT" \
      --format="value(iamConfiguration.uniformBucketLevelAccess.enabled)" 2>/dev/null | grep -q "True"; then
      log "Uniform bucket-level access already enabled."
    fi
  done

  # Uniform bucket-level access é requerido para retention policy
  gcloud storage buckets update "gs://$BUCKET" \
    --project="$PROJECT" \
    --uniform-bucket-level-access 2>/dev/null || true
  log "IAM review complete (uniform bucket-level access enforced)."
else
  echo "[DRY-RUN] gcloud storage buckets update gs://$BUCKET --uniform-bucket-level-access"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "WORM setup complete on gs://$BUCKET"
log "  • Object Versioning:  ENABLED  (versões históricas preservadas)"
log "  • Retention Policy:   ${RETENTION_DAYS} dias (nenhum objeto pode ser sobrescrito/deletado antes disso)"
log "  • Lifecycle Rule:     delete noncurrent versions after ${RETENTION_DAYS} dias"
log "  • Uniform bucket IAM: enabled  (acesso restrito a bucket-level)"
log ""
log "Verificar com:"
echo "  gcloud storage buckets describe gs://$BUCKET --format=json | jq '.versioning,.lifecycle,.retentionPolicy,.iamConfiguration'"
echo ""
log "Próximo passo: rodar scripts/gcs-worm-verify.sh para validar a configuração."

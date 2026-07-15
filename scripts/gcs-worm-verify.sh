#!/usr/bin/env bash
# =============================================================================
# gcs-worm-verify.sh — Valida que o bucket de backup está em conformidade WORM.
#
# Uso:
#   ./scripts/gcs-worm-verify.sh [--project <gcp-project-id>]
#
# Exit codes:
#   0  = conformidade total
#   1  = uma ou mais verificações falharam
#
# Referência: LGPD Art. 48 + Lei 14.063/2020 Art. 6º
# =============================================================================

set -uo pipefail

BUCKET="${BACKUP_BUCKET:-viralata-backups}"
PROJECT="${GCP_PROJECT:-}"
FAILED=0

log_pass() { echo "  ✅ $*"; }
log_fail() { echo "  ❌ $*"; ((FAILED++)); }
log_info() { echo "  ℹ️  $*"; }

require_gcloud() {
  command -v gcloud >/dev/null 2>&1 || { echo "[ERROR] gcloud CLI not found."; exit 1; }
}

get_project() {
  if [[ -z "$PROJECT" ]]; then
    PROJECT=$(gcloud config get-value project 2>/dev/null) || true
    [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]] && { echo "[ERROR] GCP project not set."; exit 1; }
  fi
}

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

require_gcloud
get_project

echo "════════════════════════════════════════════════════════════"
echo "  WORM Compliance Check — gs://$BUCKET"
echo "  Project: $PROJECT"
echo "════════════════════════════════════════════════════════════"
echo ""

# ── Fetch bucket metadata ─────────────────────────────────────────────────────
META=$(gcloud storage buckets describe "gs://$BUCKET" \
  --project="$PROJECT" \
  --format=json 2>/dev/null) || {
  echo "❌ Bucket 'gs://$BUCKET' not found or inaccessible."
  exit 1
}

# ── 1. Object Versioning ─────────────────────────────────────────────────────
echo "[1] Object Versioning"
VERSIONING=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('versioning',{}).get('enabled',False))" 2>/dev/null)
if [[ "$VERSIONING" == "True" ]]; then
  log_pass "Object Versioning enabled"
else
  log_fail "Object Versioning DISABLED — versões históricas não são preservadas"
fi

# ── 2. Retention Policy ───────────────────────────────────────────────────────
echo "[2] Retention Policy (90 dias)"
RET_PERIOD=$(echo "$META" | python3 -c "
import sys,json
d=json.load(sys.stdin)
rp = d.get('retentionPolicy', {})
period = rp.get('retentionPeriod', '')
if period:
  # GCS returns seconds as string, e.g. '7776000' = 90 dias
  print(int(period))
else:
  print(0)
" 2>/dev/null || echo "0")

EXPECTED_SECONDS=$((90 * 86400))
if [[ "$RET_PERIOD" -ge "$EXPECTED_SECONDS" ]]; then
  DAYS=$((RET_PERIOD / 86400))
  log_pass "Retention Policy: ${DAYS} dias (≥ 90)"
elif [[ "$RET_PERIOD" -gt 0 ]]; then
  DAYS=$((RET_PERIOD / 86400))
  log_fail "Retention Policy: ${DAYS} dias (< 90 — insuficiente)"
else
  log_fail "Retention Policy: NÃO CONFIGURADA (objetos podem ser deletados)"
fi

# ── 3. Lifecycle Rule (Delete noncurrent after 90d) ─────────────────────────
echo "[3] Lifecycle Rule — delete noncurrent versions after 90 dias"
LIFECYCLE=$(echo "$META" | python3 -c "
import sys,json
d=json.load(sys.stdin)
rules = d.get('lifecycle', {}).get('rule', [])
for r in rules:
    action = r.get('action', {}).get('type', '')
    cond = r.get('condition', {})
    if action == 'Delete' and cond.get('age') == 90 and not cond.get('isLive', True):
        print('OK: Delete noncurrent age=90')
        break
else:
    print('MISSING or incorrect')
" 2>/dev/null || echo "MISSING or incorrect")

if [[ "$LIFECYCLE" == "OK: Delete noncurrent age=90" ]]; then
  log_pass "Lifecycle Rule: Delete noncurrent (age=90 dias)"
else
  log_fail "Lifecycle Rule: AUSENTE ou incorreta (deve deletar noncurrent versions após 90 dias)"
fi

# ── 4. Uniform Bucket Level Access ───────────────────────────────────────────
echo "[4] Uniform Bucket Level Access"
UBLA=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('iamConfiguration',{}).get('uniformBucketLevelAccess',{}).get('enabled',False))" 2>/dev/null)
if [[ "$UBLA" == "True" ]]; then
  log_pass "Uniform Bucket Level Access enabled"
else
  log_fail "Uniform Bucket Level Access DISABLED — ACLs granulares podem conflitar com WORM"
fi

# ── 5. IAM — sem storage.objectDeleter público ───────────────────────────────
echo "[5] IAM — nenhum principal com roles/storage.objectDeleter"
IAM=$(gcloud storage buckets get-iam-policy "gs://$BUCKET" \
  --project="$PROJECT" \
  --format=json 2>/dev/null)

OBJECT_DELETER_COUNT=$(echo "$IAM" | python3 -c "
import sys,json
d=json.load(sys.stdin)
count = 0
for binding in d.get('bindings', []):
    if 'roles/storage.objectDeleter' in binding.get('role', ''):
        for member in binding.get('members', []):
            if not member.startswith('serviceAccount:'):
                print(f'  NON-SERVICE: {member} has objectDeleter')
                count += 1
print(count)
" 2>/dev/null || echo "0")

if [[ "$OBJECT_DELETER_COUNT" == "0" ]]; then
  log_pass "Nenhum principal não-serviço com storage.objectDeleter"
else
  log_fail "Principais não-serviço têm storage.objectDeleter (violação WORM)"
fi

# ── 6. Lei 14.063/2020 — Política documentada ─────────────────────────────────
echo "[6] Registro de evidências (Lei 14.063/2020 Art. 6º)"
DOC_CHECK=$(gcloud logging read \
  "resource.type=gcs_bucket AND resource.labels.bucket_name=$BUCKET" \
  --project="$PROJECT" \
  --freshness=30d \
  --format="value(logName)" 2>/dev/null | head -1 || true)

if [[ -n "$DOC_CHECK" ]]; then
  log_pass "Logging de audit está ativo no bucket"
else
  log_info "Logging de audit não verificado neste período — verificar manualmente no Cloud Console"
fi

# ── Resultado ────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
if [[ "$FAILED" -eq 0 ]]; then
  echo "  ✅ WORM COMPLIANT — gs://$BUCKET em conformidade"
  echo "════════════════════════════════════════════════════════════"
  exit 0
else
  echo "  ❌ WORM NON-COMPLIANT — $FAILED verificação(ões) falharam"
  echo "  Rode scripts/gcs-worm-setup.sh para corrigir"
  echo "════════════════════════════════════════════════════════════"
  exit 1
fi

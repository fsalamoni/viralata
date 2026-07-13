#!/usr/bin/env bash
# Security audit helper script.
# Runs npm audit, counts high+critical, exits non-zero if any.
# Outputs machine-readable summary to stdout (for the workflow).

set -o pipefail

# GITHUB_OUTPUT é setado pelo workflow. Se não estiver (rodando local),
# redireciona para um arquivo tmp.
GITHUB_OUTPUT="${GITHUB_OUTPUT:-/tmp/audit-output}"
: > "$GITHUB_OUTPUT"

OUT=audit.json
echo "Running npm audit (severity >= high)..."
npm audit --audit-level=high --json > "$OUT" 2>&1 || AUDIT_EXIT=$?
AUDIT_EXIT=${AUDIT_EXIT:-0}
echo "audit exit: $AUDIT_EXIT"

# Parse with Python (more robust than jq for nested metadata.vulnerabilities)
HIGH_COUNT=$(python3 <<'PYEOF'
import json
with open("audit.json") as f:
    d = json.load(f)
v = d.get("metadata", {}).get("vulnerabilities", {})
print(v.get("high", 0) + v.get("critical", 0))
PYEOF
)
echo "high+critical count: $HIGH_COUNT"
echo "high_count=$HIGH_COUNT" >> "$GITHUB_OUTPUT"

if [ "$AUDIT_EXIT" = "0" ]; then
  echo "OK: no high+ or critical vulnerabilities"
  exit 0
fi

echo "::error::npm audit found high+ or critical vulnerabilities"
python3 <<'PYEOF'
import json
with open("audit.json") as f:
    d = json.load(f)
for name, info in d.get("vulnerabilities", {}).items():
    sev = info.get("severity", "?")
    if sev in ("high", "critical"):
        via = info.get("via", [])
        cves = []
        for v in via[:2]:
            if isinstance(v, dict):
                cves.append(v.get("title", "")[:80])
        print(f"  [{sev}] {name} -> {cves}")
PYEOF
exit 1

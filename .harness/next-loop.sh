#!/bin/bash
# next-loop.sh — pega próxima task de feature visível e processa
# Uso: .harness/next-loop.sh

set -e
cd /workspace/viralata

# 1) Pega próxima task prioritária (não-human, não-jurídico)
NEXT=$(python3 - <<'PY'
import json
with open('.harness/SCRUM_TASKS.json', 'r') as f:
    d = json.load(f)
ready = [t for t in d['tasks'] if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']]
# Priorizar: feature visível > test > chore
def score(t):
    cat = (t.get('category') or '').lower()
    title = t.get('title') or ''
    pri = t.get('priority') or 'medium'
    s = 0
    if 'ux' in cat: s += 50
    if 'public' in cat: s += 30
    if 'shelter' in cat and 'dashboard' in title.lower(): s += 25
    if 'gallery' in title.lower() or 'lightbox' in title.lower(): s += 25
    if 'event' in title.lower() and 'public' in cat: s += 20
    if pri == 'critical': s += 10
    if pri == 'high': s += 5
    if t.get('id') in ['TASK-264','TASK-265','TASK-266','TASK-267']: s -= 100  # já feitos
    return -s
ready.sort(key=score)
if ready:
    print(ready[0]['id'])
PY
)
echo "Próxima task: $NEXT"
if [ -z "$NEXT" ]; then
    echo "Nenhuma task pronta."
    exit 0
fi
# Marcar como in_progress
node .harness/scrum.cjs start "$NEXT" 2>&1 | tail -1
echo "$NEXT" > /tmp/next_task_id

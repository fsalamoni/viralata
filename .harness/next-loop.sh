#!/bin/bash
# next-loop.sh — Decide a próxima task do loop de UX/Design
# Uso: bash .harness/next-loop.sh
# Saída: TASK-XXX ou string vazia

set -e
cd "$(dirname "$0")/.."

NEXT=$(python3 <<'PY'
import json
with open('.harness/SCRUM_TASKS.json') as f:
    d = json.load(f)

priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
ready = [t for t in d['tasks']
         if t['status'] == 'ready'
         and t.get('owner') not in ('human', 'human-juridico')
         and t.get('category') in ('design', 'ui', 'ux')]

# Ordenar por prioridade
def score(t):
    p = priority_order.get(t.get('priority', 'medium'), 2)
    return (p, t['id'])

ready.sort(key=score)
if ready:
    print(ready[0]['id'])
PY
)

if [ -n "$NEXT" ]; then
    echo "$NEXT"
fi

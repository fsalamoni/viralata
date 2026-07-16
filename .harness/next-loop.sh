#!/bin/bash
# next-loop.sh — Decide o que o loop de UX/Design vai fazer
# Uso: bash .harness/next-loop.sh

set -e
cd /workspace/viralata

# 1) Pegar próxima task ready (não human, não human-juridico, não backlog)
#    Priorizar: high > medium > low, e categoria design > ui > admin
NEXT=$(python3 <<'PY'
import json
with open('.harness/SCRUM_TASKS.json') as f:
    d = json.load(f)

priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
ready = [t for t in d['tasks']
         if t['status'] == 'ready'
         and t.get('owner') not in ('human', 'human-juridico')]

# Ordenar por prioridade + categoria
def score(t):
    p = priority_order.get(t.get('priority', 'medium'), 2)
    cat = t.get('category', '')
    # design e ui têm prioridade
    cat_bonus = -1 if cat in ('design', 'ui') else 0
    return (p, cat_bonus, t['id'])

ready.sort(key=score)
if ready:
    print(ready[0]['id'])
PY
)

if [ -n "$NEXT" ]; then
    echo "$NEXT"
fi

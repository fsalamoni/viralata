#!/bin/bash
# next-loop.sh — decide FEATURE vs REVISÃO e age
# Uso: .harness/next-loop.sh
# Retorna: 'feature' (com TASK-ID) ou 'review'

set -e
cd /workspace/viralata

# Decide modo
MODE_INFO=$(python3 - <<'PY'
import json
with open('.harness/SCRUM_TASKS.json', 'r') as f:
    d = json.load(f)
ready = [t for t in d['tasks'] if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']]

if not ready:
    print('MODE=review')
else:
    # Score
    def score(t):
        cat = (t.get('category') or '').lower()
        title = (t.get('title') or '').lower()
        pri = t.get('priority') or 'medium'
        s = 0
        if 'ux' in cat: s += 50
        if 'public' in cat: s += 30
        if 'shelter' in cat: s += 15
        if 'pet' in title: s += 5
        if 'match' in title: s += 20
        if 'devolu' in title: s += 18
        if 'a11y' in title: s += 18
        if 'vitrine' in title: s += 25
        if 'milestone' in title: s += 15
        if 'similar' in title: s += 12
        if 'wizard' in title: s += 15
        if 'dashboard' in title: s += 12
        if pri == 'critical': s += 10
        if pri == 'high': s += 5
        return -s
    ready.sort(key=score)
    next_task = ready[0]
    print(f'MODE=feature')
    print(f'TASK={next_task["id"]}')
    print(f'TITLE={next_task.get("title", "")}')
PY
)

echo "$MODE_INFO"

# Marcar como in_progress se for feature
if echo "$MODE_INFO" | grep -q "MODE=feature"; then
    NEXT_ID=$(echo "$MODE_INFO" | grep "^TASK=" | cut -d= -f2)
    if [ -n "$NEXT_ID" ]; then
        node .harness/scrum.cjs start "$NEXT_ID" 2>&1 | tail -1
        echo "$NEXT_ID" > /tmp/next_task_id
    fi
fi

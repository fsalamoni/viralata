#!/bin/bash
# ux-loop.sh — Loop de UX/Design (executa 1 task por turno)
# Uso: bash .harness/ux-loop.sh

set -e
cd /workspace/viralata

# 1) Pegar próxima task
NEXT=$(bash .harness/next-loop.sh)
if [ -z "$NEXT" ]; then
    echo "Nenhuma task ready. Saindo."
    exit 0
fi

echo "=========================================="
echo "  LOOP UX/DESIGN — Turno: $NEXT"
echo "  Data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=========================================="

# 2) Marcar como in_progress (lock visual)
node .harness/scrum.cjs start "$NEXT" 2>&1 | tail -1

# 3) Aqui o agente (root session) implementa a task
#    O loop fica esperando a implementação terminar
#    Quando o root session termina a task, ele marca como done
#    E o próximo turno começa

# 4) Mostrar o que precisa ser feito
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f:
    d = json.load(f)
for t in d['tasks']:
    if t['id'] == '$NEXT':
        print(f\"Title: {t.get('title','')}\")
        print(f\"Desc:  {t.get('description','')}\")
        break
"

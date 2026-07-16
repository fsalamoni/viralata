#!/bin/bash
# ux-bootstrap.sh — Setup COMPLETO do repo para o loop de UX/Design
# Esta é a primeira coisa que o loop SEMPRE deve rodar
# Pode ser chamada de QUALQUER lugar

set -e

REPO_DIR="/workspace/viralata"
REPO_URL="https://github.com/fsalamoni/viralata.git"

# 1. Garantir que o diretório existe
mkdir -p /workspace

# 2. Se NÃO tem .git, clonar (o que acontece em sessão nova)
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "📦 Repo não existe, clonando..."
  rm -rf "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR" 2>&1 | tail -3
else
  # 3. Se tem .git, fazer pull
  cd "$REPO_DIR"
  git pull origin main --rebase 2>&1 | tail -3
fi

# 4. Garantir que tem node_modules
cd "$REPO_DIR"
if [ ! -d "node_modules/proper-lockfile" ] || [ ! -d "node_modules/sync-request" ]; then
  echo "📦 Instalando dependências..."
  npm install --no-audit --no-fund 2>&1 | tail -3
fi

# 5. Verificar que os scripts críticos existem
if [ ! -f ".harness/ux-bootstrap.sh" ] || [ ! -f ".harness/next-loop.sh" ]; then
  echo "❌ Scripts críticos não encontrados!"
  exit 1
fi

# 6. Status final
echo "✅ Bootstrap OK"
echo "   Repo: $REPO_DIR"
echo "   Branch: $(git branch --show-current)"
echo "   Last commit: $(git log -1 --oneline)"
echo "   Ready tasks: $(python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); print(len([t for t in d['tasks'] if t['status']=='ready']))")"

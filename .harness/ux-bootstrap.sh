#!/bin/bash
# ux-bootstrap.sh — Setup mínimo do repo para o loop de UX/Design
# SEMPRE use caminhos ABSOLUTOS. A sessão do cron não compartilha o cwd.

set -e

REPO_DIR="/workspace/viralata"
REPO_URL="https://github.com/fsalamoni/viralata.git"

# 1. Garantir que o diretório existe
mkdir -p /workspace

# 2. Se não existe, clonar
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "📦 Clonando repo em $REPO_DIR..."
  git clone $REPO_URL $REPO_DIR
fi

# 3. Pull latest
cd $REPO_DIR
git pull origin main --rebase 2>&1 | tail -3

# 4. Garantir que tem node_modules
if [ ! -d "node_modules/proper-lockfile" ] || [ ! -d "node_modules/sync-request" ]; then
  echo "📦 Instalando dependências..."
  npm install --no-audit --no-fund 2>&1 | tail -3
fi

echo "✅ Bootstrap OK"

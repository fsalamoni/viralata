#!/bin/bash
#
# setup-new-dev.sh
#
# Script de setup rápido para novos dev/IAs que vão trabalhar no projeto.
# Verifica dependências, configura ambiente, valida que tudo está OK.
#
# Uso:
#   ./scripts/setup-new-dev.sh
#

set -e

echo "=========================================="
echo "  VIRALATA - SETUP NOVO DEV/IA"
echo "=========================================="
echo ""

# 1. Verificar Node
echo "1. Verificando Node.js..."
if ! command -v node &> /dev/null; then
  echo "  ERRO: Node.js não instalado. Instale Node 20+ antes de continuar."
  echo "  https://nodejs.org/"
  exit 1
fi
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
echo "  Node.js $(node --version)"

if [ "$NODE_VERSION" -lt 20 ]; then
  echo "  AVISO: Recomendado Node 20+ (você tem $(node --version))"
fi

# 2. Verificar npm
echo "2. Verificando npm..."
if ! command -v npm &> /dev/null; then
  echo "  ERRO: npm não instalado."
  exit 1
fi
echo "  npm $(npm --version)"

# 3. Verificar git
echo "3. Verificando git..."
if ! command -v git &> /dev/null; then
  echo "  ERRO: git não instalado."
  exit 1
fi
echo "  git $(git --version)"

# 4. Instalar dependências
echo ""
echo "4. Instalando dependências..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "  Dependências já instaladas (node_modules/ existe)"
fi

# 5. Verificar .env
echo ""
echo "5. Verificando .env..."
if [ ! -f ".env" ]; then
  echo "  AVISO: .env não existe."
  echo "  Copie .env.example para .env e preencha VITE_FIREBASE_*"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "  .env.example copiado para .env — preencha as vars VITE_FIREBASE_*"
  else
    echo "  ERRO: .env.example também não existe."
    exit 1
  fi
else
  echo "  .env existe"
fi

# 6. Rodar tests
echo ""
echo "6. Rodando tests..."
npx vitest run --reporter=basic 2>&1 | tail -5

# 7. Build
echo ""
echo "7. Build..."
if npx vite build 2>&1 | tail -3; then
  echo "  Build OK"
else
  echo "  ERRO: Build falhou"
  exit 1
fi

# 8. Validar imports lucide
echo ""
echo "8. Validando imports lucide..."
if node scripts/validate-lucide-imports.mjs 2>&1 | tail -3; then
  echo "  Lucide imports OK"
fi

# 9. Validar aria-current
echo ""
echo "9. Auditando aria-current..."
if node scripts/audit-aria-current.mjs 2>&1 | tail -3; then
  echo "  Aria-current OK"
fi

# 10. Validar referências cruzadas
echo ""
echo "10. Validando referências cruzadas em docs..."
if node scripts/validate-doc-references.mjs 2>&1 | tail -3; then
  echo "  Doc references OK"
fi

# 11. Ler docs importantes
echo ""
echo "=========================================="
echo "  SETUP COMPLETO!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Ler docs/AI_GUIDE/00-START-HERE.md (15 min)"
echo "2. Ler docs/AI_GUIDE/11-CORE-DIRECTIVES.md (30 min)"
echo "3. Ler docs/AI_GUIDE/16-AGENT-ONBOARDING.md (10 min)"
echo "4. Rodar 'npm run dev' para iniciar dev server"
echo ""
echo "Em caso de dúvidas:"
echo "- docs/AI_GUIDE/14-TROUBLESHOOTING.md"
echo "- docs/AI_GUIDE/15-RECENT-FIXES.md"
echo ""

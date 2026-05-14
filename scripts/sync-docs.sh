#!/bin/bash
# scripts/sync-docs.sh
# ════════════════════════════════════════════════════════════════════
# Sincroniza arquivos servidos pelo GitHub Pages (pasta docs/) com a
# raiz. Útil enquanto o Pages estiver configurado para servir de docs/
# em vez da raiz.
#
# USAGE:
#   ./scripts/sync-docs.sh
#
# COMO ELIMINAR ESSE SCRIPT (recomendado):
#   1. GitHub → Settings → Pages
#   2. Source: "Deploy from a branch"
#   3. Branch: main / (root)  ← mudar de /docs para /(root)
#   4. Save
#   5. Aguardar redeploy (~1-2 min)
#   6. Deletar este script e a pasta docs/
# ════════════════════════════════════════════════════════════════════

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d docs ]; then
  echo "Pasta docs/ não existe — Pages provavelmente já está na raiz. Nada a fazer."
  exit 0
fi

echo "Sincronizando docs/ ← raiz..."

cp -v index.html docs/index.html
cp -v recovery.html docs/recovery.html 2>/dev/null || true
cp -v app.js docs/app.js
cp -v services.js docs/services.js
cp -v utils.js docs/utils.js
cp -v styles.css docs/styles.css
cp -rv modules docs/

echo ""
echo "✓ Sincronização concluída."
echo ""
echo "Diferenças remanescentes (devem estar vazias):"
diff -q index.html docs/index.html || true
diff -q app.js docs/app.js || true
diff -q services.js docs/services.js || true
diff -q utils.js docs/utils.js || true
diff -q styles.css docs/styles.css || true
diff -rq modules docs/modules 2>/dev/null || true

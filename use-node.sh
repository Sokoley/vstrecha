#!/usr/bin/env bash
# Подключает Node из ./.node (без системной установки).
# Использование: source ./use-node.sh   или   . ./use-node.sh

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_HOME="$SITE_DIR/.node"

if [[ ! -x "$NODE_HOME/bin/node" ]]; then
  echo "Node не найден в $NODE_HOME"
  echo "Сначала выполните установку из docs/DEPLOY.md (раздел про локальный Node)."
  return 1 2>/dev/null || exit 1
fi

export PATH="$NODE_HOME/bin:$PATH"
echo "Node: $(node -v)  npm: $(npm -v)"
echo "PATH использует: $NODE_HOME/bin"

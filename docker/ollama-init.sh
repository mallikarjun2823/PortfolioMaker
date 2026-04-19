#!/bin/sh
set -eu

OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-tinyllama}"
export OLLAMA_HOST

echo "[ollama-init] Waiting for Ollama API at ${OLLAMA_HOST} ..."
attempts=0
until ollama list >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    echo "[ollama-init] Ollama did not become ready in time."
    exit 1
  fi
  sleep 2
done

echo "[ollama-init] Ollama is ready. Checking model ${OLLAMA_MODEL} ..."
if ollama list | awk 'NR > 1 { print $1 }' | grep -Fxq "${OLLAMA_MODEL}"; then
  echo "[ollama-init] Model already present: ${OLLAMA_MODEL}"
else
  echo "[ollama-init] Pulling model: ${OLLAMA_MODEL}"
  ollama pull "${OLLAMA_MODEL}"
fi

echo "[ollama-init] Done."

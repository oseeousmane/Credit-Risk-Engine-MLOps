#!/bin/sh
# Auto-train PD model if artifact is missing — enables one-shot `docker compose up`
set -e

ARTIFACT="/app/02_modeling/pd_model/artifacts/pd_model_v2.pkl"

if [ ! -f "$ARTIFACT" ]; then
  echo "[ENTRYPOINT] Artifact not found at $ARTIFACT"
  DATA="/app/01_data_layer/curated/curated_dataset.parquet"
  if [ -f "$DATA" ]; then
    echo "[ENTRYPOINT] Training data found — running PD model training (~3min)..."
    cd /app/02_modeling/pd_model && python run_training.py --model lightgbm
    echo "[ENTRYPOINT] Training complete."
  else
    echo "[ENTRYPOINT] WARNING: No training data and no artifact. Service will start in FALLBACK mode."
  fi
else
  echo "[ENTRYPOINT] Artifact found: $ARTIFACT"
fi

exec "$@"

# ═══════════════════════════════════════════════════════════════
# Credit Risk Engine — Production Dockerfile
# ═══════════════════════════════════════════════════════════════
# Multi-stage build optimisé pour environnement bancaire
# Image minimale + sécurité renforcée
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim as builder

WORKDIR /build

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim as runtime

# Security: non-root user
RUN groupadd -r riskengine && useradd -r -g riskengine riskengine

WORKDIR /app

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy application code
COPY 01_data_layer/ ./01_data_layer/
COPY 02_modeling/ ./02_modeling/
COPY 03_risk_engine/ ./03_risk_engine/
COPY 04_model_risk_management/ ./04_model_risk_management/
COPY 05_api_layer/ ./05_api_layer/
COPY 06_monitoring/ ./06_monitoring/
COPY 07_governance/ ./07_governance/
COPY config/ ./config/

# Ensure directories exist for logs/reports
RUN mkdir -p /app/logs /app/reports /app/06_monitoring/metrics \
    /app/06_monitoring/alerts /app/07_governance/audit_logs \
    /app/04_model_risk_management/reports \
    && chown -R riskengine:riskengine /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Switch to non-root user
USER riskengine

# Expose API port
EXPOSE 8000

# Labels for compliance/audit
LABEL maintainer="Credit Risk Analytics" \
      version="1.0.0" \
      description="Credit Risk Engine API — COBAC Compliant" \
      regulatory.framework="Basel_III_IFRS9"

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "05_api_layer.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--log-level", "info"]

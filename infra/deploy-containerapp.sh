#!/usr/bin/env bash
# Deploy the Bromog backend to Azure Container Apps (Consumption — free monthly
# grant + scale-to-zero). Cheaper than App Service and avoids the VM-SKU quota
# that blocks Basic App Service plans on fresh subscriptions.
#
# Usage:
#   APP_TOKEN=secret ANTHROPIC_API_KEY=sk-... ./infra/deploy-containerapp.sh [rg] [location]
#
# PERSISTENCE: the backend is a *backup* for a local-first app (the phones are the
# source of truth). It uses SQLite on the container's local disk. With scale-to-zero
# that disk is ephemeral, so server-side history can reset on a cold start — the
# phones simply re-sync their local logs on the next finish. SQLite on an Azure Files
# (SMB) mount does NOT work ("database is locked"), so for durable server history set
# DATABASE_URL to a managed/free Postgres (e.g. Neon) — one env var, no code change.
set -euo pipefail

RG="${1:-bromog-rg}"
LOCATION="${2:-eastus}"
APP_TOKEN="${APP_TOKEN:?Set APP_TOKEN (shared bearer token)}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
APK_DOWNLOAD_URL="${APK_DOWNLOAD_URL:-}"
DATABASE_URL="${DATABASE_URL:-sqlite:////home/data/bromog.db}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUFFIX=$(az account show --query id -o tsv | tr -d '-' | cut -c1-10)
ACR_NAME="bromogacr${SUFFIX}"
ENV_NAME="bromog-env"
APP_NAME="bromog"

echo "→ Providers + CLI extension"
az extension add -n containerapp --upgrade --only-show-errors -o none
az provider register -n Microsoft.App --wait -o none
az provider register -n Microsoft.OperationalInsights --wait -o none

echo "→ Resource group: $RG ($LOCATION)"
az group create -n "$RG" -l "$LOCATION" -o none

echo "→ ACR: $ACR_NAME"
az acr create -g "$RG" -n "$ACR_NAME" --sku Basic --admin-enabled true -o none
# Brief settle so the registry is queryable before the build (avoids a race).
sleep 10
echo "→ Building image in ACR (slow step)…"
az acr build -r "$ACR_NAME" -t bromog-backend:latest "$ROOT" -o none

echo "→ Container Apps environment"
if ! az containerapp env show -g "$RG" -n "$ENV_NAME" -o none 2>/dev/null; then
  az containerapp env create -g "$RG" -n "$ENV_NAME" -l "$LOCATION" -o none
fi

ACR_SERVER=$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR_NAME" --query "passwords[0].value" -o tsv)

# Idempotent: create the app the first time, otherwise roll it to the new image.
# (Re-runnable — safe to invoke repeatedly to ship a new backend.)
if az containerapp show -g "$RG" -n "$APP_NAME" -o none 2>/dev/null; then
  echo "→ Updating existing container app"
  az containerapp registry set -g "$RG" -n "$APP_NAME" \
    --server "$ACR_SERVER" --username "$ACR_NAME" --password "$ACR_PASS" -o none
  az containerapp secret set -g "$RG" -n "$APP_NAME" \
    --secrets app-token="$APP_TOKEN" anthropic-key="$ANTHROPIC_API_KEY" openai-key="$OPENAI_API_KEY" -o none
  az containerapp update -g "$RG" -n "$APP_NAME" \
    --image "${ACR_SERVER}/bromog-backend:latest" \
    --set-env-vars APP_TOKEN=secretref:app-token DATABASE_URL="$DATABASE_URL" \
                   ANTHROPIC_API_KEY=secretref:anthropic-key OPENAI_API_KEY=secretref:openai-key \
                   APK_DOWNLOAD_URL="$APK_DOWNLOAD_URL" -o none
else
  echo "→ Deploying container app (scale-to-zero)"
  az containerapp create -g "$RG" -n "$APP_NAME" \
    --environment "$ENV_NAME" \
    --image "${ACR_SERVER}/bromog-backend:latest" \
    --registry-server "$ACR_SERVER" --registry-username "$ACR_NAME" --registry-password "$ACR_PASS" \
    --target-port 8000 --ingress external \
    --min-replicas 0 --max-replicas 1 --cpu 0.5 --memory 1.0Gi \
    --secrets app-token="$APP_TOKEN" anthropic-key="$ANTHROPIC_API_KEY" openai-key="$OPENAI_API_KEY" \
    --env-vars APP_TOKEN=secretref:app-token DATABASE_URL="$DATABASE_URL" \
               ANTHROPIC_API_KEY=secretref:anthropic-key OPENAI_API_KEY=secretref:openai-key \
               APK_DOWNLOAD_URL="$APK_DOWNLOAD_URL" \
    -o none
fi

FQDN=$(az containerapp show -g "$RG" -n "$APP_NAME" --query properties.configuration.ingress.fqdn -o tsv)
URL="https://${FQDN}"

echo ""
echo "✓ Deployed to Azure Container Apps."
echo "  API:     $URL"
echo "  Health:  $URL/api/health"
echo "  Install: $URL/install"
echo ""
echo "For the APK build (GitHub secrets):"
echo "  API_BASE_URL=$URL"
echo "  APP_TOKEN=$APP_TOKEN"

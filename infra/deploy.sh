#!/usr/bin/env bash
# One-shot deploy of the Bromog backend to Azure App Service via ACR.
# Requires: az CLI logged in (`az login`) and Docker NOT required (uses `az acr build`).
#
# Usage:
#   APP_TOKEN=secret123 ANTHROPIC_API_KEY=sk-... ./infra/deploy.sh [resource-group] [location]
#
# Re-run any time to ship a new backend build (idempotent).
set -euo pipefail

RG="${1:-bromog-rg}"
LOCATION="${2:-uksouth}"
APP_TOKEN="${APP_TOKEN:?Set APP_TOKEN (shared bearer token) in the environment}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
APK_DOWNLOAD_URL="${APK_DOWNLOAD_URL:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Resource group: $RG ($LOCATION)"
az group create -n "$RG" -l "$LOCATION" -o none

echo "→ Provisioning ACR + App Service (Bicep)…"
OUTPUTS=$(az deployment group create \
  -g "$RG" \
  -f "$ROOT/infra/main.bicep" \
  -p appToken="$APP_TOKEN" \
     anthropicApiKey="$ANTHROPIC_API_KEY" \
     openaiApiKey="$OPENAI_API_KEY" \
     apkDownloadUrl="$APK_DOWNLOAD_URL" \
  --query properties.outputs -o json)

ACR_NAME=$(echo "$OUTPUTS" | python3 -c "import sys,json;print(json.load(sys.stdin)['acrName']['value'])")
APP_NAME=$(echo "$OUTPUTS" | python3 -c "import sys,json;print(json.load(sys.stdin)['appName']['value'])")
APP_URL=$(echo "$OUTPUTS" | python3 -c "import sys,json;print(json.load(sys.stdin)['appUrl']['value'])")

echo "→ Building image in ACR: $ACR_NAME"
az acr build -r "$ACR_NAME" -t "bromog-backend:latest" "$ROOT" -o none

echo "→ Restarting web app to pull the new image…"
az webapp restart -g "$RG" -n "$APP_NAME" -o none

echo ""
echo "✓ Deployed."
echo "  API:     $APP_URL"
echo "  Health:  $APP_URL/api/health"
echo "  Install: $APP_URL/install   (share this link to download the APK)"
echo ""
echo "Use this for the APK build (web/.env or GitHub secrets):"
echo "  VITE_API_BASE_URL=$APP_URL"
echo "  VITE_APP_TOKEN=$APP_TOKEN"

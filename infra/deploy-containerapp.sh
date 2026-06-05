#!/usr/bin/env bash
# Deploy the Bromog backend to Azure Container Apps (Consumption — free monthly
# grant + scale-to-zero). Cheaper than App Service and avoids VM-SKU quota.
#
# SQLite persistence: an Azure Files share is mounted at /home/data so the backup
# DB survives container restarts / scale-to-zero.
#
# Usage:
#   APP_TOKEN=secret ANTHROPIC_API_KEY=sk-... ./infra/deploy-containerapp.sh [rg] [location]
set -euo pipefail

RG="${1:-bromog-rg}"
LOCATION="${2:-eastus}"
APP_TOKEN="${APP_TOKEN:?Set APP_TOKEN (shared bearer token)}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
APK_DOWNLOAD_URL="${APK_DOWNLOAD_URL:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUFFIX=$(az account show --query id -o tsv | tr -d '-' | cut -c1-10)
ACR_NAME="bromogacr${SUFFIX}"
STORAGE_NAME="bromogstor${SUFFIX}"
ENV_NAME="bromog-env"
APP_NAME="bromog"
SHARE_NAME="bromogdata"
STORAGE_LINK="bromogfiles"

echo "→ Providers + CLI extension"
az extension add -n containerapp --upgrade --only-show-errors -o none
az provider register -n Microsoft.App --wait -o none
az provider register -n Microsoft.OperationalInsights --wait -o none

echo "→ Resource group: $RG ($LOCATION)"
az group create -n "$RG" -l "$LOCATION" -o none

echo "→ ACR: $ACR_NAME"
az acr create -g "$RG" -n "$ACR_NAME" --sku Basic --admin-enabled true -o none
echo "→ Building image in ACR (this is the slow step)…"
az acr build -r "$ACR_NAME" -t bromog-backend:latest "$ROOT" -o none

echo "→ Storage account + file share (SQLite persistence)"
az storage account create -g "$RG" -n "$STORAGE_NAME" -l "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 -o none
STKEY=$(az storage account keys list -g "$RG" -n "$STORAGE_NAME" --query "[0].value" -o tsv)
az storage share-rm create -g "$RG" --storage-account "$STORAGE_NAME" -n "$SHARE_NAME" --quota 5 -o none

echo "→ Container Apps environment"
az containerapp env create -g "$RG" -n "$ENV_NAME" -l "$LOCATION" -o none
az containerapp env storage set -g "$RG" -n "$ENV_NAME" --storage-name "$STORAGE_LINK" \
  --azure-file-account-name "$STORAGE_NAME" --azure-file-account-key "$STKEY" \
  --azure-file-share-name "$SHARE_NAME" --access-mode ReadWrite -o none

ENV_ID=$(az containerapp env show -g "$RG" -n "$ENV_NAME" --query id -o tsv)
ACR_SERVER=$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "→ Deploying container app (with /home/data volume)"
YAML=$(mktemp --suffix=.yaml)
cat > "$YAML" <<YAML
location: ${LOCATION}
properties:
  managedEnvironmentId: ${ENV_ID}
  configuration:
    activeRevisionsMode: Single
    ingress:
      external: true
      targetPort: 8000
      transport: auto
    registries:
      - server: ${ACR_SERVER}
        username: ${ACR_NAME}
        passwordSecretRef: acr-pass
    secrets:
      - name: acr-pass
        value: "${ACR_PASS}"
      - name: app-token
        value: "${APP_TOKEN}"
      - name: anthropic-key
        value: "${ANTHROPIC_API_KEY}"
      - name: openai-key
        value: "${OPENAI_API_KEY}"
  template:
    containers:
      - name: bromog
        image: ${ACR_SERVER}/bromog-backend:latest
        resources:
          cpu: 0.5
          memory: 1.0Gi
        env:
          - name: APP_TOKEN
            secretRef: app-token
          - name: DATABASE_URL
            value: sqlite:////home/data/bromog.db
          - name: ANTHROPIC_API_KEY
            secretRef: anthropic-key
          - name: OPENAI_API_KEY
            secretRef: openai-key
          - name: APK_DOWNLOAD_URL
            value: "${APK_DOWNLOAD_URL}"
        volumeMounts:
          - volumeName: data
            mountPath: /home/data
    scale:
      minReplicas: 0
      maxReplicas: 1
    volumes:
      - name: data
        storageType: AzureFile
        storageName: ${STORAGE_LINK}
YAML

az containerapp create -g "$RG" -n "$APP_NAME" --yaml "$YAML" -o none
rm -f "$YAML"

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

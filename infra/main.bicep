// Bromog infrastructure: ACR + Linux App Service (Web App for Containers).
// Deploy with infra/deploy.sh, or:
//   az deployment group create -g <rg> -f infra/main.bicep -p appToken=<token>
//
// The SQLite DB lives on the App Service /home volume, which is persisted across
// restarts/deploys (WEBSITES_ENABLE_APP_SERVICE_STORAGE=true) — no separate DB
// resource needed. Set `databaseUrl` to a Postgres URL to upgrade.

@description('Base name; resource names derive from this.')
param baseName string = 'bromog'

@description('Azure region.')
param location string = resourceGroup().location

@description('Shared bearer token guarding the API. Must match the app/APK build.')
@secure()
param appToken string

@description('Anthropic API key for the optional coach (leave empty to disable).')
@secure()
param anthropicApiKey string = ''

@description('OpenAI API key fallback for the coach (leave empty to disable).')
@secure()
param openaiApiKey string = ''

@description('SQLAlchemy DB URL. Default = SQLite on the persisted /home volume.')
param databaseUrl string = 'sqlite:////home/data/bromog.db'

@description('Always-latest APK URL for the /install page (e.g. a GitHub Release permalink).')
param apkDownloadUrl string = ''

@description('Container image tag to deploy (built into ACR by deploy.sh / CI).')
param imageTag string = 'latest'

var acrName = toLower('${baseName}acr${uniqueString(resourceGroup().id)}')
var planName = '${baseName}-plan'
var appName = '${baseName}-${uniqueString(resourceGroup().id)}'
var image = '${acr.properties.loginServer}/${baseName}-backend:${imageTag}'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: { name: 'B1', tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${image}'
      acrUseManagedIdentityCreds: false
      appSettings: [
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'true' }
        { name: 'WEBSITES_PORT', value: '8000' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        { name: 'APP_TOKEN', value: appToken }
        { name: 'DATABASE_URL', value: databaseUrl }
        { name: 'ANTHROPIC_API_KEY', value: anthropicApiKey }
        { name: 'OPENAI_API_KEY', value: openaiApiKey }
        { name: 'APK_DOWNLOAD_URL', value: apkDownloadUrl }
      ]
    }
  }
}

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output appName string = app.name
output appUrl string = 'https://${app.properties.defaultHostName}'

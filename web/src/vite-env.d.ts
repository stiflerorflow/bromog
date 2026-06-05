/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Azure App Service base URL, e.g. https://bromog.azurewebsites.net */
  readonly VITE_API_BASE_URL?: string;
  /** Shared bearer token matching the backend APP_TOKEN. */
  readonly VITE_APP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

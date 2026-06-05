/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://bromog.<region>.azurecontainerapps.io */
  readonly VITE_API_BASE_URL?: string;
  /** Shared bearer token matching the backend APP_TOKEN. */
  readonly VITE_APP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCGIS_CLIENT_ID: string;
  readonly VITE_PORTAL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

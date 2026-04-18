/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCGIS_CLIENT_ID?: string;
  readonly VITE_PORTAL_URL?: string;
  readonly VITE_ARCGIS_WEBMAP_ID?: string;
  readonly VITE_FEATURE_LAYER_URL?: string;
  readonly VITE_JAARPLAN_FEATURE_SERVICE_URL?: string;
  readonly VITE_JAARPLAN_TRAJECT_LAYER_URL?: string;
  readonly VITE_JAARPLAN_MAATREGEL_TABLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

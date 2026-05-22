export const DEFAULT_GC_WERK_FEATURE_SERVICE_URL =
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/GC_Werk_Trajecten_2027_v02/FeatureServer";

const STORAGE_KEY = "wl-groenbeheer.layer-config.v1";

export interface LayerConfig {
  featureServiceUrl: string;
}

function normalizeFeatureServiceUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/\d+$/, "");
}

export function getLayerConfig(): LayerConfig {
  const envUrl = import.meta.env.VITE_GC_WERK_FEATURE_SERVICE_URL?.trim() || "";

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LayerConfig>;
        if (parsed.featureServiceUrl?.trim()) {
          return {
            featureServiceUrl: normalizeFeatureServiceUrl(parsed.featureServiceUrl),
          };
        }
      }
    } catch {
      // Invalid local configuration should not block startup.
    }
  }

  return {
    featureServiceUrl: normalizeFeatureServiceUrl(
      envUrl || DEFAULT_GC_WERK_FEATURE_SERVICE_URL
    ),
  };
}

export function saveLayerConfig(config: LayerConfig): LayerConfig {
  const normalized = {
    featureServiceUrl: normalizeFeatureServiceUrl(config.featureServiceUrl),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetLayerConfig(): LayerConfig {
  window.localStorage.removeItem(STORAGE_KEY);
  return getLayerConfig();
}

export function getConfiguredFeatureServiceUrl(): string {
  return getLayerConfig().featureServiceUrl;
}

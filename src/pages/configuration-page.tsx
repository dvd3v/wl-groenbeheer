import { useState } from "react";
import {
  DEFAULT_GC_WERK_FEATURE_SERVICE_URL,
  getLayerConfig,
  resetLayerConfig,
  saveLayerConfig,
} from "../services/layer-config-service";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function ConfigurationPage() {
  const [featureServiceUrl, setFeatureServiceUrl] = useState(
    getLayerConfig().featureServiceUrl
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const next = saveLayerConfig({ featureServiceUrl });
    setFeatureServiceUrl(next.featureServiceUrl);
    setSaved(true);
  }

  function handleReset() {
    const next = resetLayerConfig();
    setFeatureServiceUrl(next.featureServiceUrl);
    setSaved(true);
  }

  return (
    <div className="app-scrollbar h-full overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[980px] space-y-4">
        <section className="glass-panel rounded-card border border-white/60 p-5">
          <h1 className="text-xl font-bold text-text">Configuratie</h1>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-6 text-textDim">
            Kies welke hosted FeatureServer de trajectlaag en gekoppelde maatregelentabel levert.
            De app kiest de trajectlaag en maatregelentabel automatisch op basis van de laagnamen
            in dezelfde FeatureServer.
          </p>
        </section>

        <section className="rounded-card border border-border bg-white p-5 shadow-panel">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
              FeatureServer URL
            </span>
            <Input
              value={featureServiceUrl}
              onChange={(event) => {
                setFeatureServiceUrl(event.target.value);
                setSaved(false);
              }}
              placeholder={DEFAULT_GC_WERK_FEATURE_SERVICE_URL}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={handleSave}>Configuratie opslaan</Button>
            <Button variant="ghost" onClick={handleReset}>
              Terug naar standaard
            </Button>
            {saved ? (
              <span className="text-[12px] text-textDim">
                Opgeslagen. Herlaad de app om alle kaartlagen opnieuw te initialiseren.
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

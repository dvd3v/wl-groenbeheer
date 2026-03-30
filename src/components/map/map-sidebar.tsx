import { Layers3, Palette } from "lucide-react";
import { Accordion, AccordionSection } from "../ui/accordion";
import { Switch } from "../ui/switch";
import { STATUS_OPTIONS } from "../../data/datamodel";
import type { LayerToggleItem, LegendItem } from "../../types/app";
import { MapProgressPanel } from "./map-progress-panel";

interface MapSidebarProps {
  layers: LayerToggleItem[];
  legend: LegendItem[];
  onToggleLayer: (id: string, visible: boolean) => void;
  countsByStatus: Record<number, number>;
  totalTrajecten: number;
}

export function MapSidebar({
  layers,
  legend,
  onToggleLayer,
  countsByStatus,
  totalTrajecten,
}: MapSidebarProps) {
  const borLegendLayers = layers.filter(
    (layer) =>
      layer.title !== "Jaarplan Trajecten 2027" &&
      layer.title !== "Tijdelijke geometrie" &&
      layer.title !== "BOR objectlagen"
  );
  const filteredLegend = legend.filter(
    (section) =>
      section.entries.length > 0 &&
      section.title !== "Jaarplan Trajecten 2027" &&
      section.title !== "Jaarplan trajecten"
  );

  return (
    <aside className="app-scrollbar hidden h-full w-[310px] overflow-y-auto border-r border-border bg-white/85 backdrop-blur md:block">
      <div className="p-3">
        <div className="mb-3">
          <MapProgressPanel countsByStatus={countsByStatus} total={totalTrajecten} />
        </div>
        <Accordion defaultValue={["layers", "legend"]}>
          <AccordionSection
            value="layers"
            title="Kaartlagen"
          >
            <div className="space-y-1">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surfaceAlt"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accentSoft text-accentStrong">
                    <Layers3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-text">{layer.title}</div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                      {layer.type}
                    </div>
                  </div>
                  <Switch
                    checked={layer.visible}
                    onCheckedChange={(checked) => onToggleLayer(layer.id, checked)}
                  />
                </div>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            value="legend"
            title="Legenda"
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-textDim">
                  <Palette className="h-3.5 w-3.5" />
                  Jaarplan trajecten
                </div>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((status) => (
                    <div
                      key={status.value}
                      className="flex items-center gap-2 rounded-md bg-surfaceAlt/80 px-2 py-1.5"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] border border-black/5"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-[11px] text-textDim">{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-textDim">
                  <Palette className="h-3.5 w-3.5" />
                  BOR objectlagen
                </div>
                <div className="space-y-2">
                  {borLegendLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-2 rounded-md bg-surfaceAlt/80 px-2 py-1.5"
                    >
                      <span className="h-2.5 w-2.5 rounded-[3px] border border-black/5 bg-accentSoft" />
                      <span className="text-[11px] text-textDim">{layer.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {filteredLegend.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-textDim">
                    <Palette className="h-3.5 w-3.5" />
                    {section.title}
                  </div>
                  <div className="space-y-2">
                    {section.entries.map((entry) => (
                      <div
                        key={`${section.id}-${entry.label}`}
                        className="flex items-center gap-2 rounded-md bg-surfaceAlt/80 px-2 py-1.5"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-[3px] border border-black/5"
                          style={{ backgroundColor: entry.color ?? "#c8cdd6" }}
                        />
                        <span className="text-[11px] text-textDim">{entry.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>
        </Accordion>
      </div>
    </aside>
  );
}

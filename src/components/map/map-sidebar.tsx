import { Palette } from "lucide-react";
import { Accordion, AccordionSection } from "../ui/accordion";
import type { LayerToggleItem, LegendItem, StatusOption } from "../../types/app";
import { Button } from "../ui/button";
import { MapProgressPanel } from "./map-progress-panel";

interface MapSidebarProps {
  layers: LayerToggleItem[];
  legend: LegendItem[];
  countsByStatus: Record<number, number>;
  totalTrajecten: number;
  objectCountMax: number;
  availableTypeCoderingen: string[];
  statusOptions: StatusOption[];
  selectedTypeCoderingen: string[];
  selectedStatuses: number[];
  selectedBronlagen: string[];
  onObjectCountMaxChange: (value: number) => void;
  onToggleTypeCodering: (value: string) => void;
  onToggleStatus: (value: number) => void;
  onToggleBronlaag: (value: string) => void;
  onClearFilters: () => void;
}

export function MapSidebar({
  layers,
  legend,
  countsByStatus,
  totalTrajecten,
  objectCountMax,
  availableTypeCoderingen,
  statusOptions,
  selectedTypeCoderingen,
  selectedStatuses,
  selectedBronlagen,
  onObjectCountMaxChange,
  onToggleTypeCodering,
  onToggleStatus,
  onToggleBronlaag,
  onClearFilters,
}: MapSidebarProps) {
  const borLegendLayers = layers.filter(
    (layer) =>
      layer.title !== "Jaarplan Trajecten" &&
      layer.title !== "Tijdelijke geometrie" &&
      layer.title !== "BOR objectlagen"
  );
  const filteredLegend = legend.filter(
    (section) => section.entries.length > 0
  );
  const hasActiveFilters =
    objectCountMax < 160 ||
    selectedTypeCoderingen.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedBronlagen.length > 0;

  return (
    <aside className="app-scrollbar hidden h-full w-[310px] overflow-y-auto border-r border-border bg-white/85 backdrop-blur md:block">
      <div className="p-3">
        <div className="mb-3">
          <MapProgressPanel countsByStatus={countsByStatus} total={totalTrajecten} />
        </div>
        <Accordion defaultValue={["filters", "legend"]}>
          <AccordionSection
            value="filters"
            title="Filters"
            subtitle="Filter zichtbare trajecten op kaart en in voortgang"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-textDim">
                  {hasActiveFilters ? "Filters actief" : "Geen filters actief"}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-[11px]"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                >
                  Wis filters
                </Button>
              </div>

              <section className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Object count
                </div>
                <div className="rounded-md border border-border bg-surfaceAlt px-3 py-3">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-textDim">
                    <span>1 of meer</span>
                    <span>{objectCountMax} of minder</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={1}
                      max={160}
                      value={objectCountMax}
                      className="w-full"
                      onChange={(event) => {
                        onObjectCountMaxChange(Number(event.target.value));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[11px]"
                      onClick={() => onObjectCountMaxChange(160)}
                      disabled={objectCountMax === 160}
                    >
                      Reset object count
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Type codering
                </div>
                <div className="space-y-2">
                  {availableTypeCoderingen.map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-md border border-border bg-surfaceAlt px-2 py-2 text-[11px] text-textDim"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-current"
                        checked={selectedTypeCoderingen.includes(value)}
                        onChange={() => onToggleTypeCodering(value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Status
                </div>
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-md border border-border bg-surfaceAlt px-2 py-2 text-[11px] text-textDim"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-current"
                        checked={selectedStatuses.includes(option.value)}
                        onChange={() => onToggleStatus(option.value)}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ backgroundColor: option.color }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Bronlagen
                </div>
                <div className="space-y-2">
                  {["terreindeel", "waterobject", "groenobject", "verhardingsobject"].map(
                    (value) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 rounded-md border border-border bg-surfaceAlt px-2 py-2 text-[11px] text-textDim"
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-current"
                          checked={selectedBronlagen.includes(value)}
                          onChange={() => onToggleBronlaag(value)}
                        />
                        <span>{value}</span>
                      </label>
                    )
                  )}
                </div>
              </section>
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

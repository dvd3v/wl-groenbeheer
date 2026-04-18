import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import {
  AlertTriangle,
  Layers3,
  LoaderCircle,
  MapPinned,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { JaarplanFilterPanel } from "../components/jaarplan/jaarplan-filter-panel";
import { MaatregelForm } from "../components/jaarplan/maatregel-form";
import {
  MeasureSignals,
  MaatregelStatusBadge,
  getMaatregelStatusPalette,
  RegimeBadge,
} from "../components/jaarplan/maatregel-badges";
import { BasemapSwitcher } from "../components/map/basemap-switcher";
import { Button } from "../components/ui/button";
import { Drawer } from "../components/ui/drawer";
import { arcgisJaarplanService, type JaarplanMapContext } from "../services/arcgis-jaarplan-service";
import {
  formatWerkperiodeLabel,
  getAggregatedMaatregelStatus,
  getFilteredJaarplanGroups,
} from "../lib/jaarplan-filtering";
import { useAppStore } from "../store/app-store";
import type {
  JaarplanMeasureFormValues,
  LayerToggleItem,
  MaatregelStatus,
  MapViewState,
} from "../types/app";

function toSelectOptions(values: string[]) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nl"))
    .map((value) => ({ value, label: value }));
}

const MAP_STATUS_LEGEND_ORDER: MaatregelStatus[] = [
  "uitgevoerd",
  "deels_uitgevoerd",
  "niet_uitgevoerd",
  "gepland",
  "geen_status",
];

export function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<{ remove: () => void } | null>(null);
  const mapViewStateRef = useRef<MapViewState | null>(null);
  const trajecten = useAppStore((state) => state.jaarplanTrajecten);
  const measures = useAppStore((state) => state.jaarplanMeasures);
  const metadata = useAppStore((state) => state.jaarplanMetadata);
  const jaarplanLoading = useAppStore((state) => state.jaarplanLoading);
  const jaarplanError = useAppStore((state) => state.jaarplanError);
  const sharedFilters = useAppStore((state) => state.jaarplanFilters);
  const setJaarplanFilters = useAppStore((state) => state.setJaarplanFilters);
  const resetJaarplanFilters = useAppStore((state) => state.resetJaarplanFilters);
  const selectedTrajectId = useAppStore((state) => state.selectedJaarplanTrajectId);
  const zoomTargetGlobalId = useAppStore((state) => state.jaarplanZoomTargetGlobalId);
  const jaarplanMapViewState = useAppStore((state) => state.jaarplanMapViewState);
  const selectJaarplanTraject = useAppStore((state) => state.selectJaarplanTraject);
  const setJaarplanZoomTargetGlobalId = useAppStore(
    (state) => state.setJaarplanZoomTargetGlobalId
  );
  const setJaarplanMapViewState = useAppStore((state) => state.setJaarplanMapViewState);
  const upsertJaarplanMeasure = useAppStore((state) => state.upsertJaarplanMeasure);

  const [mapContext, setMapContext] = useState<JaarplanMapContext | null>(null);
  const [layerItems, setLayerItems] = useState<LayerToggleItem[]>([]);
  const [activeBasemapId, setActiveBasemapId] = useState("light");
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [draftMeasure, setDraftMeasure] = useState<JaarplanMeasureFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectFilterOptions = useMemo(() => {
    return {
      uitvoerderOnderhoud:
        metadata?.uitvoerderOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      regime:
        metadata?.regimeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      werkzaamheid: toSelectOptions(measures.map((measure) => measure.werkzaamheidLabel)),
      werkperiode:
        metadata?.werkperiodeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      zijde:
        metadata?.zijdeOptions.map((option) => ({
          value: option.label,
          label: option.label,
        })) ?? [],
      afvoeren:
        metadata?.afvoerenOptions.map((option) => ({
          value: option.label,
          label: option.label,
        })) ?? [],
      statusMaatregel: arcgisJaarplanService.maatregelStatusOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
      steekproefStatus: arcgisJaarplanService.steekproefStatusOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    };
  }, [measures, metadata]);

  const filteredGroups = useMemo(
    () => getFilteredJaarplanGroups(trajecten, measures, sharedFilters),
    [measures, sharedFilters, trajecten]
  );
  const filteredTrajectIds = useMemo(
    () => filteredGroups.map((group) => group.traject.globalId),
    [filteredGroups]
  );
  const selectedTraject = useMemo(
    () => trajecten.find((traject) => traject.globalId === selectedTrajectId) ?? null,
    [selectedTrajectId, trajecten]
  );
  const selectedMeasures = useMemo(
    () => filteredGroups.find((group) => group.traject.globalId === selectedTrajectId)?.measures ?? [],
    [filteredGroups, selectedTrajectId]
  );
  const activeFilterCount = useMemo(
    () =>
      Object.entries(sharedFilters).filter(([, value]) =>
        typeof value === "boolean" ? value : Boolean(value)
      ).length,
    [sharedFilters]
  );
  const activeLegendLayers = useMemo(
    () =>
      layerItems.filter(
        (layer) =>
          layer.visible &&
          layer.title !== "BOR objectlagen" &&
          layer.title !== "Jaarplan Maatregelen"
      ),
    [layerItems]
  );
  const trajectLayerVisible = activeLegendLayers.some(
    (layer) => layer.title === "Jaarplan Trajecten"
  );
  const trajectStatusById = useMemo(
    () =>
      Object.fromEntries(
        filteredGroups.map((group) => [
          group.traject.globalId,
          getAggregatedMaatregelStatus(group.measures),
        ])
      ),
    [filteredGroups]
  );

  function handleSharedFilterChange<K extends keyof typeof sharedFilters>(
    key: K,
    value: (typeof sharedFilters)[K]
  ) {
    setJaarplanFilters({ [key]: value } as Partial<typeof sharedFilters>);
  }

  useEffect(() => {
    mapViewStateRef.current = jaarplanMapViewState;
  }, [jaarplanMapViewState]);

  useEffect(() => {
    if (!metadata || !mapRef.current) {
      return;
    }

    const metadataSnapshot = metadata;
    let active = true;
    let localContext: JaarplanMapContext | null = null;

    async function initMap() {
      try {
        const createdContext = await arcgisJaarplanService.createHeadlessMap(
          mapRef.current!,
          metadataSnapshot
        );

        if (!active) {
          createdContext.view.destroy();
          return;
        }

        localContext = createdContext;

        if (mapViewStateRef.current) {
          createdContext.view.center = {
            x: mapViewStateRef.current.centerX,
            y: mapViewStateRef.current.centerY,
            spatialReference: {
              wkid:
                mapViewStateRef.current.spatialReferenceWkid ??
                createdContext.view.spatialReference.wkid ??
                undefined,
            },
          };
          createdContext.view.scale = mapViewStateRef.current.scale;
          createdContext.view.rotation = mapViewStateRef.current.rotation;
        }

        setMapContext(createdContext);
        setLayerItems(
          arcgisJaarplanService.extractLayerToggleItems(
            createdContext.layerListViewModel.operationalItems
          )
        );

        const layerWatch = reactiveUtils.watch(
          () =>
            createdContext.layerListViewModel.operationalItems.map(
              (item) => `${item.uid}:${item.visible}`
            ),
          () => {
            setLayerItems(
              arcgisJaarplanService.extractLayerToggleItems(
                createdContext.layerListViewModel.operationalItems
              )
            );
          },
          { initial: true }
        );

        const viewStateWatch = reactiveUtils.watch(
          () => [
            createdContext.view.center?.x,
            createdContext.view.center?.y,
            createdContext.view.scale,
            createdContext.view.rotation,
          ],
          () => {
            const center = createdContext.view.center;
            if (!center) {
              return;
            }

            setJaarplanMapViewState({
              centerX: center.x,
              centerY: center.y,
              zoom: createdContext.view.zoom,
              scale: createdContext.view.scale,
              rotation: createdContext.view.rotation,
              spatialReferenceWkid:
                center.spatialReference?.wkid ??
                createdContext.view.spatialReference.wkid ??
                undefined,
            });
          },
          { initial: true }
        );

        const clickHandle = createdContext.view.on("click", async (event) => {
          const hitTest = await createdContext.view.hitTest(event);
          const trajectHit = hitTest.results.find(
            (result) =>
              "graphic" in result && result.graphic.layer === createdContext.trajectLayer
          );

          if (!trajectHit || !("graphic" in trajectHit)) {
            highlightRef.current?.remove();
            selectJaarplanTraject(null, "map");
            setDrawerOpen(false);
            setAddFormOpen(false);
            setDraftMeasure(null);
            return;
          }

          const globalId = String(trajectHit.graphic.attributes.GlobalID ?? "").trim();
          if (!globalId) {
            return;
          }

          selectJaarplanTraject(globalId, "map");
          setDrawerOpen(true);
          setAddFormOpen(false);
          setDraftMeasure(null);
        });

        return () => {
          layerWatch.remove();
          viewStateWatch.remove();
          clickHandle.remove();
        };
      } catch (mapError) {
        setError(
          mapError instanceof Error
            ? mapError.message
            : "Nieuwe kaart kon niet worden geïnitialiseerd."
        );
      }
    }

    const cleanupPromise = initMap();

    return () => {
      active = false;
      highlightRef.current?.remove();
      void cleanupPromise?.then((cleanup) => cleanup?.());
      localContext?.view.destroy();
    };
  }, [metadata, selectJaarplanTraject, setJaarplanMapViewState]);

  useEffect(() => {
    if (!mapContext?.view) {
      return;
    }

    const currentContext = mapContext;
    let active = true;

    async function syncFilter() {
      const layerView = (await currentContext.view.whenLayerView(
        currentContext.trajectLayer
      )) as FeatureLayerView;

      if (!active) {
        return;
      }

      const matchingTrajecten = trajecten.filter((traject) =>
        filteredTrajectIds.includes(traject.globalId)
      );
      const objectIds = matchingTrajecten
        .map((traject) => traject.objectId)
        .filter((objectId) => Number.isFinite(objectId));

      layerView.filter = objectIds.length
        ? { where: `OBJECTID IN (${objectIds.join(",")})` }
        : { where: "1=0" };
    }

    void syncFilter();

    return () => {
      active = false;
    };
  }, [filteredTrajectIds, mapContext, trajecten]);

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    arcgisJaarplanService.updateTrajectStatusRenderer(
      mapContext.trajectLayer,
      trajectStatusById
    );
  }, [mapContext, trajectStatusById]);

  useEffect(() => {
    if (!mapContext?.view || !selectedTrajectId) {
      highlightRef.current?.remove();
      return;
    }

    const currentContext = mapContext;
    const currentSelectedTrajectId = selectedTrajectId;
    let active = true;

    async function syncSelection() {
      const layerView = (await currentContext.view.whenLayerView(
        currentContext.trajectLayer
      )) as FeatureLayerView;
      const graphic = await arcgisJaarplanService.queryGraphicByGlobalId(
        currentContext.trajectLayer,
        currentSelectedTrajectId
      );

      if (!active || !graphic) {
        return;
      }

      highlightRef.current?.remove();
      highlightRef.current = layerView.highlight(graphic);

      if (zoomTargetGlobalId === currentSelectedTrajectId && graphic.geometry) {
        await currentContext.view.goTo({ target: graphic.geometry }, { duration: 700 });
        setJaarplanZoomTargetGlobalId(null);
      }
    }

    void syncSelection();

    return () => {
      active = false;
    };
  }, [mapContext, selectedTrajectId, setJaarplanZoomTargetGlobalId, zoomTargetGlobalId]);

  useEffect(() => {
    if (selectedTraject) {
      setDrawerOpen(true);
    }
  }, [selectedTraject]);

  function toggleLayer(id: string, visible: boolean) {
    if (!mapContext) {
      return;
    }

    const item = mapContext.layerListViewModel.operationalItems
      .toArray()
      .find((candidate) => candidate.uid === id);

    if (item) {
      item.visible = visible;
    }
  }

  function updateDraftMeasure(field: keyof JaarplanMeasureFormValues, value: string) {
    if (!metadata || !draftMeasure) {
      return;
    }

    const nextValues = {
      ...draftMeasure,
      [field]: value,
    } as JaarplanMeasureFormValues;

    if (field === "regimeValue" || field === "werkzaamhedenValue") {
      setDraftMeasure(
        arcgisJaarplanService.syncSubtypeValues(
          metadata,
          nextValues,
          field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
        )
      );
      return;
    }

    setDraftMeasure(nextValues);
  }

  async function handleCreateMeasure() {
    if (!metadata || !selectedTraject || !draftMeasure) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdMeasure = await arcgisJaarplanService.createMeasure(
        draftMeasure,
        metadata,
        trajecten
      );
      upsertJaarplanMeasure(createdMeasure);
      setAddFormOpen(false);
      setDraftMeasure(arcgisJaarplanService.createDefaultFormValues(metadata, selectedTraject));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Maatregel opslaan is mislukt."
      );
    } finally {
      setSaving(false);
    }
  }

  const draftToelichting = useMemo(() => {
    if (!metadata || !draftMeasure) {
      return "";
    }

    return arcgisJaarplanService.getMeasureToelichtingLabel(
      metadata,
      draftMeasure.regimeValue,
      draftMeasure.toelichtingValue
    );
  }, [draftMeasure, metadata]);

  return (
    <div className="relative h-full min-h-0">
      <div ref={mapRef} className="h-full w-full bg-surfaceAlt" />

      {mapContext ? (
        <>
          <div className="glass-panel absolute left-3 top-20 z-20 rounded-[10px] p-2">
            <Button
              variant={layerPanelOpen ? "secondary" : "outline"}
              className="h-9 w-9 px-0"
              onClick={() => setLayerPanelOpen((current) => !current)}
              aria-label="Kaartlagen"
              title="Kaartlagen"
            >
              <Layers3 className="h-4 w-4" />
            </Button>
          </div>

          {layerPanelOpen ? (
            <div className="glass-panel absolute left-3 top-32 z-20 w-[280px] rounded-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[12px] font-semibold text-text">Kaartlagen</div>
                <Button
                  variant="ghost"
                  className="h-8 w-8 px-0"
                  onClick={() => setLayerPanelOpen(false)}
                  aria-label="Sluit lagenpaneel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {layerItems.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surfaceAlt/80 px-3 py-2"
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
                    <button
                      type="button"
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                        layer.visible
                          ? "bg-accentSoft text-accentStrong"
                          : "bg-surface text-textMuted"
                      }`}
                      onClick={() => toggleLayer(layer.id, !layer.visible)}
                    >
                      {layer.visible ? "Aan" : "Uit"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <BasemapSwitcher
            basemaps={mapContext.basemapOptions}
            activeId={activeBasemapId}
            onSelect={(id) => {
              const basemap = mapContext.basemapOptions.find((option) => option.id === id);
              if (!basemap) {
                return;
              }

              setActiveBasemapId(id);
              mapContext.map.basemap = basemap.basemap;
            }}
          />

          <div className="absolute right-3 top-20 z-20 w-[420px] max-w-[calc(100vw-24px)]">
            <JaarplanFilterPanel
              mode="compact"
              filters={sharedFilters}
              options={selectFilterOptions}
              activeFilterCount={activeFilterCount}
              onFilterChange={handleSharedFilterChange}
              onReset={resetJaarplanFilters}
            />
          </div>

          <div className="glass-panel absolute bottom-3 left-3 z-20 w-[320px] rounded-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accentStrong">
              Actieve lagen
            </div>
            <div className="mt-3 text-[11px] text-textMuted">
              {filteredTrajectIds.length} trajecten zichtbaar op basis van de huidige filters
            </div>
            <div className="mt-3 space-y-2">
              {activeLegendLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-2 rounded-md bg-surfaceAlt/80 px-2 py-1.5"
                >
                  <span className="h-2.5 w-2.5 rounded-[3px] border border-black/5 bg-accentSoft" />
                  <span className="text-[11px] text-textDim">{layer.title}</span>
                </div>
              ))}
            </div>
            {trajectLayerVisible ? (
              <div className="mt-4 border-t border-border/70 pt-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Status traject
                </div>
                <div className="mt-2 grid gap-2">
                  {MAP_STATUS_LEGEND_ORDER.map((status) => {
                    const palette = getMaatregelStatusPalette(status);
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-2 rounded-md bg-surfaceAlt/80 px-2 py-1.5"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: palette.mapColor }}
                        />
                        <span className="text-[11px] text-textDim">{palette.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="glass-panel absolute left-3 top-3 z-20 rounded-card px-3 py-2 text-[12px] text-textDim">
          <div className="flex items-center gap-2">
            {jaarplanError ? (
              <>
                <AlertTriangle className="h-4 w-4 text-danger" />
                Jaarplankaart kon niet laden
              </>
            ) : (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {jaarplanLoading ? "Jaarplankaart laden..." : "Jaarplan initialiseren..."}
              </>
            )}
          </div>
        </div>
      )}

      {error ? (
        <div className="glass-panel absolute bottom-3 right-3 z-20 max-w-md rounded-card px-4 py-3 text-[12px] text-danger">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setAddFormOpen(false);
            setDraftMeasure(null);
          }
        }}
        title={selectedTraject?.trajectCode || "Jaarplan traject"}
      >
        {selectedTraject && metadata ? (
          <div className="space-y-5 p-5">
            <section className="rounded-card border border-border bg-surfaceAlt p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                Traject
              </div>
              <div className="mt-3 grid gap-3 text-[12px] text-text md:grid-cols-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                    Trajectcode
                  </div>
                  <div className="mt-1 font-medium">{selectedTraject.trajectCode || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                    Uitvoerder onderhoud
                  </div>
                  <div className="mt-1">{selectedTraject.uitvoerderOnderhoud || "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    selectJaarplanTraject(selectedTraject.globalId, "table");
                    navigate("/jaarplan");
                  }}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  Open in jaarplan
                </Button>
                <Button
                  type="button"
                  variant={addFormOpen ? "secondary" : "default"}
                  className="px-4 py-2"
                  onClick={() => {
                    setAddFormOpen((current) => !current);
                    setDraftMeasure((current) =>
                      current ??
                      arcgisJaarplanService.createDefaultFormValues(metadata, selectedTraject)
                    );
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Maatregel toevoegen
                </Button>
              </div>
            </section>

            {addFormOpen && draftMeasure ? (
              <section className="rounded-card border border-border bg-white p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Nieuwe maatregel
                </div>
                <MaatregelForm
                  layout="compact"
                  values={draftMeasure}
                  metadata={metadata}
                  steekproefStatusOptions={arcgisJaarplanService.steekproefStatusOptions}
                  toelichtingText={draftToelichting}
                  submitLabel="Maatregel opslaan"
                  saving={saving}
                  onFieldChange={updateDraftMeasure}
                  onSubmit={() => {
                    void handleCreateMeasure();
                  }}
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Geplande maatregelen
                </div>
                <div className="text-[11px] text-textMuted">{selectedMeasures.length} zichtbaar</div>
              </div>

              {!selectedMeasures.length ? (
                <div className="rounded-card border border-border bg-surfaceAlt p-4 text-[12px] text-textDim">
                  Voor dit traject zijn binnen de huidige filters geen maatregelen zichtbaar.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMeasures.map((measure) => (
                    <div
                      key={measure.globalId}
                      className="rounded-card border border-border bg-surfaceAlt/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <RegimeBadge
                              regimeLabel={measure.regimeLabel}
                              regimeNumber={measure.regimeNumber}
                            />
                            <MaatregelStatusBadge
                              status={measure.statusMaatregel}
                              compact
                            />
                            <MeasureSignals measure={measure} />
                          </div>
                          <div className="text-[13px] font-semibold text-text">
                            {measure.werkzaamheidLabel}
                          </div>
                          <div className="text-[11px] leading-5 text-textDim">
                            {measure.toelichtingLabel}
                          </div>
                        </div>
                        <div className="rounded-card border border-border bg-white px-3 py-2 text-right">
                          <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                            Werkperiode
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-text">
                            {formatWerkperiodeLabel(measure)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect.js";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import { AlertTriangle, Layers3, LoaderCircle, MapPinned } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { JaarplanFilterPanel } from "../components/jaarplan/jaarplan-filter-panel";
import { RelatedMeasuresTableEditor } from "../components/jaarplan/related-measures-table-editor";
import { getMaatregelStatusPalette } from "../components/jaarplan/maatregel-badges";
import { BasemapSwitcher } from "../components/map/basemap-switcher";
import { JaarplanAnalysisPanel } from "../components/map/jaarplan-analysis-panel";
import { Button } from "../components/ui/button";
import { Drawer } from "../components/ui/drawer";
import {
  arcgisJaarplanService,
  type JaarplanMapContext,
} from "../services/arcgis-jaarplan-service";
import {
  formatWerkperiodeLabel,
  getAggregatedMaatregelStatus,
  getFilteredJaarplanGroups,
} from "../lib/jaarplan-filtering";
import {
  getMeasuresInTimeWindow,
  getTimeWindowLabel,
  normalizeTimeWindow,
} from "../lib/jaarplan-measure-utils";
import { useAppStore } from "../store/app-store";
import type {
  JaarplanMeasureFormValues,
  JaarplanMeasureRecord,
  JaarplanTimeWindow,
  LayerToggleItem,
  MaatregelStatus,
  MapViewState,
} from "../types/app";

const MAP_STATUS_LEGEND_ORDER: MaatregelStatus[] = [
  "uitgevoerd",
  "deels_uitgevoerd",
  "niet_uitgevoerd",
  "gepland",
  "geen_status",
];

function toSelectOptions(values: string[]) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nl"))
    .map((value) => ({ value, label: value }));
}

function resolvePlanningWindow(
  metadata: ReturnType<typeof useAppStore.getState>["jaarplanMetadata"]
): JaarplanTimeWindow {
  const values = metadata?.werkperiodeOptions.map((option) => option.value) ?? [];
  if (!values.length) {
    return { start: "", end: "" };
  }

  return {
    start: values[0],
    end: values[values.length - 1],
  };
}

function sanitizeSelectionIds(ids: string[]) {
  return [...new Set(ids.map((value) => value.trim()).filter(Boolean))];
}

export function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<{ remove: () => void } | null>(null);
  const mapViewStateRef = useRef<MapViewState | null>(null);
  const drawingSelectionRef = useRef(false);
  const trajectenRef = useRef(useAppStore.getState().jaarplanTrajecten);
  const filteredTrajectIdsRef = useRef<string[]>([]);
  const applySelectionRef = useRef<(ids: string[], zoom?: boolean) => void>(() => undefined);
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
  const removeJaarplanMeasure = useAppStore((state) => state.removeJaarplanMeasure);

  const [mapContext, setMapContext] = useState<JaarplanMapContext | null>(null);
  const [layerItems, setLayerItems] = useState<LayerToggleItem[]>([]);
  const [activeBasemapId, setActiveBasemapId] = useState("light");
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionIds, setSelectionIds] = useState<string[]>([]);
  const [relatedMeasures, setRelatedMeasures] = useState<JaarplanMeasureRecord[]>([]);
  const [relatedMeasuresLoading, setRelatedMeasuresLoading] = useState(false);
  const [relatedMeasuresError, setRelatedMeasuresError] = useState<string | null>(null);
  const [savingNewMeasure, setSavingNewMeasure] = useState(false);
  const [savingMeasureId, setSavingMeasureId] = useState<string | null>(null);
  const [deletingMeasureId, setDeletingMeasureId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<JaarplanTimeWindow>({ start: "", end: "" });

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
  const filteredTrajectIdSet = useMemo(
    () => new Set(filteredTrajectIds),
    [filteredTrajectIds]
  );
  const selectionIdSet = useMemo(() => new Set(selectionIds), [selectionIds]);
  const selectedTrajects = useMemo(
    () => trajecten.filter((traject) => selectionIdSet.has(traject.globalId)),
    [selectionIdSet, trajecten]
  );
  const selectedTraject = useMemo(
    () => (selectionIds.length === 1 ? selectedTrajects[0] ?? null : null),
    [selectedTrajects, selectionIds]
  );
  const selectedMeasures = useMemo(
    () => measures.filter((measure) => selectionIdSet.has(measure.trajectGlobalId)),
    [measures, selectionIdSet]
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
          layer.title !== "Analyse selectie"
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
  const selectionStatusBreakdown = useMemo(
    () =>
      MAP_STATUS_LEGEND_ORDER.map((status) => ({
        status,
        count: selectedMeasures.filter((measure) => measure.statusMaatregel === status).length,
      })).filter((item) => item.count > 0),
    [selectedMeasures]
  );
  const visiblePlanningTrajecten = useMemo(
    () => trajecten.filter((traject) => filteredTrajectIdSet.has(traject.globalId)),
    [filteredTrajectIdSet, trajecten]
  );
  const visiblePlanningMeasures = useMemo(
    () => measures.filter((measure) => filteredTrajectIdSet.has(measure.trajectGlobalId)),
    [filteredTrajectIdSet, measures]
  );
  const planningMeasures = useMemo(
    () =>
      metadata
        ? getMeasuresInTimeWindow(visiblePlanningMeasures, metadata, timeWindow)
        : [],
    [metadata, timeWindow, visiblePlanningMeasures]
  );
  const planningTrajectCount = useMemo(
    () => new Set(planningMeasures.map((measure) => measure.trajectGlobalId)).size,
    [planningMeasures]
  );
  const planningWindowLabel = useMemo(
    () =>
      metadata
        ? getTimeWindowLabel(metadata, timeWindow)
        : "Planningvenster",
    [metadata, timeWindow]
  );

  function handleSharedFilterChange<K extends keyof typeof sharedFilters>(
    key: K,
    value: (typeof sharedFilters)[K]
  ) {
    setJaarplanFilters({ [key]: value } as Partial<typeof sharedFilters>);
  }

  function applySelection(ids: string[], zoom = false) {
    const nextIds = sanitizeSelectionIds(ids).filter((id) =>
      trajecten.some((traject) => traject.globalId === id)
    );

    setSelectionIds(nextIds);

    const singleId = nextIds.length === 1 ? nextIds[0] : null;
    selectJaarplanTraject(singleId, "map");

    if (singleId) {
      setDrawerOpen(true);
      if (zoom) {
        setJaarplanZoomTargetGlobalId(singleId);
      }
    } else {
      setDrawerOpen(false);
      if (zoom) {
        setJaarplanZoomTargetGlobalId(null);
      }
    }
  }

  useEffect(() => {
    applySelectionRef.current = applySelection;
  });

  useEffect(() => {
    trajectenRef.current = trajecten;
  }, [trajecten]);

  useEffect(() => {
    filteredTrajectIdsRef.current = filteredTrajectIds;
  }, [filteredTrajectIds]);

  useEffect(() => {
    mapViewStateRef.current = jaarplanMapViewState;
  }, [jaarplanMapViewState]);

  useEffect(() => {
    if (!metadata) {
      return;
    }

    setTimeWindow((current) => {
      const fallback = resolvePlanningWindow(metadata);
      if (!current.start || !current.end) {
        return fallback;
      }

      return normalizeTimeWindow(metadata, current);
    });
  }, [metadata]);

  useEffect(() => {
    if (selectedTrajectId && (selectionIds.length !== 1 || selectionIds[0] !== selectedTrajectId)) {
      setSelectionIds([selectedTrajectId]);
      setDrawerOpen(true);
    }
  }, [selectedTrajectId, selectionIds]);

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
          if (drawingSelectionRef.current) {
            return;
          }

          const hitTest = await createdContext.view.hitTest(event);
          const trajectHit = hitTest.results.find(
            (result) =>
              "graphic" in result &&
              (result.graphic.layer === createdContext.trajectLayer ||
                result.graphic.layer === createdContext.planningLayer)
          );

          if (!trajectHit || !("graphic" in trajectHit)) {
            highlightRef.current?.remove();
            applySelectionRef.current([]);
            setRelatedMeasures([]);
            return;
          }

          const attributes = trajectHit.graphic.attributes as Record<string, unknown>;
          const globalId = String(
            attributes.trajectGlobalId ?? attributes.GlobalID ?? attributes.guid ?? ""
          ).trim();
          if (!globalId) {
            return;
          }

          applySelectionRef.current([globalId]);
        });

        const createHandle = createdContext.sketchViewModel.on("create", async (event) => {
          if (event.state === "start") {
            drawingSelectionRef.current = true;
            return;
          }

          if (event.state === "complete" && event.graphic?.geometry) {
            const candidateObjectIds = trajectenRef.current
              .filter((traject) => filteredTrajectIdsRef.current.includes(traject.globalId))
              .map((traject) => traject.objectId)
              .filter((objectId) => Number.isFinite(objectId));

            if (!candidateObjectIds.length) {
              applySelectionRef.current([]);
              return;
            }

            const featureSet = await createdContext.trajectLayer.queryFeatures({
              geometry: event.graphic.geometry,
              spatialRelationship: "intersects",
              objectIds: candidateObjectIds,
              outFields: ["GlobalID", "guid"],
              returnGeometry: false,
            });

            const ids = featureSet.features
              .map((feature) =>
                String(feature.attributes.GlobalID ?? feature.attributes.guid ?? "").trim()
              )
              .filter(Boolean);

            applySelectionRef.current(ids);
          }

          if (event.state === "complete" || event.state === "cancel") {
            drawingSelectionRef.current = false;
            createdContext.sketchLayer.removeAll();
          }
        });

        return () => {
          layerWatch.remove();
          viewStateWatch.remove();
          clickHandle.remove();
          createHandle.remove();
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
  }, [metadata, setJaarplanMapViewState]);

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
    if (!mapContext?.view) {
      return;
    }

    const currentContext = mapContext;
    let active = true;

    async function syncSelection() {
      const layerView = (await currentContext.view.whenLayerView(
        currentContext.trajectLayer
      )) as FeatureLayerView;
      layerView.highlightOptions = {
        color: [15, 118, 110, 1],
        haloOpacity: 0.96,
        fillOpacity: 0.2,
      };

      if (!active) {
        return;
      }

      highlightRef.current?.remove();

      const selectedObjectIds = trajecten
        .filter((traject) => selectionIds.includes(traject.globalId))
        .map((traject) => traject.objectId)
        .filter((objectId) => Number.isFinite(objectId));

      if (!selectedObjectIds.length) {
        currentContext.trajectLayer.featureEffect = null;
        return;
      }

      currentContext.trajectLayer.featureEffect = new FeatureEffect({
        filter: new FeatureFilter({
          where: `OBJECTID IN (${selectedObjectIds.join(",")})`,
        }),
        includedEffect:
          "brightness(1.15) saturate(1.15) drop-shadow(0px, 0px, 10px rgba(15, 118, 110, 0.28))",
        excludedEffect: "grayscale(80%) opacity(26%)",
      });

      highlightRef.current = layerView.highlight(selectedObjectIds);

      if (zoomTargetGlobalId && selectionIds.length === 1) {
        const graphic = await arcgisJaarplanService.queryGraphicByGlobalId(
          currentContext.trajectLayer,
          zoomTargetGlobalId
        );

        if (graphic?.geometry) {
          await currentContext.view.goTo({ target: graphic.geometry }, { duration: 700 });
        }

        setJaarplanZoomTargetGlobalId(null);
      }
    }

    void syncSelection();

    return () => {
      active = false;
    };
  }, [
    mapContext,
    selectionIds,
    setJaarplanZoomTargetGlobalId,
    trajecten,
    zoomTargetGlobalId,
  ]);

  useEffect(() => {
    if (!mapContext || !metadata) {
      return;
    }

    arcgisJaarplanService.renderPlanningLayer(
      mapContext.planningLayer,
      visiblePlanningTrajecten,
      visiblePlanningMeasures,
      metadata,
      timeWindow
    );
  }, [mapContext, metadata, timeWindow, visiblePlanningMeasures, visiblePlanningTrajecten]);

  useEffect(() => {
    if (!selectedTraject || !metadata) {
      setRelatedMeasures([]);
      setRelatedMeasuresLoading(false);
      setRelatedMeasuresError(null);
      return;
    }

    let active = true;
    setRelatedMeasuresLoading(true);
    setRelatedMeasuresError(null);

    void arcgisJaarplanService
      .queryRelatedMeasuresForTraject(
        selectedTraject.globalId,
        metadata,
        trajecten,
        mapContext?.trajectLayer
      )
      .then((items) => {
        if (active) {
          setRelatedMeasures(items);
        }
      })
      .catch((loadError) => {
        if (active) {
          setRelatedMeasuresError(
            loadError instanceof Error
              ? loadError.message
              : "Gerelateerde maatregelen konden niet worden geladen."
          );
        }
      })
      .finally(() => {
        if (active) {
          setRelatedMeasuresLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mapContext, metadata, selectedTraject, trajecten]);

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

  function focusTraject(globalId: string) {
    applySelection([globalId], true);
  }

  function startRectangleSelection() {
    if (!mapContext) {
      return;
    }

    setError(null);
    setDrawerOpen(false);
    drawingSelectionRef.current = true;
    mapContext.sketchLayer.removeAll();
    mapContext.sketchViewModel.create("rectangle");
  }

  async function refreshSelectedRelatedMeasures() {
    if (!selectedTraject || !metadata) {
      return;
    }

    const items = await arcgisJaarplanService.queryRelatedMeasuresForTraject(
      selectedTraject.globalId,
      metadata,
      trajecten,
      mapContext?.trajectLayer
    );
    setRelatedMeasures(items);
  }

  async function handleCreateMeasure(values: JaarplanMeasureFormValues) {
    if (!metadata) {
      return;
    }

    setSavingNewMeasure(true);
    setError(null);

    try {
      const createdMeasure = await arcgisJaarplanService.createMeasure(values, metadata, trajecten);
      upsertJaarplanMeasure(createdMeasure);
      await refreshSelectedRelatedMeasures();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Maatregel opslaan is mislukt."
      );
    } finally {
      setSavingNewMeasure(false);
    }
  }

  async function handleSaveMeasure(
    measure: JaarplanMeasureRecord,
    values: JaarplanMeasureFormValues
  ) {
    if (!metadata) {
      return;
    }

    setSavingMeasureId(measure.globalId);
    setError(null);

    try {
      const updatedMeasure = await arcgisJaarplanService.saveMeasure(
        measure.globalId,
        values,
        metadata,
        trajecten
      );
      upsertJaarplanMeasure(updatedMeasure);
      await refreshSelectedRelatedMeasures();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Maatregel bijwerken is mislukt."
      );
    } finally {
      setSavingMeasureId((current) => (current === measure.globalId ? null : current));
    }
  }

  async function handleDeleteMeasure(measure: JaarplanMeasureRecord) {
    if (!metadata) {
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je "${measure.werkzaamheidLabel}" wilt verwijderen van traject ${measure.trajectCode}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingMeasureId(measure.globalId);
    setError(null);

    try {
      await arcgisJaarplanService.deleteMeasure(measure.globalId, metadata);
      removeJaarplanMeasure(measure.globalId);
      await refreshSelectedRelatedMeasures();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Maatregel verwijderen is mislukt."
      );
    } finally {
      setDeletingMeasureId((current) => (current === measure.globalId ? null : current));
    }
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#eef2f4]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(41, 182, 194, 0.14), transparent 28%), radial-gradient(circle at 100% 100%, rgba(14, 116, 144, 0.1), transparent 26%)",
        }}
      />
      <div ref={mapRef} className="h-full w-full bg-surfaceAlt" />

      {mapContext ? (
        <>
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

          <JaarplanAnalysisPanel
            filteredTrajectCount={filteredTrajectIds.length}
            selectedTrajects={selectedTrajects}
            selectedMeasureCount={selectedMeasures.length}
            planningTrajectCount={planningTrajectCount}
            planningMeasureCount={planningMeasures.length}
            timeWindow={timeWindow}
            timeWindowLabel={planningWindowLabel}
            werkperiodeOptions={
              metadata?.werkperiodeOptions.map((option) => ({
                value: option.value,
                label: option.label,
              })) ?? []
            }
            statusBreakdown={selectionStatusBreakdown}
            onTimeWindowChange={(partial) => {
              if (!metadata) {
                return;
              }

              setTimeWindow((current) =>
                normalizeTimeWindow(metadata, { ...current, ...partial })
              );
            }}
            onResetTimeWindow={() => {
              if (metadata) {
                setTimeWindow(resolvePlanningWindow(metadata));
              }
            }}
            onStartRectangleSelection={startRectangleSelection}
            onSelectFiltered={() => applySelection(filteredTrajectIds)}
            onClearSelection={() => applySelection([])}
            onFocusTraject={focusTraject}
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

          <div className="glass-panel absolute bottom-3 left-3 z-20 w-[360px] rounded-[22px] border border-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accentStrong">
                  Kaartlagen
                </div>
                <div className="mt-1 text-[12px] leading-5 text-textDim">
                  {filteredTrajectIds.length} trajecten zichtbaar binnen de huidige filterset.
                </div>
              </div>
              <Button
                variant={layerPanelOpen ? "secondary" : "outline"}
                onClick={() => setLayerPanelOpen((current) => !current)}
              >
                <Layers3 className="h-3.5 w-3.5" />
                {layerPanelOpen ? "Verberg" : "Toon"}
              </Button>
            </div>

            {layerPanelOpen ? (
              <div className="mt-4 space-y-2">
                {layerItems.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-3 rounded-[16px] border border-border bg-surfaceAlt/80 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-accentSoft text-accentStrong">
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
            ) : (
              <div className="mt-4 space-y-2">
                {activeLegendLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-2 rounded-[14px] bg-surfaceAlt/80 px-3 py-2"
                  >
                    <span className="h-2.5 w-2.5 rounded-[3px] border border-black/5 bg-accentSoft" />
                    <span className="text-[11px] text-textDim">{layer.title}</span>
                  </div>
                ))}
              </div>
            )}

            {trajectLayerVisible ? (
              <div className="mt-4 border-t border-border/70 pt-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Status traject
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {MAP_STATUS_LEGEND_ORDER.map((status) => {
                    const palette = getMaatregelStatusPalette(status);
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-2 rounded-[14px] bg-surfaceAlt/80 px-3 py-2"
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
        <div className="glass-panel absolute bottom-3 right-3 z-20 max-w-md rounded-[18px] px-4 py-3 text-[12px] text-danger">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedTraject?.trajectCode || "Trajectdetails"}
        description={
          selectedTraject
            ? "Gerelateerde maatregelen via relationship query, hosted table edits en planningsoverlay."
            : undefined
        }
        className="md:max-w-[560px]"
      >
        {selectedTraject && metadata ? (
          <div className="space-y-5 p-5">
            <section className="rounded-[18px] border border-border bg-surfaceAlt p-4">
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
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                    Relaties geladen
                  </div>
                  <div className="mt-1">{relatedMeasures.length} maatregelen</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                    Planningvenster
                  </div>
                  <div className="mt-1">{planningWindowLabel}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
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
                  variant="outline"
                  onClick={() => focusTraject(selectedTraject.globalId)}
                >
                  Focus op kaart
                </Button>
              </div>
            </section>

            {relatedMeasuresError ? (
              <section className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
                {relatedMeasuresError}
              </section>
            ) : null}

            <RelatedMeasuresTableEditor
              traject={selectedTraject}
              measures={relatedMeasures}
              metadata={metadata}
              loading={relatedMeasuresLoading}
              editable={metadata.editable}
              savingNew={savingNewMeasure}
              savingMeasureId={savingMeasureId}
              deletingMeasureId={deletingMeasureId}
              onCreate={(values) => {
                void handleCreateMeasure(values);
              }}
              onSave={(measure, values) => {
                void handleSaveMeasure(measure, values);
              }}
              onDelete={(measure) => {
                void handleDeleteMeasure(measure);
              }}
            />

            {relatedMeasures.length ? (
              <section className="rounded-[18px] border border-border bg-surfaceAlt px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Periode-overzicht
                </div>
                <div className="mt-3 grid gap-2">
                  {relatedMeasures.slice(0, 4).map((measure) => (
                    <div
                      key={measure.globalId}
                      className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-2"
                    >
                      <div>
                        <div className="text-[12px] font-medium text-text">
                          {measure.werkzaamheidLabel}
                        </div>
                        <div className="text-[11px] text-textDim">
                          {formatWerkperiodeLabel(measure)}
                        </div>
                      </div>
                      <div
                        className="rounded-pill px-2 py-1 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${getMaatregelStatusPalette(measure.statusMaatregel).mapColor}1A`,
                          color: getMaatregelStatusPalette(measure.statusMaatregel).mapColor,
                        }}
                      >
                        {getMaatregelStatusPalette(measure.statusMaatregel).label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

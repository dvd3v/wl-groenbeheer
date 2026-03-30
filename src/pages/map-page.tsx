import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiAssistantOverlay } from "../components/map/ai-assistant-overlay";
import { AttributeDrawer } from "../components/map/attribute-drawer";
import { BasemapSwitcher } from "../components/map/basemap-switcher";
import { MapSidebar } from "../components/map/map-sidebar";
import { MapToolbar } from "../components/map/map-toolbar";
import { mockPlanningService } from "../services/mock-planning-service";
import {
  arcgisTrajectService,
  type HeadlessMapContext,
} from "../services/arcgis-traject-service";
import { useAppStore } from "../store/app-store";
import type {
  AttributeFormValues,
  LayerToggleItem,
  LegendItem,
  PlanningRegistration,
  TrajectRecord,
} from "../types/app";

function toFormValues(traject: TrajectRecord | null, statusFallback: number): AttributeFormValues {
  return {
    hoofdobjec: traject?.hoofdobjec ?? "",
    status: traject?.status ?? statusFallback,
    opmerking: traject?.opmerking ?? "",
  };
}

export function MapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<{ remove: () => void } | null>(null);
  const trajectByGlobalIdRef = useRef<Map<string, TrajectRecord>>(new Map());
  const mapViewStateRef = useRef<typeof mapViewState>(null);
  const layerVisibilityRef = useRef<Record<string, boolean>>({});
  const trajecten = useAppStore((state) => state.trajecten);
  const planningItems = useAppStore((state) => state.planningItems);
  const initialStatusByGlobalId = useAppStore((state) => state.initialStatusByGlobalId);
  const selectedGlobalId = useAppStore((state) => state.selectedGlobalId);
  const selectedTraject = useAppStore((state) =>
    state.trajecten.find((traject) => traject.globalId === state.selectedGlobalId) ?? null
  );
  const attributeDrawerOpen = useAppStore((state) => state.attributeDrawerOpen);
  const pendingGeometryEdits = useAppStore((state) => state.pendingGeometryEdits);
  const zoomTargetGlobalId = useAppStore((state) => state.zoomTargetGlobalId);
  const mapViewState = useAppStore((state) => state.mapViewState);
  const layerVisibilityByTitle = useAppStore((state) => state.layerVisibilityByTitle);
  const selectTraject = useAppStore((state) => state.selectTraject);
  const setAttributeDrawerOpen = useAppStore((state) => state.setAttributeDrawerOpen);
  const setEditingMode = useAppStore((state) => state.setEditingMode);
  const setPendingGeometryEdits = useAppStore((state) => state.setPendingGeometryEdits);
  const setZoomTargetGlobalId = useAppStore((state) => state.setZoomTargetGlobalId);
  const setMapViewState = useAppStore((state) => state.setMapViewState);
  const setLayerVisibility = useAppStore((state) => state.setLayerVisibility);
  const upsertTraject = useAppStore((state) => state.upsertTraject);
  const updatePlanningItem = useAppStore((state) => state.updatePlanningItem);
  const [mapContext, setMapContext] = useState<HeadlessMapContext | null>(null);
  const [layerItems, setLayerItems] = useState<LayerToggleItem[]>([]);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [activeBasemapId, setActiveBasemapId] = useState("light");
  const [draftValues, setDraftValues] = useState<AttributeFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const countsByStatus = useMemo(
    () =>
      trajecten.reduce<Record<number, number>>((acc, traject) => {
        const status = Number(traject.status);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {}),
    [trajecten]
  );

  const defaultFormValues = useMemo(
    () => ({
      hoofdobjec: draftValues?.hoofdobjec || selectedTraject?.hoofdobjec || "",
      status:
        draftValues?.status ??
        selectedTraject?.status ??
        mapContext?.statusOptions[0]?.value ??
        1,
      opmerking: draftValues?.opmerking ?? selectedTraject?.opmerking ?? "",
    }),
    [draftValues, mapContext, selectedTraject]
  );
  useEffect(() => {
    trajectByGlobalIdRef.current = new Map(
      trajecten.map((traject) => [traject.globalId, traject])
    );
  }, [trajecten]);

  useEffect(() => {
    mapViewStateRef.current = mapViewState;
  }, [mapViewState]);

  useEffect(() => {
    layerVisibilityRef.current = layerVisibilityByTitle;
  }, [layerVisibilityByTitle]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let active = true;
    let localContext: HeadlessMapContext | null = null;

    async function initMap() {
      try {
        const createdContext = await arcgisTrajectService.createHeadlessMap(mapRef.current!);

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

        createdContext.layerListViewModel.operationalItems.forEach((item) => {
          const savedVisibility = layerVisibilityRef.current[item.title];
          if (typeof savedVisibility === "boolean") {
            item.visible = savedVisibility;
          }
        });

        setMapContext(createdContext);
        setLayerItems(
          arcgisTrajectService.extractLayerToggleItems(
            createdContext.layerListViewModel.operationalItems
          )
        );
        setLegendItems(
          arcgisTrajectService.extractLegendItems(createdContext.legendViewModel)
        );

        const layerWatch = reactiveUtils.watch(
          () =>
            createdContext.layerListViewModel.operationalItems.map(
              (item) => `${item.uid}:${item.visible}`
            ),
          () => {
            setLayerItems(
              arcgisTrajectService.extractLayerToggleItems(
                createdContext.layerListViewModel.operationalItems
              )
            );
          },
          { initial: true }
        );

        const legendCollectionHandle = createdContext.legendViewModel.activeLayerInfos.on(
          "change",
          () => {
            setLegendItems(
              arcgisTrajectService.extractLegendItems(createdContext.legendViewModel)
            );
          }
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

            setMapViewState({
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

        const mapClickHandle = createdContext.view.on("click", async (event) => {
          const hitTest = await createdContext.view.hitTest(event);
          const trajectHit = hitTest.results.find(
            (result) =>
              "graphic" in result && result.graphic.layer === createdContext.trajectLayer
          );

          if (!trajectHit || !("graphic" in trajectHit)) {
            highlightRef.current?.remove();
            setZoomTargetGlobalId(null);
            selectTraject(null, "map");
            setDraftValues(null);
            setAttributeDrawerOpen(false);
            setEditingMode("idle");
            return;
          }

          const globalId = String(trajectHit.graphic.attributes.GlobalID ?? "");
          if (!globalId) {
            return;
          }

          const storedTraject = trajectByGlobalIdRef.current.get(globalId);
          setDraftValues({
            hoofdobjec:
              storedTraject?.hoofdobjec ??
              String(
                trajectHit.graphic.attributes.hoofdobjec ??
                trajectHit.graphic.attributes.hoofdobject ??
                ""
              ),
            status: storedTraject?.status ?? Number(trajectHit.graphic.attributes.Status ?? 1),
            opmerking:
              storedTraject?.opmerking ??
              String(trajectHit.graphic.attributes.Opmerking ?? ""),
          });
          setZoomTargetGlobalId(null);
          selectTraject(globalId, "map");
          setAttributeDrawerOpen(true);
          setEditingMode("attributes");
        });

        const createHandle = createdContext.sketchViewModel.on("create", (event) => {
          const createdGraphic = event.graphic;

          if (event.state === "complete" && createdGraphic?.geometry) {
            setPendingGeometryEdits({
              mode: "create",
              geometry: createdGraphic.geometry,
            });
            setDraftValues(
              toFormValues(null, createdContext.statusOptions[0]?.value ?? 1)
            );
            setEditingMode("attributes");
            setAttributeDrawerOpen(true);
          }

          if (event.state === "complete") {
            createdContext.sketchLayer.removeAll();
          }
        });

        const updateHandle = createdContext.sketchViewModel.on("update", (event) => {
          if (event.state === "complete" && event.graphics[0]?.geometry) {
            setPendingGeometryEdits({
              mode: "reshape",
              geometry: event.graphics[0].geometry,
            });
            setEditingMode("attributes");
            setAttributeDrawerOpen(true);
          }

          if (event.state === "complete" || event.aborted) {
            createdContext.sketchLayer.removeAll();
          }
        });

        return () => {
          layerWatch.remove();
          legendCollectionHandle.remove();
          viewStateWatch.remove();
          mapClickHandle.remove();
          createHandle.remove();
          updateHandle.remove();
        };
      } catch (mapError) {
        setError(
          mapError instanceof Error
            ? mapError.message
            : "Kaart kon niet worden geïnitialiseerd."
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
  }, [
    selectTraject,
    setAttributeDrawerOpen,
    setEditingMode,
    setPendingGeometryEdits,
    setZoomTargetGlobalId,
    setMapViewState,
    setLayerVisibility,
  ]);

  useEffect(() => {
    if (!mapContext?.view || !selectedGlobalId) {
      highlightRef.current?.remove();
      return;
    }

    let active = true;
    const currentContext = mapContext;
    const currentGlobalId = selectedGlobalId;

    async function syncSelection() {
      const layerView = (await currentContext.view.whenLayerView(
        currentContext.trajectLayer
      )) as FeatureLayerView;
      const graphic = await arcgisTrajectService.queryGraphicByGlobalId(
        currentContext.trajectLayer,
        currentGlobalId
      );

      if (!active || !graphic) {
        return;
      }

      highlightRef.current?.remove();
      highlightRef.current = layerView.highlight(graphic);

      if (zoomTargetGlobalId === currentGlobalId && graphic.geometry) {
        await currentContext.view.goTo(
          { target: graphic.geometry },
          { duration: 700 }
        );
        setZoomTargetGlobalId(null);
      }
    }

    void syncSelection();

    return () => {
      active = false;
    };
  }, [mapContext, selectedGlobalId, setZoomTargetGlobalId, zoomTargetGlobalId]);

  async function handleSave(values: AttributeFormValues) {
    if (!mapContext) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const preservedCenter = mapContext.view.center?.clone() ?? null;
      const preservedZoom = mapContext.view.zoom;
      const preservedRotation = mapContext.view.rotation;
      setZoomTargetGlobalId(null);

      if (pendingGeometryEdits?.mode === "create") {
        const createdSpatial = await arcgisTrajectService.saveNewTraject(
          mapContext.trajectLayer,
          pendingGeometryEdits.geometry,
          values
        );
        upsertTraject(createdSpatial);
        selectTraject(createdSpatial.globalId, "map");
      } else if (selectedTraject) {
        const updatedSpatial = await arcgisTrajectService.updateTraject(
          mapContext.trajectLayer,
          selectedTraject,
          values,
          pendingGeometryEdits?.geometry
        );
        upsertTraject(updatedSpatial);
        setDraftValues({
          hoofdobjec: updatedSpatial.hoofdobjec,
          status: updatedSpatial.status,
          opmerking: updatedSpatial.opmerking,
        });
      }

      if (preservedCenter) {
        mapContext.view.center = preservedCenter;
      }
      if (typeof preservedZoom === "number") {
        mapContext.view.zoom = preservedZoom;
      }
      if (typeof preservedRotation === "number") {
        mapContext.view.rotation = preservedRotation;
      }

      setDraftValues(null);
      setPendingGeometryEdits(null);
      setEditingMode("idle");
      setAttributeDrawerOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanningUpdate(
    workId: string,
    updates: Partial<Omit<PlanningRegistration, "workId">>
  ) {
    const registration = await mockPlanningService.saveRegistration(workId, updates);
    updatePlanningItem(workId, registration);
  }

  async function startReshape() {
    if (!mapContext || !selectedTraject) {
      return;
    }

    const graphic = await arcgisTrajectService.queryGraphicByGlobalId(
      mapContext.trajectLayer,
      selectedTraject.globalId
    );

    if (!graphic) {
      setError("Geselecteerd traject kon niet worden gevonden voor shape-editing.");
      return;
    }

    mapContext.sketchLayer.removeAll();
    const editableGraphic = graphic.clone();
    mapContext.sketchLayer.add(editableGraphic);
    setEditingMode("reshape");
    setAttributeDrawerOpen(false);
    mapContext.sketchViewModel.update([editableGraphic], { tool: "reshape" });
  }

  function startCreate() {
    if (!mapContext) {
      return;
    }

    setDraftValues(null);
    selectTraject(null, "map");
    setPendingGeometryEdits(null);
    setEditingMode("create");
    setAttributeDrawerOpen(false);
    mapContext.sketchViewModel.create("polygon");
  }

  function toggleLayer(id: string, visible: boolean) {
    if (!mapContext) {
      return;
    }

    const item = mapContext.layerListViewModel.operationalItems
      .toArray()
      .find((candidate) => candidate.uid === id);

    if (item) {
      item.visible = visible;
      setLayerVisibility(item.title, visible);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <MapSidebar
        layers={layerItems}
        legend={legendItems}
        onToggleLayer={toggleLayer}
        countsByStatus={countsByStatus}
        totalTrajecten={trajecten.length}
      />

      <section className="relative min-h-0 flex-1">
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
            <MapToolbar
              disabledEdit={!selectedTraject}
              onAddTraject={startCreate}
              onEditShape={() => {
                void startReshape();
              }}
            />
            <AiAssistantOverlay view={mapContext.view} />
          </>
        ) : (
          <div className="glass-panel absolute left-3 top-3 z-20 rounded-card px-3 py-2 text-[12px] text-textDim">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Kaart laden...
            </div>
          </div>
        )}

        {error ? (
          <div className="glass-panel absolute bottom-3 left-3 z-20 max-w-md rounded-card px-4 py-3 text-[12px] text-danger">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <AttributeDrawer
          open={attributeDrawerOpen}
          onOpenChange={(open) => {
            setAttributeDrawerOpen(open);
            if (!open && pendingGeometryEdits?.mode === "create") {
              setDraftValues(null);
              setPendingGeometryEdits(null);
              setEditingMode("idle");
            }
          }}
          selectedTraject={selectedTraject}
          defaultValues={defaultFormValues}
          statusOptions={mapContext?.statusOptions ?? []}
          planningItems={planningItems}
          saving={saving}
          onSubmit={handleSave}
          onPlanningUpdate={handlePlanningUpdate}
        />
      </section>
    </div>
  );
}

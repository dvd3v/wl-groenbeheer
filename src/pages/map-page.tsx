import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import type { ViewHitTestResult } from "@arcgis/core/views/types.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import { AlertTriangle, Layers3, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiAssistantOverlay } from "../components/map/ai-assistant-overlay";
import { AttributeDrawer } from "../components/map/attribute-drawer";
import { BasemapSwitcher } from "../components/map/basemap-switcher";
import { MapSidebar } from "../components/map/map-sidebar";
import { MapToolbar } from "../components/map/map-toolbar";
import { Button } from "../components/ui/button";
import { mockPlanningService } from "../services/mock-planning-service";
import {
  arcgisTrajectService,
  type HeadlessMapContext,
} from "../services/arcgis-traject-service";
import { useAppStore } from "../store/app-store";
import type {
  AttributeFormValues,
  BorFeatureSelection,
  LayerToggleItem,
  LegendItem,
  PlanningRegistration,
  StatusOption,
  TrajectRendererMode,
  TrajectRecord,
} from "../types/app";

const BRONLAAG_OPTIONS = [
  "terreindeel",
  "waterobject",
  "groenobject",
  "verhardingsobject",
] as const;

const BRONLAAG_ALIASES: Record<string, string> = {
  terreindeel: "terreindeel",
  terreindelen: "terreindeel",
  waterobject: "waterobject",
  waterobjecten: "waterobject",
  groenobject: "groenobject",
  groenobjecten: "groenobject",
  verhardingsobject: "verhardingsobject",
  verhardingsobjecten: "verhardingsobject",
};

interface MapTrajectFilters {
  objectCountMax: number;
  typeCoderingen: string[];
  statuses: number[];
  bronlagen: string[];
  onlyNewGeometry: boolean;
}

const DEFAULT_MAP_FILTERS: MapTrajectFilters = {
  objectCountMax: 160,
  typeCoderingen: [],
  statuses: [],
  bronlagen: [],
  onlyNewGeometry: false,
};

function toggleInList<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function quoteSql(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeBronlaag(value: string): string {
  return BRONLAAG_ALIASES[value.trim().toLowerCase()] ?? value.trim().toLowerCase();
}

function parseBronlagen(value: string): string[] {
  return value
    .split(",")
    .map((item) => normalizeBronlaag(item))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nl"));
}

function isNewTrajectGeometry(traject: TrajectRecord): boolean {
  return !traject.guid.trim();
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function toTrajectGlobalId(attributes: Record<string, unknown>): string {
  const guid = String(attributes.guid ?? "").trim();
  if (guid) {
    return guid;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function toAttributeLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatAttributeValue(item)).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toBorFeatureSelection(
  result: ViewHitTestResult["results"][number]
): BorFeatureSelection | null {
  if (!("graphic" in result)) {
    return null;
  }

  const layer = result.graphic.layer;
  if (!layer || layer.type !== "feature") {
    return null;
  }

  const attributes = Object.entries(result.graphic.attributes ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: toAttributeLabel(key),
      value: formatAttributeValue(value),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "nl"));

  const objectIdAttribute =
    attributes.find((attribute) => attribute.key.toUpperCase() === "OBJECTID")?.value ?? "";

  return {
    layerId: layer.uid,
    layerTitle: layer.title || "BOR object",
    displayTitle: objectIdAttribute
      ? `${layer.title || "BOR object"} ${objectIdAttribute}`
      : layer.title || "BOR object",
    attributes,
  };
}

function toFormValues(traject: TrajectRecord | null, statusFallback: number): AttributeFormValues {
  return {
    trajectCode: traject?.trajectCode ?? "",
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
  const rendererModeRef = useRef<TrajectRendererMode>("status");
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
  const removeTraject = useAppStore((state) => state.removeTraject);
  const updatePlanningItem = useAppStore((state) => state.updatePlanningItem);
  const [mapContext, setMapContext] = useState<HeadlessMapContext | null>(null);
  const [layerItems, setLayerItems] = useState<LayerToggleItem[]>([]);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [activeBasemapId, setActiveBasemapId] = useState("light");
  const [rendererMode, setRendererMode] = useState<TrajectRendererMode>("status");
  const [mapFilters, setMapFilters] = useState<MapTrajectFilters>(DEFAULT_MAP_FILTERS);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [selectedBorFeature, setSelectedBorFeature] = useState<BorFeatureSelection | null>(null);
  const [draftValues, setDraftValues] = useState<AttributeFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const availableTypeCoderingen = useMemo(
    () =>
      [...new Set(trajecten.map((traject) => traject.typeCodering).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, "nl")),
    [trajecten]
  );

  const statusOptions = useMemo<StatusOption[]>(
    () => mapContext?.statusOptions ?? [],
    [mapContext]
  );

  const filteredTrajecten = useMemo(
    () =>
      trajecten.filter((traject) => {
        const matchesObjectCount =
          traject.objectCount === null || traject.objectCount <= mapFilters.objectCountMax;
        const matchesTypeCodering =
          mapFilters.typeCoderingen.length === 0 ||
          mapFilters.typeCoderingen.includes(traject.typeCodering);
        const matchesStatus =
          mapFilters.statuses.length === 0 || mapFilters.statuses.includes(traject.status);
        const bronlagen = parseBronlagen(traject.bronlagen);
        const selectedBronlagen = [...mapFilters.bronlagen]
          .map((value) => normalizeBronlaag(value))
          .sort((left, right) => left.localeCompare(right, "nl"));
        const matchesBronlagen =
          mapFilters.bronlagen.length === 0 ||
          arraysEqual(bronlagen, selectedBronlagen);
        const matchesNewGeometry =
          !mapFilters.onlyNewGeometry || isNewTrajectGeometry(traject);

        return (
          matchesObjectCount &&
          matchesTypeCodering &&
          matchesStatus &&
          matchesBronlagen &&
          matchesNewGeometry
        );
      }),
    [mapFilters, trajecten]
  );

  const countsByStatus = useMemo(
    () =>
      filteredTrajecten.reduce<Record<number, number>>((acc, traject) => {
        const status = Number(traject.status);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {}),
    [filteredTrajecten]
  );

  const defaultFormValues = useMemo(
    () => ({
      trajectCode: draftValues?.trajectCode || selectedTraject?.trajectCode || "",
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
    rendererModeRef.current = rendererMode;
  }, [rendererMode]);

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
          arcgisTrajectService.extractLegendItems(createdContext.legendViewModel, {
            rendererMode,
            trajectLayerId: createdContext.trajectLayer.uid,
            statusOptions: createdContext.statusOptions,
            modelTypeOptions: createdContext.modelTypeOptions,
          })
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
              arcgisTrajectService.extractLegendItems(createdContext.legendViewModel, {
                rendererMode: rendererModeRef.current,
                trajectLayerId: createdContext.trajectLayer.uid,
                statusOptions: createdContext.statusOptions,
                modelTypeOptions: createdContext.modelTypeOptions,
              })
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
            const borHit = hitTest.results.find((result) => {
              if (!("graphic" in result)) {
                return false;
              }

              const layer = result.graphic.layer;
              return layer?.type === "feature" && layer !== createdContext.trajectLayer;
            });

            if (borHit) {
              const borFeature = toBorFeatureSelection(borHit);

              if (borFeature) {
                highlightRef.current?.remove();
                setZoomTargetGlobalId(null);
                selectTraject(null, "map");
                setDraftValues(null);
                setSelectedBorFeature(borFeature);
                setAttributeDrawerOpen(true);
                setEditingMode("idle");
                return;
              }
            }

            highlightRef.current?.remove();
            setZoomTargetGlobalId(null);
            selectTraject(null, "map");
            setDraftValues(null);
            setSelectedBorFeature(null);
            setAttributeDrawerOpen(false);
            setEditingMode("idle");
            return;
          }

          setSelectedBorFeature(null);
          const globalId = toTrajectGlobalId(
            trajectHit.graphic.attributes as Record<string, unknown>
          );
          if (!globalId) {
            return;
          }

          const storedTraject = trajectByGlobalIdRef.current.get(globalId);
          setDraftValues({
            trajectCode:
              storedTraject?.trajectCode ??
              String(trajectHit.graphic.attributes.traject_code ?? ""),
            status: storedTraject?.status ?? Number(trajectHit.graphic.attributes.status ?? 1),
            opmerking:
              storedTraject?.opmerking ??
              String(trajectHit.graphic.attributes.opmerking ?? ""),
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
            setSelectedBorFeature(null);
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
            setSelectedBorFeature(null);
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

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    const currentContext = mapContext;
    let active = true;

    async function syncRenderer() {
      await arcgisTrajectService.setTrajectRenderer(
        currentContext.trajectLayer,
        rendererMode,
        currentContext.modelTypeOptions
      );

      if (!active) {
        return;
      }

      setLegendItems(
        arcgisTrajectService.extractLegendItems(currentContext.legendViewModel, {
          rendererMode,
          trajectLayerId: currentContext.trajectLayer.uid,
          statusOptions: currentContext.statusOptions,
          modelTypeOptions: currentContext.modelTypeOptions,
        })
      );
    }

    void syncRenderer();

    return () => {
      active = false;
    };
  }, [mapContext, rendererMode]);

  useEffect(() => {
    if (!mapContext) {
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

      const objectIds = filteredTrajecten
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
  }, [filteredTrajecten, mapContext]);

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
          trajectCode: updatedSpatial.trajectCode,
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

  async function handleDeleteTraject() {
    if (!mapContext || !selectedTraject) {
      return;
    }

    if (!isNewTrajectGeometry(selectedTraject)) {
      setError("Alleen nieuw ingetekende geometrieën mogen worden verwijderd.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await arcgisTrajectService.deleteTraject(mapContext.trajectLayer, selectedTraject);
      highlightRef.current?.remove();
      removeTraject(selectedTraject.globalId);
      setSelectedBorFeature(null);
      setDraftValues(null);
      setPendingGeometryEdits(null);
      setZoomTargetGlobalId(null);
      setEditingMode("idle");
      setAttributeDrawerOpen(false);
      selectTraject(null, "map");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Verwijderen is mislukt."
      );
    } finally {
      setDeleting(false);
    }
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
        countsByStatus={countsByStatus}
        totalTrajecten={filteredTrajecten.length}
        objectCountMax={mapFilters.objectCountMax}
        availableTypeCoderingen={availableTypeCoderingen}
        statusOptions={statusOptions}
        selectedTypeCoderingen={mapFilters.typeCoderingen}
        selectedStatuses={mapFilters.statuses}
        selectedBronlagen={mapFilters.bronlagen}
        onlyNewGeometry={mapFilters.onlyNewGeometry}
        onObjectCountMaxChange={(value) =>
          setMapFilters((current) => ({
            ...current,
            objectCountMax: value,
          }))
        }
        onToggleTypeCodering={(value) =>
          setMapFilters((current) => ({
            ...current,
            typeCoderingen: toggleInList(current.typeCoderingen, value).sort((left, right) =>
              left.localeCompare(right, "nl")
            ),
          }))
        }
        onToggleStatus={(value) =>
          setMapFilters((current) => ({
            ...current,
            statuses: toggleInList(current.statuses, value).sort((left, right) => left - right),
          }))
        }
        onToggleBronlaag={(value) =>
          setMapFilters((current) => ({
            ...current,
            bronlagen: toggleInList(current.bronlagen, value),
          }))
        }
        onToggleOnlyNewGeometry={() =>
          setMapFilters((current) => ({
            ...current,
            onlyNewGeometry: !current.onlyNewGeometry,
          }))
        }
        onClearFilters={() => setMapFilters(DEFAULT_MAP_FILTERS)}
      />

      <section className="relative min-h-0 flex-1">
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
              <div className="glass-panel absolute left-3 top-32 z-20 w-[260px] rounded-card p-3">
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
            <MapToolbar
              disabledEdit={!selectedTraject}
              rendererMode={rendererMode}
              onAddTraject={startCreate}
              onEditShape={() => {
                void startReshape();
              }}
              onRendererModeChange={setRendererMode}
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
            if (!open) {
              setSelectedBorFeature(null);
            }
            if (!open && pendingGeometryEdits?.mode === "create") {
              setDraftValues(null);
              setPendingGeometryEdits(null);
              setEditingMode("idle");
            }
          }}
          selectedTraject={selectedTraject}
          selectedBorFeature={selectedBorFeature}
          defaultValues={defaultFormValues}
          statusOptions={mapContext?.statusOptions ?? []}
          planningItems={planningItems}
          saving={saving}
          deleting={deleting}
          onSubmit={handleSave}
          onDeleteTraject={handleDeleteTraject}
          onPlanningUpdate={handlePlanningUpdate}
        />
      </section>
    </div>
  );
}

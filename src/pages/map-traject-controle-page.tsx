import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import type Graphic from "@arcgis/core/Graphic.js";
import type { GeometryWithoutMeshUnion } from "@arcgis/core/geometry/types.js";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect.js";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter.js";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import type { ViewHitTestResult } from "@arcgis/core/views/types.js";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiAssistantOverlay } from "../components/map/ai-assistant-overlay";
import { BasemapSwitcher } from "../components/map/basemap-switcher";
import { MapSidebar } from "../components/map/map-sidebar";
import { MapToolbar } from "../components/map/map-toolbar";
import { TrajectReviewPanel } from "../components/map/traject-review-panel";
import { BulkMeasurePlanningPanel } from "../components/traject/bulk-measure-planning-panel";
import { BulkTrajectEditPanel } from "../components/traject/bulk-traject-edit-panel";
import { Button } from "../components/ui/button";
import { arcgisJaarplanService } from "../services/arcgis-jaarplan-service";
import {
  arcgisTrajectService,
  type HeadlessMapContext,
} from "../services/arcgis-traject-service";
import {
  buildTrajectReview,
  createOverlapDiagnosticsGraphics,
  createTrajectSelectionGraphics,
  type TrajectReviewSummary,
} from "../services/traject-review-service";
import { useAppStore } from "../store/app-store";
import type {
  AttributeFormValues,
  BulkTrajectUpdateFields,
  JaarplanMeasureFormValues,
  LayerToggleItem,
  LegendItem,
  PendingGeometryEdits,
  StatusOption,
  TrajectRendererMode,
  TrajectRecord,
} from "../types/app";

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

interface TrajectSelectionChoice {
  globalId: string;
  trajectCode: string;
  status: number;
  shapeArea: number | null;
  left: number;
  top: number;
}

interface BorPopupAttribute {
  key: string;
  label: string;
  value: string;
}

interface BorPopupState {
  layerTitle: string;
  displayTitle: string;
  left: number;
  top: number;
  primaryAttributes: BorPopupAttribute[];
  secondaryAttributes: BorPopupAttribute[];
}

const DEFAULT_MAP_FILTERS: MapTrajectFilters = {
  objectCountMax: 160,
  typeCoderingen: [],
  statuses: [],
  bronlagen: [],
  onlyNewGeometry: false,
};

const TRAJECT_LAYER_EDITING_DISABLED_MESSAGE =
  "Bewerken is niet ingeschakeld voor deze trajectlaag.";
const BOR_POPUP_PRIORITY_FIELDS = [
  "OBJECTNUMMER",
  "OBJECTTYPE",
  "TYPE",
  "TYPE_GEDETAILLEERD",
  "UITVOERDER_ONDERHOUD",
] as const;

function toggleInList<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
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

function formatAttributeLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return value.toLocaleString("nl-NL");
  }

  return String(value);
}

function buildBorPopupState(
  attributes: Record<string, unknown>,
  layerTitle: string,
  x: number,
  y: number
): BorPopupState {
  const primaryAttributes = BOR_POPUP_PRIORITY_FIELDS.map((key) => ({
    key,
    label: formatAttributeLabel(key),
    value: formatAttributeValue(attributes[key]),
  }));

  const secondaryAttributes = Object.entries(attributes)
    .filter(([key]) => !BOR_POPUP_PRIORITY_FIELDS.includes(key as (typeof BOR_POPUP_PRIORITY_FIELDS)[number]))
    .sort(([left], [right]) => left.localeCompare(right, "nl"))
    .map(([key, value]) => ({
      key,
      label: formatAttributeLabel(key),
      value: formatAttributeValue(value),
    }));

  return {
    layerTitle,
    displayTitle:
      formatAttributeValue(attributes.OBJECTNUMMER) !== "—"
        ? formatAttributeValue(attributes.OBJECTNUMMER)
        : formatAttributeValue(attributes.OBJECTID),
    left: Math.min(x + 14, window.innerWidth - 404),
    top: Math.min(y + 14, window.innerHeight - 520),
    primaryAttributes,
    secondaryAttributes,
  };
}

function toTrajectGlobalId(attributes: Record<string, unknown>): string {
  const globalId = String(attributes.GlobalID ?? attributes.globalid ?? "").trim();
  if (globalId) {
    return globalId;
  }

  const guid = String(attributes.guid ?? "").trim();
  if (guid) {
    return guid;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function toFormValues(traject: TrajectRecord | null, statusFallback: number): AttributeFormValues {
  return {
    trajectCode: traject?.trajectCode ?? "",
    status: traject?.status ?? statusFallback,
    opmerking: traject?.opmerking ?? "",
    naam: traject?.naam ?? "",
    aanpassenDoor: traject?.aanpassenDoor ?? "",
    functie: traject?.functie ?? "",
    uitvoerderOnderhoud: traject?.uitvoerderOnderhoud ?? "",
    bodemklasse: traject?.bodemklasse ?? "",
    type: traject?.type ?? "",
    bovenbreedte: traject?.bovenbreedte ?? "",
    werkpadBreedte: traject?.werkpadBreedte ?? "",
    stakeholderInformatie: traject?.stakeholderInformatie ?? "",
  };
}

async function clearReviewPresentation(context: HeadlessMapContext) {
  context.reviewSelectionLayer.removeAll();
  context.reviewDiagnosticLayer.removeAll();

  try {
    const trajectLayerView = (await context.view.whenLayerView(
      context.trajectLayer
    )) as FeatureLayerView;
    trajectLayerView.featureEffect = null;
  } catch {
    // View cleanup may already be in progress.
  }
}

async function applyReviewEffects(
  context: HeadlessMapContext,
  _geometry: GeometryWithoutMeshUnion,
  selectedObjectId: number | null
) {
  // Keep the source layers visible but quiet, and let the review overlays carry the emphasis.
  try {
    const trajectLayerView = (await context.view.whenLayerView(
      context.trajectLayer
    )) as FeatureLayerView;

    trajectLayerView.featureEffect = selectedObjectId
      ? new FeatureEffect({
          filter: new FeatureFilter({
            where: `OBJECTID = ${selectedObjectId}`,
          }),
          includedEffect: "opacity(22%)",
          excludedEffect: "grayscale(100%) opacity(22%)",
        })
      : null;
  } catch {
    // Ignore layer effect failures and keep map usable.
  }
}

async function resolveReviewGeometry(
  context: HeadlessMapContext,
  options: {
    pendingGeometry: GeometryWithoutMeshUnion | null;
    selectedGlobalId: string | null;
    fallbackGeometry: GeometryWithoutMeshUnion | null;
    geometryCache: Map<string, GeometryWithoutMeshUnion>;
  }
): Promise<GeometryWithoutMeshUnion | null> {
  const { pendingGeometry, selectedGlobalId, fallbackGeometry, geometryCache } = options;

  if (pendingGeometry) {
    return pendingGeometry;
  }

  if (selectedGlobalId) {
    const cachedGeometry = geometryCache.get(selectedGlobalId);
    if (cachedGeometry) {
      return cachedGeometry;
    }
  }

  if (selectedGlobalId) {
    try {
      const graphic = await arcgisTrajectService.queryGraphicByGlobalId(
        context.trajectLayer,
        selectedGlobalId
      );
      const layerGeometry = graphic?.geometry as GeometryWithoutMeshUnion | null | undefined;
      if (layerGeometry) {
        geometryCache.set(selectedGlobalId, layerGeometry);
        return layerGeometry;
      }
    } catch {
      // Fall back to the stored geometry when a direct query fails.
    }
  }

  return fallbackGeometry;
}

function isGraphicHit(
  result: ViewHitTestResult["results"][number]
): result is ViewHitTestResult["results"][number] & { graphic: Graphic } {
  return "graphic" in result;
}

export function MapTrajectControlePage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapViewStateRef = useRef<typeof mapViewState>(null);
  const layerVisibilityRef = useRef<Record<string, boolean>>({});
  const rendererModeRef = useRef<TrajectRendererMode>("status");
  const reviewRequestIdRef = useRef(0);
  const trajectByGlobalIdRef = useRef<Map<string, TrajectRecord>>(new Map());
  const reviewHistoryRef = useRef<string[]>([]);
  const reviewHistoryIndexRef = useRef(-1);
  const borPopupDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const selectedGlobalIdRef = useRef<string | null>(null);
  const bulkSelectionModeRef = useRef(false);
  const pendingGeometryEditsRef = useRef<PendingGeometryEdits | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const reviewHighlightHandleRef = useRef<{ remove: () => void } | null>(null);
  const bulkHighlightHandleRef = useRef<{ remove: () => void } | null>(null);
  const exactGeometryCacheRef = useRef<Map<string, GeometryWithoutMeshUnion>>(new Map());
  const reviewSummaryCacheRef = useRef<Map<string, TrajectReviewSummary>>(new Map());
  const trajecten = useAppStore((state) => state.trajecten);
  const selectedGlobalId = useAppStore((state) => state.selectedGlobalId);
  const bulkSelectionMode = useAppStore((state) => state.bulkSelectionMode);
  const bulkSelectedTrajectIds = useAppStore((state) => state.bulkSelectedTrajectIds);
  const jaarplanTrajecten = useAppStore((state) => state.jaarplanTrajecten);
  const jaarplanMetadata = useAppStore((state) => state.jaarplanMetadata);
  const selectedTraject = useAppStore((state) =>
    state.trajecten.find((traject) => traject.globalId === state.selectedGlobalId) ?? null
  );
  const pendingGeometryEdits = useAppStore((state) => state.pendingGeometryEdits);
  const zoomTargetGlobalId = useAppStore((state) => state.zoomTargetGlobalId);
  const mapViewState = useAppStore((state) => state.mapViewState);
  const layerVisibilityByTitle = useAppStore((state) => state.layerVisibilityByTitle);
  const selectTraject = useAppStore((state) => state.selectTraject);
  const setEditingMode = useAppStore((state) => state.setEditingMode);
  const setPendingGeometryEdits = useAppStore((state) => state.setPendingGeometryEdits);
  const setZoomTargetGlobalId = useAppStore((state) => state.setZoomTargetGlobalId);
  const setMapViewState = useAppStore((state) => state.setMapViewState);
  const setLayerVisibility = useAppStore((state) => state.setLayerVisibility);
  const upsertTraject = useAppStore((state) => state.upsertTraject);
  const upsertJaarplanMeasure = useAppStore((state) => state.upsertJaarplanMeasure);
  const removeTraject = useAppStore((state) => state.removeTraject);
  const setBulkSelectionMode = useAppStore((state) => state.setBulkSelectionMode);
  const toggleBulkSelectedTraject = useAppStore((state) => state.toggleBulkSelectedTraject);
  const clearBulkSelectedTrajects = useAppStore((state) => state.clearBulkSelectedTrajects);
  const [mapContext, setMapContext] = useState<HeadlessMapContext | null>(null);
  const [layerItems, setLayerItems] = useState<LayerToggleItem[]>([]);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [activeBasemapId, setActiveBasemapId] = useState("streets");
  const [rendererMode, setRendererMode] = useState<TrajectRendererMode>("status");
  const [mapFilters, setMapFilters] = useState<MapTrajectFilters>(DEFAULT_MAP_FILTERS);
  const [draftValues, setDraftValues] = useState<AttributeFormValues | null>(null);
  const [reviewSummary, setReviewSummary] = useState<TrajectReviewSummary | null>(null);
  const [selectionChoices, setSelectionChoices] = useState<TrajectSelectionChoice[] | null>(null);
  const [borPopup, setBorPopup] = useState<BorPopupState | null>(null);
  const [borPopupExpanded, setBorPopupExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkMeasureSaving, setBulkMeasureSaving] = useState(false);
  const [bulkMeasureError, setBulkMeasureError] = useState<string | null>(null);
  const [bulkMeasureDraft, setBulkMeasureDraft] =
    useState<JaarplanMeasureFormValues | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!borPopup) {
      return;
    }

    function handleMouseMove(event: MouseEvent) {
      const offset = borPopupDragOffsetRef.current;
      if (!offset) {
        return;
      }

      const maxLeft = Math.max(12, window.innerWidth - 402);
      const maxTop = Math.max(12, window.innerHeight - 120);
      setBorPopup((current) =>
        current
          ? {
              ...current,
              left: Math.min(Math.max(12, event.clientX - offset.x), maxLeft),
              top: Math.min(Math.max(12, event.clientY - offset.y), maxTop),
            }
          : current
      );
    }

    function handleMouseUp() {
      borPopupDragOffsetRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      borPopupDragOffsetRef.current = null;
    };
  }, [borPopup]);

  const availableTypeCoderingen = useMemo(
    () =>
      [...new Set(trajecten.map((traject) => traject.typeCodering).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, "nl")),
    [trajecten]
  );

  const trajectByGlobalId = useMemo(
    () => new Map(trajecten.map((traject) => [traject.globalId, traject])),
    [trajecten]
  );
  const bulkSelectedTrajecten = useMemo(
    () =>
      bulkSelectedTrajectIds
        .map((globalId) => trajectByGlobalId.get(globalId))
        .filter((traject): traject is TrajectRecord => Boolean(traject)),
    [bulkSelectedTrajectIds, trajectByGlobalId]
  );
  const bulkSelectedJaarplanTrajecten = useMemo(
    () =>
      bulkSelectedTrajectIds
        .map((globalId) =>
          jaarplanTrajecten.find((traject) => traject.globalId === globalId)
        )
        .filter((traject): traject is (typeof jaarplanTrajecten)[number] => Boolean(traject)),
    [bulkSelectedTrajectIds, jaarplanTrajecten]
  );

  const statusOptions = useMemo<StatusOption[]>(
    () => mapContext?.statusOptions ?? [],
    [mapContext]
  );
  const trajectLayerEditingEnabled = useMemo(
    () =>
      mapContext ? arcgisTrajectService.isTrajectLayerEditable(mapContext.trajectLayer) : false,
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
          mapFilters.bronlagen.length === 0 || arraysEqual(bronlagen, selectedBronlagen);
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

  const filteredIndex = useMemo(
    () =>
      selectedGlobalId
        ? filteredTrajecten.findIndex((traject) => traject.globalId === selectedGlobalId)
        : -1,
    [filteredTrajecten, selectedGlobalId]
  );
  const previousTrajectId =
    filteredIndex > 0 ? filteredTrajecten[filteredIndex - 1]?.globalId ?? null : null;
  const nextTrajectId =
    filteredIndex >= 0 && filteredIndex < filteredTrajecten.length - 1
      ? filteredTrajecten[filteredIndex + 1]?.globalId ?? null
      : null;
  const pendingStatusValue =
    statusOptions.find((option) => option.label.toLowerCase() === "controleren")?.value ?? 1;
  const nextPendingTrajectId = useMemo(() => {
    if (!filteredTrajecten.length) {
      return null;
    }

    const start = filteredIndex >= 0 ? filteredIndex + 1 : 0;
    for (let offset = 0; offset < filteredTrajecten.length; offset += 1) {
      const candidate = filteredTrajecten[(start + offset) % filteredTrajecten.length];
      if (candidate.status === pendingStatusValue && candidate.globalId !== selectedGlobalId) {
        return candidate.globalId;
      }
    }

    return null;
  }, [filteredIndex, filteredTrajecten, pendingStatusValue, selectedGlobalId]);

  const reviewFormValues = useMemo(
    () => draftValues ?? toFormValues(selectedTraject, statusOptions[0]?.value ?? 1),
    [draftValues, selectedTraject, statusOptions]
  );
  const hasUnsavedChanges = useMemo(() => {
    if (pendingGeometryEdits) {
      return true;
    }

    if (!selectedTraject || !draftValues) {
      return false;
    }

    return (
      draftValues.trajectCode !== selectedTraject.trajectCode ||
      draftValues.status !== selectedTraject.status ||
      draftValues.opmerking !== selectedTraject.opmerking ||
      draftValues.naam !== selectedTraject.naam ||
      draftValues.aanpassenDoor !== selectedTraject.aanpassenDoor ||
      draftValues.functie !== selectedTraject.functie ||
      draftValues.uitvoerderOnderhoud !== selectedTraject.uitvoerderOnderhoud ||
      draftValues.bodemklasse !== selectedTraject.bodemklasse ||
      draftValues.type !== selectedTraject.type ||
      draftValues.bovenbreedte !== selectedTraject.bovenbreedte ||
      draftValues.werkpadBreedte !== selectedTraject.werkpadBreedte ||
      draftValues.stakeholderInformatie !== selectedTraject.stakeholderInformatie
    );
  }, [draftValues, pendingGeometryEdits, selectedTraject]);

  function canDiscardUnsavedChanges() {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(
      "Niet-opgeslagen reviewwijzigingen gaan verloren. Wil je doorgaan?"
    );
  }

  function updateDraftValue<K extends keyof AttributeFormValues>(
    field: K,
    value: AttributeFormValues[K]
  ) {
    setDraftValues((current) => ({
      ...(current ?? toFormValues(selectedTraject, statusOptions[0]?.value ?? 1)),
      [field]: value,
    }));
  }

  function pushReviewHistory(globalId: string) {
    const nextIndex = reviewHistoryIndexRef.current + 1;
    const nextHistory = reviewHistoryRef.current.slice(0, nextIndex);

    if (nextHistory[nextHistory.length - 1] !== globalId) {
      nextHistory.push(globalId);
    }

    reviewHistoryRef.current = nextHistory;
    reviewHistoryIndexRef.current = nextHistory.length - 1;
  }

  function moveReviewHistory(step: -1 | 1): string | null {
    const nextIndex = reviewHistoryIndexRef.current + step;
    if (nextIndex < 0 || nextIndex >= reviewHistoryRef.current.length) {
      return null;
    }

    reviewHistoryIndexRef.current = nextIndex;
    return reviewHistoryRef.current[nextIndex] ?? null;
  }

  function resetReviewState(options?: { clearBorPopup?: boolean }) {
    setSelectionChoices(null);
    setReviewSummary(null);
    setDraftValues(null);
    if (options?.clearBorPopup) {
      setBorPopup(null);
    }
    setPendingGeometryEdits(null);
    setZoomTargetGlobalId(null);
    setEditingMode("idle");
    reviewHistoryRef.current = [];
    reviewHistoryIndexRef.current = -1;
    selectTraject(null, "map");
  }

  function clearReviewHighlight() {
    reviewHighlightHandleRef.current?.remove();
    reviewHighlightHandleRef.current = null;
  }

  function selectTrajectForReview(
    globalId: string,
    source: "map" | "table",
    options?: { zoom?: boolean; recordHistory?: boolean }
  ) {
    const traject = trajectByGlobalId.get(globalId) ?? null;
    setSelectionChoices(null);
    setBorPopup(null);
    setDraftValues(toFormValues(traject, statusOptions[0]?.value ?? 1));
    setPendingGeometryEdits(null);
    setEditingMode("idle");
    selectTraject(globalId, source);
    setZoomTargetGlobalId(options?.zoom ? globalId : null);

    if (options?.recordHistory !== false) {
      pushReviewHistory(globalId);
    }
  }

  function handleSelectTraject(
    globalId: string,
    source: "map" | "table",
    options?: { zoom?: boolean; recordHistory?: boolean }
  ) {
    if (globalId === selectedGlobalId && !pendingGeometryEdits) {
      setSelectionChoices(null);
      setBorPopup(null);
      if (options?.zoom) {
        setZoomTargetGlobalId(globalId);
      }
      return;
    }

    if (!canDiscardUnsavedChanges()) {
      return;
    }

    selectTrajectForReview(globalId, source, options);
  }

  function handleCloseReview() {
    if (!canDiscardUnsavedChanges()) {
      return;
    }

    resetReviewState({ clearBorPopup: true });
  }

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
    trajectByGlobalIdRef.current = trajectByGlobalId;
  }, [trajectByGlobalId]);

  useEffect(() => {
    selectedGlobalIdRef.current = selectedGlobalId;
  }, [selectedGlobalId]);

  useEffect(() => {
    bulkSelectionModeRef.current = bulkSelectionMode;
  }, [bulkSelectionMode]);

  useEffect(() => {
    pendingGeometryEditsRef.current = pendingGeometryEdits;
  }, [pendingGeometryEdits]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!jaarplanMetadata || !bulkSelectedJaarplanTrajecten.length) {
      setBulkMeasureDraft(null);
      return;
    }

    setBulkMeasureDraft(
      (current) =>
        current ??
        arcgisJaarplanService.createDefaultFormValues(
          jaarplanMetadata,
          bulkSelectedJaarplanTrajecten[0]
        )
    );
  }, [bulkSelectedJaarplanTrajecten, jaarplanMetadata]);

  useEffect(() => {
    const fallback = statusOptions[0]?.value ?? 1;

    if (pendingGeometryEdits?.mode === "create" && !selectedTraject) {
      setDraftValues((current) => current ?? toFormValues(null, fallback));
      return;
    }

    if (selectedTraject) {
      setDraftValues(toFormValues(selectedTraject, fallback));
      return;
    }

    if (!pendingGeometryEdits) {
      setDraftValues(null);
      setReviewSummary(null);
    }
  }, [
    pendingGeometryEdits,
    selectedTraject?.globalId,
                selectedTraject?.opmerking,
    selectedTraject?.aanpassenDoor,
    selectedTraject?.bodemklasse,
    selectedTraject?.functie,
    selectedTraject?.naam,
    selectedTraject?.status,
    selectedTraject?.type,
    selectedTraject?.trajectCode,
    selectedTraject?.uitvoerderOnderhoud,
    selectedTraject?.bovenbreedte,
    selectedTraject?.werkpadBreedte,
    selectedTraject?.stakeholderInformatie,
    statusOptions,
  ]);

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
        (
          createdContext.view as typeof createdContext.view & {
            highlightOptions?: {
              color: [number, number, number, number];
              haloOpacity: number;
              fillOpacity: number;
            };
          }
        ).highlightOptions = {
          color: [14, 116, 144, 1],
          haloOpacity: 1,
          fillOpacity: 0.08,
        };
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
            rendererMode: rendererModeRef.current,
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
          const activeSelectedGlobalId = selectedGlobalIdRef.current;
          const activeBulkSelectionMode = bulkSelectionModeRef.current;
          const activePendingGeometryEdits = pendingGeometryEditsRef.current;
          const canDiscardCurrentSelection = () =>
            !hasUnsavedChangesRef.current ||
            window.confirm(
              "Niet-opgeslagen reviewwijzigingen gaan verloren. Wil je doorgaan?"
            );

          const hitTest = await createdContext.view.hitTest(event, {
            include: [createdContext.trajectLayer, ...createdContext.borLayers],
          });
          const trajectHits = hitTest.results
            .filter(
              (result): result is ViewHitTestResult["results"][number] & { graphic: Graphic } =>
                isGraphicHit(result) && result.graphic.layer === createdContext.trajectLayer
            )
            .map((result) => {
              const attributes = result.graphic.attributes as Record<string, unknown>;
              const globalId = toTrajectGlobalId(attributes);
              const fallbackObjectId = Number(attributes.OBJECTID ?? 0);
              const storedTraject = trajectByGlobalIdRef.current.get(globalId);
              return {
                globalId,
                trajectCode:
                  storedTraject?.trajectCode ||
                  String(attributes.traject_code ?? "") ||
                  `Traject ${fallbackObjectId}`,
                status:
                  storedTraject?.status ??
                  Number(attributes.status ?? createdContext.statusOptions[0]?.value ?? 1),
                shapeArea:
                  storedTraject?.shapeArea ??
                  (typeof attributes.Shape__Area === "number" ? attributes.Shape__Area : null),
              };
            })
            .filter((candidate) => Boolean(candidate.globalId))
            .filter(
              (candidate, index, all) =>
                all.findIndex((item) => item.globalId === candidate.globalId) === index
            )
            .sort(
              (left, right) =>
                (left.shapeArea ?? Number.MAX_SAFE_INTEGER) -
                  (right.shapeArea ?? Number.MAX_SAFE_INTEGER) ||
                left.trajectCode.localeCompare(right.trajectCode, "nl")
            );

          if (activeBulkSelectionMode && trajectHits.length) {
            setBorPopup(null);
            setSelectionChoices(null);
            toggleBulkSelectedTraject(trajectHits[0].globalId);
            return;
          }

          if (trajectHits.length > 1) {
            setBorPopup(null);
            setSelectionChoices(
              trajectHits.map((candidate) => ({
                ...candidate,
                left: Math.min(event.x + 14, window.innerWidth - 320),
                top: Math.min(event.y + 14, window.innerHeight - 280),
              }))
            );
            return;
          }

          if (trajectHits.length === 1) {
            setBorPopup(null);
            handleSelectTraject(trajectHits[0].globalId, "map");
            return;
          }

          if (activeBulkSelectionMode) {
            setBorPopup(null);
            setSelectionChoices(null);
            return;
          }

          const borHit = hitTest.results.find(
            (result): result is ViewHitTestResult["results"][number] & { graphic: Graphic } =>
              isGraphicHit(result) &&
              createdContext.borLayers.some((layer) => layer === result.graphic.layer)
          );

          if (borHit) {
            if (activeSelectedGlobalId || activePendingGeometryEdits) {
              if (!canDiscardCurrentSelection()) {
                return;
              }
              resetReviewState();
            }

            setSelectionChoices(null);
            const borLayer = borHit.graphic.layer;
            const layerTitle =
              borLayer && "title" in borLayer && typeof borLayer.title === "string"
                ? borLayer.title
                : "BOR object";
            setBorPopup(
              buildBorPopupState(
                borHit.graphic.attributes as Record<string, unknown>,
                layerTitle,
                event.x,
                event.y
              )
            );
            setBorPopupExpanded(false);
            return;
          }

          if (activeSelectedGlobalId || activePendingGeometryEdits) {
            if (!canDiscardCurrentSelection()) {
              return;
            }

            resetReviewState();
          }

          setBorPopup(null);
          setSelectionChoices(null);
        });

        const createHandle = createdContext.sketchViewModel.on("create", (event) => {
          if (event.state === "complete" && event.graphic?.geometry) {
            setPendingGeometryEdits({
              mode: "create",
              geometry: event.graphic.geometry,
            });
            setDraftValues(
              toFormValues(null, createdContext.statusOptions[0]?.value ?? 1)
            );
            setEditingMode("attributes");
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
      void cleanupPromise?.then((cleanup) => cleanup?.());
      localContext?.view.destroy();
    };
  }, [
    selectTraject,
    setEditingMode,
    setLayerVisibility,
    setMapViewState,
    setPendingGeometryEdits,
    setZoomTargetGlobalId,
    toggleBulkSelectedTraject,
  ]);

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    let active = true;
    const currentContext = mapContext;

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

    async function syncBulkHighlight() {
      bulkHighlightHandleRef.current?.remove();
      bulkHighlightHandleRef.current = null;

      const objectIds = bulkSelectedTrajecten
        .map((traject) => traject.objectId)
        .filter((objectId) => Number.isFinite(objectId));

      if (!objectIds.length) {
        return;
      }

      const trajectLayerView = (await currentContext.view.whenLayerView(
        currentContext.trajectLayer
      )) as FeatureLayerView;

      if (!active) {
        return;
      }

      bulkHighlightHandleRef.current = trajectLayerView.highlight(objectIds);
    }

    void syncBulkHighlight();

    return () => {
      active = false;
      bulkHighlightHandleRef.current?.remove();
      bulkHighlightHandleRef.current = null;
    };
  }, [bulkSelectedTrajecten, mapContext]);

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

  useEffect(() => {
    if (!mapContext?.view || !selectedGlobalId || zoomTargetGlobalId !== selectedGlobalId) {
      return;
    }

    const geometry = (pendingGeometryEdits?.geometry ?? selectedTraject?.geometry ?? null) as
      | GeometryWithoutMeshUnion
      | null;
    if (!geometry) {
      return;
    }

    void mapContext.view
      .goTo(geometry, { duration: 700 })
      .finally(() => setZoomTargetGlobalId(null));
  }, [
    mapContext,
    pendingGeometryEdits?.geometry,
    selectedGlobalId,
    selectedTraject?.geometry,
    setZoomTargetGlobalId,
    zoomTargetGlobalId,
  ]);

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    const currentContext = mapContext;
    let active = true;

    async function syncSelectionPresentation() {
      clearReviewHighlight();
      currentContext.reviewSelectionLayer.removeAll();

      if (pendingGeometryEdits?.geometry) {
        currentContext.reviewSelectionLayer.addMany(
          createTrajectSelectionGraphics(
            pendingGeometryEdits.geometry as GeometryWithoutMeshUnion,
            {
              mode: "draft",
            }
          )
        );
        await applyReviewEffects(currentContext, pendingGeometryEdits.geometry as GeometryWithoutMeshUnion, null);
        return;
      }

      if (selectedTraject?.objectId) {
        await applyReviewEffects(
          currentContext,
          (selectedTraject.geometry ?? null) as GeometryWithoutMeshUnion,
          selectedTraject.objectId
        );

        const trajectLayerView = (await currentContext.view.whenLayerView(
          currentContext.trajectLayer
        )) as FeatureLayerView;

        if (!active) {
          return;
        }

        reviewHighlightHandleRef.current = trajectLayerView.highlight([selectedTraject.objectId]);

        const selectionGeometry = await resolveReviewGeometry(currentContext, {
          pendingGeometry: null,
          selectedGlobalId: selectedTraject.globalId,
          fallbackGeometry: (selectedTraject.geometry ?? null) as GeometryWithoutMeshUnion | null,
          geometryCache: exactGeometryCacheRef.current,
        });

        if (!active || !selectionGeometry) {
          return;
        }

        currentContext.reviewSelectionLayer.addMany(
          createTrajectSelectionGraphics(selectionGeometry, {
            mode: "selected",
          })
        );
        return;
      }

      await clearReviewPresentation(currentContext);
    }

    void syncSelectionPresentation();

    return () => {
      active = false;
      clearReviewHighlight();
    };
  }, [mapContext, pendingGeometryEdits?.geometry, selectedTraject?.geometry, selectedTraject?.objectId]);

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    const currentContext = mapContext;
    const requestId = reviewRequestIdRef.current + 1;
    reviewRequestIdRef.current = requestId;
    let active = true;

    async function syncReview() {
      const inspectionGeometry = await resolveReviewGeometry(currentContext, {
        pendingGeometry: (pendingGeometryEdits?.geometry ?? null) as GeometryWithoutMeshUnion | null,
        selectedGlobalId: pendingGeometryEdits?.mode === "create" ? null : selectedGlobalId,
        fallbackGeometry: (selectedTraject?.geometry ?? null) as GeometryWithoutMeshUnion | null,
        geometryCache: exactGeometryCacheRef.current,
      });

      if (!active || reviewRequestIdRef.current !== requestId) {
        return;
      }

      if (!inspectionGeometry) {
        setReviewSummary(null);
        await clearReviewPresentation(currentContext);
        return;
      }

      const reviewCacheKey = pendingGeometryEdits?.mode === "create" ? null : selectedGlobalId;
      const cachedReview = reviewCacheKey ? reviewSummaryCacheRef.current.get(reviewCacheKey) : null;

      const nextReview =
        cachedReview ??
        (await buildTrajectReview({
          trajectLayer: currentContext.trajectLayer,
          geometry: inspectionGeometry,
          selectedGlobalId: pendingGeometryEdits?.mode === "create" ? null : selectedGlobalId,
          referenceTraject: selectedTraject,
        }));

      if (reviewCacheKey && !cachedReview) {
        reviewSummaryCacheRef.current.set(reviewCacheKey, nextReview);
      }

      if (!active || reviewRequestIdRef.current !== requestId) {
        return;
      }

      currentContext.reviewDiagnosticLayer.removeAll();
      currentContext.reviewDiagnosticLayer.addMany(createOverlapDiagnosticsGraphics(nextReview));
      setReviewSummary(nextReview);
    }

    void syncReview();

    return () => {
      active = false;
    };
  }, [
    mapContext,
    pendingGeometryEdits,
    selectedGlobalId,
    selectedTraject,
  ]);

  async function handleSave(options?: { advanceToNext?: boolean }) {
    if (!mapContext) {
      return;
    }

    if (!trajectLayerEditingEnabled) {
      setError(TRAJECT_LAYER_EDITING_DISABLED_MESSAGE);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const preservedCenter = mapContext.view.center?.clone() ?? null;
      const preservedZoom = mapContext.view.zoom;
      const preservedRotation = mapContext.view.rotation;
      const nextGlobalId = options?.advanceToNext ? nextTrajectId : null;
      exactGeometryCacheRef.current.clear();
      reviewSummaryCacheRef.current.clear();

      if (pendingGeometryEdits?.mode === "create") {
        const createdSpatial = await arcgisTrajectService.saveNewTraject(
          mapContext.trajectLayer,
          pendingGeometryEdits.geometry,
          reviewFormValues
        );
        upsertTraject(createdSpatial);
        selectTraject(createdSpatial.globalId, "map");
      } else if (selectedTraject) {
        const updatedSpatial = await arcgisTrajectService.updateTraject(
          mapContext.trajectLayer,
          selectedTraject,
          reviewFormValues,
          pendingGeometryEdits?.geometry
        );
        upsertTraject(updatedSpatial);
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

      setPendingGeometryEdits(null);
      setEditingMode("idle");

      if (nextGlobalId) {
        selectTrajectForReview(nextGlobalId, "table", { zoom: true });
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkSave(values: BulkTrajectUpdateFields) {
    if (!mapContext || !bulkSelectedTrajecten.length) {
      return;
    }

    if (!trajectLayerEditingEnabled) {
      setBulkError(TRAJECT_LAYER_EDITING_DISABLED_MESSAGE);
      return;
    }

    setBulkSaving(true);
    setBulkError(null);

    try {
      exactGeometryCacheRef.current.clear();
      reviewSummaryCacheRef.current.clear();

      for (const traject of bulkSelectedTrajecten) {
        const nextValues: AttributeFormValues = {
          ...toFormValues(traject, statusOptions[0]?.value ?? 1),
          ...values,
          status: values.status ?? traject.status,
        };
        const updated = await arcgisTrajectService.updateTraject(
          mapContext.trajectLayer,
          traject,
          nextValues
        );
        upsertTraject(updated);
      }
    } catch (saveError) {
      setBulkError(
        saveError instanceof Error ? saveError.message : "Bulk opslaan is mislukt."
      );
    } finally {
      setBulkSaving(false);
    }
  }

  function updateBulkMeasureDraft(
    field: keyof JaarplanMeasureFormValues,
    value: string
  ) {
    if (!jaarplanMetadata || !bulkSelectedJaarplanTrajecten.length) {
      return;
    }

    setBulkMeasureDraft((current) => {
      const existing =
        current ??
        arcgisJaarplanService.createDefaultFormValues(
          jaarplanMetadata,
          bulkSelectedJaarplanTrajecten[0]
        );
      const next = {
        ...existing,
        [field]: value,
      } as JaarplanMeasureFormValues;

      if (field === "regimeValue" || field === "werkzaamhedenValue") {
        return arcgisJaarplanService.syncSubtypeValues(
          jaarplanMetadata,
          next,
          field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
        );
      }

      return next;
    });
  }

  async function handleBulkCreateMeasures() {
    if (!jaarplanMetadata || !bulkMeasureDraft || !bulkSelectedJaarplanTrajecten.length) {
      return;
    }

    if (!jaarplanMetadata.editable) {
      setBulkMeasureError("Bewerken is niet ingeschakeld voor de maatregelentabel.");
      return;
    }

    if (bulkSelectedJaarplanTrajecten.length !== bulkSelectedTrajecten.length) {
      setBulkMeasureError(
        "Niet alle geselecteerde trajecten zijn al beschikbaar in het jaarplan."
      );
      return;
    }

    setBulkMeasureSaving(true);
    setBulkMeasureError(null);

    try {
      for (const traject of bulkSelectedJaarplanTrajecten) {
        const created = await arcgisJaarplanService.createMeasure(
          {
            ...bulkMeasureDraft,
            trajectGuid: traject.globalId,
            trajectGlobalId: traject.globalId,
          },
          jaarplanMetadata,
          jaarplanTrajecten
        );
        upsertJaarplanMeasure(created);
      }
    } catch (error) {
      setBulkMeasureError(
        error instanceof Error ? error.message : "Bulk plannen is mislukt."
      );
    } finally {
      setBulkMeasureSaving(false);
    }
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
      exactGeometryCacheRef.current.clear();
      reviewSummaryCacheRef.current.clear();
      await arcgisTrajectService.deleteTraject(mapContext.trajectLayer, selectedTraject);
      removeTraject(selectedTraject.globalId);
      resetReviewState({ clearBorPopup: true });
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

    if (!trajectLayerEditingEnabled) {
      setError(TRAJECT_LAYER_EDITING_DISABLED_MESSAGE);
      return;
    }

    if (!canDiscardUnsavedChanges()) {
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
    setPendingGeometryEdits(null);
    setEditingMode("reshape");
    mapContext.sketchViewModel.update([editableGraphic], { tool: "reshape" });
  }

  function startCreate() {
    if (!mapContext) {
      return;
    }

    if (!trajectLayerEditingEnabled) {
      setError(TRAJECT_LAYER_EDITING_DISABLED_MESSAGE);
      return;
    }

    if (!canDiscardUnsavedChanges()) {
      return;
    }

    resetReviewState({ clearBorPopup: true });
    setDraftValues(null);
    setEditingMode("create");
    mapContext.sketchViewModel.create("polygon");
  }

  function toggleBulkSelectionMode() {
    if (!bulkSelectionMode && !canDiscardUnsavedChanges()) {
      return;
    }

    setBulkSelectionMode(!bulkSelectionMode);
    setBulkError(null);

    if (!bulkSelectionMode) {
      resetReviewState({ clearBorPopup: true });
      setSidebarCollapsed(true);
    }
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

  const reviewPanelOpen =
    bulkSelectedTrajecten.length === 0 && Boolean(selectedTraject || pendingGeometryEdits);

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
        collapsed={sidebarCollapsed}
        onToggleLayer={toggleLayer}
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
        onCollapsedChange={setSidebarCollapsed}
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
              disabledAdd={!trajectLayerEditingEnabled}
              disabledEdit={!selectedTraject || !trajectLayerEditingEnabled}
              disabledReason={
                !trajectLayerEditingEnabled
                  ? TRAJECT_LAYER_EDITING_DISABLED_MESSAGE
                  : !selectedTraject
                    ? "Selecteer eerst een traject om de vorm aan te passen."
                  : undefined
              }
              bulkSelectionMode={bulkSelectionMode}
              bulkSelectedCount={bulkSelectedTrajecten.length}
              rendererMode={rendererMode}
              onAddTraject={startCreate}
              onEditShape={() => {
                void startReshape();
              }}
              onToggleBulkSelection={toggleBulkSelectionMode}
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

        {selectionChoices?.length ? (
          <div
            className="glass-panel absolute z-30 w-[300px] rounded-card p-3"
            style={{
              left: selectionChoices[0].left,
              top: selectionChoices[0].top,
            }}
          >
            <div className="mb-3 text-[12px] font-semibold text-text">
              Meerdere trajecten op dit punt
            </div>
            <div className="space-y-2">
              {selectionChoices.map((choice) => (
                <button
                  key={choice.globalId}
                  type="button"
                  className="w-full rounded-card border border-border bg-surfaceAlt/80 px-3 py-2 text-left transition hover:border-accent/40 hover:bg-accentSoft/25"
                  onClick={() => {
                    if (bulkSelectionMode) {
                      toggleBulkSelectedTraject(choice.globalId);
                      setSelectionChoices(null);
                      return;
                    }

                    handleSelectTraject(choice.globalId, "map");
                  }}
                >
                  <div className="text-[12px] font-medium text-text">{choice.trajectCode}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Status {choice.status} · {choice.shapeArea ? `${choice.shapeArea.toLocaleString("nl-NL")} m²` : "oppervlak onbekend"}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" className="h-8 px-2" onClick={() => setSelectionChoices(null)}>
                Sluiten
              </Button>
            </div>
          </div>
        ) : null}

        {bulkSelectedTrajecten.length ? (
          <div className="absolute bottom-3 right-3 top-16 z-20 w-[calc(100vw-24px)] max-w-[430px]">
            <div className="app-scrollbar flex h-full flex-col gap-3 overflow-y-auto pr-1">
              <BulkTrajectEditPanel
                title="Trajectgegevens bulk bewerken"
                selectedCount={bulkSelectedTrajecten.length}
                saving={bulkSaving}
                fieldOptions={
                  mapContext?.trajectFieldOptions ?? {
                    functie: [],
                    uitvoerderOnderhoud: [],
                    bodemklasse: [],
                    type: [],
                    bovenbreedte: [],
                    werkpadBreedte: [],
                  }
                }
                disabled={!trajectLayerEditingEnabled}
                disabledMessage={
                  !trajectLayerEditingEnabled ? TRAJECT_LAYER_EDITING_DISABLED_MESSAGE : undefined
                }
                error={bulkError}
                density="compact"
                onSave={(values) => {
                  void handleBulkSave(values);
                }}
                onClearSelection={clearBulkSelectedTrajects}
              />

              {jaarplanMetadata && bulkMeasureDraft ? (
                <BulkMeasurePlanningPanel
                  selectedCount={bulkSelectedTrajecten.length}
                  values={bulkMeasureDraft}
                  metadata={jaarplanMetadata}
                  steekproefStatusOptions={jaarplanMetadata.steekproefStatusOptions}
                  toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                    jaarplanMetadata,
                    bulkMeasureDraft.regimeValue,
                    bulkMeasureDraft.toelichtingValue
                  )}
                  saving={bulkMeasureSaving}
                  error={bulkMeasureError}
                  disabled={
                    !jaarplanMetadata.editable ||
                    bulkSelectedJaarplanTrajecten.length !== bulkSelectedTrajecten.length
                  }
                  disabledMessage={
                    !jaarplanMetadata.editable
                      ? "Bewerken is niet ingeschakeld voor de maatregelentabel."
                      : bulkSelectedJaarplanTrajecten.length !== bulkSelectedTrajecten.length
                        ? "Niet alle geselecteerde trajecten zijn al beschikbaar in het jaarplan."
                        : undefined
                  }
                  layout="compact"
                  onFieldChange={updateBulkMeasureDraft}
                  onSubmit={() => {
                    void handleBulkCreateMeasures();
                  }}
                  onClearSelection={clearBulkSelectedTrajects}
                />
              ) : null}
            </div>
          </div>
        ) : bulkSelectionMode ? (
          <div className="glass-panel absolute right-3 top-16 z-20 rounded-card px-4 py-3 text-[12px] text-textDim">
            Bulkselectie actief · 0 trajecten geselecteerd
          </div>
        ) : null}

        {reviewPanelOpen ? (
          <TrajectReviewPanel
            open={reviewPanelOpen}
            selectedTraject={selectedTraject}
            pendingMode={pendingGeometryEdits?.mode ?? null}
            draftValues={reviewFormValues}
            statusOptions={statusOptions}
            fieldOptions={
              mapContext?.trajectFieldOptions ?? {
                aanpassenDoor: [],
                functie: [],
                uitvoerderOnderhoud: [],
                bodemklasse: [],
                type: [],
                bovenbreedte: [],
                werkpadBreedte: [],
              }
            }
            review={reviewSummary}
            saving={saving}
            deleting={deleting}
            hasUnsavedChanges={hasUnsavedChanges}
            canSelectPrevious={Boolean(previousTrajectId)}
            canSelectNext={Boolean(nextTrajectId)}
            hasNextPending={Boolean(nextPendingTrajectId)}
            onDraftChange={updateDraftValue}
            onSave={() => {
              void handleSave();
            }}
            onSaveAndNext={() => {
              void handleSave({ advanceToNext: true });
            }}
            onClose={handleCloseReview}
            onDelete={() => {
              void handleDeleteTraject();
            }}
            onSelectPrevious={() => {
              const historyTarget = moveReviewHistory(-1);
              if (historyTarget) {
                handleSelectTraject(historyTarget, "table", {
                  zoom: true,
                  recordHistory: false,
                });
              } else if (previousTrajectId) {
                handleSelectTraject(previousTrajectId, "table", { zoom: true });
              }
            }}
            onSelectNext={() => {
              const historyTarget = moveReviewHistory(1);
              if (historyTarget) {
                handleSelectTraject(historyTarget, "table", {
                  zoom: true,
                  recordHistory: false,
                });
              } else if (nextTrajectId) {
                handleSelectTraject(nextTrajectId, "table", { zoom: true });
              }
            }}
            onSelectNextPending={() => {
              if (nextPendingTrajectId) {
                handleSelectTraject(nextPendingTrajectId, "table", { zoom: true });
              }
            }}
            onSelectOverlapTraject={(globalId) =>
              handleSelectTraject(globalId, "map", { zoom: true })
            }
          />
        ) : null}

        {borPopup ? (
          <div
            className="glass-panel absolute z-30 w-[390px] max-w-[calc(100vw-24px)] rounded-card p-4"
            style={{ left: borPopup.left, top: borPopup.top }}
          >
            <div
              className="mb-4 flex cursor-grab items-start justify-between gap-4 active:cursor-grabbing"
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }

                const target = event.target as HTMLElement | null;
                if (target?.closest("button")) {
                  return;
                }

                event.preventDefault();
                borPopupDragOffsetRef.current = {
                  x: event.clientX - borPopup.left,
                  y: event.clientY - borPopup.top,
                };
              }}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                  {borPopup.layerTitle}
                </div>
                <div className="mt-1 truncate text-[16px] font-semibold text-text">
                  {borPopup.displayTitle}
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 px-0"
                onClick={() => setBorPopup(null)}
                aria-label="Sluit BOR-popup"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 rounded-card border border-border bg-surfaceAlt/70 p-3">
              {borPopup.primaryAttributes.map((attribute) => (
                <div key={attribute.key}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                    {attribute.label}
                  </div>
                  <div className="mt-1 break-words text-[13px] font-medium text-text">
                    {attribute.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-card border border-border bg-surfaceAlt/70 px-3 py-2 text-left transition hover:border-accent/40 hover:bg-accentSoft/25"
                onClick={() => setBorPopupExpanded((current) => !current)}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Overige attributen
                </span>
                <span className="text-[11px] text-textDim">
                  {borPopupExpanded ? "Verbergen" : "Tonen"}
                </span>
              </button>

              {borPopupExpanded ? (
                <div className="app-scrollbar mt-2 max-h-[260px] space-y-3 overflow-y-auto rounded-card border border-border bg-surfaceAlt/70 p-3">
                  {borPopup.secondaryAttributes.map((attribute) => (
                    <div key={attribute.key}>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                        {attribute.label}
                      </div>
                      <div className="mt-1 break-words text-[12px] text-text">
                        {attribute.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="glass-panel absolute bottom-3 left-3 z-20 max-w-md rounded-card px-4 py-3 text-[12px] text-danger">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

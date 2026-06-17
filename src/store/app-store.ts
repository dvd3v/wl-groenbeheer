import { create } from "zustand";
import type {
  EditingMode,
  JaarplanMeasureRecord,
  JaarplanMetadata,
  JaarplanTrajectRecord,
  JaarplanFilters,
  MapSelectionSource,
  MapViewState,
  PendingGeometryEdits,
  PlannedWorkItem,
  SharedJaarplanFilters,
  TrajectRecord,
} from "../types/app";

interface AppState {
  trajecten: TrajectRecord[];
  planningItems: PlannedWorkItem[];
  initialStatusByGlobalId: Record<string, number>;
  jaarplanTrajecten: JaarplanTrajectRecord[];
  jaarplanMeasures: JaarplanMeasureRecord[];
  jaarplanMetadata: JaarplanMetadata | null;
  jaarplanLoading: boolean;
  jaarplanError: string | null;
  jaarplanFilters: SharedJaarplanFilters;
  selectedJaarplanTrajectId: string | null;
  jaarplanZoomTargetGlobalId: string | null;
  jaarplanMapViewState: MapViewState | null;
  selectedGlobalId: string | null;
  selectedObjectId: number | null;
  mapSelectionSource: MapSelectionSource;
  bulkSelectionMode: boolean;
  bulkSelectedTrajectIds: string[];
  editingMode: EditingMode;
  attributeDrawerOpen: boolean;
  pendingGeometryEdits: PendingGeometryEdits | null;
  filters: JaarplanFilters;
  zoomTargetGlobalId: string | null;
  mapViewState: MapViewState | null;
  layerVisibilityByTitle: Record<string, boolean>;
  setBootstrapData: (
    trajecten: TrajectRecord[],
    planningItems: PlannedWorkItem[]
  ) => void;
  setJaarplanBootstrapData: (
    trajecten: JaarplanTrajectRecord[],
    measures: JaarplanMeasureRecord[],
    metadata: JaarplanMetadata
  ) => void;
  setJaarplanLoading: (loading: boolean) => void;
  setJaarplanError: (message: string | null) => void;
  upsertTraject: (traject: TrajectRecord) => void;
  removeTraject: (globalId: string) => void;
  setPlanningItems: (items: PlannedWorkItem[]) => void;
  addPlanningItem: (item: PlannedWorkItem) => void;
  updatePlanningItem: (workId: string, partial: Partial<PlannedWorkItem>) => void;
  upsertJaarplanMeasure: (item: JaarplanMeasureRecord) => void;
  upsertJaarplanTraject: (item: JaarplanTrajectRecord) => void;
  setJaarplanMeasures: (items: JaarplanMeasureRecord[]) => void;
  removeJaarplanMeasure: (globalId: string) => void;
  setJaarplanFilters: (filters: Partial<SharedJaarplanFilters>) => void;
  resetJaarplanFilters: () => void;
  selectJaarplanTraject: (globalId: string | null, source: MapSelectionSource) => void;
  setJaarplanZoomTargetGlobalId: (globalId: string | null) => void;
  setJaarplanMapViewState: (viewState: MapViewState | null) => void;
  selectTraject: (globalId: string | null, source: MapSelectionSource) => void;
  setBulkSelectionMode: (enabled: boolean) => void;
  toggleBulkSelectedTraject: (globalId: string) => void;
  setBulkSelectedTrajects: (globalIds: string[]) => void;
  clearBulkSelectedTrajects: () => void;
  setEditingMode: (mode: EditingMode) => void;
  setAttributeDrawerOpen: (open: boolean) => void;
  setPendingGeometryEdits: (pending: PendingGeometryEdits | null) => void;
  setFilters: (filters: Partial<JaarplanFilters>) => void;
  setZoomTargetGlobalId: (globalId: string | null) => void;
  setMapViewState: (viewState: MapViewState | null) => void;
  setLayerVisibility: (title: string, visible: boolean) => void;
}

const DEFAULT_FILTERS: JaarplanFilters = {
  trajectStatus: "all",
  planningStatus: "all",
  werkzaamheid: "all",
  werkperiode: "all",
  search: "",
};

export const DEFAULT_JAARPLAN_SHARED_FILTERS: SharedJaarplanFilters = {
  search: "",
  trajectCode: "",
  uitvoerderOnderhoud: "",
  functie: "",
  bodemklasse: "",
  type: "",
  bovenbreedte: "",
  werkpadBreedte: "",
  regime: "",
  werkzaamheid: "",
  werkperiode: "",
  zijde: "",
  afvoeren: "",
  signal: "",
  statusMaatregel: "",
  datumGepland: "",
  datumUitgevoerd: "",
  steekproefStatus: "",
  hasMeasuresOnly: false,
  correctOnly: false,
  conceptGereedOnly: false,
};

function sortTrajecten(trajecten: TrajectRecord[]) {
  return [...trajecten].sort((left, right) =>
    left.trajectCode.localeCompare(right.trajectCode, "nl")
  );
}

function normalizeTraject(traject: TrajectRecord): TrajectRecord {
  return {
    ...traject,
    status: Number(traject.status),
  };
}

function mergeTrajectRecord(
  current: TrajectRecord | undefined,
  next: TrajectRecord
): TrajectRecord {
  const normalized = normalizeTraject(next);

  return {
    ...(current ?? normalized),
    ...normalized,
    geometry: normalized.geometry ?? current?.geometry ?? null,
    shapeArea: normalized.shapeArea ?? current?.shapeArea ?? null,
    shapeLength: normalized.shapeLength ?? current?.shapeLength ?? null,
  };
}

function toJaarplanTrajectRecord(
  traject: TrajectRecord,
  current?: JaarplanTrajectRecord
): JaarplanTrajectRecord {
  return {
    objectId: traject.objectId,
    globalId: traject.globalId,
    guid: traject.guid,
    trajectCode: traject.trajectCode,
    naam: traject.naam,
    functie: traject.functie,
    bodemklasse: traject.bodemklasse,
    uitvoerderOnderhoud: traject.uitvoerderOnderhoud,
    type: traject.type,
    bovenbreedte: traject.bovenbreedte,
    werkpadBreedte: traject.werkpadBreedte,
    stakeholderInformatie: traject.stakeholderInformatie,
    status: traject.status,
    conceptGereed: current?.conceptGereed ?? false,
    conceptGereedValue: current?.conceptGereedValue ?? "",
    geometry: traject.geometry ?? current?.geometry ?? null,
  };
}

function mergeJaarplanTrajectRecord(
  current: JaarplanTrajectRecord | undefined,
  next: JaarplanTrajectRecord
): JaarplanTrajectRecord {
  return {
    ...(current ?? next),
    ...next,
    geometry: next.geometry ?? current?.geometry ?? null,
  };
}

function mergeTrajectFromJaarplan(
  current: TrajectRecord | undefined,
  traject: JaarplanTrajectRecord
): TrajectRecord | null {
  if (!current && !traject.geometry) {
    return null;
  }

  return {
    objectId: current?.objectId ?? traject.objectId,
    globalId: current?.globalId ?? traject.globalId,
    guid: current?.guid ?? traject.guid,
    trajectCode: traject.trajectCode,
    naam: traject.naam,
    aanpassenDoor: current?.aanpassenDoor ?? "",
    functie: traject.functie,
    uitvoerderOnderhoud: traject.uitvoerderOnderhoud,
    bodemklasse: traject.bodemklasse,
    type: traject.type,
    bovenbreedte: traject.bovenbreedte,
    werkpadBreedte: traject.werkpadBreedte,
    stakeholderInformatie: traject.stakeholderInformatie,
    typeCodering: current?.typeCodering ?? "",
    objectCount: current?.objectCount ?? null,
    bronlagen: current?.bronlagen ?? "",
    status: Number(traject.status ?? current?.status ?? 1),
    opmerking: current?.opmerking ?? "",
    shapeArea: current?.shapeArea ?? null,
    shapeLength: current?.shapeLength ?? null,
    geometry: current?.geometry ?? traject.geometry ?? null,
  };
}

function syncMeasureTrajectCode(
  measures: JaarplanMeasureRecord[],
  trajectGlobalId: string,
  trajectCode: string
) {
  return measures.map((measure) =>
    measure.trajectGlobalId === trajectGlobalId ||
    measure.trajectGuid === trajectGlobalId
      ? { ...measure, trajectCode }
      : measure
  );
}

function sortJaarplanTrajecten(trajecten: JaarplanTrajectRecord[]) {
  return [...trajecten].sort((left, right) =>
    left.trajectCode.localeCompare(right.trajectCode, "nl")
  );
}

function sortJaarplanMeasures(items: JaarplanMeasureRecord[]) {
  return [...items].sort((left, right) => {
    const trajectCompare = left.trajectCode.localeCompare(right.trajectCode, "nl");
    if (trajectCompare !== 0) {
      return trajectCompare;
    }

    const regimeCompare = (left.regimeNumber ?? 999) - (right.regimeNumber ?? 999);
    if (regimeCompare !== 0) {
      return regimeCompare;
    }

    return left.werkzaamheidLabel.localeCompare(right.werkzaamheidLabel, "nl");
  });
}

export const useAppStore = create<AppState>((set) => ({
  trajecten: [],
  planningItems: [],
  initialStatusByGlobalId: {},
  jaarplanTrajecten: [],
  jaarplanMeasures: [],
  jaarplanMetadata: null,
  jaarplanLoading: false,
  jaarplanError: null,
  jaarplanFilters: DEFAULT_JAARPLAN_SHARED_FILTERS,
  selectedJaarplanTrajectId: null,
  jaarplanZoomTargetGlobalId: null,
  jaarplanMapViewState: null,
  selectedGlobalId: null,
  selectedObjectId: null,
  mapSelectionSource: null,
  bulkSelectionMode: false,
  bulkSelectedTrajectIds: [],
  editingMode: "idle",
  attributeDrawerOpen: false,
  pendingGeometryEdits: null,
  filters: DEFAULT_FILTERS,
  zoomTargetGlobalId: null,
  mapViewState: null,
  layerVisibilityByTitle: {},
  setBootstrapData: (trajecten, planningItems) =>
    set((state) => {
      const sorted = sortTrajecten(trajecten.map(normalizeTraject));
      const selectedTraject = sorted.find(
        (traject) => traject.globalId === state.selectedGlobalId
      );

      return {
        trajecten: sorted,
        planningItems,
        initialStatusByGlobalId: Object.fromEntries(
          sorted.map((traject) => [traject.globalId, traject.status])
        ),
        selectedObjectId: selectedTraject?.objectId ?? null,
      };
    }),
  setJaarplanBootstrapData: (trajecten, measures, metadata) =>
    set(() => ({
      jaarplanTrajecten: sortJaarplanTrajecten(trajecten),
      jaarplanMeasures: sortJaarplanMeasures(measures),
      jaarplanMetadata: metadata,
      jaarplanLoading: false,
      jaarplanError: null,
    })),
  setJaarplanLoading: (jaarplanLoading) => set({ jaarplanLoading }),
  setJaarplanError: (jaarplanError) => set({ jaarplanError }),
  upsertTraject: (traject) =>
    set((state) => {
      const currentTraject = state.trajecten.find(
        (item) => item.globalId === traject.globalId
      );
      const normalizedTraject = mergeTrajectRecord(currentTraject, traject);
      const trajecten = state.trajecten.some(
        (item) => item.globalId === normalizedTraject.globalId
      )
        ? state.trajecten.map((item) =>
            item.globalId === normalizedTraject.globalId ? normalizedTraject : item
          )
        : [...state.trajecten, normalizedTraject];
      const currentJaarplanTraject = state.jaarplanTrajecten.find(
        (item) => item.globalId === normalizedTraject.globalId
      );
      const syncedJaarplanTraject = toJaarplanTrajectRecord(
        normalizedTraject,
        currentJaarplanTraject
      );
      const jaarplanTrajecten =
        currentJaarplanTraject || state.jaarplanTrajecten.length
          ? state.jaarplanTrajecten.some(
              (item) => item.globalId === syncedJaarplanTraject.globalId
            )
            ? state.jaarplanTrajecten.map((item) =>
                item.globalId === syncedJaarplanTraject.globalId
                  ? mergeJaarplanTrajectRecord(item, syncedJaarplanTraject)
                  : item
              )
            : [...state.jaarplanTrajecten, syncedJaarplanTraject]
          : state.jaarplanTrajecten;

      return {
        trajecten: sortTrajecten(trajecten),
        jaarplanTrajecten: sortJaarplanTrajecten(jaarplanTrajecten),
        jaarplanMeasures: sortJaarplanMeasures(
          syncMeasureTrajectCode(
            state.jaarplanMeasures,
            normalizedTraject.globalId,
            normalizedTraject.trajectCode
          )
        ),
        selectedGlobalId: normalizedTraject.globalId,
        selectedObjectId: normalizedTraject.objectId,
      };
    }),
  removeTraject: (globalId) =>
    set((state) => {
      const trajecten = state.trajecten.filter((item) => item.globalId !== globalId);
      const selectedGlobalId =
        state.selectedGlobalId === globalId ? null : state.selectedGlobalId;

      return {
        trajecten,
        planningItems: state.planningItems.filter((item) => item.trajectGlobalId !== globalId),
        bulkSelectedTrajectIds: state.bulkSelectedTrajectIds.filter((item) => item !== globalId),
        selectedGlobalId,
        selectedObjectId:
          selectedGlobalId === null
            ? null
            : trajecten.find((item) => item.globalId === selectedGlobalId)?.objectId ?? null,
      };
    }),
  setPlanningItems: (planningItems) => set({ planningItems }),
  addPlanningItem: (item) =>
    set((state) => ({
      planningItems: [...state.planningItems, item],
    })),
  updatePlanningItem: (workId, partial) =>
    set((state) => ({
      planningItems: state.planningItems.map((item) =>
        item.workId === workId ? { ...item, ...partial } : item
      ),
    })),
  upsertJaarplanMeasure: (item) =>
    set((state) => {
      const measures = state.jaarplanMeasures.some(
        (current) => current.globalId === item.globalId
      )
        ? state.jaarplanMeasures.map((current) =>
            current.globalId === item.globalId ? item : current
          )
        : [...state.jaarplanMeasures, item];

      return {
        jaarplanMeasures: sortJaarplanMeasures(measures),
      };
    }),
  upsertJaarplanTraject: (item) =>
    set((state) => {
      const mergedJaarplanTraject = mergeJaarplanTrajectRecord(
        state.jaarplanTrajecten.find((current) => current.globalId === item.globalId),
        item
      );
      const trajecten = state.jaarplanTrajecten.some(
        (current) => current.globalId === mergedJaarplanTraject.globalId
      )
        ? state.jaarplanTrajecten.map((current) =>
            current.globalId === mergedJaarplanTraject.globalId
              ? mergedJaarplanTraject
              : current
          )
        : [...state.jaarplanTrajecten, mergedJaarplanTraject];
      const syncedTraject = mergeTrajectFromJaarplan(
        state.trajecten.find((current) => current.globalId === mergedJaarplanTraject.globalId),
        mergedJaarplanTraject
      );
      const spatialTrajecten = syncedTraject
        ? state.trajecten.some((current) => current.globalId === syncedTraject.globalId)
          ? state.trajecten.map((current) =>
              current.globalId === syncedTraject.globalId ? syncedTraject : current
            )
          : [...state.trajecten, syncedTraject]
        : state.trajecten;

      return {
        jaarplanTrajecten: sortJaarplanTrajecten(trajecten),
        jaarplanMeasures: sortJaarplanMeasures(
          syncMeasureTrajectCode(
            state.jaarplanMeasures,
            mergedJaarplanTraject.globalId,
            mergedJaarplanTraject.trajectCode
          )
        ),
        trajecten: sortTrajecten(spatialTrajecten),
        selectedObjectId:
          state.selectedGlobalId === mergedJaarplanTraject.globalId
            ? syncedTraject?.objectId ?? state.selectedObjectId
            : state.selectedObjectId,
      };
    }),
  setJaarplanMeasures: (items) =>
    set(() => ({
      jaarplanMeasures: sortJaarplanMeasures(items),
    })),
  removeJaarplanMeasure: (globalId) =>
    set((state) => ({
      jaarplanMeasures: state.jaarplanMeasures.filter((item) => item.globalId !== globalId),
    })),
  setJaarplanFilters: (filters) =>
    set((state) => ({
      jaarplanFilters: {
        ...state.jaarplanFilters,
        ...filters,
      },
    })),
  resetJaarplanFilters: () =>
    set(() => ({
      jaarplanFilters: DEFAULT_JAARPLAN_SHARED_FILTERS,
    })),
  selectJaarplanTraject: (globalId, source) =>
    set(() => ({
      selectedJaarplanTrajectId: globalId,
      mapSelectionSource: source,
    })),
  setJaarplanZoomTargetGlobalId: (jaarplanZoomTargetGlobalId) =>
    set({ jaarplanZoomTargetGlobalId }),
  setJaarplanMapViewState: (jaarplanMapViewState) => set({ jaarplanMapViewState }),
  selectTraject: (globalId, source) =>
    set((state) => {
      const selectedTraject = state.trajecten.find(
        (traject) => traject.globalId === globalId
      );

      return {
        selectedGlobalId: globalId,
        selectedObjectId: selectedTraject?.objectId ?? null,
        mapSelectionSource: source,
      };
    }),
  setBulkSelectionMode: (bulkSelectionMode) => set({ bulkSelectionMode }),
  toggleBulkSelectedTraject: (globalId) =>
    set((state) => ({
      bulkSelectedTrajectIds: state.bulkSelectedTrajectIds.includes(globalId)
        ? state.bulkSelectedTrajectIds.filter((item) => item !== globalId)
        : [...state.bulkSelectedTrajectIds, globalId],
    })),
  setBulkSelectedTrajects: (globalIds) =>
    set(() => ({
      bulkSelectedTrajectIds: [...new Set(globalIds)],
    })),
  clearBulkSelectedTrajects: () => set({ bulkSelectedTrajectIds: [] }),
  setEditingMode: (editingMode) => set({ editingMode }),
  setAttributeDrawerOpen: (attributeDrawerOpen) => set({ attributeDrawerOpen }),
  setPendingGeometryEdits: (pendingGeometryEdits) => set({ pendingGeometryEdits }),
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  setZoomTargetGlobalId: (zoomTargetGlobalId) => set({ zoomTargetGlobalId }),
  setMapViewState: (mapViewState) => set({ mapViewState }),
  setLayerVisibility: (title, visible) =>
    set((state) => ({
      layerVisibilityByTitle: {
        ...state.layerVisibilityByTitle,
        [title]: visible,
      },
    })),
}));

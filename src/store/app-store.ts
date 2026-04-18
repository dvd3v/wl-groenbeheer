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
  setJaarplanMeasures: (items: JaarplanMeasureRecord[]) => void;
  removeJaarplanMeasure: (globalId: string) => void;
  setJaarplanFilters: (filters: Partial<SharedJaarplanFilters>) => void;
  resetJaarplanFilters: () => void;
  selectJaarplanTraject: (globalId: string | null, source: MapSelectionSource) => void;
  setJaarplanZoomTargetGlobalId: (globalId: string | null) => void;
  setJaarplanMapViewState: (viewState: MapViewState | null) => void;
  selectTraject: (globalId: string | null, source: MapSelectionSource) => void;
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
      const normalizedTraject = normalizeTraject(traject);
      const trajecten = state.trajecten.some(
        (item) => item.globalId === normalizedTraject.globalId
      )
        ? state.trajecten.map((item) =>
            item.globalId === normalizedTraject.globalId ? normalizedTraject : item
          )
        : [...state.trajecten, normalizedTraject];

      return {
        trajecten: sortTrajecten(trajecten),
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

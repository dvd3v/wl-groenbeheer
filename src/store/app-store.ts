import { create } from "zustand";
import type {
  EditingMode,
  JaarplanFilters,
  MapSelectionSource,
  MapViewState,
  PendingGeometryEdits,
  PlannedWorkItem,
  TrajectRecord,
} from "../types/app";

interface AppState {
  trajecten: TrajectRecord[];
  planningItems: PlannedWorkItem[];
  initialStatusByGlobalId: Record<string, number>;
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
  upsertTraject: (traject: TrajectRecord) => void;
  setPlanningItems: (items: PlannedWorkItem[]) => void;
  updatePlanningItem: (workId: string, partial: Partial<PlannedWorkItem>) => void;
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
  handeling: "all",
  periode: "all",
  search: "",
};

function sortTrajecten(trajecten: TrajectRecord[]) {
  return [...trajecten].sort((left, right) =>
    left.hoofdobjec.localeCompare(right.hoofdobjec, "nl")
  );
}

function normalizeTraject(traject: TrajectRecord): TrajectRecord {
  return {
    ...traject,
    status: Number(traject.status),
  };
}

export const useAppStore = create<AppState>((set) => ({
  trajecten: [],
  planningItems: [],
  initialStatusByGlobalId: {},
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
  setPlanningItems: (planningItems) => set({ planningItems }),
  updatePlanningItem: (workId, partial) =>
    set((state) => ({
      planningItems: state.planningItems.map((item) =>
        item.workId === workId ? { ...item, ...partial } : item
      ),
    })),
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

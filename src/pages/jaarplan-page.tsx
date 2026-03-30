import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  MapPinned,
  Minus,
  Search,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NativeSelect } from "../components/ui/native-select";
import { Textarea } from "../components/ui/textarea";
import {
  PLANNING_STATUS_COLORS,
  REGIME_COLOR_GROUPS,
  REGIME_TEMPLATE_LIBRARY,
  STATUS_OPTIONS,
  WERKZAAMHEDEN_SCHEMA,
  getRegimeColorGroup,
} from "../data/datamodel";
import { mockPlanningService } from "../services/mock-planning-service";
import { useAppStore } from "../store/app-store";
import type {
  PlannedWorkItem,
  PlanningWorkCreateInput,
  PlanningRegistrationStatus,
  TrajectRecord,
  WorkSide,
} from "../types/app";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function createWorkFormFromTemplate(regime: number): PlanningWorkCreateInput {
  const template =
    REGIME_TEMPLATE_LIBRARY.find((item) => item.regime === regime) ?? REGIME_TEMPLATE_LIBRARY[0];

  return {
    regime: template.regime,
    werkzaamheid: template.werkzaamheid,
    toelichting: template.toelichting,
    doel: "",
    zijde: "N.v.t.",
    bewerkingspercentage: template.bewerkingspercentage?.trim() || "N.v.t.",
    afvoeren: template.afvoeren?.trim() || "N.v.t.",
    werkperiodeCode: template.werkperiodeCode || "1",
    status: "gepland",
    datumGepland: "",
    datumUitgevoerd: "",
    opmerking: "",
  };
}

function applyWerkzaamheidTemplate(
  current: PlanningWorkCreateInput,
  werkzaamheid: string
): PlanningWorkCreateInput {
  const template = REGIME_TEMPLATE_LIBRARY.find((item) => item.werkzaamheid === werkzaamheid);
  if (!template) {
    return {
      ...current,
      werkzaamheid,
    };
  }

  return {
    ...current,
    regime: template.regime,
    werkzaamheid: template.werkzaamheid,
    toelichting: template.toelichting,
    bewerkingspercentage: template.bewerkingspercentage?.trim() || current.bewerkingspercentage,
    afvoeren: template.afvoeren?.trim() || current.afvoeren,
    werkperiodeCode: template.werkperiodeCode || current.werkperiodeCode,
  };
}

function reviewStatusLabel(statusValue: number): string {
  return STATUS_OPTIONS.find((option) => option.value === Number(statusValue))?.label ?? "Onbekend";
}

function reviewStatusColor(statusValue: number): string {
  return STATUS_OPTIONS.find((option) => option.value === Number(statusValue))?.color ?? "#9298ad";
}

function formatPlanningStatus(status: PlanningRegistrationStatus): string {
  return status.replace(/_/g, " ");
}

function SideBadge({ side }: { side: WorkSide }) {
  const icon =
    side === "L" ? (
      <ArrowLeft className="h-3.5 w-3.5" />
    ) : side === "R" ? (
      <ArrowRight className="h-3.5 w-3.5" />
    ) : side === "Beide" ? (
      <ArrowLeftRight className="h-3.5 w-3.5" />
    ) : (
      <Minus className="h-3.5 w-3.5" />
    );

  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-white px-2 py-1 text-[10px] font-semibold text-text">
      {icon}
      {side}
    </span>
  );
}

function RegimeBadge({ regime }: { regime: number }) {
  const palette = getRegimeColorGroup(regime);

  return (
    <span
      className="inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-semibold"
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        borderColor: palette.border,
      }}
      title={palette.label}
    >
      {regime}
    </span>
  );
}

export function JaarplanPage() {
  const navigate = useNavigate();
  const trajecten = useAppStore((state) => state.trajecten);
  const planningItems = useAppStore((state) => state.planningItems);
  const initialStatusByGlobalId = useAppStore((state) => state.initialStatusByGlobalId);
  const filters = useAppStore((state) => state.filters);
  const selectedGlobalId = useAppStore((state) => state.selectedGlobalId);
  const setFilters = useAppStore((state) => state.setFilters);
  const selectTraject = useAppStore((state) => state.selectTraject);
  const setZoomTargetGlobalId = useAppStore((state) => state.setZoomTargetGlobalId);
  const addPlanningItem = useAppStore((state) => state.addPlanningItem);
  const updatePlanningItem = useAppStore((state) => state.updatePlanningItem);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedWorkIds, setExpandedWorkIds] = useState<Record<string, boolean>>({});
  const [addingByTrajectId, setAddingByTrajectId] = useState<Record<string, boolean>>({});
  const [newWorkByTrajectId, setNewWorkByTrajectId] = useState<
    Record<string, PlanningWorkCreateInput>
  >({});
  const [savingWorkId, setSavingWorkId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const werkzaamheden = useMemo(
    () => [...new Set(planningItems.map((item) => item.werkzaamheid))].sort((a, b) => a.localeCompare(b, "nl")),
    [planningItems]
  );
  const werkperiodes = useMemo(
    () =>
      Array.from(
        new Map(
          planningItems.map((item) => [item.werkperiodeCode, item.werkperiodeLabel])
        ).entries()
      ).sort((left, right) => Number(left[0]) - Number(right[0])),
    [planningItems]
  );

  const groupedRows = useMemo(() => {
    const trajectById = new Map(trajecten.map((traject) => [traject.globalId, traject]));
    const groups = new Map<
      string,
      {
        traject: TrajectRecord;
        items: PlannedWorkItem[];
        aggregatePlanningStatus: PlanningRegistrationStatus;
      }
    >();

    planningItems.forEach((item) => {
      const traject = trajectById.get(item.trajectGlobalId);
      if (!traject) {
        return;
      }

      const searchNeedle = filters.search.trim().toLowerCase();
      const matchesSearch =
        !searchNeedle ||
        traject.hoofdobjec.toLowerCase().includes(searchNeedle) ||
        traject.modelType.toLowerCase().includes(searchNeedle) ||
        item.trajectCode.toLowerCase().includes(searchNeedle) ||
        item.werkzaamheid.toLowerCase().includes(searchNeedle) ||
        item.toelichting.toLowerCase().includes(searchNeedle) ||
        item.doel.toLowerCase().includes(searchNeedle);
      const matchesStatus =
        filters.planningStatus === "all" || item.status === filters.planningStatus;
      const matchesTrajectStatus =
        filters.trajectStatus === "all" ||
        String(traject.status) === filters.trajectStatus;
      const matchesWerkzaamheid =
        filters.werkzaamheid === "all" || item.werkzaamheid === filters.werkzaamheid;
      const matchesWerkperiode =
        filters.werkperiode === "all" || item.werkperiodeCode === filters.werkperiode;

      if (
        !matchesSearch ||
        !matchesStatus ||
        !matchesTrajectStatus ||
        !matchesWerkzaamheid ||
        !matchesWerkperiode
      ) {
        return;
      }

      if (!groups.has(item.trajectGlobalId)) {
        groups.set(item.trajectGlobalId, {
          traject,
          items: [],
          aggregatePlanningStatus: "gepland",
        });
      }

      groups.get(item.trajectGlobalId)!.items.push(item);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        aggregatePlanningStatus: mockPlanningService.getAggregateTrajectPlanningStatus(
          group.items,
          group.traject.globalId
        ),
      }))
      .sort((left, right) =>
        left.traject.hoofdobjec.localeCompare(right.traject.hoofdobjec, "nl")
      );
  }, [filters, planningItems, trajecten]);

  const totalWerkzaamheden = groupedRows.reduce((sum, group) => sum + group.items.length, 0);
  const changedTrajecten = trajecten.filter(
    (traject) =>
      initialStatusByGlobalId[traject.globalId] !== undefined &&
      initialStatusByGlobalId[traject.globalId] !== traject.status
  ).length;
  const countsByPlanningStatus = planningItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalPages = Math.max(1, Math.ceil(groupedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const allCollapsed = groupedRows.every(
    (group) => (collapsed[group.traject.globalId] ?? true) === true
  );
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedRows.slice(start, start + pageSize);
  }, [currentPage, groupedRows, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.planningStatus,
    filters.search,
    filters.trajectStatus,
    filters.werkperiode,
    filters.werkzaamheid,
    pageSize,
  ]);

  async function handlePlanningUpdate(
    workId: string,
    updates: Partial<Pick<PlannedWorkItem, "status" | "datumGepland" | "datumUitgevoerd" | "opmerking">>
  ) {
    setSavingWorkId(workId);
    const registration = await mockPlanningService.saveRegistration(workId, updates);
    updatePlanningItem(workId, registration);
    setSavingWorkId((current) => (current === workId ? null : current));
  }

  async function handleCreateWorkItem(traject: TrajectRecord) {
    const form = newWorkByTrajectId[traject.globalId];
    if (!form) {
      return;
    }

    const createdItem = await mockPlanningService.createWorkItem(traject, form);
    addPlanningItem(createdItem);
    setAddingByTrajectId((current) => ({
      ...current,
      [traject.globalId]: false,
    }));
    setNewWorkByTrajectId((current) => ({
      ...current,
      [traject.globalId]: createWorkFormFromTemplate(form.regime),
    }));
    setExpandedWorkIds((current) => ({
      ...current,
      [createdItem.workId]: true,
    }));
  }

  return (
    <div className="app-scrollbar h-full overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="glass-panel rounded-card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
            Jaarplan
          </div>
          <h1 className="mt-2 text-2xl font-bold text-text">
            Trajecten met dummy related werkzaamheden
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            {REGIME_COLOR_GROUPS.map((group) => (
              <span
                key={group.id}
                className="inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  backgroundColor: group.background,
                  color: group.foreground,
                  borderColor: group.border,
                }}
              >
                {group.label}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-text">{groupedRows.length}</div>
            <div className="mt-1 text-[11px] text-textMuted">Trajectgroepen</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-text">{totalWerkzaamheden}</div>
            <div className="mt-1 text-[11px] text-textMuted">Werkzaamheden</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-violet">
              {countsByPlanningStatus.gepland ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-textMuted">Planning: gepland</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-warning">
              {countsByPlanningStatus.in_uitvoering ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-textMuted">Planning: in uitvoering</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-success">{changedTrajecten}</div>
            <div className="mt-1 text-[11px] text-textMuted">Trajectstatus gewijzigd</div>
          </div>
        </section>

        <section className="glass-panel rounded-card p-4">
          <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              <Input
                className="pl-9"
                value={filters.search}
                onChange={(event) => setFilters({ search: event.target.value })}
                placeholder="Zoek op traject, werkzaamheid, toelichting of doel..."
              />
            </label>
            <NativeSelect
              value={filters.trajectStatus}
              onChange={(event) => setFilters({ trajectStatus: event.target.value })}
            >
              <option value="all">Alle traject statussen</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={String(status.value)}>
                  {status.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.planningStatus}
              onChange={(event) =>
                setFilters({
                  planningStatus: event.target.value as typeof filters.planningStatus,
                })
              }
            >
              <option value="all">Alle planning statussen</option>
              {Object.keys(PLANNING_STATUS_COLORS).map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.werkzaamheid}
              onChange={(event) => setFilters({ werkzaamheid: event.target.value })}
            >
              <option value="all">Alle werkzaamheden</option>
              {werkzaamheden.map((werkzaamheid) => (
                <option key={werkzaamheid} value={werkzaamheid}>
                  {werkzaamheid}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.werkperiode}
              onChange={(event) => setFilters({ werkperiode: event.target.value })}
            >
              <option value="all">Alle werkperiodes</option>
              {werkperiodes.map(([code, label]) => (
                <option key={code} value={code}>
                  {code}: {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-border bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-[12px] text-textDim">
              Pagina {currentPage} van {totalPages} · {groupedRows.length} trajecten in resultaat
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.12em] text-textMuted">
                Per pagina
              </span>
              <Button
                variant="ghost"
                onClick={() =>
                  setCollapsed(
                    Object.fromEntries(
                      groupedRows.map((group) => [group.traject.globalId, false])
                    )
                  )
                }
                disabled={groupedRows.length === 0}
              >
                Alles uitklappen
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setCollapsed(
                    Object.fromEntries(
                      groupedRows.map((group) => [group.traject.globalId, true])
                    )
                  )
                }
                disabled={groupedRows.length === 0 || allCollapsed}
              >
                Alles inklappen
              </Button>
              <NativeSelect
                className="h-9 py-0 text-[12px]"
                value={String(pageSize)}
                onChange={(event) =>
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                }
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="ghost"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
              >
                Vorige
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
              >
                Volgende
              </Button>
            </div>
          </div>
          <div className="app-scrollbar overflow-auto">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-surfaceAlt">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Traject</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Model type</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Trajectstatus</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Planning</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Werkzaamheden</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((group) => {
                  const isCollapsed = collapsed[group.traject.globalId] ?? true;
                  const reviewColor = reviewStatusColor(group.traject.status);
                  const changed =
                    initialStatusByGlobalId[group.traject.globalId] !== undefined &&
                    initialStatusByGlobalId[group.traject.globalId] !== group.traject.status;
                  return (
                    <Fragment key={group.traject.globalId}>
                      <tr
                        className={`border-b border-border/80 ${selectedGlobalId === group.traject.globalId ? "bg-violet/5" : ""
                          }`}
                      >
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left"
                            onClick={() =>
                              setCollapsed((current) => ({
                                ...current,
                                [group.traject.globalId]: !isCollapsed,
                              }))
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-textMuted" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-textMuted" />
                            )}
                            <div>
                              <div className="font-medium text-text">
                                {group.traject.hoofdobjec || `Traject ${group.traject.objectId}`}
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-textMuted">
                                {group.traject.globalId.slice(0, 8)}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-textDim">{group.traject.modelType}</td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex rounded-pill px-2 py-1 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: reviewColor }}
                          >
                            {reviewStatusLabel(group.traject.status)}
                          </span>
                          {changed ? (
                            <span className="ml-2 rounded-pill bg-violet/10 px-2 py-1 text-[10px] font-semibold text-violet">
                              gewijzigd
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex rounded-pill px-2 py-1 text-[10px] font-semibold text-white"
                            style={{
                              backgroundColor:
                                PLANNING_STATUS_COLORS[
                                group.aggregatePlanningStatus as keyof typeof PLANNING_STATUS_COLORS
                                ],
                            }}
                          >
                            {formatPlanningStatus(group.aggregatePlanningStatus)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-textDim">{group.items.length}</td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            variant="outline"
                            onClick={() => {
                              selectTraject(group.traject.globalId, "table");
                              setZoomTargetGlobalId(group.traject.globalId);
                              navigate("/map");
                            }}
                          >
                            <MapPinned className="h-3.5 w-3.5" />
                            View on map
                          </Button>
                        </td>
                      </tr>

                      {!isCollapsed ? (
                        <tr className="border-b border-border/60 bg-surfaceAlt/40">
                          <td colSpan={6} className="px-3 py-4">
                            <div className="overflow-hidden rounded-card border border-border bg-white">
                              <div className="app-scrollbar overflow-auto">
                                <table className="min-w-[1320px] w-full border-collapse text-[12px]">
                                  <thead className="bg-surfaceAlt">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Regime
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Werkzaamheden
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Doel
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Zijde
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Bewerkingspercentage
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Afvoeren
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Werkperiode
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Datum gepland
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Datum uitgevoerd
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Planning
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold text-textDim">
                                        Details
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item) => {
                                      const detailsOpen = expandedWorkIds[item.workId] ?? false;

                                      return (
                                        <Fragment key={item.workId}>
                                          <tr className="border-t border-border/70 align-top">
                                            <td className="px-3 py-3">
                                              <RegimeBadge regime={item.regime} />
                                            </td>
                                            <td className="px-3 py-3">
                                              <div className="font-medium text-text">
                                                {item.werkzaamheid}
                                              </div>
                                              <div className="mt-1 text-[11px] text-textMuted">
                                                Toelichting en opmerking in details
                                              </div>
                                            </td>
                                            <td className="px-3 py-3 text-textDim">
                                              {item.doel || "—"}
                                            </td>
                                            <td className="px-3 py-3">
                                              <SideBadge side={item.zijde} />
                                            </td>
                                            <td className="px-3 py-3 text-textDim">
                                              {item.bewerkingspercentage}
                                            </td>
                                            <td className="px-3 py-3 text-textDim">
                                              {item.afvoeren}
                                            </td>
                                            <td className="px-3 py-3">
                                              <span
                                                className="inline-flex rounded-pill border border-border bg-white px-2 py-1 text-[10px] font-semibold text-text"
                                                title={item.werkperiodeLabel}
                                              >
                                                {item.werkperiodeCode}
                                              </span>
                                            </td>
                                            <td className="px-3 py-3">
                                              <Input
                                                type="date"
                                                value={item.datumGepland}
                                                onChange={(event) => {
                                                  void handlePlanningUpdate(item.workId, {
                                                    datumGepland: event.target.value,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="px-3 py-3">
                                              <Input
                                                type="date"
                                                value={item.datumUitgevoerd}
                                                onChange={(event) => {
                                                  void handlePlanningUpdate(item.workId, {
                                                    datumUitgevoerd: event.target.value,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="px-3 py-3">
                                              <NativeSelect
                                                className="h-9 py-0 text-[11px]"
                                                value={item.status}
                                                onChange={(event) => {
                                                  void handlePlanningUpdate(item.workId, {
                                                    status:
                                                      event.target.value as PlannedWorkItem["status"],
                                                  });
                                                }}
                                              >
                                                {Object.keys(PLANNING_STATUS_COLORS).map((status) => (
                                                  <option key={status} value={status}>
                                                    {status.replace(/_/g, " ")}
                                                  </option>
                                                ))}
                                              </NativeSelect>
                                            </td>
                                            <td className="px-3 py-3">
                                              <Button
                                                variant={detailsOpen ? "outline" : "ghost"}
                                                onClick={() =>
                                                  setExpandedWorkIds((current) => ({
                                                    ...current,
                                                    [item.workId]: !detailsOpen,
                                                  }))
                                                }
                                              >
                                                {detailsOpen ? "Sluit" : "Open"}
                                              </Button>
                                            </td>
                                          </tr>

                                          {detailsOpen ? (
                                            <tr className="border-t border-border/50 bg-surfaceAlt/60">
                                              <td colSpan={11} className="px-4 py-4">
                                                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                                                  <div className="rounded-card border border-border bg-white p-4">
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                                                      Toelichting
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-line text-[12px] leading-6 text-textDim">
                                                      {item.toelichting}
                                                    </p>
                                                  </div>

                                                  <div className="space-y-3 rounded-card border border-border bg-white p-4">
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                      <div>
                                                        <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                                                          Werkperiode
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-text">
                                                          {item.werkperiodeCode}: {item.werkperiodeLabel}
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                                                          Planning
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-text">
                                                          {formatPlanningStatus(item.status)}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <label className="block space-y-1.5">
                                                      <span className="text-[11px] text-textDim">
                                                        Opmerking
                                                      </span>
                                                      <Textarea
                                                        rows={4}
                                                        value={item.opmerking}
                                                        onChange={(event) => {
                                                          void handlePlanningUpdate(item.workId, {
                                                            opmerking: event.target.value,
                                                          });
                                                        }}
                                                        placeholder="Voeg een interne notitie toe"
                                                      />
                                                    </label>

                                                    {savingWorkId === item.workId ? (
                                                      <div className="text-[11px] text-textMuted">
                                                        Werkzaamheid opslaan...
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          ) : null}
                                        </Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="mt-3 rounded-card border border-border bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                                    Nieuwe werkzaamheid
                                  </div>
                                </div>
                                <Button
                                  variant={addingByTrajectId[group.traject.globalId] ? "outline" : "secondary"}
                                  onClick={() => {
                                    setAddingByTrajectId((current) => ({
                                      ...current,
                                      [group.traject.globalId]:
                                        !current[group.traject.globalId],
                                    }));
                                    setNewWorkByTrajectId((current) => ({
                                      ...current,
                                      [group.traject.globalId]:
                                        current[group.traject.globalId] ??
                                        createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime),
                                    }));
                                  }}
                                >
                                  {addingByTrajectId[group.traject.globalId]
                                    ? "Sluit"
                                    : "Toevoegen"}
                                </Button>
                              </div>

                              {addingByTrajectId[group.traject.globalId] ? (
                                <div className="mt-3 grid gap-2 lg:grid-cols-4">
                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Regime</span>
                                    <NativeSelect
                                      value={String(newWorkByTrajectId[group.traject.globalId]?.regime ?? 1)}
                                      onChange={(event) => {
                                        const next = createWorkFormFromTemplate(Number(event.target.value));
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...next,
                                            doel: current[group.traject.globalId]?.doel ?? next.doel,
                                            zijde: current[group.traject.globalId]?.zijde ?? next.zijde,
                                            status: current[group.traject.globalId]?.status ?? next.status,
                                            datumGepland:
                                              current[group.traject.globalId]?.datumGepland ?? "",
                                            datumUitgevoerd:
                                              current[group.traject.globalId]?.datumUitgevoerd ?? "",
                                            opmerking: current[group.traject.globalId]?.opmerking ?? "",
                                          },
                                        }));
                                      }}
                                    >
                                      {REGIME_TEMPLATE_LIBRARY.map((item) => (
                                        <option key={item.regime} value={item.regime}>
                                          {item.regime}: {item.werkzaamheid}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Werkzaamheden</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.werkzaamheid ?? ""}
                                      onChange={(event) => {
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: applyWerkzaamheidTemplate(
                                            current[group.traject.globalId] ??
                                            createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime),
                                            event.target.value
                                          ),
                                        }));
                                      }}
                                    >
                                      {WERKZAAMHEDEN_SCHEMA.werkzaamheden.map((werkzaamheid) => (
                                        <option key={werkzaamheid} value={werkzaamheid}>
                                          {werkzaamheid}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Doel</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.doel ?? ""}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            doel: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      <option value="">Niet ingevuld</option>
                                      {WERKZAAMHEDEN_SCHEMA.doel.map((doel) => (
                                        <option key={doel} value={doel}>
                                          {doel}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Zijde</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.zijde ?? "N.v.t."}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            zijde: event.target.value as WorkSide,
                                          },
                                        }))
                                      }
                                    >
                                      {WERKZAAMHEDEN_SCHEMA.zijde.map((zijde) => (
                                        <option key={zijde} value={zijde}>
                                          {zijde}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">
                                      Bewerkingspercentage
                                    </span>
                                    <NativeSelect
                                      value={
                                        newWorkByTrajectId[group.traject.globalId]?.bewerkingspercentage ??
                                        "N.v.t."
                                      }
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            bewerkingspercentage: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {WERKZAAMHEDEN_SCHEMA.bewerkingspercentage.map((value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Afvoeren</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.afvoeren ?? "N.v.t."}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            afvoeren: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {WERKZAAMHEDEN_SCHEMA.afvoeren.map((value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Werkperiode</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.werkperiodeCode ?? "1"}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            werkperiodeCode: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {WERKZAAMHEDEN_SCHEMA.werkperiode.map((value) => {
                                        const [code, label] = value.split(": ");
                                        return (
                                          <option key={code} value={code}>
                                            {code}: {label}
                                          </option>
                                        );
                                      })}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Datum gepland</span>
                                    <Input
                                      type="date"
                                      value={newWorkByTrajectId[group.traject.globalId]?.datumGepland ?? ""}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            datumGepland: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Datum uitgevoerd</span>
                                    <Input
                                      type="date"
                                      value={newWorkByTrajectId[group.traject.globalId]?.datumUitgevoerd ?? ""}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            datumUitgevoerd: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Planning status</span>
                                    <NativeSelect
                                      value={newWorkByTrajectId[group.traject.globalId]?.status ?? "gepland"}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            status: event.target.value as PlanningRegistrationStatus,
                                          },
                                        }))
                                      }
                                    >
                                      {Object.keys(PLANNING_STATUS_COLORS).map((status) => (
                                        <option key={status} value={status}>
                                          {status.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </label>

                                  <label className="space-y-1.5 lg:col-span-2">
                                    <span className="text-[11px] text-textDim">Toelichting</span>
                                    <Textarea
                                      rows={3}
                                      value={newWorkByTrajectId[group.traject.globalId]?.toelichting ?? ""}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            toelichting: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>

                                  <label className="space-y-1.5 lg:col-span-2">
                                    <span className="text-[11px] text-textDim">Opmerking</span>
                                    <Textarea
                                      rows={3}
                                      value={newWorkByTrajectId[group.traject.globalId]?.opmerking ?? ""}
                                      onChange={(event) =>
                                        setNewWorkByTrajectId((current) => ({
                                          ...current,
                                          [group.traject.globalId]: {
                                            ...(current[group.traject.globalId] ??
                                              createWorkFormFromTemplate(REGIME_TEMPLATE_LIBRARY[0].regime)),
                                            opmerking: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </label>

                                  <div className="lg:col-span-4 flex justify-end">
                                    <Button
                                      onClick={() => {
                                        void handleCreateWorkItem(group.traject);
                                      }}
                                    >
                                      Opslaan als nieuwe werkzaamheid
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-[12px] text-textDim">
              Toon trajecten {(currentPage - 1) * pageSize + 1}
              {" - "}
              {Math.min(currentPage * pageSize, groupedRows.length)} van {groupedRows.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
              >
                Vorige
              </Button>
              <div className="rounded-pill border border-border px-3 py-1 text-[11px] text-textDim">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="ghost"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
              >
                Volgende
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

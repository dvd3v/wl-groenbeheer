import { ChevronDown, ChevronRight, MapPinned, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NativeSelect } from "../components/ui/native-select";
import { PLANNING_STATUS_COLORS, STATUS_OPTIONS } from "../data/datamodel";
import { mockPlanningService } from "../services/mock-planning-service";
import { useAppStore } from "../store/app-store";
import type { PlannedWorkItem, TrajectRecord } from "../types/app";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function reviewStatusLabel(statusValue: number): string {
  return STATUS_OPTIONS.find((option) => option.value === Number(statusValue))?.label ?? "Onbekend";
}

function reviewStatusColor(statusValue: number): string {
  return STATUS_OPTIONS.find((option) => option.value === Number(statusValue))?.color ?? "#9298ad";
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
  const updatePlanningItem = useAppStore((state) => state.updatePlanningItem);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const handelingen = useMemo(
    () => [...new Set(planningItems.map((item) => item.handeling))].sort(),
    [planningItems]
  );
  const periodes = useMemo(
    () =>
      [...new Set(planningItems.map((item) => String(item.periode)))]
        .sort((left, right) => Number(left) - Number(right)),
    [planningItems]
  );

  const groupedRows = useMemo(() => {
    const trajectById = new Map(trajecten.map((traject) => [traject.globalId, traject]));
    const groups = new Map<
      string,
      { traject: TrajectRecord; items: PlannedWorkItem[]; aggregatePlanningStatus: string }
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
        item.handeling.toLowerCase().includes(searchNeedle) ||
        item.doel.toLowerCase().includes(searchNeedle);
      const matchesStatus =
        filters.planningStatus === "all" || item.status === filters.planningStatus;
      const matchesTrajectStatus =
        filters.trajectStatus === "all" ||
        String(traject.status) === filters.trajectStatus;
      const matchesHandeling =
        filters.handeling === "all" || item.handeling === filters.handeling;
      const matchesPeriode =
        filters.periode === "all" || String(item.periode) === filters.periode;

      if (
        !matchesSearch ||
        !matchesStatus ||
        !matchesTrajectStatus ||
        !matchesHandeling ||
        !matchesPeriode
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

  const totalWerkzaamheden = groupedRows.reduce(
    (sum, group) => sum + group.items.length,
    0
  );
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
    filters.handeling,
    filters.periode,
    filters.planningStatus,
    filters.search,
    filters.trajectStatus,
    pageSize,
  ]);

  async function handlePlanningStatusChange(workId: string, status: PlannedWorkItem["status"]) {
    const registration = await mockPlanningService.saveRegistration(workId, { status });
    updatePlanningItem(workId, registration);
  }

  return (
    <div className="app-scrollbar h-full overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="glass-panel rounded-card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
            Jaarplan
          </div>
          <h1 className="mt-2 text-2xl font-bold text-text">
            Trajecten met uitklapbare werkzaamheden
          </h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-6 text-textDim">
            Het jaarplan volgt nu de Groencontract-demo-opzet: per traject meerdere
            werkzaamheden, met een aparte registratiestatus per planningsregel.
          </p>
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
                placeholder="Zoek op traject, modeltype, handeling of doel..."
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
              value={filters.handeling}
              onChange={(event) => setFilters({ handeling: event.target.value })}
            >
              <option value="all">Alle handelingen</option>
              {handelingen.map((handeling) => (
                <option key={handeling} value={handeling}>
                  {handeling}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.periode}
              onChange={(event) => setFilters({ periode: event.target.value })}
            >
              <option value="all">Alle periodes</option>
              {periodes.map((periode) => (
                <option key={periode} value={periode}>
                  Periode {periode}
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
                        className={`border-b border-border/80 ${
                          selectedGlobalId === group.traject.globalId ? "bg-violet/5" : ""
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
                            {group.aggregatePlanningStatus.replace(/_/g, " ")}
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
                      {!isCollapsed &&
                        group.items.map((item) => (
                          <tr
                            key={item.workId}
                            className="border-b border-border/60 bg-surfaceAlt/40"
                          >
                            <td className="px-3 py-3 pl-10 text-textDim">
                              <div className="font-medium text-text">{item.handeling}</div>
                              <div className="mt-0.5 text-[11px]">
                                {item.werkwijze} · {item.doel}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-textDim">
                              {item.zijde} · P{item.periode}
                            </td>
                            <td className="px-3 py-3 text-textDim">{item.percentage}%</td>
                            <td className="px-3 py-3">
                              <NativeSelect
                                className="h-8 py-0 text-[11px]"
                                value={item.status}
                                onChange={(event) => {
                                  void handlePlanningStatusChange(
                                    item.workId,
                                    event.target.value as PlannedWorkItem["status"]
                                  );
                                }}
                              >
                                {Object.keys(PLANNING_STATUS_COLORS).map((status) => (
                                  <option key={status} value={status}>
                                    {status.replace(/_/g, " ")}
                                  </option>
                                ))}
                              </NativeSelect>
                            </td>
                            <td className="px-3 py-3 text-textDim">Ruimen: {item.ruimen}</td>
                            <td className="px-3 py-3">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  selectTraject(group.traject.globalId, "table");
                                  setZoomTargetGlobalId(group.traject.globalId);
                                  navigate("/map");
                                }}
                              >
                                Open
                              </Button>
                            </td>
                          </tr>
                        ))}
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

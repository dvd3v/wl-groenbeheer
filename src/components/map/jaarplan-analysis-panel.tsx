import { AreaChart, CalendarRange, Filter, MousePointerClick, X } from "lucide-react";
import { Button } from "../ui/button";
import { NativeSelect } from "../ui/native-select";
import type {
  JaarplanTimeWindow,
  JaarplanTrajectRecord,
  MaatregelStatus,
} from "../../types/app";
import { getMaatregelStatusPalette } from "../jaarplan/maatregel-badges";

interface StatusBreakdownItem {
  status: MaatregelStatus;
  count: number;
}

interface JaarplanAnalysisPanelProps {
  filteredTrajectCount: number;
  selectedTrajects: JaarplanTrajectRecord[];
  selectedMeasureCount: number;
  planningTrajectCount: number;
  planningMeasureCount: number;
  timeWindow: JaarplanTimeWindow;
  timeWindowLabel: string;
  werkperiodeOptions: Array<{ value: string; label: string }>;
  statusBreakdown: StatusBreakdownItem[];
  onTimeWindowChange: (partial: Partial<JaarplanTimeWindow>) => void;
  onResetTimeWindow: () => void;
  onStartRectangleSelection: () => void;
  onSelectFiltered: () => void;
  onClearSelection: () => void;
  onFocusTraject: (globalId: string) => void;
}

export function JaarplanAnalysisPanel({
  filteredTrajectCount,
  selectedTrajects,
  selectedMeasureCount,
  planningTrajectCount,
  planningMeasureCount,
  timeWindow,
  timeWindowLabel,
  werkperiodeOptions,
  statusBreakdown,
  onTimeWindowChange,
  onResetTimeWindow,
  onStartRectangleSelection,
  onSelectFiltered,
  onClearSelection,
  onFocusTraject,
}: JaarplanAnalysisPanelProps) {
  const hasSelection = selectedTrajects.length > 0;

  return (
    <aside className="glass-panel absolute left-3 top-20 z-20 w-[360px] max-w-[calc(100vw-24px)] rounded-[22px] border border-white/70 p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
            GIS analyse
          </div>
          <div className="mt-1 text-[16px] font-semibold text-text">
            Selectie, relaties en planning
          </div>
          <div className="mt-1 text-[12px] leading-5 text-textDim">
            Werk met klikselectie, een getekend analysevlak of de huidige filterset.
          </div>
        </div>
        {hasSelection ? (
          <Button variant="ghost" onClick={onClearSelection}>
            <X className="h-3.5 w-3.5" />
            Wis
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onStartRectangleSelection}>
          <MousePointerClick className="h-3.5 w-3.5" />
          Teken selectie
        </Button>
        <Button variant="outline" onClick={onSelectFiltered} disabled={!filteredTrajectCount}>
          <Filter className="h-3.5 w-3.5" />
          Selecteer zichtbaar
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border bg-surfaceAlt/80 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">Kaartset</div>
          <div className="mt-1 text-[20px] font-semibold text-text">{filteredTrajectCount}</div>
          <div className="text-[11px] text-textDim">gefilterde trajecten</div>
        </div>
        <div className="rounded-[18px] border border-border bg-surfaceAlt/80 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">Selectie</div>
          <div className="mt-1 text-[20px] font-semibold text-text">{selectedTrajects.length}</div>
          <div className="text-[11px] text-textDim">trajecten in analyse</div>
        </div>
        <div className="rounded-[18px] border border-border bg-surfaceAlt/80 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">Relaties</div>
          <div className="mt-1 text-[20px] font-semibold text-text">{selectedMeasureCount}</div>
          <div className="text-[11px] text-textDim">gekoppelde maatregelen</div>
        </div>
      </div>

      <section className="mt-4 rounded-[18px] border border-border bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet">
              <CalendarRange className="h-3.5 w-3.5" />
              Planningvenster
            </div>
            <div className="mt-1 text-[13px] font-semibold text-text">{timeWindowLabel}</div>
            <div className="mt-1 text-[11px] text-textDim">
              De kaartlaag toont alleen trajecten met maatregelen die dit venster raken.
            </div>
          </div>
          <Button variant="ghost" onClick={onResetTimeWindow}>
            Reset
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] text-textDim">Van</span>
            <NativeSelect
              value={timeWindow.start}
              onChange={(event) => onTimeWindowChange({ start: event.target.value })}
            >
              {werkperiodeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] text-textDim">Tot</span>
            <NativeSelect
              value={timeWindow.end}
              onChange={(event) => onTimeWindowChange({ end: event.target.value })}
            >
              {werkperiodeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[16px] border border-border bg-surfaceAlt/70 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
              Overlay
            </div>
            <div className="mt-1 text-[18px] font-semibold text-text">{planningTrajectCount}</div>
            <div className="text-[11px] text-textDim">trajecten in dit venster</div>
          </div>
          <div className="rounded-[16px] border border-border bg-surfaceAlt/70 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
              Tijdlaag
            </div>
            <div className="mt-1 text-[18px] font-semibold text-text">{planningMeasureCount}</div>
            <div className="text-[11px] text-textDim">maatregelen actief in periode</div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[18px] border border-border bg-white px-4 py-4">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accentStrong">
          <AreaChart className="h-3.5 w-3.5" />
          Selectie-inzichten
        </div>

        {!hasSelection ? (
          <div className="mt-3 rounded-[16px] border border-dashed border-border bg-surfaceAlt/60 px-3 py-4 text-[12px] text-textDim">
            Klik op een traject of teken een selectie om relatie-informatie en bewerkbare maatregelen te openen.
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusBreakdown.length ? (
                statusBreakdown.map((item) => {
                  const palette = getMaatregelStatusPalette(item.status);
                  return (
                    <div
                      key={item.status}
                      className="rounded-pill border border-border bg-surfaceAlt px-3 py-1.5 text-[11px] text-text"
                    >
                      <span className={palette.textClassName}>{palette.label}</span> · {item.count}
                    </div>
                  );
                })
              ) : (
                <div className="text-[12px] text-textDim">Geen statusinformatie beschikbaar.</div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {selectedTrajects.slice(0, 6).map((traject) => (
                <button
                  key={traject.globalId}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[16px] border border-border bg-surfaceAlt/70 px-3 py-2 text-left transition hover:border-accent/40 hover:bg-accentSoft/30"
                  onClick={() => onFocusTraject(traject.globalId)}
                >
                  <div>
                    <div className="text-[12px] font-semibold text-text">{traject.trajectCode}</div>
                    <div className="text-[11px] text-textDim">
                      {traject.uitvoerderOnderhoud || "Geen uitvoerder"}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Open
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </aside>
  );
}

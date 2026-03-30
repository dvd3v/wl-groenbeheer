import { STATUS_OPTIONS } from "../../data/datamodel";

interface MapProgressPanelProps {
  countsByStatus: Record<number, number>;
  total: number;
}

export function MapProgressPanel({ countsByStatus, total }: MapProgressPanelProps) {
  const controleren = countsByStatus[1] ?? 0;
  const processed = Math.max(total - controleren, 0);
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
          Controle voortgang
        </div>
        <div className="mt-2 text-2xl font-bold text-text">{progress}%</div>
        <div className="text-[11px] text-textMuted">
          {processed} van {total} trajecten niet meer op Controleren
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-pill bg-surfaceAlt">
        <div
          className="h-full rounded-pill bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {STATUS_OPTIONS.map((status) => {
          const count = countsByStatus[status.value] ?? 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={status.value}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2 text-textDim">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                </span>
                <span className="font-medium text-text">{count}</span>
              </div>
              <div className="h-1.5 rounded-pill bg-surfaceAlt">
                <div
                  className="h-full rounded-pill"
                  style={{
                    width: `${width}%`,
                    backgroundColor: status.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

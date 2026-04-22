import {
  ArrowLeft,
  ArrowRight,
  Layers3,
  MapPinned,
  Save,
  Search,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import type { AttributeFormValues, StatusOption, TrajectRecord } from "../../types/app";
import type { TrajectNeighbourSummary, TrajectReviewSummary } from "../../services/traject-review-service";

interface TrajectReviewPanelProps {
  open: boolean;
  selectedTraject: TrajectRecord | null;
  pendingMode: "create" | "reshape" | null;
  draftValues: AttributeFormValues;
  statusOptions: StatusOption[];
  review: TrajectReviewSummary | null;
  saving: boolean;
  deleting: boolean;
  hasUnsavedChanges: boolean;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  hasNextPending: boolean;
  onDraftChange: <K extends keyof AttributeFormValues>(
    field: K,
    value: AttributeFormValues[K]
  ) => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  onClose: () => void;
  onDelete: () => void;
  onSelectPrevious: () => void;
  onSelectNext: () => void;
  onSelectNextPending: () => void;
  onSelectOverlapTraject: (globalId: string) => void;
}

function formatArea(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: value >= 1000 ? 0 : 1 })} m²`;
}

function formatDensity(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}/ha`;
}

function formatLength(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: value >= 100 ? 0 : 1 })} m`;
}

function NeighbourList({
  title,
  items,
  emptyMessage,
  tone,
  onSelect,
}: {
  title: string;
  items: TrajectNeighbourSummary[];
  emptyMessage: string;
  tone: "danger" | "neutral";
  onSelect: (globalId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
          {title}
        </div>
      </div>

      {!items.length ? (
        <div className="rounded-card border border-border bg-surfaceAlt p-4 text-[12px] text-textDim">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={`${title}-${item.globalId}-${item.objectId}`}
              type="button"
              className={`w-full rounded-card border px-3 py-3 text-left transition ${
                tone === "danger"
                  ? "border-danger/30 bg-danger/5 hover:border-danger/50 hover:bg-danger/10"
                  : "border-border bg-surfaceAlt/80 hover:border-accent/40 hover:bg-accentSoft/25"
              }`}
              onClick={() => onSelect(item.globalId)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-text">{item.trajectCode}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    {item.relation === "adjacent"
                      ? "grenst direct aan selectie"
                      : `${formatArea(item.overlapAreaSqm)} overlap`}
                  </div>
                </div>
                <MapPinned className="h-4 w-4 shrink-0 text-textMuted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function TrajectReviewPanel({
  open,
  selectedTraject,
  pendingMode,
  draftValues,
  statusOptions,
  review,
  saving,
  deleting,
  hasUnsavedChanges,
  canSelectPrevious,
  canSelectNext,
  hasNextPending,
  onDraftChange,
  onSave,
  onSaveAndNext,
  onClose,
  onDelete,
  onSelectPrevious,
  onSelectNext,
  onSelectNextPending,
  onSelectOverlapTraject,
}: TrajectReviewPanelProps) {
  if (!open) {
    return null;
  }

  const title = selectedTraject
    ? draftValues.trajectCode || selectedTraject.trajectCode || `Traject ${selectedTraject.objectId}`
    : pendingMode === "create"
      ? "Nieuw traject"
      : "Reviewmodus";

  return (
    <aside className="glass-panel absolute bottom-3 right-3 top-3 z-20 flex w-[430px] max-w-[calc(100vw-24px)] flex-col rounded-card border border-white/70 bg-white/95 shadow-panel">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accentStrong">
            Reviewmodus
          </div>
          <div className="mt-1 truncate text-[16px] font-semibold text-text">{title}</div>
          <div className="mt-1 text-[11px] text-textDim">
            Traject blijft geselecteerd tijdens review.
          </div>
        </div>
        <Button variant="ghost" className="h-8 w-8 px-0" onClick={onClose} aria-label="Sluit review">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="h-8 px-2" onClick={onSelectPrevious} disabled={!canSelectPrevious}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Vorige
          </Button>
          <Button variant="ghost" className="h-8 px-2" onClick={onSelectNext} disabled={!canSelectNext}>
            Volgende
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            className="h-8 px-2"
            onClick={onSelectNextPending}
            disabled={!hasNextPending}
          >
            <Search className="h-3.5 w-3.5" />
            Volgende te controleren
          </Button>
        </div>
      </div>

      <div className="app-scrollbar flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5">
          <section className="space-y-3 rounded-card border border-border bg-surfaceAlt/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                Reviewgegevens
              </div>
              {pendingMode ? (
                <span className="rounded-pill border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
                  {pendingMode === "create"
                    ? "Nieuwe geometrie nog niet opgeslagen"
                    : "Geometriewijziging nog niet opgeslagen"}
                </span>
              ) : hasUnsavedChanges ? (
                <span className="rounded-pill border border-accent/30 bg-accentSoft/50 px-2.5 py-1 text-[10px] font-semibold text-accentStrong">
                  Niet-opgeslagen wijzigingen
                </span>
              ) : null}
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Trajectcode</span>
              <Input
                value={draftValues.trajectCode}
                onChange={(event) => onDraftChange("trajectCode", event.target.value)}
                placeholder="Vul trajectcode in"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Reviewstatus</span>
              <NativeSelect
                value={draftValues.status}
                onChange={(event) => onDraftChange("status", Number(event.target.value))}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Opmerking</span>
              <Textarea
                rows={4}
                value={draftValues.opmerking}
                onChange={(event) => onDraftChange("opmerking", event.target.value)}
                placeholder="Leg twijfel, afkeur of aandachtspunten vast"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={onSave} disabled={saving || deleting}>
                <Save className="h-3.5 w-3.5" />
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>
              <Button
                variant="secondary"
                onClick={onSaveAndNext}
                disabled={saving || deleting || !canSelectNext}
              >
                <Save className="h-3.5 w-3.5" />
                Opslaan en volgende
              </Button>
              {selectedTraject && !selectedTraject.guid.trim() ? (
                <Button
                  variant="outline"
                  className="border-danger/30 bg-danger/5 text-danger hover:bg-danger hover:text-white"
                  onClick={onDelete}
                  disabled={saving || deleting}
                >
                  {deleting ? "Verwijderen..." : "Nieuwe geometrie verwijderen"}
                </Button>
              ) : null}
            </div>
          </section>

          <NeighbourList
            title="Overlappende trajecten"
            items={review?.overlaps ?? []}
            emptyMessage="Geen overlappende trajecten gevonden voor de huidige selectie."
            tone="danger"
            onSelect={onSelectOverlapTraject}
          />

          <NeighbourList
            title="Aangrenzende trajecten"
            items={review?.adjacentTrajects ?? []}
            emptyMessage="Geen direct aangrenzende trajecten gevonden."
            tone="neutral"
            onSelect={onSelectOverlapTraject}
          />

          <section className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
              Geometrie
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-border bg-white p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">Oppervlak</div>
                <div className="mt-1 text-[14px] font-semibold text-text">{formatArea(review?.areaSqm ?? selectedTraject?.shapeArea ?? null)}</div>
              </div>
              <div className="rounded-card border border-border bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Dichtheid / vorm
                  </div>
                  <Layers3 className="h-4 w-4 text-textMuted" />
                </div>
                <div className="mt-1 text-[14px] font-semibold text-text">
                  {formatDensity(review?.objectDensityPerHectare ?? null)}
                </div>
                <div className="mt-1 text-[11px] text-textDim">
                  Breedte-indicatie {formatLength(review?.effectiveWidthM ?? null)}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}

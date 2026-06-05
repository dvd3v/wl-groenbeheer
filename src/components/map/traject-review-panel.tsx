import {
  ArrowLeft,
  ArrowRight,
  Layers3,
  MapPinned,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MaatregelForm } from "../jaarplan/maatregel-form";
import {
  MaatregelStatusBadge,
  MeasureSignals,
  RegimeBadge,
} from "../jaarplan/maatregel-badges";
import { formatWerkperiodeLabel } from "../../lib/jaarplan-filtering";
import { arcgisJaarplanService } from "../../services/arcgis-jaarplan-service";
import { useAppStore } from "../../store/app-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import type {
  AttributeFormValues,
  JaarplanDomainOption,
  JaarplanMeasureFormValues,
  StatusOption,
  TrajectRecord,
} from "../../types/app";
import type { TrajectNeighbourSummary, TrajectReviewSummary } from "../../services/traject-review-service";

interface TrajectReviewPanelProps {
  open: boolean;
  selectedTraject: TrajectRecord | null;
  pendingMode: "create" | "reshape" | null;
  draftValues: AttributeFormValues;
  statusOptions: StatusOption[];
  fieldOptions: {
    aanpassenDoor: JaarplanDomainOption[];
    functie: JaarplanDomainOption[];
    uitvoerderOnderhoud: JaarplanDomainOption[];
    bodemklasse: JaarplanDomainOption[];
    type: JaarplanDomainOption[];
    bovenbreedte: JaarplanDomainOption[];
    werkpadBreedte: JaarplanDomainOption[];
  };
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
  fieldOptions,
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
  const [activeTab, setActiveTab] = useState<"review" | "maatregelen">("review");
  const [addMeasureOpen, setAddMeasureOpen] = useState(false);
  const [draftMeasure, setDraftMeasure] = useState<JaarplanMeasureFormValues | null>(null);
  const [measureSaving, setMeasureSaving] = useState(false);
  const [conceptSaving, setConceptSaving] = useState(false);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const jaarplanTrajecten = useAppStore((state) => state.jaarplanTrajecten);
  const jaarplanMeasures = useAppStore((state) => state.jaarplanMeasures);
  const metadata = useAppStore((state) => state.jaarplanMetadata);
  const upsertJaarplanMeasure = useAppStore((state) => state.upsertJaarplanMeasure);
  const upsertJaarplanTraject = useAppStore((state) => state.upsertJaarplanTraject);
  const selectedJaarplanTraject = useMemo(
    () =>
      selectedTraject
        ? jaarplanTrajecten.find((traject) => traject.globalId === selectedTraject.globalId) ??
          null
        : null,
    [jaarplanTrajecten, selectedTraject]
  );
  const selectedMeasures = useMemo(
    () =>
      selectedTraject
        ? jaarplanMeasures.filter(
            (measure) => measure.trajectGlobalId === selectedTraject.globalId
          )
        : [],
    [jaarplanMeasures, selectedTraject]
  );

  if (!open) {
    return null;
  }

  const title = selectedTraject
    ? draftValues.trajectCode || selectedTraject.trajectCode || `Traject ${selectedTraject.objectId}`
    : pendingMode === "create"
      ? "Nieuw traject"
      : "Reviewmodus";
  const modeLabel = activeTab === "maatregelen" ? "Planmodus" : "Reviewmodus";

  function updateDraftMeasure(field: keyof JaarplanMeasureFormValues, value: string) {
    if (!metadata || !draftMeasure) {
      return;
    }

    const next = {
      ...draftMeasure,
      [field]: value,
    } as JaarplanMeasureFormValues;

    setDraftMeasure(
      field === "regimeValue" || field === "werkzaamhedenValue"
        ? arcgisJaarplanService.syncSubtypeValues(
            metadata,
            next,
            field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
          )
        : next
    );
  }

  async function handleCreateMeasure() {
    if (!metadata || !selectedJaarplanTraject || !draftMeasure) {
      return;
    }

    setMeasureSaving(true);
    setMeasureError(null);

    try {
      const created = await arcgisJaarplanService.createMeasure(
        draftMeasure,
        metadata,
        jaarplanTrajecten
      );
      upsertJaarplanMeasure(created);
      setAddMeasureOpen(false);
      setDraftMeasure(arcgisJaarplanService.createDefaultFormValues(metadata, selectedJaarplanTraject));
    } catch (error) {
      setMeasureError(
        error instanceof Error ? error.message : "Maatregel opslaan is mislukt."
      );
    } finally {
      setMeasureSaving(false);
    }
  }

  async function handleToggleConceptGereed(checked: boolean) {
    if (!metadata || !selectedJaarplanTraject) {
      return;
    }

    setConceptSaving(true);
    setMeasureError(null);

    try {
      const updated = await arcgisJaarplanService.updateTrajectDetails(
        selectedJaarplanTraject.globalId,
        {
          naam: selectedJaarplanTraject.naam,
          functie: selectedJaarplanTraject.functie,
          bodemklasse: selectedJaarplanTraject.bodemklasse,
          uitvoerderOnderhoud: selectedJaarplanTraject.uitvoerderOnderhoud,
          type: selectedJaarplanTraject.type,
          bovenbreedte: selectedJaarplanTraject.bovenbreedte,
          werkpadBreedte: selectedJaarplanTraject.werkpadBreedte,
          stakeholderInformatie: selectedJaarplanTraject.stakeholderInformatie,
          conceptGereedValue: checked ? "1" : "0",
        }
      );
      upsertJaarplanTraject(updated);
    } catch (error) {
      setMeasureError(
        error instanceof Error ? error.message : "Concept gereed opslaan is mislukt."
      );
    } finally {
      setConceptSaving(false);
    }
  }

  return (
    <aside className="glass-panel absolute bottom-3 right-3 top-3 z-20 flex w-[430px] max-w-[calc(100vw-24px)] flex-col rounded-card border border-white/70 bg-white/95 shadow-panel">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accentStrong">
            {modeLabel}
          </div>
          <div className="mt-1 truncate text-[16px] font-semibold text-text">{title}</div>
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
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              activeTab === "review"
                ? "bg-accentSoft text-accentStrong"
                : "bg-surfaceAlt text-textMuted"
            }`}
            onClick={() => setActiveTab("review")}
          >
            Review
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              activeTab === "maatregelen"
                ? "bg-violet/10 text-violet"
                : "bg-surfaceAlt text-textMuted"
            }`}
            onClick={() => setActiveTab("maatregelen")}
            disabled={!selectedTraject}
          >
            Maatregelen
          </button>
        </div>
      </div>

      <div className="app-scrollbar flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5">
          {activeTab === "review" ? (
          <>
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

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Aanpassen door</span>
              <NativeSelect
                value={draftValues.aanpassenDoor}
                onChange={(event) => onDraftChange("aanpassenDoor", event.target.value)}
              >
                <option value="">—</option>
                {fieldOptions.aanpassenDoor.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </section>

          <section className="space-y-3 rounded-card border border-border bg-surfaceAlt/70 p-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                Trajectgegevens
              </div>
              <div className="mt-1 text-[12px] text-textDim">
                Basisgegevens, profiel en stakeholderafspraken voor dit traject.
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Naam</span>
              <Input
                value={draftValues.naam}
                onChange={(event) => onDraftChange("naam", event.target.value)}
                placeholder="Naam traject"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Functie</span>
                <NativeSelect
                  value={draftValues.functie}
                  onChange={(event) => onDraftChange("functie", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.functie.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Type</span>
                <NativeSelect
                  value={draftValues.type}
                  onChange={(event) => onDraftChange("type", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.type.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Uitvoerder onderhoud</span>
                <NativeSelect
                  value={draftValues.uitvoerderOnderhoud}
                  onChange={(event) => onDraftChange("uitvoerderOnderhoud", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.uitvoerderOnderhoud.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Bodemklasse</span>
                <NativeSelect
                  value={draftValues.bodemklasse}
                  onChange={(event) => onDraftChange("bodemklasse", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.bodemklasse.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Bovenbreedte</span>
                <NativeSelect
                  value={draftValues.bovenbreedte}
                  onChange={(event) => onDraftChange("bovenbreedte", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.bovenbreedte.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-textDim">Werkpad breedte</span>
                <NativeSelect
                  value={draftValues.werkpadBreedte}
                  onChange={(event) => onDraftChange("werkpadBreedte", event.target.value)}
                >
                  <option value="">—</option>
                  {fieldOptions.werkpadBreedte.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Stakeholder informatie</span>
              <Textarea
                rows={3}
                value={draftValues.stakeholderInformatie}
                onChange={(event) =>
                  onDraftChange("stakeholderInformatie", event.target.value)
                }
                placeholder="Afspraken en aandachtspunten voor dit traject"
              />
            </label>
          </section>

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
          </>
          ) : (
          <>
            <section className="space-y-3 rounded-card border border-border bg-surfaceAlt/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                    Maatregelen
                  </div>
                  <div className="mt-1 text-[12px] text-textDim">
                    {selectedMeasures.length} gekoppeld aan dit traject.
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  {metadata && selectedJaarplanTraject ? (
                    <Button
                      type="button"
                      variant={addMeasureOpen ? "secondary" : "default"}
                      className="w-full whitespace-nowrap"
                      onClick={() => {
                        setAddMeasureOpen((current) => !current);
                        setDraftMeasure((current) =>
                          current ??
                          arcgisJaarplanService.createDefaultFormValues(
                            metadata,
                            selectedJaarplanTraject
                          )
                        );
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addMeasureOpen ? "Sluiten" : "Plannen"}
                    </Button>
                  ) : null}

                  {metadata && selectedJaarplanTraject ? (
                    <label className="flex min-h-[32px] items-center justify-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-textDim">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        checked={selectedJaarplanTraject.conceptGereed}
                        disabled={conceptSaving || !metadata.trajectEditable}
                        onChange={(event) => {
                          void handleToggleConceptGereed(event.target.checked);
                        }}
                      />
                      <span className="whitespace-nowrap">Concept gereed</span>
                    </label>
                  ) : null}
                </div>
              </div>

              {measureError ? (
                <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-[12px] text-danger">
                  {measureError}
                </div>
              ) : null}

              {addMeasureOpen && draftMeasure && metadata ? (
                <MaatregelForm
                  layout="compact"
                  values={draftMeasure}
                  metadata={metadata}
                  steekproefStatusOptions={metadata.steekproefStatusOptions}
                  toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                    metadata,
                    draftMeasure.regimeValue,
                    draftMeasure.toelichtingValue
                  )}
                  submitLabel="Maatregel opslaan"
                  saving={measureSaving}
                  onFieldChange={updateDraftMeasure}
                  onSubmit={() => {
                    void handleCreateMeasure();
                  }}
                />
              ) : null}
            </section>

            {!selectedMeasures.length ? (
              <div className="rounded-card border border-border bg-surfaceAlt p-4 text-[12px] text-textDim">
                Voor dit traject zijn nog geen maatregelen vastgelegd.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMeasures.map((measure) => (
                  <div
                    key={measure.globalId}
                    className="rounded-card border border-border bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <RegimeBadge
                        regimeLabel={measure.regimeLabel}
                        regimeNumber={measure.regimeNumber}
                      />
                      <MaatregelStatusBadge status={measure.statusMaatregel} compact />
                      <MeasureSignals measure={measure} />
                    </div>
                    <div className="mt-3 text-[13px] font-semibold text-text">
                      {measure.werkzaamheidLabel}
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-textDim">
                      {measure.toelichtingLabel}
                    </div>
                    <div className="mt-3 grid gap-2 text-[11px] text-textDim">
                      <div>Werkperiode: {formatWerkperiodeLabel(measure)}</div>
                      <div>Zijde: {measure.zijdeLabel || "—"}</div>
                      <div>Afvoeren: {measure.afvoerenLabel || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
          )}

          {activeTab === "review" ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

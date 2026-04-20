import { PencilLine, Plus, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { formatWerkperiodeLabel } from "../../lib/jaarplan-filtering";
import { toMeasureDraft } from "../../lib/jaarplan-measure-utils";
import { arcgisJaarplanService } from "../../services/arcgis-jaarplan-service";
import type {
  JaarplanMeasureFormValues,
  JaarplanMeasureRecord,
  JaarplanMetadata,
  JaarplanTrajectRecord,
} from "../../types/app";
import {
  MeasureSignals,
  MaatregelStatusBadge,
  RegimeBadge,
} from "./maatregel-badges";
import { MaatregelForm } from "./maatregel-form";
import { Button } from "../ui/button";

interface RelatedMeasuresTableEditorProps {
  traject: JaarplanTrajectRecord;
  measures: JaarplanMeasureRecord[];
  metadata: JaarplanMetadata;
  loading?: boolean;
  editable?: boolean;
  savingNew?: boolean;
  savingMeasureId?: string | null;
  deletingMeasureId?: string | null;
  onCreate: (values: JaarplanMeasureFormValues) => void;
  onSave: (measure: JaarplanMeasureRecord, values: JaarplanMeasureFormValues) => void;
  onDelete: (measure: JaarplanMeasureRecord) => void;
}

function updateDraftValues(
  metadata: JaarplanMetadata,
  currentValues: JaarplanMeasureFormValues,
  field: keyof JaarplanMeasureFormValues,
  value: string
): JaarplanMeasureFormValues {
  const nextValues = {
    ...currentValues,
    [field]: value,
  } as JaarplanMeasureFormValues;

  if (field === "regimeValue" || field === "werkzaamhedenValue") {
    return arcgisJaarplanService.syncSubtypeValues(
      metadata,
      nextValues,
      field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
    );
  }

  return nextValues;
}

export function RelatedMeasuresTableEditor({
  traject,
  measures,
  metadata,
  loading = false,
  editable = true,
  savingNew = false,
  savingMeasureId = null,
  deletingMeasureId = null,
  onCreate,
  onSave,
  onDelete,
}: RelatedMeasuresTableEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editingMeasureId, setEditingMeasureId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<JaarplanMeasureFormValues | null>(null);
  const [drafts, setDrafts] = useState<Record<string, JaarplanMeasureFormValues>>({});

  useEffect(() => {
    setAdding(false);
    setEditingMeasureId(null);
    setNewDraft(null);
    setDrafts({});
  }, [traject.globalId]);

  const savingAnyExisting = useMemo(
    () => Boolean(savingMeasureId && savingMeasureId !== "new"),
    [savingMeasureId]
  );

  function openAddForm() {
    setEditingMeasureId(null);
    setAdding(true);
    setNewDraft(
      arcgisJaarplanService.createDefaultFormValues(metadata, traject)
    );
  }

  function openEditForm(measure: JaarplanMeasureRecord) {
    setAdding(false);
    setEditingMeasureId(measure.globalId);
    setDrafts((current) => ({
      ...current,
      [measure.globalId]: current[measure.globalId] ?? toMeasureDraft(measure),
    }));
  }

  return (
    <section className="rounded-[18px] border border-border bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
              Gerelateerde maatregelen
            </div>
            <div className="mt-1 text-[13px] font-semibold text-text">
              {traject.trajectCode}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-pill border border-border bg-white px-3 py-1 text-[11px] text-textDim">
              {measures.length} maatregel{measures.length === 1 ? "" : "en"}
            </div>
            <Button
              onClick={openAddForm}
              disabled={!editable || savingNew || savingAnyExisting}
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuwe maatregel
            </Button>
          </div>
        </div>

        {!editable ? (
          <div className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Deze maatregelentabel is alleen-lezen; ArcGIS editing staat niet aan.
          </div>
        ) : null}
      </div>

      {adding && newDraft ? (
        <div className="border-b border-border bg-surfaceAlt/50 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accentStrong">
                Nieuwe maatregel
              </div>
              <div className="mt-1 text-[12px] text-textDim">
                Nieuwe relatie voor traject {traject.trajectCode} wordt direct naar ArcGIS Online geschreven.
              </div>
            </div>
            <Button variant="ghost" onClick={() => setAdding(false)} disabled={savingNew}>
              <X className="h-3.5 w-3.5" />
              Sluiten
            </Button>
          </div>
          <MaatregelForm
            layout="compact"
            values={newDraft}
            metadata={metadata}
            steekproefStatusOptions={arcgisJaarplanService.steekproefStatusOptions}
            toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
              metadata,
              newDraft.regimeValue,
              newDraft.toelichtingValue
            )}
            submitLabel="Maatregel toevoegen"
            saving={savingNew}
            onFieldChange={(field, value) =>
              setNewDraft((current) =>
                current ? updateDraftValues(metadata, current, field, value) : current
              )
            }
            onSubmit={() => {
              if (newDraft) {
                onCreate(newDraft);
              }
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-6 text-[12px] text-textDim">Gerelateerde maatregelen laden...</div>
      ) : !measures.length ? (
        <div className="px-4 py-6 text-[12px] text-textDim">
          Voor dit traject zijn nog geen gerelateerde maatregelen gevonden.
        </div>
      ) : (
        <div className="app-scrollbar overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-surfaceAlt">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Maatregel</th>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Werkperiode</th>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Steekproef</th>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Signalen</th>
                <th className="px-4 py-3 text-left font-semibold text-textDim">Opmerking</th>
                <th className="px-4 py-3 text-right font-semibold text-textDim">Acties</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((measure) => {
                const rowDraft = drafts[measure.globalId] ?? toMeasureDraft(measure);
                const editing = editingMeasureId === measure.globalId;

                return (
                  <Fragment key={measure.globalId}>
                    <tr
                      className="border-t border-border/80 align-top transition-colors hover:bg-surfaceAlt/40"
                    >
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <RegimeBadge
                              regimeLabel={measure.regimeLabel}
                              regimeNumber={measure.regimeNumber}
                            />
                            <div className="text-[13px] font-semibold text-text">
                              {measure.werkzaamheidLabel}
                            </div>
                          </div>
                          <div className="text-[11px] leading-5 text-textDim">
                            {measure.toelichtingLabel || "Geen toelichting"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-textDim">
                        {formatWerkperiodeLabel(measure)}
                      </td>
                      <td className="px-4 py-3">
                        <MaatregelStatusBadge status={measure.statusMaatregel} compact />
                      </td>
                      <td className="px-4 py-3 text-textDim">
                        {arcgisJaarplanService.getSteekproefStatusLabel(measure.steekproefStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <MeasureSignals measure={measure} />
                      </td>
                      <td className="px-4 py-3 text-textDim">
                        {measure.opmerking || measure.redenNietUitgevoerd || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={editing ? "secondary" : "outline"}
                            onClick={() => {
                              if (editing) {
                                setEditingMeasureId(null);
                                return;
                              }

                              openEditForm(measure);
                            }}
                            disabled={!editable || savingNew || deletingMeasureId === measure.globalId}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            {editing ? "Sluiten" : "Bewerken"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-danger hover:bg-rose-50 hover:text-danger"
                            onClick={() => onDelete(measure)}
                            disabled={!editable || deletingMeasureId === measure.globalId}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingMeasureId === measure.globalId ? "Verwijderen..." : "Verwijderen"}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {editing ? (
                      <tr className="border-t border-border/70 bg-surfaceAlt/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet">
                                Maatregel bewerken
                              </div>
                              <div className="mt-1 text-[12px] text-textDim">
                                Wijzigingen worden opgeslagen naar de gerelateerde ArcGIS-tabel.
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              onClick={() => setEditingMeasureId(null)}
                              disabled={savingMeasureId === measure.globalId}
                            >
                              <X className="h-3.5 w-3.5" />
                              Sluiten
                            </Button>
                          </div>
                          <MaatregelForm
                            layout="compact"
                            values={rowDraft}
                            metadata={metadata}
                            steekproefStatusOptions={arcgisJaarplanService.steekproefStatusOptions}
                            toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                              metadata,
                              rowDraft.regimeValue,
                              rowDraft.toelichtingValue
                            )}
                            submitLabel="Wijzigingen opslaan"
                            saving={savingMeasureId === measure.globalId}
                            onFieldChange={(field, value) =>
                              setDrafts((current) => ({
                                ...current,
                                [measure.globalId]: updateDraftValues(
                                  metadata,
                                  current[measure.globalId] ?? toMeasureDraft(measure),
                                  field,
                                  value
                                ),
                              }))
                            }
                            onSubmit={() => onSave(measure, rowDraft)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { ArrowLeft, ArrowLeftRight, ArrowRight, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { PLANNING_STATUS_COLORS, getRegimeColorGroup } from "../../data/datamodel";
import type {
  AttributeFormValues,
  BorFeatureSelection,
  PlannedWorkItem,
  PlanningRegistrationStatus,
  StatusOption,
  TrajectRecord,
  WorkSide,
} from "../../types/app";
import { Button } from "../ui/button";
import { Drawer } from "../ui/drawer";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";

interface AttributeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTraject: TrajectRecord | null;
  selectedBorFeature: BorFeatureSelection | null;
  defaultValues: AttributeFormValues;
  statusOptions: StatusOption[];
  planningItems: PlannedWorkItem[];
  saving: boolean;
  deleting?: boolean;
  onSubmit: (values: AttributeFormValues) => Promise<void>;
  onDeleteTraject?: () => Promise<void>;
  onPlanningUpdate: (
    workId: string,
    updates: Partial<Pick<PlannedWorkItem, "status" | "datumGepland" | "datumUitgevoerd" | "opmerking">>
  ) => Promise<void>;
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
    >
      Regime {regime}
    </span>
  );
}

export function AttributeDrawer({
  open,
  onOpenChange,
  selectedTraject,
  selectedBorFeature,
  defaultValues,
  statusOptions,
  planningItems,
  saving,
  deleting = false,
  onSubmit,
  onDeleteTraject,
  onPlanningUpdate,
}: AttributeDrawerProps) {
  const [activeTab, setActiveTab] = useState<"traject" | "planning">("traject");
  const [busyWorkId, setBusyWorkId] = useState<string | null>(null);
  const form = useForm<AttributeFormValues>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
    if (!selectedTraject) {
      setActiveTab("traject");
    }
  }, [defaultValues, form, selectedTraject]);

  useEffect(() => {
    if (selectedTraject?.trajectCode && !form.getValues("trajectCode")) {
      form.setValue("trajectCode", selectedTraject.trajectCode, { shouldDirty: false });
    }
  }, [form, selectedTraject]);

  const trajectPlanning = useMemo(
    () =>
      selectedTraject
        ? planningItems.filter((item) => item.trajectGlobalId === selectedTraject.globalId)
        : [],
    [planningItems, selectedTraject]
  );
  const isNewGeometry = Boolean(selectedTraject && !selectedTraject.guid.trim());

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        selectedBorFeature
          ? selectedBorFeature.displayTitle
          : selectedTraject
          ? selectedTraject.trajectCode || `Traject ${selectedTraject.objectId}`
          : "Nieuw traject"
      }
    >
      {selectedBorFeature ? (
        <div className="space-y-5 p-5">
          <section className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
              BOR object
            </div>
            <div className="rounded-card border border-border bg-surfaceAlt p-3 text-[11px] text-textDim">
              <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                Laag
              </div>
              <div className="mt-1 text-text">{selectedBorFeature.layerTitle}</div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
              Attributen
            </div>
            <div className="grid gap-3 rounded-card border border-border bg-surfaceAlt p-3 text-[11px] text-textDim">
              {selectedBorFeature.attributes.map((attribute) => (
                <div key={`${selectedBorFeature.layerId}-${attribute.key}`}>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    {attribute.label}
                  </div>
                  <div className="mt-1 break-words text-text">{attribute.value}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
              Sluiten
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-border px-5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${activeTab === "traject"
                    ? "bg-accentSoft text-accentStrong"
                    : "bg-surfaceAlt text-textMuted"
                  }`}
                onClick={() => setActiveTab("traject")}
              >
                Traject
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${activeTab === "planning"
                    ? "bg-violet/10 text-violet"
                    : "bg-surfaceAlt text-textMuted"
                  }`}
                onClick={() => setActiveTab("planning")}
                disabled={!selectedTraject}
              >
                Planning
              </button>
            </div>
          </div>
      
      {activeTab === "traject" ? (
        <form
          className="space-y-6 p-5"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <section className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
              Wijzigbaar
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Trajectcode</span>
              <Input
                placeholder={selectedTraject?.trajectCode || "Vul trajectcode in"}
                {...form.register("trajectCode", { required: true })}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] text-textDim">Status</span>
              <NativeSelect
                {...form.register("status", {
                  setValueAs: (value) => Number(value),
                })}
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
                placeholder="Voeg een toelichting toe"
                {...form.register("opmerking")}
              />
            </label>
          </section>

          {selectedTraject ? (
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                Alleen lezen
              </div>

              <div className="grid gap-3 rounded-card border border-border bg-surfaceAlt p-3 text-[11px] text-textDim">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    OBJECTID
                  </div>
                  <div className="mt-1 font-mono text-text">{selectedTraject.objectId}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    GUID
                  </div>
                  <div className="mt-1 break-all font-mono text-text">{selectedTraject.guid || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Type codering
                  </div>
                  <div className="mt-1 text-text">{selectedTraject.typeCodering || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Object count
                  </div>
                  <div className="mt-1 text-text">
                    {selectedTraject.objectCount?.toLocaleString("nl-NL") ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                    Bronlagen
                  </div>
                  <div className="mt-1 break-words text-text">{selectedTraject.bronlagen || "—"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                      Area
                    </div>
                    <div className="mt-1 text-text">
                      {selectedTraject.shapeArea?.toLocaleString("nl-NL") ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">
                      Length
                    </div>
                    <div className="mt-1 text-text">
                      {selectedTraject.shapeLength?.toLocaleString("nl-NL") ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            {isNewGeometry && onDeleteTraject ? (
              <Button
                variant="outline"
                className="mr-auto border-danger/30 bg-danger/5 text-danger hover:bg-danger hover:text-white"
                onClick={async () => {
                  await onDeleteTraject();
                }}
                type="button"
                disabled={saving || deleting}
              >
                {deleting ? "Verwijderen..." : "Nieuwe geometrie verwijderen"}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
              Sluiten
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? "Opslaan..." : "wijzigingen opslaan"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
            Werkzaamheden per traject
          </div>

          {!trajectPlanning.length ? (
            <div className="rounded-card border border-border bg-surfaceAlt p-4 text-[12px] text-textDim">
              Voor dit traject zijn nog geen lokale werkzaamheden geladen.
            </div>
          ) : (
            trajectPlanning.map((item) => (
              <div
                key={item.workId}
                className="space-y-4 rounded-card border border-border bg-surfaceAlt/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <RegimeBadge regime={item.regime} />
                      <span className="font-mono text-[11px] text-textMuted">
                        {item.trajectCode}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-text">
                      {item.werkzaamheid}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-textDim">
                      <span>{item.doel || "Geen doel"}</span>
                      <span>|</span>
                      <SideBadge side={item.zijde} />
                      <span>|</span>
                      <span>{item.bewerkingspercentage}</span>
                      <span>|</span>
                      <span>{item.afvoeren}</span>
                      <span>|</span>
                      <span title={item.werkperiodeLabel}>
                        Werkperiode {item.werkperiodeCode}
                      </span>
                    </div>
                  </div>
                  <span
                    className="rounded-pill px-2 py-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PLANNING_STATUS_COLORS[item.status] }}
                  >
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-card border border-border bg-white p-4 text-[12px] leading-6 text-textDim">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                    Toelichting
                  </div>
                  <p className="mt-2 whitespace-pre-line">{item.toelichting}</p>
                </div>

                <div className="grid gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-textDim">Planning status</span>
                    <NativeSelect
                      value={item.status}
                      onChange={async (event) => {
                        setBusyWorkId(item.workId);
                        await onPlanningUpdate(item.workId, {
                          status: event.target.value as PlanningRegistrationStatus,
                        });
                        setBusyWorkId(null);
                      }}
                    >
                      {Object.keys(PLANNING_STATUS_COLORS).map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-[11px] text-textDim">Datum gepland</span>
                      <Input
                        type="date"
                        value={item.datumGepland}
                        onChange={async (event) => {
                          setBusyWorkId(item.workId);
                          await onPlanningUpdate(item.workId, {
                            datumGepland: event.target.value,
                          });
                          setBusyWorkId(null);
                        }}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] text-textDim">Datum uitgevoerd</span>
                      <Input
                        type="date"
                        value={item.datumUitgevoerd}
                        onChange={async (event) => {
                          setBusyWorkId(item.workId);
                          await onPlanningUpdate(item.workId, {
                            datumUitgevoerd: event.target.value,
                          });
                          setBusyWorkId(null);
                        }}
                      />
                    </label>
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-[11px] text-textDim">Opmerking</span>
                    <Textarea
                      rows={3}
                      value={item.opmerking}
                      onChange={async (event) => {
                        setBusyWorkId(item.workId);
                        await onPlanningUpdate(item.workId, {
                          opmerking: event.target.value,
                        });
                        setBusyWorkId(null);
                      }}
                    />
                  </label>
                </div>

                {busyWorkId === item.workId ? (
                  <div className="text-[11px] text-textMuted">Planning opslaan...</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
        </>
      )}
    </Drawer>
  );
}

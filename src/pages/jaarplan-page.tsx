import { AlertTriangle, ChevronDown, ChevronRight, LoaderCircle, MapPinned, Plus, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { JaarplanFilterPanel } from "../components/jaarplan/jaarplan-filter-panel";
import { MaatregelForm } from "../components/jaarplan/maatregel-form";
import { BulkMeasurePlanningPanel } from "../components/traject/bulk-measure-planning-panel";
import { BulkTrajectEditPanel } from "../components/traject/bulk-traject-edit-panel";
import {
  MeasureSignals,
  getJaarplanRegimePalette,
  MaatregelStatusBadge,
  RegimeBadge,
} from "../components/jaarplan/maatregel-badges";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NativeSelect } from "../components/ui/native-select";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { arcgisJaarplanService } from "../services/arcgis-jaarplan-service";
import {
  getFilteredJaarplanGroups,
  getWerkperiodeLabels,
  formatWerkperiodeLabel,
} from "../lib/jaarplan-filtering";
import { useAppStore } from "../store/app-store";
import type {
  BulkTrajectUpdateFields,
  JaarplanMeasureFormValues,
  JaarplanMeasureRecord,
  JaarplanTrajectRecord,
} from "../types/app";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type TrajectDetailsDraft = Pick<
  JaarplanTrajectRecord,
  "naam" | "functie" | "bodemklasse" | "uitvoerderOnderhoud"
  | "type" | "bovenbreedte" | "werkpadBreedte" | "stakeholderInformatie"
  | "conceptGereedValue"
>;

function toMeasureDraft(measure: JaarplanMeasureRecord): JaarplanMeasureFormValues {
  return {
    trajectGuid: measure.trajectGuid,
    trajectGlobalId: measure.trajectGlobalId,
    regimeValue: measure.regimeValue,
    werkzaamhedenValue: measure.werkzaamhedenValue,
    toelichtingValue: measure.toelichtingValue,
    werkperiodeVanValue: measure.werkperiodeVanValue,
    werkperiodeTotValue: measure.werkperiodeTotValue,
    zijdeValue: measure.zijdeValue,
    afvoerenValue: measure.afvoerenValue,
    soortspecifiekeMaatValue: measure.soortspecifiekeMaatValue,
    locatiebezoekValue: measure.locatiebezoekValue,
    wlToelichting: measure.wlToelichting,
    werkinstructieUrl: measure.werkinstructieUrl,
    uitvoeringswijzeMaaienValue: measure.uitvoeringswijzeMaaienValue,
    steekproefOpmerking: measure.steekproefOpmerking,
    redenAfgekeurd: measure.redenAfgekeurd,
    datumSteekproef: measure.datumSteekproef,
    statusMaatregel: measure.statusMaatregel,
    datumGepland: measure.datumGepland,
    datumUitgevoerd: measure.datumUitgevoerd,
    datumMaaiselGeruimd: measure.datumMaaiselGeruimd,
    steekproefStatus: measure.steekproefStatus,
    redenNietUitgevoerd: measure.redenNietUitgevoerd,
    foto: measure.foto,
    opmerking: measure.opmerking,
  };
}

function toSelectOptions(values: string[]) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nl"))
    .map((value) => ({ value, label: value }));
}

function toTrajectDetailsDraft(traject: JaarplanTrajectRecord): TrajectDetailsDraft {
  return {
    naam: traject.naam,
    functie: traject.functie,
    bodemklasse: traject.bodemklasse,
    uitvoerderOnderhoud: traject.uitvoerderOnderhoud,
    type: traject.type,
    bovenbreedte: traject.bovenbreedte,
    werkpadBreedte: traject.werkpadBreedte,
    stakeholderInformatie: traject.stakeholderInformatie,
    conceptGereedValue: traject.conceptGereed ? "1" : "0",
  };
}

export function JaarplanPage() {
  const navigate = useNavigate();
  const trajecten = useAppStore((state) => state.jaarplanTrajecten);
  const measures = useAppStore((state) => state.jaarplanMeasures);
  const metadata = useAppStore((state) => state.jaarplanMetadata);
  const jaarplanLoading = useAppStore((state) => state.jaarplanLoading);
  const jaarplanError = useAppStore((state) => state.jaarplanError);
  const sharedFilters = useAppStore((state) => state.jaarplanFilters);
  const setJaarplanFilters = useAppStore((state) => state.setJaarplanFilters);
  const resetJaarplanFilters = useAppStore((state) => state.resetJaarplanFilters);
  const selectedTrajectId = useAppStore((state) => state.selectedJaarplanTrajectId);
  const bulkSelectedTrajectIds = useAppStore((state) => state.bulkSelectedTrajectIds);
  const selectJaarplanTraject = useAppStore((state) => state.selectJaarplanTraject);
  const selectTraject = useAppStore((state) => state.selectTraject);
  const setZoomTargetGlobalId = useAppStore((state) => state.setZoomTargetGlobalId);
  const setJaarplanZoomTargetGlobalId = useAppStore(
    (state) => state.setJaarplanZoomTargetGlobalId
  );
  const upsertJaarplanMeasure = useAppStore((state) => state.upsertJaarplanMeasure);
  const upsertJaarplanTraject = useAppStore((state) => state.upsertJaarplanTraject);
  const removeJaarplanMeasure = useAppStore((state) => state.removeJaarplanMeasure);
  const toggleBulkSelectedTraject = useAppStore((state) => state.toggleBulkSelectedTraject);
  const setBulkSelectedTrajects = useAppStore((state) => state.setBulkSelectedTrajects);
  const clearBulkSelectedTrajects = useAppStore((state) => state.clearBulkSelectedTrajects);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedMeasureIds, setExpandedMeasureIds] = useState<Record<string, boolean>>({});
  const [addingByTrajectId, setAddingByTrajectId] = useState<Record<string, boolean>>({});
  const [editingMeasureId, setEditingMeasureId] = useState<string | null>(null);
  const [savingTrajectId, setSavingTrajectId] = useState<string | null>(null);
  const [savingTrajectDetailsId, setSavingTrajectDetailsId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkMeasureSaving, setBulkMeasureSaving] = useState(false);
  const [bulkMeasureError, setBulkMeasureError] = useState<string | null>(null);
  const [bulkMeasureDraft, setBulkMeasureDraft] =
    useState<JaarplanMeasureFormValues | null>(null);
  const [savingMeasureId, setSavingMeasureId] = useState<string | null>(null);
  const [deletingMeasureId, setDeletingMeasureId] = useState<string | null>(null);
  const [newMeasureByTrajectId, setNewMeasureByTrajectId] = useState<
    Record<string, JaarplanMeasureFormValues>
  >({});
  const [measureDrafts, setMeasureDrafts] = useState<Record<string, JaarplanMeasureFormValues>>(
    {}
  );
  const [trajectDrafts, setTrajectDrafts] = useState<Record<string, TrajectDetailsDraft>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const selectFilterOptions = useMemo(() => {
    return {
      uitvoerderOnderhoud:
        metadata?.uitvoerderOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      regime:
        metadata?.regimeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      werkzaamheid: toSelectOptions(measures.map((measure) => measure.werkzaamheidLabel)),
      werkperiode:
        metadata?.werkperiodeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      zijde:
        metadata?.zijdeOptions.map((option) => ({
          value: option.label,
          label: option.label,
        })) ?? [],
      afvoeren:
        metadata?.afvoerenOptions.map((option) => ({
          value: option.label,
          label: option.label,
        })) ?? [],
      statusMaatregel:
        metadata?.statusMaatregelOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
      steekproefStatus:
        metadata?.steekproefStatusOptions.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? [],
    };
  }, [measures, metadata]);

  const groupedRows = useMemo(
    () => getFilteredJaarplanGroups(trajecten, measures, sharedFilters),
    [measures, sharedFilters, trajecten]
  );

  const activeFilterCount = useMemo(
    () =>
      Object.entries(sharedFilters).filter(([, value]) =>
        typeof value === "boolean" ? value : Boolean(value)
      ).length,
    [sharedFilters]
  );
  const totalVisibleMeasures = groupedRows.reduce((sum, group) => sum + group.measures.length, 0);
  const conceptGereedCount = trajecten.filter((traject) => traject.conceptGereed).length;
  const conceptGereedProgress =
    trajecten.length > 0 ? Math.round((conceptGereedCount / trajecten.length) * 100) : 0;
  const totalAlerts = groupedRows.reduce(
    (sum, group) =>
      sum +
      group.measures.filter((measure) => measure.soortspecifiekeMaat || measure.locatiebezoek)
        .length,
    0
  );
  const totalPages = Math.max(1, Math.ceil(groupedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedRows.slice(start, start + pageSize);
  }, [currentPage, groupedRows, pageSize]);
  const paginatedTrajectIds = useMemo(
    () => paginatedRows.map((group) => group.traject.globalId),
    [paginatedRows]
  );
  const groupedTrajectIds = useMemo(
    () => groupedRows.map((group) => group.traject.globalId),
    [groupedRows]
  );
  const bulkSelectedTrajecten = useMemo(
    () =>
      bulkSelectedTrajectIds
        .map((globalId) => trajecten.find((traject) => traject.globalId === globalId))
        .filter((traject): traject is JaarplanTrajectRecord => Boolean(traject)),
    [bulkSelectedTrajectIds, trajecten]
  );
  const selectedOnPageCount = paginatedTrajectIds.filter((globalId) =>
    bulkSelectedTrajectIds.includes(globalId)
  ).length;
  const allPageTrajectenSelected =
    paginatedTrajectIds.length > 0 && selectedOnPageCount === paginatedTrajectIds.length;
  const allFilteredTrajectenSelected =
    groupedTrajectIds.length > 0 &&
    groupedTrajectIds.every((globalId) => bulkSelectedTrajectIds.includes(globalId));

  useEffect(() => {
    setPage(1);
  }, [pageSize, sharedFilters]);

  useEffect(() => {
    if (!selectedTrajectId) {
      return;
    }

    const selectedIndex = groupedRows.findIndex(
      (group) => group.traject.globalId === selectedTrajectId
    );

    if (selectedIndex < 0) {
      return;
    }

    setCollapsed((current) => ({
      ...current,
      [selectedTrajectId]: false,
    }));
    setPage(Math.floor(selectedIndex / pageSize) + 1);
  }, [groupedRows, pageSize, selectedTrajectId]);

  useEffect(() => {
    if (!metadata || !bulkSelectedTrajecten.length) {
      setBulkMeasureDraft(null);
      return;
    }

    setBulkMeasureDraft(
      (current) =>
        current ??
        arcgisJaarplanService.createDefaultFormValues(metadata, bulkSelectedTrajecten[0])
    );
  }, [bulkSelectedTrajecten, metadata]);

  function handleSharedFilterChange<K extends keyof typeof sharedFilters>(
    key: K,
    value: (typeof sharedFilters)[K]
  ) {
    setJaarplanFilters({ [key]: value } as Partial<typeof sharedFilters>);
  }

  function ensureNewDraft(traject: JaarplanTrajectRecord) {
    if (!metadata) {
      return;
    }

    setNewMeasureByTrajectId((current) => ({
      ...current,
      [traject.globalId]:
        current[traject.globalId] ??
        arcgisJaarplanService.createDefaultFormValues(metadata, traject),
    }));
  }

  function updateNewDraft(
    traject: JaarplanTrajectRecord,
    field: keyof JaarplanMeasureFormValues,
    value: string
  ) {
    if (!metadata) {
      return;
    }

    setNewMeasureByTrajectId((current) => {
      const existing =
        current[traject.globalId] ??
        arcgisJaarplanService.createDefaultFormValues(metadata, traject);
      const next = {
        ...existing,
        [field]: value,
      } as JaarplanMeasureFormValues;

      if (field === "regimeValue" || field === "werkzaamhedenValue") {
        return {
          ...current,
          [traject.globalId]: arcgisJaarplanService.syncSubtypeValues(
            metadata,
            next,
            field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
          ),
        };
      }

      return {
        ...current,
        [traject.globalId]: next,
      };
    });
  }

  function updateMeasureDraft(
    measure: JaarplanMeasureRecord,
    field: keyof JaarplanMeasureFormValues,
    value: string
  ) {
    if (!metadata) {
      return;
    }

    setMeasureDrafts((current) => {
      const existing = current[measure.globalId] ?? toMeasureDraft(measure);
      const next = {
        ...existing,
        [field]: value,
      } as JaarplanMeasureFormValues;

      if (field === "regimeValue" || field === "werkzaamhedenValue") {
        return {
          ...current,
          [measure.globalId]: arcgisJaarplanService.syncSubtypeValues(
            metadata,
            next,
            field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
          ),
        };
      }

      return {
        ...current,
        [measure.globalId]: next,
      };
    });
  }

  function updateTrajectDraft(
    traject: JaarplanTrajectRecord,
    field: keyof TrajectDetailsDraft,
    value: string
  ) {
    setTrajectDrafts((current) => ({
      ...current,
      [traject.globalId]: {
        ...(current[traject.globalId] ?? toTrajectDetailsDraft(traject)),
        [field]: value,
      },
    }));
  }

  async function handleSaveTrajectDetails(traject: JaarplanTrajectRecord) {
    if (!metadata) {
      return;
    }

    const draft = trajectDrafts[traject.globalId] ?? toTrajectDetailsDraft(traject);
    setSavingTrajectDetailsId(traject.globalId);

    try {
      const updated = await arcgisJaarplanService.updateTrajectDetails(
        traject.globalId,
        draft
      );
      upsertJaarplanTraject(updated);
      setTrajectDrafts((current) => ({
        ...current,
        [traject.globalId]: toTrajectDetailsDraft(updated),
      }));
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Trajectgegevens opslaan is mislukt."
      );
    } finally {
      setSavingTrajectDetailsId((current) =>
        current === traject.globalId ? null : current
      );
    }
  }

  function selectPageTrajecten() {
    const selected = new Set(bulkSelectedTrajectIds);

    if (allPageTrajectenSelected) {
      paginatedTrajectIds.forEach((globalId) => selected.delete(globalId));
    } else {
      paginatedTrajectIds.forEach((globalId) => selected.add(globalId));
    }

    setBulkSelectedTrajects([...selected]);
    setBulkError(null);
  }

  function selectFilteredTrajecten() {
    const selected = new Set(bulkSelectedTrajectIds);

    if (allFilteredTrajectenSelected) {
      groupedTrajectIds.forEach((globalId) => selected.delete(globalId));
    } else {
      groupedTrajectIds.forEach((globalId) => selected.add(globalId));
    }

    setBulkSelectedTrajects([...selected]);
    setBulkError(null);
  }

  async function handleBulkSave(values: BulkTrajectUpdateFields) {
    if (!metadata || !bulkSelectedTrajecten.length) {
      return;
    }

    if (!metadata.trajectEditable) {
      setBulkError("Bewerken is niet ingeschakeld voor de trajectlaag.");
      return;
    }

    setBulkSaving(true);
    setBulkError(null);

    try {
      for (const traject of bulkSelectedTrajecten) {
        const updated = await arcgisJaarplanService.updateTrajectDetails(
          traject.globalId,
          {
            naam: values.naam ?? traject.naam,
            functie: values.functie ?? traject.functie,
            bodemklasse: values.bodemklasse ?? traject.bodemklasse,
            uitvoerderOnderhoud:
              values.uitvoerderOnderhoud ?? traject.uitvoerderOnderhoud,
            type: values.type ?? traject.type,
            bovenbreedte: values.bovenbreedte ?? traject.bovenbreedte,
            werkpadBreedte: values.werkpadBreedte ?? traject.werkpadBreedte,
            stakeholderInformatie: traject.stakeholderInformatie,
            conceptGereedValue:
              values.conceptGereedValue ??
              (traject.conceptGereed ? "1" : "0"),
          }
        );
        upsertJaarplanTraject(updated);
      }
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : "Bulk opslaan is mislukt."
      );
    } finally {
      setBulkSaving(false);
    }
  }

  function updateBulkMeasureDraft(
    field: keyof JaarplanMeasureFormValues,
    value: string
  ) {
    if (!metadata || !bulkSelectedTrajecten.length) {
      return;
    }

    setBulkMeasureDraft((current) => {
      const existing =
        current ??
        arcgisJaarplanService.createDefaultFormValues(metadata, bulkSelectedTrajecten[0]);
      const next = {
        ...existing,
        [field]: value,
      } as JaarplanMeasureFormValues;

      if (field === "regimeValue" || field === "werkzaamhedenValue") {
        return arcgisJaarplanService.syncSubtypeValues(
          metadata,
          next,
          field === "regimeValue" ? "regimeValue" : "werkzaamhedenValue"
        );
      }

      return next;
    });
  }

  async function handleBulkCreateMeasures() {
    if (!metadata || !bulkMeasureDraft || !bulkSelectedTrajecten.length) {
      return;
    }

    if (!metadata.editable) {
      setBulkMeasureError("Bewerken is niet ingeschakeld voor de maatregelentabel.");
      return;
    }

    setBulkMeasureSaving(true);
    setBulkMeasureError(null);

    try {
      for (const traject of bulkSelectedTrajecten) {
        const created = await arcgisJaarplanService.createMeasure(
          {
            ...bulkMeasureDraft,
            trajectGuid: traject.globalId,
            trajectGlobalId: traject.globalId,
          },
          metadata,
          trajecten
        );
        upsertJaarplanMeasure(created);
      }
    } catch (error) {
      setBulkMeasureError(
        error instanceof Error ? error.message : "Bulk plannen is mislukt."
      );
    } finally {
      setBulkMeasureSaving(false);
    }
  }

  async function handleCreateMeasure(traject: JaarplanTrajectRecord) {
    if (!metadata) {
      return;
    }

    const draft =
      newMeasureByTrajectId[traject.globalId] ??
      arcgisJaarplanService.createDefaultFormValues(metadata, traject);

    setSavingTrajectId(traject.globalId);
    try {
      const createdMeasure = await arcgisJaarplanService.createMeasure(draft, metadata, trajecten);
      upsertJaarplanMeasure(createdMeasure);
      setAddingByTrajectId((current) => ({
        ...current,
        [traject.globalId]: false,
      }));
      setNewMeasureByTrajectId((current) => ({
        ...current,
        [traject.globalId]: arcgisJaarplanService.createDefaultFormValues(metadata, traject),
      }));
      setCollapsed((current) => ({
        ...current,
        [traject.globalId]: false,
      }));
    } finally {
      setSavingTrajectId((current) => (current === traject.globalId ? null : current));
    }
  }

  async function handleSaveMeasure(measure: JaarplanMeasureRecord) {
    if (!metadata) {
      return;
    }

    const draft = measureDrafts[measure.globalId] ?? toMeasureDraft(measure);
    setSavingMeasureId(measure.globalId);

    try {
      const updatedServerMeasure = await arcgisJaarplanService.updateMeasureServerFields(
        measure.globalId,
        draft,
        metadata,
        trajecten
      );

      upsertJaarplanMeasure(updatedServerMeasure);
      setEditingMeasureId((current) => (current === measure.globalId ? null : current));
    } finally {
      setSavingMeasureId((current) => (current === measure.globalId ? null : current));
    }
  }

  async function handleDeleteMeasure(measure: JaarplanMeasureRecord) {
    if (!metadata) {
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je de maatregel "${measure.werkzaamheidLabel}" voor traject ${measure.trajectCode} wilt verwijderen?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingMeasureId(measure.globalId);

    try {
      await arcgisJaarplanService.deleteMeasure(measure.globalId, metadata);
      removeJaarplanMeasure(measure.globalId);
      setEditingMeasureId((current) => (current === measure.globalId ? null : current));
      setExpandedMeasureIds((current) => {
        const next = { ...current };
        delete next[measure.globalId];
        return next;
      });
      setMeasureDrafts((current) => {
        const next = { ...current };
        delete next[measure.globalId];
        return next;
      });
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Verwijderen van de maatregel is mislukt."
      );
    } finally {
      setDeletingMeasureId((current) => (current === measure.globalId ? null : current));
    }
  }

  if (!metadata) {
    return (
      <div className="app-scrollbar h-full overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[1100px]">
          <section className="glass-panel rounded-card p-6">
            {jaarplanError ? (
              <div className="flex items-start gap-3 text-danger">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="text-[14px] font-semibold">Jaarplan kon niet laden</div>
                  <div className="mt-2 text-[12px] leading-6 text-textDim">{jaarplanError}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-textDim">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <div className="text-[13px]">
                  {jaarplanLoading ? "Jaarplan laden..." : "Jaarplan initialiseren..."}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scrollbar h-full overflow-y-auto px-4 py-5 md:px-8">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="glass-panel rounded-card border border-white/60 p-4 md:p-5">
            <h1 className="text-xl font-bold text-text">Jaarplan</h1>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-6 text-textDim">
              Modern overzicht van trajecten, maatregelen, planning en uitvoering. De kaart volgt
              dezelfde filters en dezelfde statuslogica.
            </p>
          </section>

          <section className="rounded-card border border-border bg-white p-4 shadow-panel">
            <div className="flex h-full flex-col justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
                  Concept gereed voortgang
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{conceptGereedProgress}%</div>
                <div className="text-[11px] text-textMuted">
                  {conceptGereedCount} van {trajecten.length} trajecten gemarkeerd
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-surfaceAlt">
                <div
                  className="h-full rounded-pill bg-accent transition-all"
                  style={{ width: `${conceptGereedProgress}%` }}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-text">{groupedRows.length}</div>
            <div className="mt-1 text-[11px] text-textMuted">Trajecten in resultaat</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-text">{totalVisibleMeasures}</div>
            <div className="mt-1 text-[11px] text-textMuted">Maatregelen in resultaat</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-warning">{totalAlerts}</div>
            <div className="mt-1 text-[11px] text-textMuted">Signaleringen actief</div>
          </div>
          <div className="glass-panel rounded-card p-4">
            <div className="text-2xl font-bold text-accentStrong">{activeFilterCount}</div>
            <div className="mt-1 text-[11px] text-textMuted">Actieve filters</div>
          </div>
        </section>

        <JaarplanFilterPanel
          filters={sharedFilters}
          options={selectFilterOptions}
          activeFilterCount={activeFilterCount}
          onFilterChange={handleSharedFilterChange}
          onReset={resetJaarplanFilters}
        />

        {bulkSelectedTrajecten.length ? (
          <div className="space-y-3">
            <BulkTrajectEditPanel
              title="Trajectgegevens bulk bewerken"
              selectedCount={bulkSelectedTrajecten.length}
              saving={bulkSaving}
              fieldOptions={metadata.trajectFieldOptions}
              disabled={!metadata.trajectEditable}
              disabledMessage={
                !metadata.trajectEditable
                  ? "Bewerken is niet ingeschakeld voor de trajectlaag."
                  : undefined
              }
              error={bulkError}
              onSave={(values) => {
                void handleBulkSave(values);
              }}
              onClearSelection={clearBulkSelectedTrajects}
            />

            {bulkMeasureDraft ? (
              <BulkMeasurePlanningPanel
                selectedCount={bulkSelectedTrajecten.length}
                values={bulkMeasureDraft}
                metadata={metadata}
                steekproefStatusOptions={metadata.steekproefStatusOptions}
                toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                  metadata,
                  bulkMeasureDraft.regimeValue,
                  bulkMeasureDraft.toelichtingValue
                )}
                saving={bulkMeasureSaving}
                error={bulkMeasureError}
                disabled={!metadata.editable}
                disabledMessage={
                  !metadata.editable
                    ? "Bewerken is niet ingeschakeld voor de maatregelentabel."
                    : undefined
                }
                onFieldChange={updateBulkMeasureDraft}
                onSubmit={() => {
                  void handleBulkCreateMeasures();
                }}
                onClearSelection={clearBulkSelectedTrajects}
              />
            ) : null}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-card border border-border bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-[12px] text-textDim">
              Pagina {currentPage} van {totalPages} · {groupedRows.length} trajecten ·{" "}
              {totalVisibleMeasures} maatregelen
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={selectPageTrajecten}
                disabled={!paginatedTrajectIds.length}
              >
                {allPageTrajectenSelected ? "Pagina deselecteren" : "Selecteer pagina"}
              </Button>
              <Button
                variant="outline"
                onClick={selectFilteredTrajecten}
                disabled={!groupedTrajectIds.length}
              >
                {allFilteredTrajectenSelected ? "Resultaat deselecteren" : "Selecteer resultaat"}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setCollapsed(
                    Object.fromEntries(groupedRows.map((group) => [group.traject.globalId, false]))
                  )
                }
                disabled={!groupedRows.length}
              >
                Alles uitklappen
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setCollapsed(
                    Object.fromEntries(groupedRows.map((group) => [group.traject.globalId, true]))
                  )
                }
                disabled={!groupedRows.length}
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
                    {option} per pagina
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
                  <th className="w-10 px-3 py-3 text-left font-semibold text-textDim">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      checked={allPageTrajectenSelected}
                      ref={(element) => {
                        if (element) {
                          element.indeterminate =
                            selectedOnPageCount > 0 && !allPageTrajectenSelected;
                        }
                      }}
                      onChange={selectPageTrajecten}
                      aria-label="Selecteer trajecten op deze pagina"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Traject</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">
                    Uitvoerder onderhoud
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Werkperiode</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Maatregelen</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Signalen</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((group) => {
                  const isCollapsed = collapsed[group.traject.globalId] ?? true;
                  const isBulkSelected = bulkSelectedTrajectIds.includes(
                    group.traject.globalId
                  );
                  const trajectDraft =
                    trajectDrafts[group.traject.globalId] ??
                    toTrajectDetailsDraft(group.traject);
                  const hasTrajectDraftChanges =
                    trajectDraft.naam !== group.traject.naam ||
                    trajectDraft.functie !== group.traject.functie ||
                    trajectDraft.bodemklasse !== group.traject.bodemklasse ||
                    trajectDraft.uitvoerderOnderhoud !==
                      group.traject.uitvoerderOnderhoud ||
                    trajectDraft.type !== group.traject.type ||
                    trajectDraft.bovenbreedte !== group.traject.bovenbreedte ||
                    trajectDraft.werkpadBreedte !== group.traject.werkpadBreedte ||
                    trajectDraft.stakeholderInformatie !==
                      group.traject.stakeholderInformatie ||
                    (trajectDraft.conceptGereedValue === "1") !==
                      group.traject.conceptGereed;

                  return (
                    <Fragment key={group.traject.globalId}>
                      <tr
                        className={`border-b border-border/80 transition-colors ${
                          isBulkSelected
                            ? "bg-accentSoft/50"
                            : selectedTrajectId === group.traject.globalId
                              ? "bg-accentSoft/40"
                              : "hover:bg-surfaceAlt/60"
                        }`}
                      >
                        <td className="px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                            checked={isBulkSelected}
                            onChange={() => {
                              toggleBulkSelectedTraject(group.traject.globalId);
                              setBulkError(null);
                            }}
                            aria-label={`Selecteer traject ${group.traject.trajectCode}`}
                          />
                        </td>
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
                              <div className="font-medium text-text">{group.traject.trajectCode}</div>
                              {group.traject.naam ? (
                                <div className="mt-0.5 text-[11px] text-textDim">
                                  {group.traject.naam}
                                </div>
                              ) : null}
                              <div className="mt-0.5 font-mono text-[10px] text-textMuted">
                                {group.traject.globalId.slice(0, 8)}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-textDim">
                          {group.traject.uitvoerderOnderhoud || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {getWerkperiodeLabels(group.measures).length ? (
                              getWerkperiodeLabels(group.measures).map((label) => (
                                <span
                                  key={label}
                                  className="rounded-pill border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700"
                                >
                                  {label}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-textMuted">Geen</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-textDim">
                          {group.measures.length} zichtbaar / {group.totalMeasures} totaal
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {group.measures.some((measure) => measure.soortspecifiekeMaat) ? (
                              <span className="rounded-pill bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700">
                                Soortspecifiek
                              </span>
                            ) : null}
                            {group.measures.some((measure) => measure.locatiebezoek) ? (
                              <span className="rounded-pill bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                Locatiebezoek
                              </span>
                            ) : null}
                            {!group.measures.some(
                              (measure) => measure.soortspecifiekeMaat || measure.locatiebezoek
                            ) ? (
                              <span className="text-[11px] text-textMuted">Geen</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            variant="outline"
                            onClick={() => {
                              selectJaarplanTraject(group.traject.globalId, "table");
                              setJaarplanZoomTargetGlobalId(group.traject.globalId);
                              selectTraject(group.traject.globalId, "table");
                              setZoomTargetGlobalId(group.traject.globalId);
                              navigate("/map-traject-controle");
                            }}
                          >
                            <MapPinned className="h-3.5 w-3.5" />
                            View on map
                          </Button>
                        </td>
                      </tr>

                      {!isCollapsed ? (
                        <tr className="border-b border-border/60 bg-surfaceAlt/40">
                          <td colSpan={7} className="px-3 py-4">
                            <div className="space-y-4">
                              <section className="rounded-card border border-border bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                                      Trajectgegevens
                                    </div>
                                    <div className="mt-1 text-[12px] text-textDim">
                                      Basisgegevens van het traject voor jaarplan en planning.
                                    </div>
                                  </div>
                                  <Button
                                    variant={hasTrajectDraftChanges ? "default" : "outline"}
                                    onClick={() => {
                                      void handleSaveTrajectDetails(group.traject);
                                    }}
                                    disabled={
                                      !metadata.trajectEditable ||
                                      !hasTrajectDraftChanges ||
                                      savingTrajectDetailsId === group.traject.globalId
                                    }
                                  >
                                    {savingTrajectDetailsId === group.traject.globalId
                                      ? "Opslaan..."
                                      : "Traject opslaan"}
                                  </Button>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Naam</span>
                                    <Input
                                      value={trajectDraft.naam}
                                      onChange={(event) =>
                                        updateTrajectDraft(
                                          group.traject,
                                          "naam",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Functie</span>
                                    {metadata.trajectFieldOptions.functie.length ? (
                                      <NativeSelect
                                        value={trajectDraft.functie}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "functie",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.functie.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.functie}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "functie",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Bodemklasse</span>
                                    {metadata.trajectFieldOptions.bodemklasse.length ? (
                                      <NativeSelect
                                        value={trajectDraft.bodemklasse}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "bodemklasse",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.bodemklasse.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.bodemklasse}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "bodemklasse",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">
                                      Uitvoerder onderhoud
                                    </span>
                                    {metadata.trajectFieldOptions.uitvoerderOnderhoud.length ? (
                                      <NativeSelect
                                        value={trajectDraft.uitvoerderOnderhoud}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "uitvoerderOnderhoud",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.uitvoerderOnderhoud.map(
                                          (option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          )
                                        )}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.uitvoerderOnderhoud}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "uitvoerderOnderhoud",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Type</span>
                                    {metadata.trajectFieldOptions.type.length ? (
                                      <NativeSelect
                                        value={trajectDraft.type}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "type",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.type.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.type}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "type",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">Bovenbreedte</span>
                                    {metadata.trajectFieldOptions.bovenbreedte.length ? (
                                      <NativeSelect
                                        value={trajectDraft.bovenbreedte}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "bovenbreedte",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.bovenbreedte.map(
                                          (option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          )
                                        )}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.bovenbreedte}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "bovenbreedte",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5">
                                    <span className="text-[11px] text-textDim">
                                      Werkpad breedte
                                    </span>
                                    {metadata.trajectFieldOptions.werkpadBreedte.length ? (
                                      <NativeSelect
                                        value={trajectDraft.werkpadBreedte}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "werkpadBreedte",
                                            event.target.value
                                          )
                                        }
                                      >
                                        <option value="">—</option>
                                        {metadata.trajectFieldOptions.werkpadBreedte.map(
                                          (option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          )
                                        )}
                                      </NativeSelect>
                                    ) : (
                                      <Input
                                        value={trajectDraft.werkpadBreedte}
                                        onChange={(event) =>
                                          updateTrajectDraft(
                                            group.traject,
                                            "werkpadBreedte",
                                            event.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>

                                  <label className="space-y-1.5 md:col-span-2 xl:col-span-4">
                                    <span className="text-[11px] text-textDim">
                                      Stakeholder informatie
                                    </span>
                                    <Textarea
                                      rows={3}
                                      value={trajectDraft.stakeholderInformatie}
                                      onChange={(event) =>
                                        updateTrajectDraft(
                                          group.traject,
                                          "stakeholderInformatie",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </label>
                                </div>

                                <label className="mt-3 flex items-start gap-3 rounded-card border border-border bg-surfaceAlt px-4 py-3">
                                  <Switch
                                    checked={trajectDraft.conceptGereedValue === "1"}
                                    onCheckedChange={(checked) =>
                                      updateTrajectDraft(
                                        group.traject,
                                        "conceptGereedValue",
                                        checked ? "1" : "0"
                                      )
                                    }
                                  />
                                  <div>
                                    <div className="text-[12px] font-medium text-text">
                                      Concept gereed
                                    </div>
                                    <div className="text-[11px] text-textMuted">
                                      Telt mee in de voortgang van het vullen van maatregelen.
                                    </div>
                                  </div>
                                </label>

                                {!metadata.trajectEditable ? (
                                  <div className="mt-3 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                                    Bewerken is niet ingeschakeld voor de trajectlaag.
                                  </div>
                                ) : null}
                              </section>

                              <div className="overflow-hidden rounded-card border border-border bg-white">
                                <div className="app-scrollbar overflow-auto">
                                  <table className="min-w-[1380px] w-full border-collapse text-[12px]">
                                    <thead className="bg-surfaceAlt">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Regime
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Werkzaamheid
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Werkperiode
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Zijde
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Afvoeren
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Signalen
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Status
                                        </th>
                                        <th className="px-3 py-2 text-left font-semibold text-textDim">
                                          Details
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.measures.length ? (
                                        group.measures.map((measure) => {
                                          const isExpanded =
                                            expandedMeasureIds[measure.globalId] ?? false;
                                          const isEditing = editingMeasureId === measure.globalId;
                                          const palette = getJaarplanRegimePalette(
                                            measure.regimeNumber
                                          );
                                          const draft =
                                            measureDrafts[measure.globalId] ?? toMeasureDraft(measure);

                                          return (
                                            <Fragment key={measure.globalId}>
                                              <tr
                                                className="border-t border-border/70 align-top"
                                                style={{ backgroundColor: palette.background }}
                                              >
                                                <td className="px-3 py-3">
                                                  <RegimeBadge
                                                    regimeLabel={measure.regimeLabel}
                                                    regimeNumber={measure.regimeNumber}
                                                  />
                                                </td>
                                                <td className="px-3 py-3">
                                                  <div className="font-medium text-text">
                                                    {measure.werkzaamheidLabel}
                                                  </div>
                                                  <div className="mt-1 max-w-[420px] text-[11px] leading-5 text-textDim">
                                                    {measure.toelichtingLabel}
                                                  </div>
                                                </td>
                                                <td className="px-3 py-3 text-textDim">
                                                  {formatWerkperiodeLabel(measure)}
                                                </td>
                                                <td className="px-3 py-3 text-textDim">
                                                  {measure.zijdeLabel}
                                                </td>
                                                <td className="px-3 py-3 text-textDim">
                                                  {measure.afvoerenLabel}
                                                </td>
                                                <td className="px-3 py-3">
                                                  <MeasureSignals measure={measure} />
                                                </td>
                                                <td className="px-3 py-3">
                                                  <MaatregelStatusBadge
                                                    status={measure.statusMaatregel}
                                                  />
                                                </td>
                                                <td className="px-3 py-3">
                                                  <Button
                                                    variant={isExpanded ? "outline" : "ghost"}
                                                    onClick={() => {
                                                      setExpandedMeasureIds((current) => ({
                                                        ...current,
                                                        [measure.globalId]: !isExpanded,
                                                      }));
                                                      setMeasureDrafts((current) => ({
                                                        ...current,
                                                        [measure.globalId]:
                                                          current[measure.globalId] ??
                                                          toMeasureDraft(measure),
                                                      }));
                                                    }}
                                                  >
                                                    {isExpanded ? "Sluit" : "Open"}
                                                  </Button>
                                                </td>
                                              </tr>

                                              {isExpanded ? (
                                                <tr className="border-t border-border/50 bg-white">
                                                  <td colSpan={8} className="px-4 py-4">
                                                    <div className="mb-3 flex items-center justify-between">
                                                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                                                        Maatregel details
                                                      </div>
                                                      <div className="flex flex-wrap items-center gap-2">
                                                        <Button
                                                          variant={isEditing ? "secondary" : "outline"}
                                                          onClick={() =>
                                                            setEditingMeasureId((current) =>
                                                              current === measure.globalId
                                                                ? null
                                                                : measure.globalId
                                                            )
                                                          }
                                                          disabled={
                                                            deletingMeasureId === measure.globalId
                                                          }
                                                        >
                                                          {isEditing ? "Lezen" : "Bewerken"}
                                                        </Button>
                                                        <Button
                                                          variant="outline"
                                                          className="border-danger/30 bg-danger/5 text-danger hover:bg-danger hover:text-white"
                                                          onClick={() => {
                                                            void handleDeleteMeasure(measure);
                                                          }}
                                                          disabled={
                                                            deletingMeasureId === measure.globalId ||
                                                            savingMeasureId === measure.globalId
                                                          }
                                                        >
                                                          <Trash2 className="h-3.5 w-3.5" />
                                                          {deletingMeasureId === measure.globalId
                                                            ? "Verwijderen..."
                                                            : "Verwijderen"}
                                                        </Button>
                                                      </div>
                                                    </div>

                                                    {isEditing ? (
                                                      <MaatregelForm
                                                        values={draft}
                                                        metadata={metadata!}
                                                        steekproefStatusOptions={
                                                          metadata!.steekproefStatusOptions
                                                        }
                                                        toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                                                          metadata!,
                                                          draft.regimeValue,
                                                          draft.toelichtingValue
                                                        )}
                                                        submitLabel="Wijzigingen opslaan"
                                                        saving={savingMeasureId === measure.globalId}
                                                        onFieldChange={(field, value) =>
                                                          updateMeasureDraft(measure, field, value)
                                                        }
                                                        onSubmit={() => {
                                                          void handleSaveMeasure(measure);
                                                        }}
                                                      />
                                                    ) : (
                                                      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                                                        <div className="rounded-card border border-border bg-surfaceAlt p-4">
                                                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                                                            Werkinstructie
                                                          </div>
                                                          <p className="mt-2 whitespace-pre-line text-[12px] leading-6 text-textDim">
                                                            {measure.toelichtingLabel}
                                                          </p>
                                                          <div className="mt-4 border-t border-border pt-4">
                                                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                                                              Toelichting
                                                            </div>
                                                            <p className="mt-2 whitespace-pre-line text-[12px] leading-6 text-textDim">
                                                              {measure.wlToelichting || "—"}
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <div className="grid gap-3 rounded-card border border-border bg-surfaceAlt p-4 text-[12px] text-textDim">
                                                          <div>
                                                            <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                                                              Status maatregel
                                                            </div>
                                                            <div className="mt-1">
                                                              <MaatregelStatusBadge
                                                                status={measure.statusMaatregel}
                                                              />
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                                                              Werkperiode
                                                            </div>
                                                            <div className="mt-1 text-text">
                                                              {formatWerkperiodeLabel(measure)}
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                                                              Reden niet uitgevoerd
                                                            </div>
                                                            <div className="mt-1 break-words text-text">
                                                              {measure.redenNietUitgevoerd || "—"}
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                                                              Foto
                                                            </div>
                                                            <div className="mt-1 break-words text-text">
                                                              {measure.foto || "—"}
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <div className="text-[10px] uppercase tracking-[0.1em] text-textMuted">
                                                              Opmerking
                                                            </div>
                                                            <div className="mt-1 break-words text-text">
                                                              {measure.opmerking || "—"}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              ) : null}
                                            </Fragment>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={8}
                                            className="px-3 py-6 text-center text-[12px] text-textMuted"
                                          >
                                            Voor dit traject zijn geen maatregelen zichtbaar binnen de
                                            huidige filters.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="rounded-card border border-border bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                                      Nieuwe maatregel
                                    </div>
                                    <div className="mt-1 text-[12px] text-textDim">
                                      Voeg direct een maatregel toe aan dit traject.
                                    </div>
                                  </div>
                                  <Button
                                    variant={
                                      addingByTrajectId[group.traject.globalId]
                                        ? "secondary"
                                        : "default"
                                    }
                                    className="px-4 py-2 shadow-sm"
                                    onClick={() => {
                                      setAddingByTrajectId((current) => ({
                                        ...current,
                                        [group.traject.globalId]:
                                          !current[group.traject.globalId],
                                      }));
                                      ensureNewDraft(group.traject);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    {addingByTrajectId[group.traject.globalId]
                                      ? "Formulier sluiten"
                                      : "Maatregel toevoegen"}
                                  </Button>
                                </div>

                                {addingByTrajectId[group.traject.globalId] ? (
                                  <div className="mt-4">
                                    <MaatregelForm
                                      values={
                                        newMeasureByTrajectId[group.traject.globalId] ??
                                        arcgisJaarplanService.createDefaultFormValues(
                                          metadata,
                                          group.traject
                                        )
                                      }
                                      metadata={metadata}
                                      steekproefStatusOptions={
                                        metadata.steekproefStatusOptions
                                      }
                                      toelichtingText={arcgisJaarplanService.getMeasureToelichtingLabel(
                                        metadata,
                                        (
                                          newMeasureByTrajectId[group.traject.globalId] ??
                                          arcgisJaarplanService.createDefaultFormValues(
                                            metadata,
                                            group.traject
                                          )
                                        ).regimeValue,
                                        (
                                          newMeasureByTrajectId[group.traject.globalId] ??
                                          arcgisJaarplanService.createDefaultFormValues(
                                            metadata,
                                            group.traject
                                          )
                                        ).toelichtingValue
                                      )}
                                      submitLabel="Maatregel toevoegen"
                                      saving={savingTrajectId === group.traject.globalId}
                                      onFieldChange={(field, value) =>
                                        updateNewDraft(group.traject, field, value)
                                      }
                                      onSubmit={() => {
                                        void handleCreateMeasure(group.traject);
                                      }}
                                    />
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
        </section>
      </div>
    </div>
  );
}

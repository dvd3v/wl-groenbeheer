import type {
  JaarplanMeasureRecord,
  JaarplanTrajectRecord,
  MaatregelStatus,
  SharedJaarplanFilters,
} from "../types/app";

export interface FilteredJaarplanGroup {
  traject: JaarplanTrajectRecord;
  measures: JaarplanMeasureRecord[];
  totalMeasures: number;
}

function includesText(value: string, filterValue: string) {
  if (!filterValue.trim()) {
    return true;
  }

  return value.toLowerCase().includes(filterValue.trim().toLowerCase());
}

function matchesSignal(
  measure: JaarplanMeasureRecord,
  signalFilter: string
): boolean {
  if (!signalFilter) {
    return true;
  }

  if (signalFilter === "signaal") {
    return measure.soortspecifiekeMaat || measure.locatiebezoek;
  }

  if (signalFilter === "soortspecifiek") {
    return measure.soortspecifiekeMaat;
  }

  if (signalFilter === "locatiebezoek") {
    return measure.locatiebezoek;
  }

  return true;
}

function matchesWerkperiode(
  measure: JaarplanMeasureRecord,
  werkperiodeFilter: string
): boolean {
  if (!werkperiodeFilter) {
    return true;
  }

  const selected = Number(werkperiodeFilter);
  const from = Number(measure.werkperiodeVanValue);
  const to = Number(measure.werkperiodeTotValue);

  if (!Number.isFinite(selected) || !Number.isFinite(from) || !Number.isFinite(to)) {
    return false;
  }

  return selected >= Math.min(from, to) && selected <= Math.max(from, to);
}

export function formatWerkperiodeLabel(measure: JaarplanMeasureRecord): string {
  if (
    measure.werkperiodeVanValue &&
    measure.werkperiodeVanValue === measure.werkperiodeTotValue
  ) {
    return measure.werkperiodeVanLabel;
  }

  if (!measure.werkperiodeVanLabel && !measure.werkperiodeTotLabel) {
    return "—";
  }

  return `${measure.werkperiodeVanLabel} - ${measure.werkperiodeTotLabel}`;
}

export function getWerkperiodeLabels(measures: JaarplanMeasureRecord[]): string[] {
  return [...new Set(measures.map((measure) => formatWerkperiodeLabel(measure)).filter(Boolean))]
    .filter((label) => label !== "—")
    .sort((left, right) => left.localeCompare(right, "nl"));
}

export function getAggregatedMaatregelStatus(
  measures: JaarplanMeasureRecord[]
): MaatregelStatus {
  const statuses = measures.map((measure) => measure.statusMaatregel);

  if (statuses.includes("niet_uitgevoerd")) {
    return "niet_uitgevoerd";
  }

  if (statuses.includes("deels_uitgevoerd")) {
    return "deels_uitgevoerd";
  }

  if (statuses.includes("gepland")) {
    return "gepland";
  }

  if (statuses.includes("uitgevoerd")) {
    return "uitgevoerd";
  }

  return "geen_status";
}

export function getFilteredJaarplanGroups(
  trajecten: JaarplanTrajectRecord[],
  measures: JaarplanMeasureRecord[],
  filters: SharedJaarplanFilters
): FilteredJaarplanGroup[] {
  const measuresByTrajectId = measures.reduce<Record<string, JaarplanMeasureRecord[]>>(
    (acc, measure) => {
      acc[measure.trajectGlobalId] = [...(acc[measure.trajectGlobalId] ?? []), measure];
      return acc;
    },
    {}
  );

  const measureFiltersActive = Boolean(
    filters.regime ||
      filters.werkzaamheid ||
      filters.werkperiode ||
      filters.zijde ||
      filters.afvoeren ||
      filters.signal ||
      filters.statusMaatregel ||
      filters.datumGepland ||
      filters.datumUitgevoerd ||
      filters.steekproefStatus
  );
  const trajectoryFiltersActive = Boolean(
    filters.trajectCode || filters.uitvoerderOnderhoud || filters.hasMeasuresOnly
  );

  return trajecten
    .map((traject) => {
      const trajectMeasures = measuresByTrajectId[traject.globalId] ?? [];

      if (!includesText(traject.trajectCode, filters.trajectCode)) {
        return null;
      }

      if (
        filters.uitvoerderOnderhoud &&
        traject.uitvoerderOnderhoud !== filters.uitvoerderOnderhoud
      ) {
        return null;
      }

      if (filters.hasMeasuresOnly && trajectMeasures.length === 0) {
        return null;
      }

      const trajectoryMatchesSearch =
        !filters.search ||
        includesText(traject.trajectCode, filters.search) ||
        includesText(traject.uitvoerderOnderhoud, filters.search);

      const matchingMeasures = trajectMeasures.filter((measure) => {
        const matchesSearch =
          !filters.search ||
          includesText(measure.werkzaamheidLabel, filters.search) ||
          includesText(measure.toelichtingLabel, filters.search) ||
          includesText(measure.opmerking, filters.search) ||
          includesText(measure.redenNietUitgevoerd, filters.search);

        return (
          matchesSearch &&
          (!filters.regime || measure.regimeLabel === filters.regime) &&
          includesText(measure.werkzaamheidLabel, filters.werkzaamheid) &&
          matchesWerkperiode(measure, filters.werkperiode) &&
          (!filters.zijde || measure.zijdeLabel === filters.zijde) &&
          (!filters.afvoeren || measure.afvoerenLabel === filters.afvoeren) &&
          matchesSignal(measure, filters.signal) &&
          (!filters.statusMaatregel || measure.statusMaatregel === filters.statusMaatregel) &&
          (!filters.datumGepland || measure.datumGepland === filters.datumGepland) &&
          (!filters.datumUitgevoerd || measure.datumUitgevoerd === filters.datumUitgevoerd) &&
          (!filters.steekproefStatus ||
            measure.steekproefStatus === filters.steekproefStatus)
        );
      });

      const visible =
        matchingMeasures.length > 0 ||
        (!measureFiltersActive &&
          (trajectoryMatchesSearch || (!filters.search && trajectoryFiltersActive))) ||
        (!filters.search && !trajectoryFiltersActive && !measureFiltersActive);

      if (!visible) {
        return null;
      }

      return {
        traject,
        measures:
          matchingMeasures.length > 0 || measureFiltersActive || filters.search
            ? matchingMeasures
            : trajectMeasures,
        totalMeasures: trajectMeasures.length,
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      left!.traject.trajectCode.localeCompare(right!.traject.trajectCode, "nl")
    ) as FilteredJaarplanGroup[];
}

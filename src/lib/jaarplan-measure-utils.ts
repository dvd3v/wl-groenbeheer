import type {
  JaarplanMeasureFormValues,
  JaarplanMeasureRecord,
  JaarplanMetadata,
  JaarplanTimeWindow,
} from "../types/app";

export const WERKZAAMHEID_SELECTION_SEPARATOR = "::";

export function toMeasureDraft(
  measure: JaarplanMeasureRecord
): JaarplanMeasureFormValues {
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
    statusMaatregel: measure.statusMaatregel,
    datumGepland: measure.datumGepland,
    datumUitgevoerd: measure.datumUitgevoerd,
    steekproefStatus: measure.steekproefStatus,
    redenNietUitgevoerd: measure.redenNietUitgevoerd,
    foto: measure.foto,
    opmerking: measure.opmerking,
  };
}

export function getWerkzaamheidGroups(metadata: JaarplanMetadata) {
  return metadata.regimeOptions
    .map((regimeOption) => {
      const subtypeConfig = metadata.subtypeConfigsByRegime[regimeOption.value];
      if (!subtypeConfig?.werkzaamhedenOptions.length) {
        return null;
      }

      return {
        regimeValue: regimeOption.value,
        regimeLabel: regimeOption.label,
        options: subtypeConfig.werkzaamhedenOptions,
      };
    })
    .filter(Boolean) as Array<{
    regimeValue: string;
    regimeLabel: string;
    options: JaarplanMetadata["subtypeConfigsByRegime"][string]["werkzaamhedenOptions"];
  }>;
}

function normalizeJaNeeToken(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function getCheckboxValue(
  options: JaarplanMetadata["jaNeeOptions"],
  checked: boolean
): string {
  const matcher = checked
    ? (option: JaarplanMetadata["jaNeeOptions"][number]) =>
        normalizeJaNeeToken(option.rawValue) === "1" ||
        normalizeJaNeeToken(option.rawValue) === "ja" ||
        normalizeJaNeeToken(option.label) === "ja"
    : (option: JaarplanMetadata["jaNeeOptions"][number]) =>
        normalizeJaNeeToken(option.rawValue) === "0" ||
        normalizeJaNeeToken(option.rawValue) === "nee" ||
        normalizeJaNeeToken(option.label) === "nee";

  return options.find(matcher)?.value ?? (checked ? "1" : "0");
}

export function isCheckedJaNeeValue(
  options: JaarplanMetadata["jaNeeOptions"],
  value: string
): boolean {
  return value === getCheckboxValue(options, true);
}

function getWerkperiodeOrderMap(metadata: JaarplanMetadata): Map<string, number> {
  return new Map(
    metadata.werkperiodeOptions.map((option, index) => [option.value, index])
  );
}

function toRangeValue(
  orderMap: Map<string, number>,
  value: string,
  fallback: number
): number {
  return orderMap.get(value) ?? fallback;
}

export function normalizeTimeWindow(
  metadata: JaarplanMetadata,
  timeWindow: JaarplanTimeWindow
): JaarplanTimeWindow {
  const optionValues = metadata.werkperiodeOptions.map((option) => option.value);
  if (!optionValues.length) {
    return { start: "", end: "" };
  }

  const start = timeWindow.start || optionValues[0];
  const end = timeWindow.end || start;
  const startIndex = optionValues.indexOf(start);
  const endIndex = optionValues.indexOf(end);

  if (startIndex >= 0 && endIndex >= 0 && startIndex <= endIndex) {
    return { start, end };
  }

  return startIndex >= 0 ? { start, end: start } : { start: optionValues[0], end: optionValues[0] };
}

export function matchesTimeWindow(
  measure: JaarplanMeasureRecord,
  metadata: JaarplanMetadata,
  timeWindow: JaarplanTimeWindow
): boolean {
  if (!timeWindow.start && !timeWindow.end) {
    return true;
  }

  const normalizedWindow = normalizeTimeWindow(metadata, timeWindow);
  const orderMap = getWerkperiodeOrderMap(metadata);
  const selectedStart = toRangeValue(orderMap, normalizedWindow.start, 0);
  const selectedEnd = toRangeValue(
    orderMap,
    normalizedWindow.end,
    selectedStart
  );
  const measureStart = toRangeValue(orderMap, measure.werkperiodeVanValue, selectedStart);
  const measureEnd = toRangeValue(orderMap, measure.werkperiodeTotValue, measureStart);
  const rangeStart = Math.min(measureStart, measureEnd);
  const rangeEnd = Math.max(measureStart, measureEnd);

  return rangeEnd >= selectedStart && rangeStart <= selectedEnd;
}

export function getMeasuresInTimeWindow(
  measures: JaarplanMeasureRecord[],
  metadata: JaarplanMetadata,
  timeWindow: JaarplanTimeWindow
): JaarplanMeasureRecord[] {
  if (!timeWindow.start && !timeWindow.end) {
    return measures;
  }

  return measures.filter((measure) => matchesTimeWindow(measure, metadata, timeWindow));
}

export function getTimeWindowLabel(
  metadata: JaarplanMetadata,
  timeWindow: JaarplanTimeWindow
): string {
  if (!timeWindow.start && !timeWindow.end) {
    return "Alle periodes";
  }

  const normalizedWindow = normalizeTimeWindow(metadata, timeWindow);
  const startLabel =
    metadata.werkperiodeOptions.find((option) => option.value === normalizedWindow.start)?.label ??
    normalizedWindow.start;
  const endLabel =
    metadata.werkperiodeOptions.find((option) => option.value === normalizedWindow.end)?.label ??
    normalizedWindow.end;

  return normalizedWindow.start === normalizedWindow.end
    ? startLabel
    : `${startLabel} - ${endLabel}`;
}

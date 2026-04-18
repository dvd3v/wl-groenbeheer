import { Binoculars, TriangleAlert } from "lucide-react";
import type { JaarplanMeasureRecord, MaatregelStatus } from "../../types/app";

export function getJaarplanRegimePalette(regimeNumber: number | null) {
  if (regimeNumber !== null && regimeNumber >= 1 && regimeNumber <= 11) {
    return {
      background: "#e0f2fe",
      foreground: "#075985",
      border: "#7dd3fc",
      label: "Regime 1-11",
    };
  }

  if (regimeNumber !== null && regimeNumber >= 12 && regimeNumber <= 15) {
    return {
      background: "#dcfce7",
      foreground: "#166534",
      border: "#86efac",
      label: "Regime 12-15",
    };
  }

  return {
    background: "#ffedd5",
    foreground: "#9a3412",
    border: "#fdba74",
    label: "Regime 16-17",
  };
}

export function getMaatregelStatusPalette(status: MaatregelStatus) {
  switch (status) {
    case "uitgevoerd":
      return {
        label: "Uitgevoerd",
        textClassName: "text-emerald-700",
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
        mapColor: "#16a34a",
      };
    case "niet_uitgevoerd":
      return {
        label: "Niet uitgevoerd",
        textClassName: "text-rose-700",
        badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
        mapColor: "#dc2626",
      };
    case "deels_uitgevoerd":
      return {
        label: "Deels uitgevoerd",
        textClassName: "text-orange-700",
        badgeClassName: "border-orange-200 bg-orange-50 text-orange-700",
        mapColor: "#f97316",
      };
    case "gepland":
      return {
        label: "Gepland",
        textClassName: "text-violet-700",
        badgeClassName: "border-violet/20 bg-violet/10 text-violet",
        mapColor: "#7c3aed",
      };
    default:
      return {
        label: "Geen status",
        textClassName: "text-slate-800",
        badgeClassName: "border-slate-300 bg-slate-50 text-slate-800",
        mapColor: "#111827",
      };
  }
}

export function RegimeBadge({
  regimeLabel,
  regimeNumber,
}: {
  regimeLabel: string;
  regimeNumber: number | null;
}) {
  const palette = getJaarplanRegimePalette(regimeNumber);

  return (
    <span
      className="inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-semibold"
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        borderColor: palette.border,
      }}
      title={palette.label}
    >
      Regime {regimeLabel || regimeNumber || "—"}
    </span>
  );
}

export function MaatregelStatusBadge({
  status,
  compact = false,
}: {
  status: MaatregelStatus;
  compact?: boolean;
}) {
  const palette = getMaatregelStatusPalette(status);

  return (
    <span
      className={`inline-flex rounded-pill border font-semibold ${palette.badgeClassName} ${
        compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      {palette.label}
    </span>
  );
}

export function MeasureSignals({ measure }: { measure: JaarplanMeasureRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {measure.soortspecifiekeMaat ? (
        <span
          className="inline-flex items-center gap-1 rounded-pill border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700"
          title="Soortspecifieke maatregel vereist aandacht"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          Soortspecifiek
        </span>
      ) : null}
      {measure.locatiebezoek ? (
        <span
          className="inline-flex items-center gap-1 rounded-pill border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
          title="Locatiebezoek nodig"
        >
          <Binoculars className="h-3.5 w-3.5" />
          Locatiebezoek
        </span>
      ) : null}
    </div>
  );
}

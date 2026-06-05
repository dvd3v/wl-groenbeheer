import { ListPlus, X } from "lucide-react";
import { MaatregelForm } from "../jaarplan/maatregel-form";
import { Button } from "../ui/button";
import type {
  JaarplanMeasureFormValues,
  JaarplanMetadata,
  SteekproefStatus,
} from "../../types/app";

interface BulkMeasurePlanningPanelProps {
  selectedCount: number;
  values: JaarplanMeasureFormValues;
  metadata: JaarplanMetadata;
  steekproefStatusOptions: Array<{
    value: SteekproefStatus;
    label: string;
  }>;
  toelichtingText: string;
  saving: boolean;
  error?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
  layout?: "full" | "compact";
  onFieldChange: (field: keyof JaarplanMeasureFormValues, value: string) => void;
  onSubmit: () => void;
  onClearSelection: () => void;
}

export function BulkMeasurePlanningPanel({
  selectedCount,
  values,
  metadata,
  steekproefStatusOptions,
  toelichtingText,
  saving,
  error,
  disabled = false,
  disabledMessage,
  layout = "full",
  onFieldChange,
  onSubmit,
  onClearSelection,
}: BulkMeasurePlanningPanelProps) {
  return (
    <section className="rounded-card border border-border bg-white p-4 shadow-panel">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet">
            <ListPlus className="h-3.5 w-3.5" />
            Maatregel plannen voor selectie
          </div>
          <div className="mt-1 text-[12px] text-textDim">
            Deze maatregel wordt aangemaakt voor {selectedCount} geselecteerd
            traject{selectedCount === 1 ? "" : "en"}.
          </div>
        </div>
        <Button variant="ghost" onClick={onClearSelection} disabled={saving}>
          <X className="h-3.5 w-3.5" />
          Selectie wissen
        </Button>
      </div>

      {disabledMessage && disabled ? (
        <div className="mb-3 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          {disabledMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger">
          {error}
        </div>
      ) : null}

      <MaatregelForm
        layout={layout}
        values={values}
        metadata={metadata}
        steekproefStatusOptions={steekproefStatusOptions}
        toelichtingText={toelichtingText}
        submitLabel={`Maatregel toevoegen aan ${selectedCount} traject${selectedCount === 1 ? "" : "en"}`}
        saving={saving}
        submitDisabled={disabled}
        onFieldChange={onFieldChange}
        onSubmit={onSubmit}
      />
    </section>
  );
}

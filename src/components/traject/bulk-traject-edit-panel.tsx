import { CheckSquare, Save, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { BulkTrajectUpdateFields, JaarplanDomainOption } from "../../types/app";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";

type BulkFieldKey = keyof Pick<
  BulkTrajectUpdateFields,
  | "naam"
  | "functie"
  | "uitvoerderOnderhoud"
  | "bodemklasse"
  | "type"
  | "bovenbreedte"
  | "werkpadBreedte"
>;

interface BulkTrajectEditPanelProps {
  selectedCount: number;
  saving: boolean;
  title?: string;
  density?: "regular" | "compact";
  fieldOptions: {
    functie: JaarplanDomainOption[];
    uitvoerderOnderhoud: JaarplanDomainOption[];
    bodemklasse: JaarplanDomainOption[];
    type: JaarplanDomainOption[];
    bovenbreedte: JaarplanDomainOption[];
    werkpadBreedte: JaarplanDomainOption[];
  };
  disabled?: boolean;
  disabledMessage?: string;
  error?: string | null;
  onSave: (values: BulkTrajectUpdateFields) => void;
  onClearSelection: () => void;
}

const DEFAULT_ENABLED: Record<BulkFieldKey, boolean> = {
  naam: false,
  functie: false,
  uitvoerderOnderhoud: false,
  bodemklasse: false,
  type: false,
  bovenbreedte: false,
  werkpadBreedte: false,
};

interface FieldToggleProps {
  checked: boolean;
  children: ReactNode;
  compact?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

function FieldToggle({
  checked,
  children,
  compact = false,
  label,
  onCheckedChange,
}: FieldToggleProps) {
  return (
    <label
      className={`block rounded-card border transition ${
        compact ? "p-2.5" : "p-3"
      } ${
        checked ? "border-accent/45 bg-accentSoft/25" : "border-border bg-white"
      }`}
    >
      <span className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span className="text-[11px] font-medium text-textDim">{label}</span>
      </span>
      {children}
    </label>
  );
}

function DomainControl({
  disabled,
  options,
  value,
  onChange,
}: {
  disabled: boolean;
  options: JaarplanDomainOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!options.length) {
    return (
      <Input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <NativeSelect
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">-</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function BulkTrajectEditPanel({
  selectedCount,
  saving,
  title = "Trajectgegevens bulk bewerken",
  density = "regular",
  fieldOptions,
  disabled = false,
  disabledMessage,
  error,
  onSave,
  onClearSelection,
}: BulkTrajectEditPanelProps) {
  const [enabled, setEnabled] = useState<Record<BulkFieldKey, boolean>>(DEFAULT_ENABLED);
  const [values, setValues] = useState<
    Required<
      Pick<
        BulkTrajectUpdateFields,
        | "naam"
        | "functie"
        | "uitvoerderOnderhoud"
        | "bodemklasse"
        | "type"
        | "bovenbreedte"
        | "werkpadBreedte"
      >
    >
  >({
    naam: "",
    functie: "",
    uitvoerderOnderhoud: "",
    bodemklasse: "",
    type: "",
    bovenbreedte: "",
    werkpadBreedte: "",
  });

  const activeFieldCount = useMemo(
    () => Object.values(enabled).filter(Boolean).length,
    [enabled]
  );
  const compact = density === "compact";

  function setFieldEnabled(field: BulkFieldKey, checked: boolean) {
    setEnabled((current) => ({
      ...current,
      [field]: checked,
    }));
  }

  function updateValue<K extends keyof typeof values>(
    field: K,
    value: (typeof values)[K]
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload(): BulkTrajectUpdateFields {
    return (Object.keys(enabled) as BulkFieldKey[]).reduce<BulkTrajectUpdateFields>(
      (payload, field) => {
        if (!enabled[field]) {
          return payload;
        }

        return {
          ...payload,
          [field]: values[field],
        };
      },
      {}
    );
  }

  return (
    <section className={`rounded-card border border-border bg-white shadow-panel ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex flex-col gap-3 ${compact ? "" : "lg:flex-row lg:items-start lg:justify-between"}`}>
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
            <CheckSquare className="h-3.5 w-3.5" />
            {title}
          </div>
          <div className="mt-1 text-[12px] text-textDim">
            {selectedCount} traject{selectedCount === 1 ? "" : "en"} geselecteerd
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onClearSelection} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Selectie wissen
          </Button>
          <Button
            onClick={() => onSave(buildPayload())}
            disabled={disabled || saving || selectedCount === 0 || activeFieldCount === 0}
            title={disabled ? disabledMessage : undefined}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Opslaan..." : "Toepassen"}
          </Button>
        </div>
      </div>

      {disabledMessage && disabled ? (
        <div className="mt-3 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          {disabledMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger">
          {error}
        </div>
      ) : null}

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        <FieldToggle
          label="Naam"
          checked={enabled.naam}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("naam", checked)}
        >
          <Input
            disabled={!enabled.naam}
            value={values.naam}
            onChange={(event) => updateValue("naam", event.target.value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Functie"
          checked={enabled.functie}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("functie", checked)}
        >
          <DomainControl
            disabled={!enabled.functie}
            options={fieldOptions.functie}
            value={values.functie}
            onChange={(value) => updateValue("functie", value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Bodemklasse"
          checked={enabled.bodemklasse}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("bodemklasse", checked)}
        >
          <DomainControl
            disabled={!enabled.bodemklasse}
            options={fieldOptions.bodemklasse}
            value={values.bodemklasse}
            onChange={(value) => updateValue("bodemklasse", value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Uitvoerder onderhoud"
          checked={enabled.uitvoerderOnderhoud}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("uitvoerderOnderhoud", checked)}
        >
          <DomainControl
            disabled={!enabled.uitvoerderOnderhoud}
            options={fieldOptions.uitvoerderOnderhoud}
            value={values.uitvoerderOnderhoud}
            onChange={(value) => updateValue("uitvoerderOnderhoud", value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Type"
          checked={enabled.type}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("type", checked)}
        >
          <DomainControl
            disabled={!enabled.type}
            options={fieldOptions.type}
            value={values.type}
            onChange={(value) => updateValue("type", value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Bovenbreedte"
          checked={enabled.bovenbreedte}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("bovenbreedte", checked)}
        >
          <DomainControl
            disabled={!enabled.bovenbreedte}
            options={fieldOptions.bovenbreedte}
            value={values.bovenbreedte}
            onChange={(value) => updateValue("bovenbreedte", value)}
          />
        </FieldToggle>

        <FieldToggle
          label="Werkpad breedte"
          checked={enabled.werkpadBreedte}
          compact={compact}
          onCheckedChange={(checked) => setFieldEnabled("werkpadBreedte", checked)}
        >
          <DomainControl
            disabled={!enabled.werkpadBreedte}
            options={fieldOptions.werkpadBreedte}
            value={values.werkpadBreedte}
            onChange={(value) => updateValue("werkpadBreedte", value)}
          />
        </FieldToggle>

      </div>
    </section>
  );
}

import type {
  JaarplanMeasureFormValues,
  JaarplanMetadata,
  SteekproefStatus,
} from "../../types/app";
import {
  getCheckboxValue,
  getWerkzaamheidGroups,
  isCheckedJaNeeValue,
  WERKZAAMHEID_SELECTION_SEPARATOR,
} from "../../lib/jaarplan-measure-utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

interface MaatregelFormProps {
  values: JaarplanMeasureFormValues;
  metadata: JaarplanMetadata;
  steekproefStatusOptions: Array<{
    value: SteekproefStatus;
    label: string;
  }>;
  toelichtingText: string;
  submitLabel: string;
  saving?: boolean;
  layout?: "full" | "compact";
  onFieldChange: (field: keyof JaarplanMeasureFormValues, value: string) => void;
  onSubmit: () => void;
}

function getRangeTargetValue(
  currentValue: string,
  options: JaarplanMetadata["werkperiodeOptions"]
): string {
  const currentIndex = options.findIndex((option) => option.value === currentValue);
  const nextOption = options[currentIndex + 1] ?? options[currentIndex - 1] ?? null;

  return nextOption?.value ?? currentValue;
}

export function MaatregelForm({
  values,
  metadata,
  steekproefStatusOptions,
  toelichtingText,
  submitLabel,
  saving = false,
  layout = "full",
  onFieldChange,
  onSubmit,
}: MaatregelFormProps) {
  const compact = layout === "compact";
  const isWerkperiodeBereik = values.werkperiodeVanValue !== values.werkperiodeTotValue;
  const werkzaamhedenGroups = getWerkzaamheidGroups(metadata);
  const geselecteerdeWerkzaamheid = `${values.regimeValue}${WERKZAAMHEID_SELECTION_SEPARATOR}${values.werkzaamhedenValue}`;
  const planningTopGridClassName = compact
    ? "grid gap-3 sm:grid-cols-6"
    : "grid gap-3 xl:grid-cols-12";
  const planningBottomGridClassName = compact
    ? "grid gap-3 sm:grid-cols-2"
    : "grid gap-3 xl:grid-cols-12";
  const contractorTopGridClassName = compact
    ? "grid gap-3 sm:grid-cols-2"
    : "grid gap-3 xl:grid-cols-12";
  const contractorBottomGridClassName = compact
    ? "grid gap-3 sm:grid-cols-2"
    : "grid gap-3 xl:grid-cols-12";
  const yesValue = getCheckboxValue(metadata.jaNeeOptions, true);
  const noValue = getCheckboxValue(metadata.jaNeeOptions, false);

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-accent/15 bg-accentSoft/20 p-4">
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accentStrong">
            WL planning
          </div>
          <div className="mt-1 text-[12px] text-textDim">
            Velden voor voorbereiding en inhoud van de maatregel.
          </div>
        </div>

        <div className="space-y-3">
          <div className={planningTopGridClassName}>
          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Regime</span>
            <NativeSelect
              value={values.regimeValue}
              className="font-mono"
              onChange={(event) => onFieldChange("regimeValue", event.target.value)}
            >
              {metadata.regimeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className={`space-y-1.5 ${compact ? "sm:col-span-2" : "xl:col-span-4"}`}>
            <span className="text-[11px] text-textDim">Werkzaamheden</span>
            <NativeSelect
              value={geselecteerdeWerkzaamheid}
              onChange={(event) => onFieldChange("werkzaamhedenValue", event.target.value)}
            >
              {werkzaamhedenGroups.map((group) => (
                <optgroup
                  key={group.regimeValue}
                  label={`${group.regimeLabel}`}
                >
                  {group.options.map((option) => (
                    <option
                      key={`${group.regimeValue}-${option.value}`}
                      value={`${group.regimeValue}${WERKZAAMHEID_SELECTION_SEPARATOR}${option.value}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </label>

          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Zijde</span>
            <NativeSelect
              value={values.zijdeValue}
              onChange={(event) => onFieldChange("zijdeValue", event.target.value)}
            >
              {metadata.zijdeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Afvoeren</span>
            <NativeSelect
              value={values.afvoerenValue}
              onChange={(event) => onFieldChange("afvoerenValue", event.target.value)}
            >
              {metadata.afvoerenOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>

          <div className={`space-y-1.5 ${compact ? "sm:col-span-2" : "xl:col-span-2"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-textDim">Werkperiode</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-textMuted">Bereik</span>
                <Switch
                  checked={isWerkperiodeBereik}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      onFieldChange("werkperiodeTotValue", values.werkperiodeVanValue);
                      return;
                    }

                    onFieldChange(
                      "werkperiodeTotValue",
                      getRangeTargetValue(values.werkperiodeVanValue, metadata.werkperiodeOptions)
                    );
                  }}
                />
              </div>
            </div>

            {isWerkperiodeBereik ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Van</span>
                  <NativeSelect
                    value={values.werkperiodeVanValue}
                    onChange={(event) => onFieldChange("werkperiodeVanValue", event.target.value)}
                  >
                    {metadata.werkperiodeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Tot</span>
                  <NativeSelect
                    value={values.werkperiodeTotValue}
                    onChange={(event) => onFieldChange("werkperiodeTotValue", event.target.value)}
                  >
                    {metadata.werkperiodeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            ) : (
              <NativeSelect
                value={values.werkperiodeVanValue}
                onChange={(event) => {
                  onFieldChange("werkperiodeVanValue", event.target.value);
                  onFieldChange("werkperiodeTotValue", event.target.value);
                }}
              >
                {metadata.werkperiodeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
          </div>

          <div className={planningBottomGridClassName}>
            <label
              className={`flex items-center gap-3 rounded-card border border-border bg-white px-3 py-3 ${
                compact ? "" : "xl:col-span-6"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                checked={isCheckedJaNeeValue(metadata.jaNeeOptions, values.soortspecifiekeMaatValue)}
                onChange={(event) =>
                  onFieldChange(
                    "soortspecifiekeMaatValue",
                    event.target.checked ? yesValue : noValue
                  )
                }
              />
              <div>
                <div className="text-[12px] font-medium text-text">Soortspecifieke maatregel</div>
                <div className="text-[11px] text-textMuted">
                  Aanvinken wanneer extra soortspecifieke aandacht nodig is.
                </div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 rounded-card border border-border bg-white px-3 py-3 ${
                compact ? "" : "xl:col-span-6"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                checked={isCheckedJaNeeValue(metadata.jaNeeOptions, values.locatiebezoekValue)}
                onChange={(event) =>
                  onFieldChange(
                    "locatiebezoekValue",
                    event.target.checked ? yesValue : noValue
                  )
                }
              />
              <div>
                <div className="text-[12px] font-medium text-text">Locatiebezoek</div>
                <div className="text-[11px] text-textMuted">
                  Aanvinken wanneer een locatiebezoek nodig is.
                </div>
              </div>
            </label>
          </div>

          <label className={`space-y-1.5 ${compact ? "sm:col-span-2" : "xl:col-span-12"}`}>
            <span className="text-[11px] text-textDim">Toelichting</span>
            <Textarea
              rows={4}
              value={toelichtingText}
              readOnly
              className="min-h-[110px] bg-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Aannemer uitvoering
          </div>
          <div className="mt-1 text-[12px] text-textDim">
            Velden die later tijdens planning en uitvoering worden ingevuld.
          </div>
        </div>

        <div className="space-y-3">
          <div className={contractorTopGridClassName}>
          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-3"}`}>
            <span className="text-[11px] text-textDim">Status maatregel</span>
            <NativeSelect
              value={values.statusMaatregel}
              onChange={(event) => onFieldChange("statusMaatregel", event.target.value)}
            >
              <option value="geen_status">Geen status</option>
              <option value="gepland">Gepland</option>
              <option value="uitgevoerd">Uitgevoerd</option>
              <option value="deels_uitgevoerd">Deels uitgevoerd</option>
              <option value="niet_uitgevoerd">Niet uitgevoerd</option>
            </NativeSelect>
          </label>

          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Datum gepland</span>
            <Input
              type="date"
              value={values.datumGepland}
              onChange={(event) => onFieldChange("datumGepland", event.target.value)}
            />
          </label>

          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Datum uitgevoerd</span>
            <Input
              type="date"
              value={values.datumUitgevoerd}
              onChange={(event) => onFieldChange("datumUitgevoerd", event.target.value)}
            />
          </label>

          <label className={`space-y-1.5 ${compact ? "" : "xl:col-span-2"}`}>
            <span className="text-[11px] text-textDim">Steekproef status</span>
            <NativeSelect
              value={values.steekproefStatus}
              onChange={(event) =>
                onFieldChange("steekproefStatus", event.target.value as SteekproefStatus)
              }
            >
              {steekproefStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className={`space-y-1.5 ${compact ? "sm:col-span-2" : "xl:col-span-5"}`}>
            <span className="text-[11px] text-textDim">Foto</span>
            <Input
              value={values.foto}
              onChange={(event) => onFieldChange("foto", event.target.value)}
              placeholder="Dummy veld voor fotolink of bestandsnaam"
            />
          </label>
          </div>

          <div className={contractorBottomGridClassName}>
          <label className={`${compact ? "sm:col-span-2" : "xl:col-span-6"} space-y-1.5`}>
            <span className="text-[11px] text-textDim">Reden niet uitgevoerd</span>
            <Textarea
              rows={3}
              className="min-h-[92px] bg-white"
              value={values.redenNietUitgevoerd}
              onChange={(event) => onFieldChange("redenNietUitgevoerd", event.target.value)}
              placeholder="Toelichting wanneer de maatregel niet is uitgevoerd"
            />
          </label>

          <label className={`${compact ? "sm:col-span-2" : "xl:col-span-6"} space-y-1.5`}>
            <span className="text-[11px] text-textDim">Opmerking</span>
            <Textarea
              rows={3}
              className="min-h-[92px] bg-white"
              value={values.opmerking}
              onChange={(event) => onFieldChange("opmerking", event.target.value)}
              placeholder="Vrije opmerking voor aannemer of controle"
            />
          </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={onSubmit} disabled={saving} className="px-4 py-2">
          {saving ? "Opslaan..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

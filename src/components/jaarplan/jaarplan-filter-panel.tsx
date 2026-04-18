import { ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
import { useState } from "react";
import type { SharedJaarplanFilters } from "../../types/app";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Switch } from "../ui/switch";

export interface JaarplanFilterOptions {
  uitvoerderOnderhoud: Array<{ value: string; label: string }>;
  regime: Array<{ value: string; label: string }>;
  werkzaamheid: Array<{ value: string; label: string }>;
  werkperiode: Array<{ value: string; label: string }>;
  zijde: Array<{ value: string; label: string }>;
  afvoeren: Array<{ value: string; label: string }>;
  statusMaatregel: Array<{ value: string; label: string }>;
  steekproefStatus: Array<{ value: string; label: string }>;
}

interface JaarplanFilterPanelProps {
  filters: SharedJaarplanFilters;
  options: JaarplanFilterOptions;
  activeFilterCount: number;
  mode?: "full" | "compact";
  onFilterChange: <K extends keyof SharedJaarplanFilters>(
    key: K,
    value: SharedJaarplanFilters[K]
  ) => void;
  onReset: () => void;
}

export function JaarplanFilterPanel({
  filters,
  options,
  activeFilterCount,
  mode = "full",
  onFilterChange,
  onReset,
}: JaarplanFilterPanelProps) {
  const compact = mode === "compact";
  const [expanded, setExpanded] = useState(mode === "full");
  const quickFilters = (
    <>
      <label className="space-y-1.5">
        <span className="text-[11px] text-textDim">Regime</span>
        <NativeSelect
          value={filters.regime}
          onChange={(event) => onFilterChange("regime", event.target.value)}
        >
          <option value="">Alle regimes</option>
          {options.regime.map((option) => (
            <option key={option.value} value={option.label}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="space-y-1.5">
        <span className="text-[11px] text-textDim">Werkperiode</span>
        <NativeSelect
          value={filters.werkperiode}
          onChange={(event) => onFilterChange("werkperiode", event.target.value)}
        >
          <option value="">Alle periodes</option>
          {options.werkperiode.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="space-y-1.5">
        <span className="text-[11px] text-textDim">Status maatregel</span>
        <NativeSelect
          value={filters.statusMaatregel}
          onChange={(event) => onFilterChange("statusMaatregel", event.target.value)}
        >
          <option value="">Alle statussen</option>
          {options.statusMaatregel.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="space-y-1.5">
        <span className="text-[11px] text-textDim">Signalering</span>
        <NativeSelect
          value={filters.signal}
          onChange={(event) => onFilterChange("signal", event.target.value)}
        >
          <option value="">Alles</option>
          <option value="signaal">Alleen met signaal</option>
          <option value="soortspecifiek">Soortspecifiek</option>
          <option value="locatiebezoek">Locatiebezoek</option>
        </NativeSelect>
      </label>
    </>
  );

  return (
    <section className="glass-panel rounded-card border border-white/60 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className={`${compact ? "max-w-[340px]" : "max-w-[460px]"} relative flex-1`}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
          <Input
            className="pl-9"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Zoek op traject, werkzaamheid of opmerking..."
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-2 text-[11px] text-textDim">
            <Filter className="h-3.5 w-3.5" />
            {activeFilterCount ? `${activeFilterCount} filters actief` : "Geen filters actief"}
          </div>
          <Button variant="outline" onClick={() => setExpanded((current) => !current)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Filters inklappen" : "Filters uitklappen"}
          </Button>
          <Button variant="ghost" onClick={onReset} disabled={!activeFilterCount}>
            Wis filters
          </Button>
        </div>
      </div>

      {expanded ? (
        <>
          <div
            className={`mt-4 grid gap-3 ${
              compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            {quickFilters}

            {!compact ? (
              <>
                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Uitvoerder onderhoud</span>
                  <NativeSelect
                    value={filters.uitvoerderOnderhoud}
                    onChange={(event) => onFilterChange("uitvoerderOnderhoud", event.target.value)}
                  >
                    <option value="">Alle uitvoerders</option>
                    {options.uitvoerderOnderhoud.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Trajectcode</span>
                  <Input
                    value={filters.trajectCode}
                    onChange={(event) => onFilterChange("trajectCode", event.target.value)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Werkzaamheid</span>
                  <NativeSelect
                    value={filters.werkzaamheid}
                    onChange={(event) => onFilterChange("werkzaamheid", event.target.value)}
                  >
                    <option value="">Alle werkzaamheden</option>
                    {options.werkzaamheid.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Zijde</span>
                  <NativeSelect
                    value={filters.zijde}
                    onChange={(event) => onFilterChange("zijde", event.target.value)}
                  >
                    <option value="">Alle zijdes</option>
                    {options.zijde.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Afvoeren</span>
                  <NativeSelect
                    value={filters.afvoeren}
                    onChange={(event) => onFilterChange("afvoeren", event.target.value)}
                  >
                    <option value="">Alle afvoeropties</option>
                    {options.afvoeren.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Datum gepland</span>
                  <Input
                    type="date"
                    value={filters.datumGepland}
                    onChange={(event) => onFilterChange("datumGepland", event.target.value)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Datum uitgevoerd</span>
                  <Input
                    type="date"
                    value={filters.datumUitgevoerd}
                    onChange={(event) => onFilterChange("datumUitgevoerd", event.target.value)}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] text-textDim">Steekproef status</span>
                  <NativeSelect
                    value={filters.steekproefStatus}
                    onChange={(event) => onFilterChange("steekproefStatus", event.target.value)}
                  >
                    <option value="">Alle statussen</option>
                    {options.steekproefStatus.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-white px-4 py-3">
            <Switch
              checked={filters.hasMeasuresOnly}
              onCheckedChange={(checked) => onFilterChange("hasMeasuresOnly", checked)}
            />
            <div>
              <div className="text-[12px] font-medium text-text">
                Alleen trajecten met zichtbare maatregelen
              </div>
              <div className="text-[11px] text-textMuted">
                Houd de tabel en kaart beperkt tot trajecten met maatregelen binnen de huidige filterselectie.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

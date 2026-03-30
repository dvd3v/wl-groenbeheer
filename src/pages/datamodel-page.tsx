import { Database, GitBranchPlus, Link2 } from "lucide-react";
import { Accordion, AccordionSection } from "../components/ui/accordion";
import {
  DATAMODEL_SECTIONS,
  REGIME_TEMPLATE_LIBRARY,
  SPATIAL_CONTEXT_OPTIONS,
  WERKZAAMHEDEN_SCHEMA,
} from "../data/datamodel";
import { cn } from "../lib/cn";

const toneClasses = {
  accent: "border-accent/25 bg-accentSoft text-accentStrong",
  blue: "border-blue/25 bg-blue/10 text-blue",
  violet: "border-violet/25 bg-violet/10 text-violet",
};

export function DatamodelPage() {
  return (
    <div className="app-scrollbar h-full overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <div className="glass-panel rounded-card p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
              <Database className="h-4 w-4" />
              Datamodel
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-text">
              Trajectlaag en planningmodel
            </h1>
            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-textDim">
              De React-app documenteert zowel de live ArcGIS feature layer als het
              lokale planningmodel voor werkzaamheden. In de huidige productiebron is{" "}
              <code>traject_code</code> de zichtbare trajectsleutel en gebruikt de app{" "}
              <code>guid</code> als interne selectie- en koppelsleutel.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">2</div>
              <div className="mt-1 text-[11px] text-textMuted">Gedocumenteerde lagen</div>
            </div>
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">guid</div>
              <div className="mt-1 text-[11px] text-textMuted">Actieve join- en selectiecode</div>
            </div>
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">0</div>
              <div className="mt-1 text-[11px] text-textMuted">UI-refactors nodig bij planning-migratie</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-card p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
              <Link2 className="h-4 w-4 text-accentStrong" />
              Planning seam
            </div>
            <p className="mt-2 text-[12px] leading-6 text-textDim">
              De UI leest trajecten en werkzaamheden via een stabiele datastructuur.
              Daardoor kan de huidige lokale planning later worden vervangen door een
              ArcGIS-gerelateerde tabel zonder de map- of jaarplanweergave te herschrijven.
            </p>
          </div>
          <div className="glass-panel rounded-card p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
              <Database className="h-4 w-4 text-blue" />
              ArcGIS truth
            </div>
            <p className="mt-2 text-[12px] leading-6 text-textDim">
              Geometrie en Esri-attributen blijven in de hosted feature layer. De
              app gebruikt ArcGIS headless voor auth, querying, rendering en
              applyEdits.
            </p>
          </div>
          <div className="glass-panel rounded-card p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
              <GitBranchPlus className="h-4 w-4 text-violet" />
              Migration ready
            </div>
            <p className="mt-2 text-[12px] leading-6 text-textDim">
              De datamodelpagina maakt expliciet welke velden live zijn en welke
              velden voorlopig alleen als browser-persistente planningsdata bestaan.
            </p>
          </div>
        </section>

        <section className="glass-panel rounded-card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet">
            Datamodeldomeinen
          </div>
          <h2 className="mt-2 text-xl font-bold text-text">
            Volledige regimes, contexten en domeinlijsten
          </h2>
          <p className="mt-2 max-w-4xl text-[13px] leading-6 text-textDim">
            Hieronder staan alle regimes, werkzaamheden, ruimtelijke contexten,
            afvoeropties, bewerkingspercentages en werkperiodes die nu in het mock
            jaarplan worden gebruikt.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-card p-5">
            <div className="text-[12px] font-semibold text-text">Ruimtelijke contexten</div>
            <div className="mt-4 grid gap-3">
              {SPATIAL_CONTEXT_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="rounded-card border border-border bg-surfaceAlt/70 p-4"
                >
                  <div className="text-[12px] font-semibold text-text">{option.value}</div>
                  <p className="mt-1 text-[12px] leading-6 text-textDim">
                    {option.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-card p-5">
            <div className="text-[12px] font-semibold text-text">Overige domeinlijsten</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Zijde
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WERKZAAMHEDEN_SCHEMA.zijde.map((value) => (
                    <span
                      key={value}
                      className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Bewerkingspercentage
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WERKZAAMHEDEN_SCHEMA.bewerkingspercentage.map((value) => (
                    <span
                      key={value}
                      className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Afvoeren
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WERKZAAMHEDEN_SCHEMA.afvoeren.map((value) => (
                    <span
                      key={value}
                      className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  Werkperiodes
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WERKZAAMHEDEN_SCHEMA.werkperiode.map((value) => (
                    <span
                      key={value}
                      className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-border bg-white shadow-panel">
          <div className="border-b border-border bg-surface px-5 py-4">
            <div className="text-[12px] font-semibold text-text">
              Regimes en werkzaamheden
            </div>
            <div className="mt-1 text-[12px] text-textDim">
              Volledige regimecatalogus uit het mock datamodel.
            </div>
          </div>
          <div className="app-scrollbar overflow-auto">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="bg-surfaceAlt">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Regime</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Werkzaamheid</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Toelichting</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">
                    Bewerkingspercentage
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Afvoeren</th>
                  <th className="px-3 py-3 text-left font-semibold text-textDim">Werkperiode</th>
                </tr>
              </thead>
              <tbody>
                {REGIME_TEMPLATE_LIBRARY.map((item) => (
                  <tr key={item.regime} className="border-t border-border/70 align-top">
                    <td className="px-3 py-3 font-mono text-text">{item.regime}</td>
                    <td className="px-3 py-3 font-medium text-text">{item.werkzaamheid}</td>
                    <td className="px-3 py-3 text-textDim">{item.toelichting}</td>
                    <td className="px-3 py-3 text-textDim">
                      {item.bewerkingspercentage || "N.v.t."}
                    </td>
                    <td className="px-3 py-3 text-textDim">
                      {item.afvoeren || "N.v.t."}
                    </td>
                    <td className="px-3 py-3 text-textDim">
                      {item.werkperiodeCode && item.werkperiodeLabel
                        ? `${item.werkperiodeCode}: ${item.werkperiodeLabel}`
                        : "N.v.t."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Accordion defaultValue={DATAMODEL_SECTIONS.map((section) => section.id)}>
          {DATAMODEL_SECTIONS.map((section) => (
            <AccordionSection
              key={section.id}
              value={section.id}
              title={section.title}
              subtitle={section.subtitle}
            >
              <div className="mb-4">
                <span
                  className={cn(
                    "inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    toneClasses[section.tone]
                  )}
                >
                  {section.id === "spatial" ? "ArcGIS live" : "Lokale planning"}
                </span>
              </div>

              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div
                    key={field.name}
                    className="rounded-card border border-border bg-surfaceAlt/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-mono text-[11px] font-medium text-text">
                        {field.name}
                      </div>
                      <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] text-textMuted">
                        {field.type}
                      </span>
                      {field.status ? (
                        <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] text-textMuted">
                          {field.status}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-[12px] font-semibold text-text">
                      {field.label}
                    </div>
                    <p className="mt-1 text-[12px] leading-6 text-textDim">
                      {field.description}
                    </p>
                    {field.domain?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {field.domain.map((domainValue) => (
                          <span
                            key={domainValue}
                            className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                          >
                            {domainValue}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionSection>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

import { Database, GitBranchPlus, Link2 } from "lucide-react";
import { Accordion, AccordionSection } from "../components/ui/accordion";
import { DATAMODEL_SECTIONS } from "../data/datamodel";
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
              lokale planningmodel voor werkzaamheden. Omdat de productiebron op
              March 26, 2026 nog geen <code>traject_code</code> bevat, gebruikt v1{" "}
              <code>GlobalID</code> als koppelsleutel tussen traject en planning.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">2</div>
              <div className="mt-1 text-[11px] text-textMuted">Gedocumenteerde lagen</div>
            </div>
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">GlobalID</div>
              <div className="mt-1 text-[11px] text-textMuted">Tijdelijke join-strategie</div>
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

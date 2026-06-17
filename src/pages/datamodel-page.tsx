import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  GitBranchPlus,
  KeyRound,
  Layers3,
  Network,
  Table2,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionSection } from "../components/ui/accordion";
import {
  DATAMODEL_SECTIONS,
  REGIME_TEMPLATE_LIBRARY,
  SPATIAL_CONTEXT_OPTIONS,
  WERKZAAMHEDEN_SCHEMA,
} from "../data/datamodel";
import { cn } from "../lib/cn";

type Tone = "accent" | "blue" | "violet" | "amber" | "green" | "neutral";
type DatamodelTabId = "overview" | "laag-a" | "laag-b" | "laag-c";

const toneClasses: Record<Tone, string> = {
  accent: "border-accent/25 bg-accentSoft text-accentStrong",
  blue: "border-blue/25 bg-blue/10 text-blue",
  violet: "border-violet/25 bg-violet/10 text-violet",
  amber: "border-warning/25 bg-warning/10 text-warning",
  green: "border-success/25 bg-success/10 text-success",
  neutral: "border-border bg-surfaceAlt text-textDim",
};

const entityAccentClasses: Record<Tone, string> = {
  accent: "border-accent/25 bg-accentSoft/40",
  blue: "border-blue/25 bg-blue/5",
  violet: "border-violet/25 bg-violet/5",
  amber: "border-warning/25 bg-warning/5",
  green: "border-success/25 bg-success/5",
  neutral: "border-border bg-white",
};

const FEATURE_SERVICE_URL =
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/GC_Werk_Trajecten_2027_v04/FeatureServer";

const TABS: Array<{ id: DatamodelTabId; label: string; description: string }> = [
  {
    id: "overview",
    label: "Hoofdmodel",
    description: "Samenhang tussen objecten, trajecten, maatregelen en jaarplan.",
  },
  {
    id: "laag-a",
    label: "Laag A",
    description: "Technisch objectmodel en IMBOR/WL-domeinen.",
  },
  {
    id: "laag-b",
    label: "Laag B",
    description: "Identificatie, namen, codes en beheercontext.",
  },
  {
    id: "laag-c",
    label: "Laag C",
    description: "Beheer, planning, uitvoering en inspectie.",
  },
];

const OBJECT_GROUPS = [
  { label: "Groenobjecten", examples: "Gras- en kruidachtigen, bos, struweel, haag", tone: "green" },
  { label: "Waterobjecten", examples: "Watergang, watervlakte, poel, ven", tone: "blue" },
  { label: "Verhardingsobjecten", examples: "Asfalt, beton, halfverharding, elementverharding", tone: "neutral" },
  { label: "Hekken", examples: "Draadraster, faunaraster, gaashek, toegangspoort", tone: "amber" },
] as const;

const LAYER_DEFINITIONS = {
  "laag-a": {
    label: "Laag A - Technisch",
    subtitle: "Technische objectclassificatie, afgestemd op IMBOR 2025 / WL / PWP.",
    fields: [
      ["GlobalID", "GUID", "Unieke technische sleutel voor objecten en relaties."],
      ["objecttype", "Short INT", "Hoofdklasse van het object, zoals groen, water, verharding of hek."],
      ["verschijningsvorm", "Short INT", "Nadere vorm of vegetatietype binnen het objecttype."],
      ["ruimtelijke_context", "Short INT", "Constructieve ligging, zoals talud, bodem, kruin of werkpad."],
      ["functie", "Short INT", "Functionele context, zoals Natuurbeek, Waterbuffer of Waterkering."],
      ["taludsteilte", "Int", "Technische indicatie voor grasland, bermen en taluds."],
      ["is_werkpad", "Boolean", "Geeft aan of het object fungeert als werkpad voor onderhoud."],
      ["steilheidklasse", "Text", "Aanvullende technische klasse binnen het drielagenmodel."],
    ],
    domains: [
      "Objecttype",
      "Verschijningsvorm",
      "Ruimtelijke context",
      "Functie",
      "Ja/Nee",
      "Breedteklasse watergang",
    ],
    tone: "accent" as Tone,
  },
  "laag-b": {
    label: "Laag B - Identificatie",
    subtitle: "Menselijke herkenning: codes, namen, beheerder en ecologische of streefbeeldcontext.",
    fields: [
      ["watergang_id", "Text", "Identificatie van de gekoppelde watergang waar relevant."],
      ["complex_id", "Text", "Identificatie van een groter beheercomplex of verzameling objecten."],
      ["trajectcode / traject_code", "Text", "Leesbare trajectsleutel voor kaart, tabel en jaarplan."],
      ["naam", "Text", "Naam van watergang, waterkering, lijnelement, buffer of traject."],
      ["streefbeeld_id", "Text", "Verwijzing naar ecologisch of beheergericht streefbeeld."],
      ["ecologisch_doel", "Text", "Doelstelling of context voor ecologisch beheer."],
      ["beheerder", "Text", "Juridisch of financieel verantwoordelijke beheerpartij."],
    ],
    domains: ["Beheerder", "Functie", "Trajectstatus", "Aanpassen door"],
    tone: "blue" as Tone,
  },
  "laag-c": {
    label: "Laag C - Beheer",
    subtitle: "Werkpakket voor jaarplan 2027: WL-planning, aannemerregistratie en inspectie.",
    fields: [
      ["regime / wl_regime", "Short INT", "Subtypeveld dat werkzaamheid en werkinstructie stuurt."],
      ["werkzaamheden / wl_werkzaamheden", "Short INT", "Werkzaamheid die automatisch bij het regime hoort."],
      ["wl_werkinstructie", "Text", "Instructietekst die door de app als werkinstructie wordt getoond."],
      ["afvoeren / wl_afvoeren", "Text", "Nee, direct ruimen of na 24 uur ruimen."],
      ["werkperiode van/tot", "Short INT", "Werkperiode 1 t/m 26 als bereik."],
      ["uitvoeringswijze_maaien", "Text", "Machinaal, handmatig, combinatie of N.v.t."],
      ["soortspecifieke_maatregel", "Boolean", "Signaalveld voor extra soortspecifieke aandacht."],
      ["locatiebezoek", "Boolean", "Signaalveld voor benodigd locatiebezoek."],
      ["steekproef_status", "Text", "Inspectiestatus: niet beoordeeld, ingepland, goedgekeurd of afgekeurd."],
      ["uitvoering_status", "Text", "Aannemerstatus, standaard zonder status bij nieuwe maatregelen."],
      ["datum uitgevoerd / maaisel geruimd", "Date", "Uitvoeringsregistratie door aannemer."],
    ],
    domains: [
      "Regime 1-19",
      "Werkzaamheden",
      "Afvoeren",
      "Werkperiode 1-26",
      "Uitvoerder",
      "Steekproefstatus",
      "Uitvoeringstatus",
    ],
    tone: "violet" as Tone,
  },
};

const DOMAIN_MODEL_ENTITIES = [
  "OBJECTTYPE",
  "VERSCHIJNINGSVORM",
  "RUIMTELIJKE_CONTEXT",
  "FUNCTIE",
];

function TonePill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

function FieldList({
  fields,
}: {
  fields: string[][];
}) {
  return (
    <div className="grid gap-3">
      {fields.map(([name, type, description]) => (
        <div key={name} className="rounded-card border border-border bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-text">{name}</span>
            <span className="rounded-pill bg-surfaceAlt px-2 py-0.5 text-[10px] text-textMuted">
              {type}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-6 text-textDim">{description}</p>
        </div>
      ))}
    </div>
  );
}

function EntityCard({
  title,
  subtitle,
  fields,
  tone,
}: {
  title: string;
  subtitle: string;
  fields: string[];
  tone: Tone;
}) {
  return (
    <div
      className={cn(
        "min-h-[190px] rounded-card border p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]",
        entityAccentClasses[tone]
      )}
    >
      <TonePill tone={tone}>{subtitle}</TonePill>
      <div className="mt-3 font-mono text-[13px] font-bold text-text">{title}</div>
      <div className="mt-3 grid gap-2">
        {fields.map((field) => (
          <div
            key={field}
            className="rounded-md border border-white/80 bg-white/80 px-2 py-1.5 font-mono text-[10px] text-textDim"
          >
            {field}
          </div>
        ))}
      </div>
    </div>
  );
}

function RelationChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
      <span className="hidden h-px w-8 bg-borderStrong lg:block" />
      <span className="rounded-pill border border-border bg-white px-2 py-1">{children}</span>
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

function HighLevelModel() {
  return (
    <section className="glass-panel rounded-card p-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
        <Network className="h-4 w-4" />
        Schematische samenhang
      </div>
      <h2 className="mt-2 text-xl font-bold text-text">
        Van beheerobject naar traject naar maatregel
      </h2>
      <p className="mt-2 max-w-4xl text-[13px] leading-6 text-textDim">
        Het areaal wordt beschreven met het A/B/C-drielagenmodel. In deze app wordt
        dat werkbaar gemaakt als trajectenlaag met een gerelateerde maatregelentabel
        voor het jaarplan.
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        <EntityCard
          title="BEHEEROBJECT"
          subtitle="Areaalbasis"
          tone="accent"
          fields={["GlobalID PK", "objecttype FK", "verschijningsvorm FK", "ruimtelijke_context FK", "functie FK"]}
        />
        <RelationChip>classificeert</RelationChip>
        <EntityCard
          title="TRAJECT"
          subtitle="Werkbare eenheid"
          tone="violet"
          fields={["GlobalID PK", "traject_code", "naam", "uitvoerder_onderhoud", "concept_gereed"]}
        />
        <RelationChip>1 : N</RelationChip>
        <EntityCard
          title="MAATREGEL"
          subtitle="Planning"
          tone="blue"
          fields={["GlobalID PK", "traject_guid FK", "wl_regime", "wl_werkinstructie", "aannemer + inspectie"]}
        />
        <RelationChip>voedt</RelationChip>
        <EntityCard
          title="JAARPLAN"
          subtitle="Werkproces"
          tone="green"
          fields={["WL vult planning", "Aannemer registreert", "Inspecteur beoordeelt", "Concept gereed teller"]}
        />
      </div>
    </section>
  );
}

function VisualErModel() {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-white shadow-panel">
      <div className="border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
          <Workflow className="h-4 w-4 text-accentStrong" />
          Relationeel model
        </div>
        <div className="mt-1 text-[12px] text-textDim">
          Visuele ER-weergave van domeinen, beheerobjecten, specialisaties, trajecten en maatregelen.
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[0.8fr_1fr_0.95fr]">
        <div className="space-y-3">
          <TonePill tone="neutral">Referentiedomeinen</TonePill>
          {DOMAIN_MODEL_ENTITIES.map((entity) => (
            <div
              key={entity}
              className="rounded-card border border-border bg-surfaceAlt/70 p-3"
            >
              <div className="font-mono text-[11px] font-semibold text-text">{entity}</div>
              <div className="mt-1 text-[11px] text-textDim">1 domeinwaarde classificeert meerdere beheerobjecten</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <EntityCard
            title="BEHEEROBJECT"
            subtitle="Centraal object"
            tone="accent"
            fields={[
              "GlobalID PK",
              "naam",
              "trajectcode",
              "beheerder",
              "is_werkpad",
              "taludsteilte",
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {["GROENOBJECT", "WATEROBJECT", "VERHARDINGSOBJECT", "HEK"].map((name) => (
              <div key={name} className="rounded-card border border-border bg-white p-3">
                <div className="font-mono text-[11px] font-semibold text-text">{name}</div>
                <div className="mt-1 text-[11px] text-textDim">specialisatie met geometrie</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-card border border-violet/25 bg-violet/5 p-4">
            <TonePill tone="violet">Werklaag</TonePill>
            <div className="mt-3 font-mono text-[13px] font-bold text-text">TRAJECT</div>
            <div className="mt-3 text-[12px] leading-6 text-textDim">
              Eén traject is de onderhoudbare eenheid in kaart en jaarplan. Het traject
              koppelt naar maatregelen via <code>GlobalID</code>.
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-pill border border-border bg-surfaceAlt px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-textMuted">
              1 traject heeft 0..n maatregelen
            </div>
          </div>
          <div className="rounded-card border border-blue/25 bg-blue/5 p-4">
            <TonePill tone="blue">Related table</TonePill>
            <div className="mt-3 font-mono text-[13px] font-bold text-text">MAATREGEL</div>
            <div className="mt-3 text-[12px] leading-6 text-textDim">
              <code>traject_guid</code> verwijst naar <code>Traject.GlobalID</code>.
              WL, aannemer en inspectie vullen elk hun eigen velden.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-card p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
            <KeyRound className="h-4 w-4 text-accentStrong" />
            Relatie
          </div>
          <p className="mt-2 text-[12px] leading-6 text-textDim">
            <code>GC_Werk_Rel_2027_v04</code> koppelt trajecten aan maatregelen:
            <code> Traject.GlobalID</code> naar <code>Maatregel.traject_guid</code>.
          </p>
        </div>
        <div className="glass-panel rounded-card p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
            <Table2 className="h-4 w-4 text-blue" />
            Editor tracking
          </div>
          <p className="mt-2 text-[12px] leading-6 text-textDim">
            De app schrijft direct naar ArcGIS met <code>applyEdits</code>.
            Creator, CreationDate, Editor en EditDate blijven ArcGIS-beheerd.
          </p>
        </div>
        <div className="glass-panel rounded-card p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
            <GitBranchPlus className="h-4 w-4 text-violet" />
            Versies wisselen
          </div>
          <p className="mt-2 text-[12px] leading-6 text-textDim">
            Via de configuratiepagina kan een andere trajectenlaag of maatregelentabel
            worden geselecteerd zodra een nieuwe versie is gepubliceerd.
          </p>
        </div>
      </section>

      <HighLevelModel />
      <VisualErModel />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-card p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
            <FileText className="h-4 w-4 text-accentStrong" />
            Documentatiebasis
          </div>
          <p className="mt-2 text-[12px] leading-6 text-textDim">
            De structuur bundelt datamodel, drielagenmodel, regimelogica,
            objecttypen en domeinen tot één overzicht.
          </p>
          <div className="mt-4 grid gap-2">
            {["IMBOR 2025 / WL / PWP", "Laag A technisch", "Laag B identificatie", "Laag C beheer"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-[11px] text-textDim">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accentStrong" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <div className="glass-panel rounded-card p-5">
          <div className="text-[12px] font-semibold text-text">Objectgroepen</div>
          <div className="mt-4 grid gap-3">
            {OBJECT_GROUPS.map((group) => (
              <div key={group.label} className="rounded-card border border-border bg-white p-3">
                <TonePill tone={group.tone}>{group.label}</TonePill>
                <p className="mt-2 text-[12px] leading-6 text-textDim">{group.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LayerTab({ id }: { id: "laag-a" | "laag-b" | "laag-c" }) {
  const layer = LAYER_DEFINITIONS[id];
  const isLayerC = id === "laag-c";

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-card p-6">
        <TonePill tone={layer.tone}>{layer.label}</TonePill>
        <h2 className="mt-3 text-xl font-bold text-text">{layer.label}</h2>
        <p className="mt-2 max-w-4xl text-[13px] leading-6 text-textDim">{layer.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {layer.domains.map((domain) => (
            <span
              key={domain}
              className="rounded-pill border border-border bg-white px-2.5 py-1 text-[10px] font-medium text-textDim"
            >
              {domain}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="glass-panel rounded-card p-5">
          <div className="text-[12px] font-semibold text-text">Velden</div>
          <div className="mt-4">
            <FieldList fields={layer.fields} />
          </div>
        </div>

        <div className="space-y-4">
          {id === "laag-a" ? (
            <>
              <div className="glass-panel rounded-card p-5">
                <div className="text-[12px] font-semibold text-text">Objecttypefamilies</div>
                <div className="mt-4 grid gap-3">
                  {OBJECT_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-card border border-border bg-white p-3">
                      <TonePill tone={group.tone}>{group.label}</TonePill>
                      <p className="mt-2 text-[12px] leading-6 text-textDim">{group.examples}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel rounded-card p-5">
                <div className="text-[12px] font-semibold text-text">Ruimtelijke contexten</div>
                <div className="mt-4 grid gap-3">
                  {SPATIAL_CONTEXT_OPTIONS.slice(0, 7).map((option) => (
                    <div key={option.value} className="rounded-card border border-border bg-white p-3">
                      <div className="text-[12px] font-semibold text-text">{option.value}</div>
                      <p className="mt-1 text-[12px] leading-6 text-textDim">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {id === "laag-b" ? (
            <div className="glass-panel rounded-card p-5">
              <div className="text-[12px] font-semibold text-text">Identificatie in de app</div>
              <div className="mt-4 grid gap-3">
                {[
                  ["traject_code", "Zichtbare code in tabel, popup en kaartselectie."],
                  ["naam", "Bewerkbaar in review en jaarplan."],
                  ["uitvoerder_onderhoud", "Filter en planningscontext voor onderhoudspartij."],
                  ["status", "Trajectcontrole, inclusief filter op Correct."],
                  ["concept_gereed", "Voortgangsvlag voor het vullen van maatregelen."],
                ].map(([name, text]) => (
                  <div key={name} className="rounded-card border border-border bg-white p-3">
                    <div className="font-mono text-[11px] font-semibold text-text">{name}</div>
                    <p className="mt-1 text-[12px] leading-6 text-textDim">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isLayerC ? (
            <div className="glass-panel rounded-card p-5">
              <div className="text-[12px] font-semibold text-text">Werkproces per rol</div>
              <div className="mt-4 grid gap-3">
                {[
                  ["WL", "Regime, werkzaamheid, werkinstructie, werkperiode, zijde, afvoeren en toelichting."],
                  ["Aannemer", "Status, geplande periode, datum uitgevoerd, maaisel geruimd, bewijs en opmerkingen."],
                  ["Inspecteur", "Steekproefstatus en steekproefopmerking in het oranje inspectieblok."],
                ].map(([role, text]) => (
                  <div key={role} className="rounded-card border border-border bg-white p-3">
                    <TonePill tone={role === "WL" ? "accent" : role === "Aannemer" ? "blue" : "amber"}>
                      {role}
                    </TonePill>
                    <p className="mt-2 text-[12px] leading-6 text-textDim">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {isLayerC ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel rounded-card p-5">
              <div className="text-[12px] font-semibold text-text">Maatregel- en trajectdomeinen</div>
              <div className="mt-4 space-y-4">
                {[
                  ["Zijde uitvoering", WERKZAAMHEDEN_SCHEMA.zijde],
                  ["Afvoeren", WERKZAAMHEDEN_SCHEMA.afvoeren],
                  ["Steekproefstatus", ["Niet beoordeeld", "Ingepland", "Goedgekeurd", "Afgekeurd"]],
                  ["Status maatregel", ["Geen status", "Gepland", "Uitgevoerd", "Deels uitgevoerd", "Niet uitgevoerd"]],
                ].map(([title, values]) => (
                  <div key={title as string}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                      {title as string}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(values as readonly string[]).map((value) => (
                        <span
                          key={value}
                          className="rounded-pill border border-border bg-white px-2 py-1 text-[10px] text-textDim"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-card p-5">
              <div className="text-[12px] font-semibold text-text">Werkperiode 1-26</div>
              <div className="mt-4 flex flex-wrap gap-2">
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
          </section>

          <section className="overflow-hidden rounded-card border border-border bg-white shadow-panel">
            <div className="border-b border-border bg-surface px-5 py-4">
              <div className="text-[12px] font-semibold text-text">
                Regimes, werkzaamheden en werkinstructies
              </div>
              <div className="mt-1 text-[12px] text-textDim">
                Catalogus uit het v04 datamodel. De app synchroniseert werkzaamheid en
                werkinstructie automatisch wanneer een regime wordt gekozen.
              </div>
            </div>
            <div className="app-scrollbar overflow-auto">
              <table className="min-w-full border-collapse text-[12px]">
                <thead className="bg-surfaceAlt">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold text-textDim">Regime</th>
                    <th className="px-3 py-3 text-left font-semibold text-textDim">Werkzaamheid</th>
                    <th className="px-3 py-3 text-left font-semibold text-textDim">Werkinstructie</th>
                  </tr>
                </thead>
                <tbody>
                  {REGIME_TEMPLATE_LIBRARY.map((item) => (
                    <tr key={item.regime} className="border-t border-border/70 align-top">
                      <td className="px-3 py-3 font-mono text-text">{item.regime}</td>
                      <td className="px-3 py-3 font-medium text-text">{item.werkzaamheid}</td>
                      <td className="px-3 py-3 text-textDim">{item.toelichting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <Accordion defaultValue={DATAMODEL_SECTIONS.map((section) => section.id)}>
        {DATAMODEL_SECTIONS.filter((section) =>
          id === "laag-c" ? section.id === "planning" : section.id === "spatial"
        ).map((section) => (
          <AccordionSection
            key={section.id}
            value={section.id}
            title={section.title}
            subtitle={section.subtitle}
          >
            <div className="mb-4">
              <TonePill tone={section.tone}>
                {section.id === "spatial" ? "ArcGIS trajectenlaag" : "ArcGIS related table"}
              </TonePill>
            </div>

            <div className="space-y-3">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className="rounded-card border border-border bg-surfaceAlt/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-mono text-[11px] font-medium text-text">{field.name}</div>
                    <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] text-textMuted">
                      {field.type}
                    </span>
                    {field.status ? (
                      <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] text-textMuted">
                        {field.status}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-[12px] font-semibold text-text">{field.label}</div>
                  <p className="mt-1 text-[12px] leading-6 text-textDim">{field.description}</p>
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
  );
}

export function DatamodelPage() {
  const [activeTab, setActiveTab] = useState<DatamodelTabId>("overview");

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
              Werklaag trajecten en maatregelen
            </h1>
            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-textDim">
              De app werkt op de gepubliceerde ArcGIS FeatureServer voor{" "}
              <code>GC_Werk_Trajecten_2027_v04</code> en de gekoppelde tabel{" "}
              <code>GC_Werk_Maatregelen_2027_v04</code>. Het onderliggende
              documentatiemodel volgt de A/B/C-lagen voor techniek, identificatie en beheer.
            </p>
            <a
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[11px] font-medium text-textDim hover:border-accent/40 hover:text-accentStrong"
              href={FEATURE_SERVICE_URL}
              target="_blank"
              rel="noreferrer"
            >
              FeatureServer openen
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">A/B/C</div>
              <div className="mt-1 text-[11px] text-textMuted">Drielagenmodel</div>
            </div>
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">1:N</div>
              <div className="mt-1 text-[11px] text-textMuted">Traject naar maatregelen</div>
            </div>
            <div className="glass-panel rounded-card p-4">
              <div className="text-2xl font-bold text-text">19</div>
              <div className="mt-1 text-[11px] text-textMuted">Regimes met subtype-logica</div>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-border bg-white p-2 shadow-panel">
          <div className="grid gap-2 md:grid-cols-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md border px-3 py-3 text-left transition",
                  activeTab === tab.id
                    ? "border-accent/35 bg-accentSoft text-accentStrong"
                    : "border-transparent bg-transparent text-textDim hover:bg-surfaceAlt"
                )}
              >
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <Layers3 className="h-4 w-4" />
                  {tab.label}
                </div>
                <div className="mt-1 text-[11px] leading-5">{tab.description}</div>
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" ? <OverviewTab /> : <LayerTab id={activeTab} />}
      </div>
    </div>
  );
}

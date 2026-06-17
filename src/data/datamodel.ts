import type {
  DatamodelSection,
  DescribedDomainOption,
  ModelTypeOption,
  PlanningRegistrationStatus,
  RegimeTemplateDefinition,
  StatusOption,
  WorkPeriodOption,
} from "../types/app";

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 1, label: "Controleren", color: "#d97706" },
  { value: 2, label: "Correct", color: "#16a34a" },
  { value: 3, label: "Afgekeurd", color: "#dc2626" },
  { value: 4, label: "Aanpassen", color: "#2563eb" },
  { value: 5, label: "Anders", color: "#7c3aed" },
];

export const FALLBACK_MODEL_TYPES: ModelTypeOption[] = [
  { value: "P1_Netwerk_Direct", label: "P1_Netwerk_Direct" },
  { value: "P1_Standaard_Traject", label: "P1_Standaard_Traject" },
  { value: "P1_Waterkering", label: "P1_Waterkering" },
  { value: "P4_Afwijkend_2", label: "P4_Afwijkend_2" },
  { value: "P4_Afwijkend_5", label: "P4_Afwijkend_5" },
  { value: "P4_Standaard", label: "P4_Standaard" },
  { value: "Uitzondering/Geen_ID", label: "Uitzondering/Geen_ID" },
];

export const WORK_PERIOD_OPTIONS: WorkPeriodOption[] = Array.from(
  { length: 26 },
  (_, index) => ({
    value: String(index + 1),
    shortLabel: String(index + 1),
    label: `Week ${index * 2 + 1}-${index * 2 + 2}`,
  })
);

const WORK_PERIOD_LOOKUP = new Map(
  WORK_PERIOD_OPTIONS.map((option) => [option.value, option])
);

export function getWorkPeriodOption(value: string): WorkPeriodOption | undefined {
  return WORK_PERIOD_LOOKUP.get(value);
}

export const REGIME_COLOR_GROUPS = [
  {
    id: "1-11",
    label: "Regime 1-11",
    background: "#e0f2fe",
    foreground: "#075985",
    border: "#7dd3fc",
  },
  {
    id: "12-20",
    label: "Regime 12-20",
    background: "#fef3c7",
    foreground: "#92400e",
    border: "#fbbf24",
  },
  {
    id: "21-28",
    label: "Regime 21-28",
    background: "#dcfce7",
    foreground: "#166534",
    border: "#4ade80",
  },
  {
    id: "29-32",
    label: "Regime 29-32",
    background: "#ede9fe",
    foreground: "#5b21b6",
    border: "#a78bfa",
  },
] as const;

export function getRegimeColorGroup(regime: number) {
  if (regime <= 11) {
    return REGIME_COLOR_GROUPS[0];
  }
  if (regime <= 20) {
    return REGIME_COLOR_GROUPS[1];
  }
  if (regime <= 28) {
    return REGIME_COLOR_GROUPS[2];
  }
  return REGIME_COLOR_GROUPS[3];
}

export const REGIME_TEMPLATE_LIBRARY: RegimeTemplateDefinition[] = [
  {
    regime: 1,
    werkzaamheid: "Volledig maaien bij watergang of kering",
    toelichting: "De vegetatie wordt op het hele traject 100% gemaaid.",
  },
  {
    regime: 2,
    werkzaamheid: "Maaien watergang Habitatbenadering (0,5-1m)",
    toelichting:
      "Vegetatie op het droge talud wordt aan een zijde van de watergang gespaard, overige delen worden 100% gemaaid. Exclusief locaties met aangewezen streefbeelden.",
  },
  {
    regime: 3,
    werkzaamheid: "Maaien watergang Habitatbenadering overig",
    toelichting:
      "Vegetatie op het droge talud wordt aan een zijde van de watergang gespaard. Van het natte profiel wordt er minimaal 25% gespaard.",
  },
  {
    regime: 4,
    werkzaamheid: "Maaien watergang habitatbenadering inclusief snor",
    toelichting:
      "Vegetatie op het droge talud wordt aan een zijde van de watergang gespaard exclusief de snor. Overige delen worden 100% gemaaid.",
  },
  {
    regime: 5,
    werkzaamheid: "Maaien Waterkeringen habitatbenadering",
    toelichting:
      "Vegetatie op het talud wordt aan een zijde van de kering gespaard en de overige delen worden 100% gemaaid.",
  },
  {
    regime: 6,
    werkzaamheid: "Maaien Regenwaterbuffer Habitatbenadering",
    toelichting:
      "De vegetatie op de bodem wordt in zijn geheel gemaaid. Op de overige terreindelen wordt een vastgesteld percentage gespaard.",
  },
  {
    regime: 7,
    werkzaamheid: "Regime Streefbeeld",
    toelichting:
      "Maaironde 1 en 3 wordt het te maaien stuk 100% gemaaid en afgevoerd. Maaironde 2 is opgesplitst in 2x 50%.",
  },
  {
    regime: 8,
    werkzaamheid: "Wandelpad maaien",
    toelichting: "Het wandelpad wordt minimaal 1,20 m breed vrij gemaaid.",
  },
  {
    regime: 9,
    werkzaamheid: "Algenscheppen",
    toelichting: "Draadalgen scheppen.",
  },
  {
    regime: 10,
    werkzaamheid: "Opschonen Poelen",
    toelichting:
      "De poel dient in orde te zijn volgens de beheercategorie waaronder hij valt en op basis daarvan onderhouden te worden.",
  },
  {
    regime: 11,
    werkzaamheid: "Stapelmuren vrijhouden van houtopslag",
    toelichting: "Verwijderen van houtige gewassen op stapelmuren en mergelmuren.",
  },
  {
    regime: 12,
    werkzaamheid: "Onderhoud vispassage",
    toelichting:
      "Verwijderen van vegetatie, houtopslag en maaigerelateerd drijfvuil, zodat de vispassage aan zijn functie kan blijven voldoen.",
  },
  {
    regime: 13,
    werkzaamheid: "Begrazen in regenwaterbuffers en watergangen",
    toelichting: "Met inzet van dieren de vegetatie korthouden.",
  },
  {
    regime: 14,
    werkzaamheid: "Knotten",
    toelichting: "Het cyclisch verwijderen van de kruin van een boom tot op de hoofdstam.",
  },
  {
    regime: 15,
    werkzaamheid: "Kandelaberen (niet) vrijgroeiend",
    toelichting:
      "Een cyclische snoeitechniek waarbij hoofd- en zijtakken van 50% tot 75% worden ingekort tot op de gesteltakken.",
  },
  {
    regime: 16,
    werkzaamheid: "Begeleidingssnoei fruitboom & (niet) vrijgroeiend solitaire bomen",
    toelichting:
      "Snoeien van jonge bomen of struiken om een gezonde structuur en kroonvorm te ontwikkelen en toekomstige problemen te voorkomen.",
  },
  {
    regime: 17,
    werkzaamheid: "BVC-bomen VTA",
    toelichting:
      "Boomveiligheidscontrole aan de hand van de BVC-richtlijnen.",
  },
  {
    regime: 18,
    werkzaamheid: "Verhardingsobjecten vrijhouden",
    toelichting: "Verhardingsobjecten onkruidvrij en begroeiingsvrij houden.",
  },
  {
    regime: 19,
    werkzaamheid: "Verhardingsobjecten reinigen",
    toelichting: "Vegen of borstelen van verhardingsobjecten.",
  },
];

export const SPATIAL_CONTEXT_OPTIONS: DescribedDomainOption[] = [
  {
    value: "Talud",
    description: "Onder helling gelegen vlak.",
  },
  {
    value: "Boven Talud",
    description:
      "Onder helling gelegen vlak, niet aan de watergangzijde maar aan de landzijde van het onderhoudspad.",
  },
  {
    value: "Wegberm",
    description:
      "Plat of licht hellend terreindeel naast een verharde of onverharde weg dat ook als werkpad dient.",
  },
  {
    value: "Meterstrook",
    description:
      "Strook aan een of beide zijden van de watergang van circa 1 meter breed om onderhoud uit te voeren of maaisel te deponeren.",
  },
  {
    value: "Bodem",
    description: "Het laagst gelegen vlak in een terrein.",
  },
  {
    value: "Natte Bodem",
    description:
      "Bodem van regenwaterbuffers die niet permanent water bevat, maar wel als nat of vochtig wordt beschouwd.",
  },
  {
    value: "Winterbed",
    description:
      "Oppervlakte tussen het zomerbed van een bovenrivier en de buitenkruinlijn van de hoogwaterkerende dijk of hoge gronden.",
  },
  {
    value: "Instroom Voorziening",
    description:
      "Constructie die ervoor gemaakt is om te zorgen dat het regenwater de buffer in stroomt.",
  },
  {
    value: "Uitstroom Voorziening",
    description:
      "Constructie die ervoor gemaakt is om te zorgen dat het regenwater de buffer uit stroomt.",
  },
  {
    value: "Kruin",
    description:
      "Horizontale of licht hellende strook grond die bovenop de waterkering ligt of het hoogst gelegen deel ervan vormt.",
  },
  {
    value: "Toegang & bereikbaarheid",
    description: "Ruimte of voorziening om onderhoud veilig te bereiken en uit te voeren.",
  },
  {
    value: "Overlaat",
    description: "Constructie waar water gecontroleerd overheen kan stromen.",
  },
];

export const WERKZAAMHEDEN_SCHEMA = {
  werkzaamheden: REGIME_TEMPLATE_LIBRARY.map((item) => item.werkzaamheid),
  doel: SPATIAL_CONTEXT_OPTIONS.map((option) => option.value),
  zijde: ["Links", "Rechts", "Beide", "N.v.t."],
  bewerkingspercentage: ["N.v.t."],
  afvoeren: ["Nee", "Direct ruimen", "Na 24 uur ruimen"],
  werkperiode: WORK_PERIOD_OPTIONS.map((option) => `${option.shortLabel}: ${option.label}`),
} as const;

export const PLANNING_STATUS_COLORS: Record<PlanningRegistrationStatus, string> = {
  gepland: "#7c3aed",
  in_uitvoering: "#d97706",
  uitgevoerd: "#16a34a",
  afgekeurd: "#dc2626",
};

export const DATAMODEL_SECTIONS: DatamodelSection[] = [
  {
    id: "spatial",
    title: "GC_Werk_Trajecten_2027_v04",
    subtitle:
      "Live ArcGIS trajectenlaag met GlobalID als relationele sleutel naar de maatregelentabel.",
    tone: "accent",
    fields: [
      {
        name: "OBJECTID",
        label: "Primary key",
        type: "OID",
        description: "Door ArcGIS beheerde object-id voor queries en edit responses.",
        status: "Live",
      },
      {
        name: "GlobalID",
        label: "Relationele sleutel",
        type: "GUID",
        description: "Primaire sleutel in de relatie met GC_Werk_Maatregelen_2027_v04.traject_guid.",
        status: "Live",
      },
      {
        name: "traject_code",
        label: "Display field",
        type: "String(254)",
        description: "Zichtbare trajectcode voor kaart, popup en jaarplanoverzicht.",
        status: "Editable",
      },
      {
        name: "naam",
        label: "Naam",
        type: "String(255)",
        description: "Naam van het traject, bewerkbaar in review en jaarplan.",
        status: "Editable",
      },
      {
        name: "aanpassen_door",
        label: "Aanpassen door",
        type: "String(25)",
        description: "Geeft aan wie de trajectgegevens inhoudelijk moet aanpassen.",
        status: "Editable",
        domain: ["WL", "Teyler", "Anders"],
      },
      {
        name: "functie",
        label: "Functie",
        type: "String(50)",
        description: "Functie van het traject volgens het domein uit de werklaag.",
        status: "Editable",
        domain: [
          "Natuurbeek",
          "Bronbeek",
          "Omgevingsgericht water",
          "Aanvoersloot",
          "Waterbuffer",
          "Waterkering",
        ],
      },
      {
        name: "uitvoerder_onderhoud",
        label: "Uitvoerder onderhoud",
        type: "String(30)",
        description: "Partij die het onderhoud uitvoert; gebruikt als filter en planningscontext.",
        status: "Editable",
        domain: [
          "Aannemer A",
          "Aannemer B",
          "Aannemer C",
          "Aannemer D",
          "WL",
          "Gemeente",
          "Derden",
          "Anders",
        ],
      },
      {
        name: "bodemklasse",
        label: "Bodemklasse",
        type: "String(10)",
        description: "Bodemklasse van het traject. Standaardwaarde is N.v.t.",
        status: "Editable",
        defaultValue: "NVT",
        domain: ["1", "2", "3", "4", "N.v.t."],
      },
      {
        name: "type",
        label: "Type",
        type: "String(50)",
        description: "Type traject volgens de domeinlijst uit ArcGIS Online.",
        status: "Editable",
      },
      {
        name: "bovenbreedte",
        label: "Bovenbreedte",
        type: "String(10)",
        description: "Bovenbreedteklasse van het traject.",
        status: "Editable",
      },
      {
        name: "werkpad_breedte",
        label: "Werkpad breedte",
        type: "Short Integer",
        description: "Werkpadbreedte volgens domeinlijst.",
        status: "Editable",
      },
      {
        name: "stakeholder_informatie",
        label: "Stakeholder informatie",
        type: "String(1000)",
        description: "Afspraken en aandachtspunten die voor dit traject met stakeholders zijn gemaakt.",
        status: "Editable",
      },
      {
        name: "status",
        label: "Review status",
        type: "Short Integer",
        description: "Reviewstatus voor trajectcontrole. De jaarplanfilters kunnen alleen status Correct tonen.",
        status: "Editable",
        domain: STATUS_OPTIONS.map((option) => `${option.value}: ${option.label}`),
      },
      {
        name: "concept_gereed",
        label: "Concept gereed",
        type: "Short Integer / Boolean",
        description:
          "Binaire voortgangsvlag voor het jaarplan. Deze telt mee in de concept-gereed teller.",
        status: "Editable",
        domain: ["0: Nee", "1: Ja"],
      },
      {
        name: "opmerking",
        label: "Reviewer note",
        type: "String(255)",
        description: "Vrije toelichting voor trajectcontrole.",
        status: "Editable",
      },
      {
        name: "Shape__Area / Shape__Length",
        label: "Geometry metrics",
        type: "Double",
        description: "Read-only geometrievelden uit de hosted feature layer.",
        status: "Read only",
      },
    ],
  },
  {
    id: "planning",
    title: "GC_Werk_Maatregelen_2027_v04",
    subtitle:
      "Gerelateerde ArcGIS tabel voor WL-planning, aannemerregistratie en inspectievelden.",
    tone: "violet",
    fields: [
      {
        name: "OBJECTID / GlobalID",
        label: "Maatregel primary keys",
        type: "OID / GUID",
        description: "Door ArcGIS beheerde sleutels en editor tracking velden.",
        status: "Live",
      },
      {
        name: "traject_guid",
        label: "Traject linkage",
        type: "GUID",
        description: "Foreign key naar GC_Werk_Trajecten_2027_v04.GlobalID.",
        status: "Live",
      },
      {
        name: "wl_regime",
        label: "WL - Regime",
        type: "Short Integer",
        description:
          "Subtypeveld. Bij selectie vult de app de bijbehorende werkzaamheid en werkinstructie automatisch.",
        status: "Editable",
        domain: REGIME_TEMPLATE_LIBRARY.map((item) => `${item.regime}: ${item.regime}`),
      },
      {
        name: "wl_werkzaamheden / wl_werkinstructie",
        label: "WL - Werkzaamheid en werkinstructie",
        type: "Short Integer / String(255)",
        description:
          "Subtype-afhankelijk gevuld vanuit het regime. De UI toont de werkinstructie als inhoudelijke instructietekst.",
        status: "Editable",
        domain: REGIME_TEMPLATE_LIBRARY.map(
          (item) => `${item.regime}: ${item.werkzaamheid}`
        ),
      },
      {
        name: "wl_toelichting / wl_werkperiode_van / wl_werkperiode_tot",
        label: "WL - Planning",
        type: "Text / Short Integer",
        description: "Vrije toelichting en werkperiodebereik voor de geplande maatregel.",
        status: "Editable",
        domain: [
          ...WERKZAAMHEDEN_SCHEMA.werkperiode,
        ],
      },
      {
        name: "wl_zijde / wl_afvoeren / wl_uitvoeringswijze_maaien",
        label: "WL - Uitvoeringskeuzes",
        type: "String",
        description: "Zijde, afvoeren en uitvoeringswijze voor de WL-planning.",
        status: "Editable",
        domain: [
          ...WERKZAAMHEDEN_SCHEMA.zijde,
          ...WERKZAAMHEDEN_SCHEMA.afvoeren,
          "Machinaal",
          "Handmatig",
          "Combinatie",
          "N.v.t.",
        ],
      },
      {
        name: "wl_soortspecifieke_maatregel / wl_locatiebezoek",
        label: "WL - Signalen",
        type: "Short Integer",
        description: "Binaire velden voor soortspecifieke maatregel en locatiebezoek.",
        status: "Editable",
        domain: ["0: Nee", "1: Ja"],
      },
      {
        name: "anm_status_maatregel / anm_periode_gepland",
        label: "Aannemer - Status en planning",
        type: "String / Short Integer",
        description: "Aannemerstatus en geplande werkperiode. Nieuwe maatregelen starten zonder status.",
        status: "Editable",
        domain: [
          "Geen status",
          "Gepland",
          "Uitgevoerd",
          "Deels uitgevoerd",
          "Niet uitgevoerd",
          ...WERKZAAMHEDEN_SCHEMA.werkperiode,
        ],
      },
      {
        name: "anm_datum_uitgevoerd / anm_datum_maaisel_geruimd",
        label: "Aannemer - Uitvoering",
        type: "Date",
        description: "Datum uitvoering en datum waarop maaisel is geruimd.",
        status: "Editable",
      },
      {
        name: "anm_foto_url / anm_reden_niet_uitgevoerd / anm_opmerking",
        label: "Aannemer - Bewijs en toelichting",
        type: "Text",
        description: "Bewijsfoto-url, reden bij niet uitvoeren en vrije aannemeropmerking.",
        status: "Editable",
        domain: [
          "Onbereikbaar",
          "Droogteregime",
          "Flora fauna conflict",
          "Lopend project",
          "Anders",
        ],
      },
      {
        name: "wl_steekproef_status / wl_reden_afgekeurd / wl_datum_steekproef / wl_steekproef_opmerking",
        label: "Inspectie",
        type: "String / Date / Text",
        description:
          "Inspecteursblok voor steekproefstatus, afkeurreden, datum steekproef en vrije steekproefopmerking.",
        status: "Editable",
        domain: ["Niet beoordeeld", "Ingepland", "Goedgekeurd", "Afgekeurd"],
      },
    ],
  },
];

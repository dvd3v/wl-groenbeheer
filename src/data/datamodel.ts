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
    werkzaamheid: "Maaien standaard",
    toelichting: "De vegetatie wordt in zijn geheel gemaaid.",
    bewerkingspercentage: "100%",
    afvoeren: "Nee",
  },
  {
    regime: 2,
    werkzaamheid: "Maaien watergang Habitatbenadering (0,5-1 m)",
    toelichting:
      "Vegetatie op het talud wordt aan een zijde van de watergang gemaaid. De bodem wordt volledig gemaaid.",
    bewerkingspercentage: "75%",
    afvoeren: "Direct ruimen",
    werkperiodeCode: "1",
    werkperiodeLabel: "Week 1-2",
  },
  {
    regime: 3,
    werkzaamheid: "Maaien watergang Habitatbenadering overig",
    toelichting:
      "Vegetatie op het talud wordt aan een zijde van de watergang gemaaid. Van de bodem wordt maximaal 75% gemaaid.",
    bewerkingspercentage: "50%",
    afvoeren: "Na 24 uur ruimen",
    werkperiodeCode: "2",
    werkperiodeLabel: "Week 3-4",
  },
  {
    regime: 4,
    werkzaamheid: "Gefaseerd maaien",
    toelichting:
      "Een vastgesteld aandeel vegetatie wordt gespaard, waarbij in de volgende ronde een ander deel wordt gemaaid.",
    bewerkingspercentage: "75% met 10% overlap*",
    werkperiodeCode: "3",
    werkperiodeLabel: "Week 5-6",
  },
  {
    regime: 5,
    werkzaamheid: "Maaien waterkeringen habitatbenadering",
    toelichting:
      "Vegetatie op talud en berm wordt aan een zijde van de kering gemaaid en de kruin volledig.",
    werkperiodeCode: "4",
    werkperiodeLabel: "Week 7-8",
  },
  {
    regime: 6,
    werkzaamheid: "Maaien regenwaterbuffer habitatbenadering",
    toelichting:
      "De bodem wordt volledig gemaaid. Op de overige terreindelen blijft een vastgesteld aandeel vegetatie staan.",
    werkperiodeCode: "5",
    werkperiodeLabel: "Week 9-10",
  },
  {
    regime: 7,
    werkzaamheid: "Vrijmaaien assets stuwen, meetobjecten, duikers en bruggen",
    toelichting:
      "Tien meter voor en achter de asset wordt volledig vrijgemaakt van vegetatie en maaigerelateerd drijfvuil.",
    werkperiodeCode: "6",
    werkperiodeLabel: "Week 11-12",
  },
  {
    regime: 8,
    werkzaamheid: "Vrijmaaien hekwerk en scheidingen",
    toelichting:
      "Maaiwerk langs scheidingen loopt door tot tegen het raster zonder tussenstrook en zonder houtige opslag.",
    werkperiodeCode: "7",
    werkperiodeLabel: "Week 13-14",
  },
  {
    regime: 9,
    werkzaamheid: "Opschonen poelen",
    toelichting:
      "De poel mag niet meer dan twee derde dichtgegroeid zijn met waterplanten.",
    werkperiodeCode: "8",
    werkperiodeLabel: "Week 15-16",
  },
  {
    regime: 10,
    werkzaamheid: "Stapelmuren vrijhouden van houtopslag",
    toelichting:
      "Stapelmuren en mergelmuren vrijhouden van houtige gewassen.",
    werkperiodeCode: "9",
    werkperiodeLabel: "Week 17-18",
  },
  {
    regime: 11,
    werkzaamheid: "Onderhoud vispassage",
    toelichting:
      "Vrijhouden van vegetatie, houtopslag en maaigerelateerd drijfvuil zodat de vispassage kan functioneren.",
    werkperiodeCode: "10",
    werkperiodeLabel: "Week 19-20",
  },
  {
    regime: 12,
    werkzaamheid: "Begrazen in regenwaterbuffers en watergangen",
    toelichting:
      "Met inzet van vee de vegetatie kort houden.",
    werkperiodeCode: "11",
    werkperiodeLabel: "Week 21-22",
  },
  {
    regime: 13,
    werkzaamheid: "Knotten",
    toelichting:
      "Cyclisch verwijderen van de kruin van een boom tot op de hoofdstam.",
    werkperiodeCode: "12",
    werkperiodeLabel: "Week 23-24",
  },
  {
    regime: 14,
    werkzaamheid: "Kandelaberen (niet) vrijgroeiend",
    toelichting:
      "Snoeitechniek waarbij hoofd- en zijtakken met ongeveer 50% tot 75% worden ingekort tot op de gesteltakken.",
    werkperiodeCode: "13",
    werkperiodeLabel: "Week 25-26",
  },
  {
    regime: 15,
    werkzaamheid: "Begeleidingssnoei fruitboom en (niet) vrijgroeiend",
    toelichting:
      "Snoeien van jonge bomen of struiken om een gezonde structuur en kroonvorm te ontwikkelen.",
    werkperiodeCode: "14",
    werkperiodeLabel: "Week 27-28",
  },
  {
    regime: 16,
    werkzaamheid: "Onderhoudssnoei fruitboom en (niet) vrijgroeiend",
    toelichting:
      "Verwijderen van dode, zieke of overbodige takken en het stimuleren van gezonde groei.",
    werkperiodeCode: "15",
    werkperiodeLabel: "Week 29-30",
  },
  {
    regime: 17,
    werkzaamheid: "BVC-bomen VTA",
    toelichting:
      "Boomveiligheidscontrole aan de hand van de BVC-richtlijnen.",
    werkperiodeCode: "16",
    werkperiodeLabel: "Week 31-32",
  },
  {
    regime: 18,
    werkzaamheid: "Bos en bosplantsoen randen snoei",
    toelichting:
      "Snoeien van overhangende takken of bomen en het terugzetten van struweel om overlast naar derden te voorkomen.",
    werkperiodeCode: "17",
    werkperiodeLabel: "Week 33-34",
  },
  {
    regime: 19,
    werkzaamheid: "Bosplantsoen randen snoei",
    toelichting:
      "Snoeien van overhangende takken of bomen en het terugzetten van struweel om overlast naar derden te voorkomen.",
    werkperiodeCode: "18",
    werkperiodeLabel: "Week 35-36",
  },
  {
    regime: 20,
    werkzaamheid: "Bosplantsoen dunnen",
    toelichting:
      "Gezonde groei stimuleren en licht en lucht in het bosplantsoen brengen door maximaal 30% van het kronendak te verwijderen.",
    werkperiodeCode: "19",
    werkperiodeLabel: "Week 37-38",
  },
  {
    regime: 21,
    werkzaamheid: "Bosplantsoen hakhoutbeheer",
    toelichting:
      "Gefaseerd maximaal 30% afzetten in een terugkerende cyclus.",
    werkperiodeCode: "20",
    werkperiodeLabel: "Week 39-40",
  },
  {
    regime: 22,
    werkzaamheid: "Struweel randen snoei",
    toelichting:
      "Overhangend struweel snoeien of terugzetten om hinder naar derden te voorkomen, circa 1 meter vanaf erfgrens of raster.",
    werkperiodeCode: "21",
    werkperiodeLabel: "Week 41-42",
  },
  {
    regime: 23,
    werkzaamheid: "Struweel dunnen",
    toelichting:
      "Boomvormers verwijderen zodat het struweel kan doorgroeien, maximaal circa 30%.",
    werkperiodeCode: "22",
    werkperiodeLabel: "Week 43-44",
  },
  {
    regime: 24,
    werkzaamheid: "Struweel hakhoutbeheer",
    toelichting:
      "Gefaseerd circa 30% afzetten in een terugkerende cyclus.",
    werkperiodeCode: "23",
    werkperiodeLabel: "Week 45-46",
  },
  {
    regime: 25,
    werkzaamheid: "Houtsingel randen snoei",
    toelichting:
      "Snoeien van overhangende takken of bomen en het terugzetten van struweel om overlast te voorkomen.",
    werkperiodeCode: "24",
    werkperiodeLabel: "Week 47-48",
  },
  {
    regime: 26,
    werkzaamheid: "Houtsingel dunnen",
    toelichting:
      "Gezonde groei stimuleren en licht en lucht in het houtsingel brengen door maximaal circa 30% van het kronendak te verwijderen.",
    werkperiodeCode: "25",
    werkperiodeLabel: "Week 49-50",
  },
  {
    regime: 27,
    werkzaamheid: "Houtsingel hakhoutbeheer",
    toelichting:
      "Maximaal gefaseerd 30% afzetten in een terugkerende cyclus, gericht op het struweel.",
    werkperiodeCode: "26",
    werkperiodeLabel: "Week 51-52",
  },
  {
    regime: 28,
    werkzaamheid: "Geschoren haag scheren",
    toelichting:
      "Scheerheggen strak of redelijk strak in vorm snoeien, afhankelijk van onderhoudsfrequentie en beeldkwaliteitseis.",
  },
  {
    regime: 29,
    werkzaamheid: "Losse haag hakhoutbeheer",
    toelichting:
      "Maximaal 70% kappen of afzetten in een cyclische onderhoudsgang.",
  },
  {
    regime: 30,
    werkzaamheid: "Losse haag terugzetten",
    toelichting:
      "De haag terugbrengen in de oorspronkelijke vorm waarbij paden en wegen begaanbaar blijven.",
  },
  {
    regime: 31,
    werkzaamheid: "Vervangingswerk",
    toelichting: "Herstel of vervanging van hekwerken en scheidingen.",
  },
  {
    regime: 32,
    werkzaamheid: "Verhardingsobjecten vrijhouden",
    toelichting:
      "Verhardingsobjecten onkruidvrij en begroeiingsvrij houden, inclusief reinigen, vezelen, frezen of mulchen waar nodig.",
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
  zijde: ["L", "R", "Beide", "N.v.t."],
  bewerkingspercentage: ["100%", "75%", "50%", "75% met 10% overlap*", "N.v.t."],
  afvoeren: ["Nee", "Direct ruimen", "Na 24 uur ruimen", "N.v.t."],
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
    title: "Trajecten Feature Layer",
    subtitle:
      "Live ArcGIS polygonlaag met traject_code als zichtbare sleutel en guid als technische koppeling.",
    tone: "accent",
    fields: [
      {
        name: "OBJECTID",
        label: "Primary key",
        type: "OID",
        description: "System-maintained object id used for ArcGIS queries and edit responses.",
        status: "Live",
      },
      {
        name: "guid",
        label: "Join key",
        type: "String",
        description: "Technische sleutel voor selectie in de app en koppeling met planning.",
        status: "Live",
      },
      {
        name: "traject_code",
        label: "Display field",
        type: "String(254)",
        description: "Zichtbare trajectcode die in de UI het oude hoofdobject vervangt.",
        status: "Editable",
      },
      {
        name: "type_codering",
        label: "Type codering",
        type: "String(254)",
        description: "Broncodering van het trajecttype, zichtbaar als read-only context in de UI.",
        status: "Read only in UI",
        domain: FALLBACK_MODEL_TYPES.map((option) => option.label),
      },
      {
        name: "object_count / bronlagen",
        label: "Broncontext",
        type: "SmallInteger / String",
        description: "Geeft het aantal bronobjecten en de gebruikte bronlagen weer.",
        status: "Read only",
      },
      {
        name: "status",
        label: "Review status",
        type: "Integer",
        description: "ArcGIS-coded review domain used to track validation progress on trajects.",
        status: "Editable",
        domain: STATUS_OPTIONS.map((option) => `${option.value}: ${option.label}`),
      },
      {
        name: "opmerking",
        label: "Reviewer note",
        type: "String(255)",
        description: "Vrije toelichting die in het attribuutvenster kan worden aangepast.",
        status: "Editable",
      },
      {
        name: "Shape__Area / Shape__Length",
        label: "Geometry metrics",
        type: "Double",
        description: "Read-only geometry metadata supplied by the hosted feature layer.",
        status: "Read only",
      },
    ],
  },
  {
    id: "planning",
    title: "Werkzaamheden Related Table (mock)",
    subtitle:
      "Lokale dummy-rijen volgen nu het jaarplanmodel dat later als echte ArcGIS related table kan landen.",
    tone: "violet",
    fields: [
      {
        name: "Werk_ID",
        label: "Planning primary key",
        type: "String",
        description: "Stable local key per planningsregel, ready to swap for an ArcGIS row id later.",
        status: "Mock / local",
      },
      {
        name: "Traject_guid / Traject_Code",
        label: "Traject linkage",
        type: "GUID / String",
        description: "De planning koppelt lokaal op guid en toont traject_code als leesbare sleutel.",
        status: "Mock / local",
      },
      {
        name: "Regime / Werkzaamheden / Toelichting",
        label: "Werkpakket",
        type: "Integer / String / Text",
        description: "Regime numbers are normalized from the CSV and keep their own color bands in the UI.",
        status: "Mock / local",
        domain: REGIME_TEMPLATE_LIBRARY.map(
          (item) => `${item.regime}: ${item.werkzaamheid}`
        ),
      },
      {
        name: "Doel / Zijde / Bewerkingspercentage / Afvoeren / Werkperiode",
        label: "Uitvoeringscontext",
        type: "String",
        description: "Execution scope fields match the requested yearplan columns and remain editable-ready.",
        status: "Mock / local",
        domain: [
          ...WERKZAAMHEDEN_SCHEMA.doel,
          ...WERKZAAMHEDEN_SCHEMA.zijde,
          ...WERKZAAMHEDEN_SCHEMA.bewerkingspercentage,
          ...WERKZAAMHEDEN_SCHEMA.afvoeren,
          ...WERKZAAMHEDEN_SCHEMA.werkperiode,
        ],
      },
      {
        name: "status / datum_gepland / datum_uitgevoerd / opmerking",
        label: "Registratie",
        type: "String / Date / Text",
        description: "Per werkzaamheid registratie is bewerkbaar en blijft browser-persistent totdat de ESRI related table live is.",
        status: "Mock / local",
        domain: Object.keys(PLANNING_STATUS_COLORS),
      },
    ],
  },
];

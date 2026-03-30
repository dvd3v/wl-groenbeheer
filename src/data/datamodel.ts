import type {
  DatamodelSection,
  ModelTypeOption,
  PlanningRegistrationStatus,
  StatusOption,
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

export const WERKZAAMHEDEN_SCHEMA = {
  handeling: [
    "Maaien",
    "Snoeien",
    "Knippen",
    "Opschonen",
    "Vrijmaaien",
    "Inspecteren",
    "Begrazen",
    "Knotten",
    "Kandelaberen",
    "Uitdunnen",
    "Kappen",
    "Terugzetten",
    "Vervangen",
    "Vegen",
    "Frezen",
  ],
  werkwijze: [
    "Habitatbenadering",
    "Sinusbeheer",
    "Klepelen",
    "Standaard",
    "Begeleidingssnoei",
    "Onderhoudssnoei",
    "Hakhout",
    "BVC",
  ],
  doel: [
    "Talud",
    "Boven Talud",
    "Bodem",
    "Natte Bodem",
    "Kruin",
    "Meterstrook",
    "Werkpad",
    "Berm",
    "Instroom Voorziening",
    "Uitstroom Voorziening",
    "Struweel",
    "Haag",
    "Houtsingel",
    "Bos",
    "Bosplantsoen",
    "Boom",
    "Hek",
    "Verharding",
    "N.v.t.",
  ],
  zijde: ["Links", "Rechts", "Beide", "N.v.t."],
  ruimen: ["Nee", "Direct", "Na 24 uur"],
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
      "Live ArcGIS polygonlaag. March 26, 2026 metadata confirms there is no traject_code field yet.",
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
        name: "GlobalID",
        label: "Join key",
        type: "GlobalID",
        description: "V1 key for selection, planning linkage and future related-table migration.",
        status: "Live",
      },
      {
        name: "hoofdobjec",
        label: "Display field",
        type: "String(254)",
        description: "Hoofdobject label. Note the source field is intentionally named hoofdobjec.",
        status: "Editable",
      },
      {
        name: "model_type",
        label: "Type template",
        type: "String(254)",
        description: "ArcGIS type id field used for templates and unique-value authoring.",
        status: "Read only in UI",
        domain: FALLBACK_MODEL_TYPES.map((option) => option.label),
      },
      {
        name: "Status",
        label: "Review status",
        type: "Integer",
        description: "ArcGIS-coded review domain used to track validation progress on trajects.",
        status: "Editable",
        domain: STATUS_OPTIONS.map((option) => `${option.value}: ${option.label}`),
      },
      {
        name: "Opmerking",
        label: "Reviewer note",
        type: "String(255)",
        description: "Visible in the UI but currently read only.",
        status: "Read only in UI",
      },
      {
        name: "Shape__Area / Shape__Length",
        label: "Geometry metrics",
        type: "Double",
        description: "Read-only geometry metadata supplied by the hosted feature layer.",
        status: "Read only",
      },
      {
        name: "Creator / CreationDate / Editor / EditDate",
        label: "Audit fields",
        type: "String / Date",
        description: "ArcGIS-managed audit trail shown in the drawer and jaarplan.",
        status: "Read only",
      },
    ],
  },
  {
    id: "planning",
    title: "Werkzaamheden Planning Table",
    subtitle:
      "Demo-aligned local planning model: one traject can contain multiple werkzaamheden and separate registratie state per work item.",
    tone: "violet",
    fields: [
      {
        name: "Werk_ID",
        label: "Planning primary key",
        type: "String",
        description: "Stable local key per planningsregel, similar to the demo repo.",
        status: "Mock / local",
      },
      {
        name: "Traject_GlobalID",
        label: "Traject foreign key",
        type: "GUID",
        description: "Links each werkzaamheid to one ArcGIS traject.",
        status: "Mock / local",
      },
      {
        name: "Handeling / Werkwijze / Doel",
        label: "Work semantics",
        type: "String",
        description: "What to do, how to do it, and on which traject element.",
        status: "Mock / local",
        domain: [
          ...WERKZAAMHEDEN_SCHEMA.handeling.slice(0, 4),
          ...WERKZAAMHEDEN_SCHEMA.werkwijze.slice(0, 3),
          ...WERKZAAMHEDEN_SCHEMA.doel.slice(0, 4),
        ],
      },
      {
        name: "Zijde / Periode / Percentage / Ruimen",
        label: "Execution scope",
        type: "String / Int",
        description: "Side, period bucket, coverage and disposal handling per work item.",
        status: "Mock / local",
      },
      {
        name: "status / datum_gepland / datum_uitgevoerd / opmerking",
        label: "Registratie",
        type: "String / Date",
        description: "Per-werkzaamheid registratie state persisted in localStorage, matching the demo interaction pattern.",
        status: "Mock / local",
        domain: Object.keys(PLANNING_STATUS_COLORS),
      },
    ],
  },
];

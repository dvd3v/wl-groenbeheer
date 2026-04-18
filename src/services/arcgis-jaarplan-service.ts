import Graphic from "@arcgis/core/Graphic.js";
import ArcGISMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import esriRequest from "@arcgis/core/request.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import WMTSLayer from "@arcgis/core/layers/WMTSLayer.js";
import WMSLayer from "@arcgis/core/layers/WMSLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import LayerListViewModel from "@arcgis/core/widgets/LayerList/LayerListViewModel.js";
import Collection from "@arcgis/core/core/Collection.js";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem.js";
import type Field from "@arcgis/core/layers/support/Field.js";
import type {
  JaarplanDomainOption,
  JaarplanLocalFields,
  JaarplanMeasureFormValues,
  JaarplanMeasureRecord,
  JaarplanMeasureServerInput,
  JaarplanMetadata,
  JaarplanSubtypeConfig,
  JaarplanTrajectRecord,
  LayerToggleItem,
  LegendItem,
  MaatregelStatus,
  SteekproefStatus,
} from "../types/app";

const DEFAULT_JAARPLAN_FEATURE_SERVICE_URL =
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/JaarplanTrajecten_pilot/FeatureServer";

const JAARPLAN_FEATURE_SERVICE_URL = normalizeFeatureServiceUrl(
  import.meta.env.VITE_JAARPLAN_FEATURE_SERVICE_URL?.trim() ||
    import.meta.env.VITE_JAARPLAN_TRAJECT_LAYER_URL?.trim() ||
    import.meta.env.VITE_JAARPLAN_MAATREGEL_TABLE_URL?.trim() ||
    DEFAULT_JAARPLAN_FEATURE_SERVICE_URL
);

const GISIB_BOR_MAPSERVER_URL =
  "https://utility.arcgis.com/usrsvcs/servers/73fc6147aa1d457fa19f50598a9e1001/rest/services/Groenbeheer/GISIB_BOR/MapServer";
const PDOK_LUCHTFOTO_WMS_URL = "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0";
const PDOK_BGT_WMTS_URL = "https://service.pdok.nl/lv/bgt/wmts/v1_0";
const GISIB_BOR_LAYER_DEFINITIONS = [
  { id: 7, title: "Waterobject" },
  { id: 8, title: "Terreindeel" },
  { id: 9, title: "Groenobject" },
  { id: 10, title: "Verhardingsobject" },
  { id: 11, title: "Grindkoffer" },
  { id: 12, title: "Rooster" },
  { id: 4, title: "Hek" },
  { id: 5, title: "Faunavoorziening" },
  { id: 6, title: "Slagboom" },
  { id: 15, title: "Boom" },
  { id: 1, title: "Solitaire plant" },
  { id: 2, title: "Markeringspaal" },
  { id: 3, title: "Faunaverblijfplaats" },
] as const;

const LOCAL_STORAGE_KEY = "wl-groenbeheer.jaarplan-local-fields.v1";

const DEFAULT_LOCAL_FIELDS: JaarplanLocalFields = {
  statusMaatregel: "geen_status",
  datumGepland: "",
  datumUitgevoerd: "",
  steekproefStatus: "niet_beoordeeld",
  redenNietUitgevoerd: "",
  foto: "",
  opmerking: "",
};

const STEEKPROEF_STATUS_OPTIONS: Array<{
  value: SteekproefStatus;
  label: string;
}> = [
  { value: "niet_beoordeeld", label: "Niet beoordeeld" },
  { value: "ingepland", label: "Ingepland" },
  { value: "goedgekeurd", label: "Goedgekeurd" },
  { value: "afgekeurd", label: "Afgekeurd" },
];

const MAATREGEL_STATUS_OPTIONS: Array<{
  value: MaatregelStatus;
  label: string;
}> = [
  { value: "geen_status", label: "Geen status" },
  { value: "gepland", label: "Gepland" },
  { value: "uitgevoerd", label: "Uitgevoerd" },
  { value: "deels_uitgevoerd", label: "Deels uitgevoerd" },
  { value: "niet_uitgevoerd", label: "Niet uitgevoerd" },
];

const FIELD_NAMES = {
  trajectCode: "traject_code",
  trajectGuid: "traject_guid",
  regime: "Regime",
  werkzaamheden: "Werkzaamheden",
  toelichting: "Toelichting",
  werkperiodeVan: "Werkperiode_van",
  werkperiodeTot: "Werkperiode_tot",
  zijde: "Zijde",
  afvoeren: "Afvoeren",
  soortspecifiekeMaat: "Soortspecifieke_maat",
  locatiebezoek: "Locatiebezoek",
  uitvoerderOnderhoud: "uitvoerder_onderhoud",
  guid: "guid",
  globalId: "GlobalID",
} as const;

const LEGEND_COLORS = [
  "#0f766e",
  "#2563eb",
  "#ca8a04",
  "#9333ea",
  "#dc2626",
  "#0d9488",
  "#475569",
  "#0891b2",
];
const WERKZAAMHEID_SELECTION_SEPARATOR = "::";
const TRAJECT_OUT_FIELDS = [
  "OBJECTID",
  FIELD_NAMES.globalId,
  FIELD_NAMES.guid,
  FIELD_NAMES.trajectCode,
  FIELD_NAMES.uitvoerderOnderhoud,
] as const;
const MAATREGEL_OUT_FIELDS = [
  "OBJECTID",
  FIELD_NAMES.globalId,
  FIELD_NAMES.trajectGuid,
  FIELD_NAMES.regime,
  FIELD_NAMES.werkzaamheden,
  FIELD_NAMES.toelichting,
  FIELD_NAMES.werkperiodeVan,
  FIELD_NAMES.werkperiodeTot,
  FIELD_NAMES.zijde,
  FIELD_NAMES.afvoeren,
  FIELD_NAMES.soortspecifiekeMaat,
  FIELD_NAMES.locatiebezoek,
] as const;

interface BasemapOption {
  id: string;
  label: string;
  basemap: Basemap;
}

interface FeatureServiceResourceSummary {
  id: number;
  name: string;
}

interface FeatureServiceMetadata {
  layers?: FeatureServiceResourceSummary[];
  tables?: FeatureServiceResourceSummary[];
}

export interface JaarplanMapContext {
  map: ArcGISMap;
  view: MapView;
  trajectLayer: FeatureLayer;
  layerListViewModel: LayerListViewModel;
  basemapOptions: BasemapOption[];
}

function toCodedValueDomain(
  domain: unknown
): { codedValues?: Array<{ code: string | number; name: string }> } | null {
  return domain && typeof domain === "object" && "codedValues" in domain
    ? (domain as { codedValues?: Array<{ code: string | number; name: string }> })
    : null;
}

function normalizeFeatureServiceUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/\d+$/, "");
}

function toResourceUrl(serviceUrl: string, resourceId: number): string {
  return `${normalizeFeatureServiceUrl(serviceUrl)}/${resourceId}`;
}

function findNamedResource(
  resources: FeatureServiceResourceSummary[] | undefined,
  candidates: string[]
): FeatureServiceResourceSummary | null {
  if (!resources?.length) {
    return null;
  }

  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const exactOrContains = resources.find((resource) => {
    const name = resource.name.toLowerCase();
    return loweredCandidates.some((candidate) => name.includes(candidate));
  });

  return exactOrContains ?? resources[0] ?? null;
}

function createPdokBasemap(layerName: string, title: string): Basemap {
  return new Basemap({
    id: layerName.toLowerCase(),
    title,
    baseLayers: [
      new WMSLayer({
        url: PDOK_LUCHTFOTO_WMS_URL,
        title,
        imageFormat: "image/jpeg",
        imageTransparency: false,
        sublayers: [{ name: layerName }],
      }),
    ],
  });
}

function createBgtBasemap(): Basemap {
  return new Basemap({
    id: "pdok-bgt",
    title: "PDOK BGT",
    baseLayers: [
      new WMTSLayer({
        url: PDOK_BGT_WMTS_URL,
        serviceMode: "KVP",
        activeLayer: { id: "achtergrondvisualisatie" },
      }),
    ],
  });
}

function createBasemapOptions(): BasemapOption[] {
  return [
    {
      id: "light",
      label: "Licht",
      basemap: Basemap.fromId("gray-vector") ?? new Basemap({ title: "Licht" }),
    },
    {
      id: "streets",
      label: "Kleur",
      basemap:
        Basemap.fromId("streets-vector") ?? new Basemap({ title: "Kleur" }),
    },
    {
      id: "pdok25",
      label: "PDOK 25cm",
      basemap: createPdokBasemap("Actueel_ortho25", "PDOK 25cm"),
    },
    {
      id: "pdokhr",
      label: "PDOK HR 8cm",
      basemap: createPdokBasemap("Actueel_orthoHR", "PDOK HR 8cm"),
    },
    {
      id: "bgt",
      label: "BGT",
      basemap: createBgtBasemap(),
    },
  ];
}

function readLocalFields(): Record<string, Partial<JaarplanLocalFields>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Record<string, Partial<JaarplanLocalFields>>;
  } catch {
    return {};
  }
}

function writeLocalFields(values: Record<string, Partial<JaarplanLocalFields>>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    console.warn("Lokale jaarplanvelden konden niet worden bewaard.", error);
  }
}

function measureStorageKey(globalId: string, objectId: number): string {
  return globalId || `oid:${objectId}`;
}

function mergeLocalFields(
  globalId: string,
  objectId: number
): JaarplanLocalFields {
  const stored = readLocalFields()[measureStorageKey(globalId, objectId)];

  return {
    ...DEFAULT_LOCAL_FIELDS,
    ...stored,
  };
}

function persistLocalFields(
  globalId: string,
  objectId: number,
  values: Partial<JaarplanLocalFields>
): JaarplanLocalFields {
  const storage = readLocalFields();
  const key = measureStorageKey(globalId, objectId);
  const next = {
    ...DEFAULT_LOCAL_FIELDS,
    ...storage[key],
    ...values,
  };

  storage[key] = next;
  writeLocalFields(storage);

  return next;
}

function removePersistedLocalFields(globalId: string, objectId: number): void {
  const storage = readLocalFields();
  const globalKey = globalId ? measureStorageKey(globalId, objectId) : "";
  const objectKey = measureStorageKey("", objectId);
  let changed = false;

  if (globalKey && globalKey in storage) {
    delete storage[globalKey];
    changed = true;
  }

  if (objectKey in storage) {
    delete storage[objectKey];
    changed = true;
  }

  if (changed) {
    writeLocalFields(storage);
  }
}

function normalizeDomainOptions(
  domain: { codedValues?: Array<{ code: string | number; name: string }> } | null | undefined
): JaarplanDomainOption[] {
  return (domain?.codedValues ?? []).map((codedValue) => ({
    value: String(codedValue.code),
    label: codedValue.name,
    rawValue: codedValue.code,
  }));
}

function getField(
  layer: FeatureLayer,
  fieldName: string
): Field | undefined {
  return layer.fields.find((field) => field.name === fieldName);
}

function getFieldDomainOptions(
  layer: FeatureLayer,
  fieldName: string
): JaarplanDomainOption[] {
  const field = getField(layer, fieldName);
  const domain = toCodedValueDomain(field?.domain);

  return normalizeDomainOptions(domain);
}

function getSubtypeConfigs(table: FeatureLayer): Record<string, JaarplanSubtypeConfig> {
  return (table.types ?? []).reduce<Record<string, JaarplanSubtypeConfig>>((acc, subtype) => {
    const subtypeDomains = subtype.domains ?? {};
    const werkzaamhedenDomain = toCodedValueDomain(
      subtypeDomains[FIELD_NAMES.werkzaamheden]
    );
    const toelichtingDomain = toCodedValueDomain(subtypeDomains[FIELD_NAMES.toelichting]);
    const werkzaamhedenOptions = normalizeDomainOptions(werkzaamhedenDomain);
    const toelichtingOptions = normalizeDomainOptions(toelichtingDomain);
    const defaultWerkzaamheidValue = werkzaamhedenOptions[0]?.value ?? null;
    const expectedToelichtingCode = defaultWerkzaamheidValue
      ? `T${defaultWerkzaamheidValue}`
      : null;
    const defaultToelichtingValue =
      toelichtingOptions.find((option) => option.value === expectedToelichtingCode)?.value ??
      toelichtingOptions[0]?.value ??
      null;

    acc[String(subtype.id)] = {
      regimeValue: String(subtype.id),
      regimeLabel: subtype.name || String(subtype.id),
      werkzaamhedenOptions,
      toelichtingOptions,
      defaultWerkzaamheidValue,
      defaultToelichtingValue,
    };

    return acc;
  }, {});
}

function getDomainLabel(
  options: JaarplanDomainOption[],
  value: string
): string {
  return options.find((option) => option.value === value)?.label ?? value ?? "";
}

function toBooleanJaNee(value: string | number | null | undefined): boolean {
  return String(value ?? "").toLowerCase() === "1" || String(value ?? "").toLowerCase() === "ja";
}

function normalizeJaNeeToken(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function isJaOption(option: JaarplanDomainOption): boolean {
  const token = normalizeJaNeeToken(option.rawValue);
  const label = normalizeJaNeeToken(option.label);
  return token === "1" || token === "ja" || label === "ja";
}

function isNeeOption(option: JaarplanDomainOption): boolean {
  const token = normalizeJaNeeToken(option.rawValue);
  const label = normalizeJaNeeToken(option.label);
  return token === "0" || token === "nee" || label === "nee";
}

function getJaNeeOptionValue(
  options: JaarplanDomainOption[],
  checked: boolean
): string {
  if (checked) {
    return options.find(isJaOption)?.value ?? "1";
  }

  return options.find(isNeeOption)?.value ?? "0";
}

function toTrajectGlobalId(attributes: Record<string, unknown>): string {
  const globalId = String(attributes[FIELD_NAMES.globalId] ?? "").trim();
  if (globalId) {
    return globalId;
  }

  const guid = String(attributes[FIELD_NAMES.guid] ?? "").trim();
  if (guid) {
    return guid;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function toMeasureGlobalId(attributes: Record<string, unknown>): string {
  const globalId = String(attributes[FIELD_NAMES.globalId] ?? "").trim();
  if (globalId) {
    return globalId;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function createUitvoerderColorMap(
  options: JaarplanDomainOption[]
): Record<string, string> {
  return Object.fromEntries(
    options.map((option, index) => [
      option.value,
      LEGEND_COLORS[index % LEGEND_COLORS.length],
    ])
  );
}

function createUitvoerderRenderer(
  options: JaarplanDomainOption[]
): UniqueValueRenderer {
  const colorMap = createUitvoerderColorMap(options);

  return new UniqueValueRenderer({
    field: FIELD_NAMES.uitvoerderOnderhoud,
    defaultLabel: "Onbekend",
    defaultSymbol: new SimpleFillSymbol({
      color: [148, 163, 184, 0.16],
      outline: new SimpleLineSymbol({
        color: [71, 85, 105, 1],
        width: 2,
        style: "solid",
      }),
    }),
    uniqueValueInfos: options.map((option) => {
      const color = colorMap[option.value] ?? "#475569";
      const [r, g, b] = color
        .replace("#", "")
        .match(/.{1,2}/g)
        ?.map((value) => Number.parseInt(value, 16)) ?? [71, 85, 105];

      return {
        value: option.rawValue,
        label: option.label,
        symbol: new SimpleFillSymbol({
          color: [r, g, b, 0.14],
          outline: new SimpleLineSymbol({
            color: [r, g, b, 1],
            width: 2.5,
            style: "solid",
          }),
        }),
      };
    }),
  });
}

function getStatusColor(status: MaatregelStatus): [number, number, number] {
  switch (status) {
    case "uitgevoerd":
      return [22, 163, 74];
    case "niet_uitgevoerd":
      return [220, 38, 38];
    case "deels_uitgevoerd":
      return [249, 115, 22];
    case "gepland":
      return [124, 58, 237];
    default:
      return [17, 24, 39];
  }
}

function getStatusLabel(status: MaatregelStatus): string {
  return (
    MAATREGEL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Geen status"
  );
}

function createTrajectStatusRenderer(
  statusByTrajectId: Record<string, MaatregelStatus>
): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: FIELD_NAMES.globalId,
    defaultLabel: "Geen status",
    defaultSymbol: new SimpleFillSymbol({
      color: [17, 24, 39, 0.12],
      outline: new SimpleLineSymbol({
        color: [17, 24, 39, 1],
        width: 2.4,
        style: "solid",
      }),
    }),
    uniqueValueInfos: Object.entries(statusByTrajectId).map(([globalId, status]) => {
      const [r, g, b] = getStatusColor(status);

      return {
        value: globalId,
        label: getStatusLabel(status),
        symbol: new SimpleFillSymbol({
          color: [r, g, b, 0.16],
          outline: new SimpleLineSymbol({
            color: [r, g, b, 1],
            width: 2.6,
            style: "solid",
          }),
        }),
      };
    }),
  });
}

function toLegendItems(metadata: JaarplanMetadata): LegendItem[] {
  const colorMap = createUitvoerderColorMap(metadata.uitvoerderOptions);

  return [
    {
      id: "jaarplan-trajecten",
      title: "Jaarplan Trajecten",
      entries: metadata.uitvoerderOptions.length
        ? metadata.uitvoerderOptions.map((option) => ({
            label: option.label,
            color: colorMap[option.value] ?? "#475569",
          }))
        : [
            {
              label: "Traject",
              color: "#475569",
            },
          ],
    },
    {
      id: "bor-objectlagen",
      title: "BOR objectlagen",
      entries: GISIB_BOR_LAYER_DEFINITIONS.map((layer) => ({
        label: layer.title,
        color: "#c8cdd6",
      })),
    },
  ];
}

function toJaarplanTraject(graphic: Graphic): JaarplanTrajectRecord {
  return {
    objectId: Number(graphic.attributes.OBJECTID),
    globalId: toTrajectGlobalId(graphic.attributes as Record<string, unknown>),
    guid: String(graphic.attributes[FIELD_NAMES.guid] ?? ""),
    trajectCode: String(graphic.attributes[FIELD_NAMES.trajectCode] ?? ""),
    uitvoerderOnderhoud: String(graphic.attributes[FIELD_NAMES.uitvoerderOnderhoud] ?? ""),
    geometry: graphic.geometry ?? null,
  };
}

function toFieldValue(
  field: Field | undefined,
  value: string
): string | number | null {
  if (!field) {
    return value || null;
  }

  if (!value.trim()) {
    return null;
  }

  if (
    field.type === "small-integer" ||
    field.type === "integer" ||
    field.type === "single" ||
    field.type === "double"
  ) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return value;
}

async function queryAllLayerFeatures(
  layer: FeatureLayer,
  returnGeometry: boolean,
  outFields: readonly string[] = ["*"]
): Promise<Graphic[]> {
  const allFeatures: Graphic[] = [];
  let lastObjectId = -1;
  const pageSize = 1000;

  while (true) {
    const featureSet = await layer.queryFeatures({
      where: lastObjectId < 0 ? "1=1" : `OBJECTID > ${lastObjectId}`,
      outFields: [...outFields],
      returnGeometry,
      orderByFields: ["OBJECTID ASC"],
      num: pageSize,
    });

    if (!featureSet.features.length) {
      break;
    }

    allFeatures.push(...featureSet.features);

    const nextLastObjectId = Number(
      featureSet.features[featureSet.features.length - 1]?.attributes.OBJECTID
    );
    if (!Number.isFinite(nextLastObjectId) || featureSet.features.length < pageSize) {
      break;
    }

    lastObjectId = nextLastObjectId;
  }

  return allFeatures;
}

function toJaarplanMeasure(
  graphic: Graphic,
  metadata: JaarplanMetadata,
  trajectByGlobalId: Map<string, JaarplanTrajectRecord>
): JaarplanMeasureRecord {
  const attributes = graphic.attributes as Record<string, unknown>;
  const regimeValue = String(attributes[FIELD_NAMES.regime] ?? "");
  const subtypeConfig = metadata.subtypeConfigsByRegime[regimeValue];
  const werkzaamhedenValue = String(attributes[FIELD_NAMES.werkzaamheden] ?? "");
  const toelichtingValue = String(attributes[FIELD_NAMES.toelichting] ?? "");
  const trajectGuid = String(attributes[FIELD_NAMES.trajectGuid] ?? "");
  const traject = trajectByGlobalId.get(trajectGuid);
  const globalId = toMeasureGlobalId(attributes);
  const objectId = Number(attributes.OBJECTID);
  const localFields = mergeLocalFields(globalId, objectId);

  return {
    objectId,
    globalId,
    trajectGuid,
    trajectGlobalId: traject?.globalId ?? trajectGuid,
    trajectCode: traject?.trajectCode ?? "Onbekend traject",
    regimeValue,
    regimeLabel: getDomainLabel(metadata.regimeOptions, regimeValue),
    regimeNumber: regimeValue ? Number(regimeValue) : null,
    werkzaamhedenValue,
    werkzaamheidLabel: getDomainLabel(
      subtypeConfig?.werkzaamhedenOptions ?? [],
      werkzaamhedenValue
    ),
    toelichtingValue,
    toelichtingLabel: getDomainLabel(
      subtypeConfig?.toelichtingOptions ?? [],
      toelichtingValue
    ),
    werkperiodeVanValue: String(attributes[FIELD_NAMES.werkperiodeVan] ?? ""),
    werkperiodeVanLabel: getDomainLabel(
      metadata.werkperiodeOptions,
      String(attributes[FIELD_NAMES.werkperiodeVan] ?? "")
    ),
    werkperiodeTotValue: String(attributes[FIELD_NAMES.werkperiodeTot] ?? ""),
    werkperiodeTotLabel: getDomainLabel(
      metadata.werkperiodeOptions,
      String(attributes[FIELD_NAMES.werkperiodeTot] ?? "")
    ),
    zijdeValue: String(attributes[FIELD_NAMES.zijde] ?? ""),
    zijdeLabel: getDomainLabel(
      metadata.zijdeOptions,
      String(attributes[FIELD_NAMES.zijde] ?? "")
    ),
    afvoerenValue: String(attributes[FIELD_NAMES.afvoeren] ?? ""),
    afvoerenLabel: getDomainLabel(
      metadata.afvoerenOptions,
      String(attributes[FIELD_NAMES.afvoeren] ?? "")
    ),
    soortspecifiekeMaatValue: String(attributes[FIELD_NAMES.soortspecifiekeMaat] ?? ""),
    soortspecifiekeMaatLabel: getDomainLabel(
      metadata.jaNeeOptions,
      String(attributes[FIELD_NAMES.soortspecifiekeMaat] ?? "")
    ),
    soortspecifiekeMaat: toBooleanJaNee(attributes[FIELD_NAMES.soortspecifiekeMaat] as
      | string
      | number
      | null
      | undefined),
    locatiebezoekValue: String(attributes[FIELD_NAMES.locatiebezoek] ?? ""),
    locatiebezoekLabel: getDomainLabel(
      metadata.jaNeeOptions,
      String(attributes[FIELD_NAMES.locatiebezoek] ?? "")
    ),
    locatiebezoek: toBooleanJaNee(
      attributes[FIELD_NAMES.locatiebezoek] as string | number | null | undefined
    ),
    ...localFields,
  };
}

export class ArcgisJaarplanService {
  readonly steekproefStatusOptions = STEEKPROEF_STATUS_OPTIONS;
  readonly maatregelStatusOptions = MAATREGEL_STATUS_OPTIONS;
  private sharedMaatregelTablePromise: Promise<FeatureLayer> | null = null;
  private resourceInfoPromise:
    | Promise<{
        serviceUrl: string;
        trajectLayerUrl: string;
        maatregelTableUrl: string;
      }>
    | null = null;

  private async resolveResourceInfo(): Promise<{
    serviceUrl: string;
    trajectLayerUrl: string;
    maatregelTableUrl: string;
  }> {
    if (!this.resourceInfoPromise) {
      this.resourceInfoPromise = (async () => {
        const response = await esriRequest(JAARPLAN_FEATURE_SERVICE_URL, {
          query: { f: "json" },
          responseType: "json",
        });
        const data = response.data as FeatureServiceMetadata;
        const trajectLayer = findNamedResource(data.layers, [
          "jaarplantraject",
          "trajecten",
          "traject",
        ]);
        const maatregelTable = findNamedResource(data.tables, [
          "jaarplanmaatregel",
          "maatregelen",
          "maatregel",
        ]);

        if (!trajectLayer) {
          throw new Error(
            "Kon in de jaarplan FeatureServer geen trajectlaag vinden."
          );
        }

        if (!maatregelTable) {
          throw new Error(
            "Kon in de jaarplan FeatureServer geen maatregelentabel vinden."
          );
        }

        return {
          serviceUrl: JAARPLAN_FEATURE_SERVICE_URL,
          trajectLayerUrl: toResourceUrl(JAARPLAN_FEATURE_SERVICE_URL, trajectLayer.id),
          maatregelTableUrl: toResourceUrl(JAARPLAN_FEATURE_SERVICE_URL, maatregelTable.id),
        };
      })().catch((error) => {
        this.resourceInfoPromise = null;
        throw error;
      });
    }

    return this.resourceInfoPromise;
  }

  async createTrajectLayer(metadata?: JaarplanMetadata): Promise<FeatureLayer> {
    const { trajectLayerUrl } = await this.resolveResourceInfo();
    const layer = new FeatureLayer({
      url: trajectLayerUrl,
      outFields: ["*"],
      title: "Jaarplan Trajecten",
      renderer: createUitvoerderRenderer(metadata?.uitvoerderOptions ?? []),
    });

    await layer.load();

    if (metadata) {
      layer.renderer = createUitvoerderRenderer(metadata.uitvoerderOptions);
    }

    return layer;
  }

  async createMaatregelTable(): Promise<FeatureLayer> {
    if (!this.sharedMaatregelTablePromise) {
      this.sharedMaatregelTablePromise = (async () => {
        const { maatregelTableUrl } = await this.resolveResourceInfo();
        const table = new FeatureLayer({
          url: maatregelTableUrl,
          outFields: ["*"],
          title: "Jaarplan Maatregelen",
        });

        await table.load();
        return table;
      })().catch((error) => {
        this.sharedMaatregelTablePromise = null;
        throw error;
      });
    }

    return this.sharedMaatregelTablePromise;
  }

  async queryAllTrajecten(
    layer?: FeatureLayer,
    returnGeometry = false
  ): Promise<JaarplanTrajectRecord[]> {
    const trajectLayer = layer ?? (await this.createTrajectLayer());

    return (await queryAllLayerFeatures(trajectLayer, returnGeometry, TRAJECT_OUT_FIELDS))
      .map((feature) => toJaarplanTraject(feature))
      .sort((left, right) => left.trajectCode.localeCompare(right.trajectCode, "nl"));
  }

  async loadMetadata(
    trajecten?: JaarplanTrajectRecord[],
    trajectLayer?: FeatureLayer,
    maatregelTable?: FeatureLayer
  ): Promise<JaarplanMetadata> {
    const [resolvedLayer, resolvedTable, resolvedTrajecten] = await Promise.all([
      trajectLayer ? Promise.resolve(trajectLayer) : this.createTrajectLayer(),
      maatregelTable ? Promise.resolve(maatregelTable) : this.createMaatregelTable(),
      trajecten ? Promise.resolve(trajecten) : this.queryAllTrajecten(trajectLayer, false),
    ]);

    const uitvoerderOptions = [...new Set(resolvedTrajecten.map((item) => item.uitvoerderOnderhoud))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "nl"))
      .map((value) => ({
        value,
        label: value,
        rawValue: value,
      }));

    return {
      editable:
        resolvedTable.editingEnabled &&
        resolvedTable.capabilities?.operations?.supportsEditing !== false,
      relationshipId: resolvedLayer.relationships?.[0]?.id ?? null,
      regimeOptions: getFieldDomainOptions(resolvedTable, FIELD_NAMES.regime),
      subtypeField: resolvedTable.subtypeField || null,
      regimeFieldName: FIELD_NAMES.regime,
      werkzaamhedenFieldName: FIELD_NAMES.werkzaamheden,
      toelichtingFieldName: FIELD_NAMES.toelichting,
      werkperiodeVanFieldName: FIELD_NAMES.werkperiodeVan,
      werkperiodeTotFieldName: FIELD_NAMES.werkperiodeTot,
      zijdeFieldName: FIELD_NAMES.zijde,
      afvoerenFieldName: FIELD_NAMES.afvoeren,
      soortspecifiekeMaatFieldName: FIELD_NAMES.soortspecifiekeMaat,
      locatiebezoekFieldName: FIELD_NAMES.locatiebezoek,
      subtypeConfigsByRegime: getSubtypeConfigs(resolvedTable),
      werkperiodeOptions: getFieldDomainOptions(resolvedTable, FIELD_NAMES.werkperiodeVan),
      zijdeOptions: getFieldDomainOptions(resolvedTable, FIELD_NAMES.zijde),
      afvoerenOptions: getFieldDomainOptions(resolvedTable, FIELD_NAMES.afvoeren),
      jaNeeOptions: getFieldDomainOptions(resolvedTable, FIELD_NAMES.soortspecifiekeMaat),
      uitvoerderOptions,
    };
  }

  async queryAllMeasures(
    metadata: JaarplanMetadata,
    trajecten: JaarplanTrajectRecord[],
    table?: FeatureLayer
  ): Promise<JaarplanMeasureRecord[]> {
    const maatregelTable = table ?? (await this.createMaatregelTable());

    const trajectByGlobalId = new Map(
      trajecten.map((traject) => [traject.globalId, traject])
    );

    return (await queryAllLayerFeatures(maatregelTable, false, MAATREGEL_OUT_FIELDS))
      .map((feature) => toJaarplanMeasure(feature, metadata, trajectByGlobalId));
  }

  async loadBootstrap(): Promise<{
    trajecten: JaarplanTrajectRecord[];
    measures: JaarplanMeasureRecord[];
    metadata: JaarplanMetadata;
  }> {
    const [trajectLayer, maatregelTable] = await Promise.all([
      this.createTrajectLayer(),
      this.createMaatregelTable(),
    ]);
    const trajecten = await this.queryAllTrajecten(trajectLayer, false);
    const metadata = await this.loadMetadata(trajecten, trajectLayer, maatregelTable);
    const measures = await this.queryAllMeasures(metadata, trajecten, maatregelTable);

    return {
      trajecten,
      measures,
      metadata,
    };
  }

  createDefaultFormValues(
    metadata: JaarplanMetadata,
    traject: JaarplanTrajectRecord
  ): JaarplanMeasureFormValues {
    const defaultRegime = metadata.regimeOptions[0]?.value ?? "";
    const subtypeConfig = metadata.subtypeConfigsByRegime[defaultRegime];
    const defaultWerkzaamheidValue =
      subtypeConfig?.defaultWerkzaamheidValue ??
      subtypeConfig?.werkzaamhedenOptions[0]?.value ??
      "";
    const defaultToelichtingValue =
      subtypeConfig?.toelichtingOptions.find(
        (option) => option.value === `T${defaultWerkzaamheidValue}`
      )?.value ??
      subtypeConfig?.defaultToelichtingValue ??
      "";

    return {
      trajectGuid: traject.globalId,
      trajectGlobalId: traject.globalId,
      regimeValue: defaultRegime,
      werkzaamhedenValue: defaultWerkzaamheidValue,
      toelichtingValue: defaultToelichtingValue,
      werkperiodeVanValue: metadata.werkperiodeOptions[0]?.value ?? "",
      werkperiodeTotValue: metadata.werkperiodeOptions[0]?.value ?? "",
      zijdeValue: metadata.zijdeOptions[0]?.value ?? "",
      afvoerenValue: metadata.afvoerenOptions[0]?.value ?? "",
      soortspecifiekeMaatValue: getJaNeeOptionValue(metadata.jaNeeOptions, false),
      locatiebezoekValue: getJaNeeOptionValue(metadata.jaNeeOptions, false),
      ...DEFAULT_LOCAL_FIELDS,
    };
  }

  syncSubtypeValues(
    metadata: JaarplanMetadata,
    values: JaarplanMeasureFormValues,
    changedField: "regimeValue" | "werkzaamhedenValue"
  ): JaarplanMeasureFormValues {
    if (changedField === "regimeValue") {
      const subtypeConfig = metadata.subtypeConfigsByRegime[values.regimeValue];
      if (!subtypeConfig) {
        return values;
      }

      const werkzaamhedenValue =
        subtypeConfig.defaultWerkzaamheidValue ??
        subtypeConfig.werkzaamhedenOptions[0]?.value ??
        "";
      const toelichtingValue =
        subtypeConfig.toelichtingOptions.find(
          (option) => option.value === `T${werkzaamhedenValue}`
        )?.value ??
        subtypeConfig.defaultToelichtingValue ??
        "";

      return {
        ...values,
        werkzaamhedenValue,
        toelichtingValue,
      };
    }

    const [selectedRegimeValue, selectedWerkzaamhedenValue] =
      values.werkzaamhedenValue.includes(WERKZAAMHEID_SELECTION_SEPARATOR)
        ? values.werkzaamhedenValue.split(WERKZAAMHEID_SELECTION_SEPARATOR)
        : [null, values.werkzaamhedenValue];

    const resolvedRegimeValue =
      selectedRegimeValue ??
      Object.values(metadata.subtypeConfigsByRegime).find((subtype) =>
        subtype.werkzaamhedenOptions.some(
          (option) => option.value === selectedWerkzaamhedenValue
        )
      )?.regimeValue ??
      values.regimeValue;

    const subtypeConfig = metadata.subtypeConfigsByRegime[resolvedRegimeValue];
    if (!subtypeConfig) {
      return {
        ...values,
        werkzaamhedenValue: selectedWerkzaamhedenValue,
      };
    }

    const toelichtingValue =
      subtypeConfig.toelichtingOptions.find(
        (option) => option.value === `T${selectedWerkzaamhedenValue}`
      )?.value ??
      values.toelichtingValue;

    return {
      ...values,
      regimeValue: resolvedRegimeValue,
      werkzaamhedenValue: selectedWerkzaamhedenValue,
      toelichtingValue,
    };
  }

  getSubtypeConfig(
    metadata: JaarplanMetadata,
    regimeValue: string
  ): JaarplanSubtypeConfig | null {
    return metadata.subtypeConfigsByRegime[regimeValue] ?? null;
  }

  getLegendItems(metadata: JaarplanMetadata): LegendItem[] {
    return toLegendItems(metadata);
  }

  updateTrajectStatusRenderer(
    layer: FeatureLayer,
    statusByTrajectId: Record<string, MaatregelStatus>
  ): void {
    layer.renderer = createTrajectStatusRenderer(statusByTrajectId);
  }

  async createHeadlessMap(
    container: HTMLDivElement,
    metadata: JaarplanMetadata
  ): Promise<JaarplanMapContext> {
    const trajectLayer = await this.createTrajectLayer(metadata);
    const map = new ArcGISMap({
      basemap: createBasemapOptions()[0].basemap,
      layers: [trajectLayer],
    });

    const view = new MapView({
      container,
      map,
      center: [5.9, 51.2],
      zoom: 10,
      constraints: {
        snapToZoom: false,
      },
      popupEnabled: false,
    });

    await view.when();
    view.ui.empty();

    const addBorLayers = () => {
      if (view.destroyed) {
        return;
      }

      const groupLayer = new GroupLayer({
        title: "BOR objectlagen",
        visibilityMode: "independent",
        listMode: "show",
      });

      GISIB_BOR_LAYER_DEFINITIONS.forEach(({ id, title }) => {
        groupLayer.add(
          new FeatureLayer({
            url: `${GISIB_BOR_MAPSERVER_URL}/${id}`,
            title,
            outFields: ["*"],
            listMode: "show",
          })
        );
      });

      map.add(groupLayer, 0);
    };

    if (typeof window !== "undefined") {
      window.setTimeout(addBorLayers, 0);
    } else {
      addBorLayers();
    }

    const layerListViewModel = new LayerListViewModel({
      view,
      listItemCreatedFunction: ({ item }) => {
        item.open = false;
      },
    });

    return {
      map,
      view,
      trajectLayer,
      layerListViewModel,
      basemapOptions: createBasemapOptions(),
    };
  }

  async queryGraphicByGlobalId(
    layer: FeatureLayer,
    globalId: string
  ): Promise<Graphic | null> {
    const featureSet = await layer.queryFeatures({
      where: `${FIELD_NAMES.globalId}='${globalId.replace(/'/g, "''")}'`,
      outFields: ["*"],
      returnGeometry: true,
    });

    return featureSet.features[0] ?? null;
  }

  extractLayerToggleItems(collection: Collection<ListItem>): LayerToggleItem[] {
    return collection
      .toArray()
      .map((item: ListItem) => ({
        id: item.uid,
        title: item.title,
        visible: item.visible,
        type: item.layer?.type ?? "layer",
      }));
  }

  async createMeasure(
    values: JaarplanMeasureFormValues,
    metadata: JaarplanMetadata,
    trajecten: JaarplanTrajectRecord[]
  ): Promise<JaarplanMeasureRecord> {
    const table = await this.createMaatregelTable();

    if (!metadata.editable) {
      throw new Error("Bewerken is niet ingeschakeld voor de maatregelentabel.");
    }

    const attributes = {
      [FIELD_NAMES.trajectGuid]: values.trajectGuid,
      [FIELD_NAMES.regime]: toFieldValue(getField(table, FIELD_NAMES.regime), values.regimeValue),
      [FIELD_NAMES.werkzaamheden]: toFieldValue(
        getField(table, FIELD_NAMES.werkzaamheden),
        values.werkzaamhedenValue
      ),
      [FIELD_NAMES.toelichting]: toFieldValue(
        getField(table, FIELD_NAMES.toelichting),
        values.toelichtingValue
      ),
      [FIELD_NAMES.werkperiodeVan]: toFieldValue(
        getField(table, FIELD_NAMES.werkperiodeVan),
        values.werkperiodeVanValue
      ),
      [FIELD_NAMES.werkperiodeTot]: toFieldValue(
        getField(table, FIELD_NAMES.werkperiodeTot),
        values.werkperiodeTotValue
      ),
      [FIELD_NAMES.zijde]: toFieldValue(getField(table, FIELD_NAMES.zijde), values.zijdeValue),
      [FIELD_NAMES.afvoeren]: toFieldValue(
        getField(table, FIELD_NAMES.afvoeren),
        values.afvoerenValue
      ),
      [FIELD_NAMES.soortspecifiekeMaat]: toFieldValue(
        getField(table, FIELD_NAMES.soortspecifiekeMaat),
        values.soortspecifiekeMaatValue
      ),
      [FIELD_NAMES.locatiebezoek]: toFieldValue(
        getField(table, FIELD_NAMES.locatiebezoek),
        values.locatiebezoekValue
      ),
    };

    const result = await table.applyEdits({
      addFeatures: [new Graphic({ attributes })],
    });
    const addResult = result.addFeatureResults?.[0];
    if (addResult?.error) {
      throw new Error(addResult.error.message);
    }

    if (!addResult?.objectId) {
      throw new Error("ArcGIS gaf geen objectId terug voor de nieuwe maatregel.");
    }

    const featureSet = await table.queryFeatures({
      objectIds: [addResult.objectId],
      outFields: ["*"],
      returnGeometry: false,
    });
    const created = featureSet.features[0];
    if (!created) {
      throw new Error("Nieuwe maatregel kon niet opnieuw worden opgehaald.");
    }

    const globalId = toMeasureGlobalId(created.attributes as Record<string, unknown>);
    persistLocalFields(globalId, addResult.objectId, {
      statusMaatregel: values.statusMaatregel,
      datumGepland: values.datumGepland,
      datumUitgevoerd: values.datumUitgevoerd,
      steekproefStatus: values.steekproefStatus,
      redenNietUitgevoerd: values.redenNietUitgevoerd,
      foto: values.foto,
      opmerking: values.opmerking,
    });

    const trajectByGlobalId = new Map(trajecten.map((traject) => [traject.globalId, traject]));
    return toJaarplanMeasure(created, metadata, trajectByGlobalId);
  }

  async updateMeasureServerFields(
    globalId: string,
    values: JaarplanMeasureServerInput,
    metadata: JaarplanMetadata,
    trajecten: JaarplanTrajectRecord[]
  ): Promise<JaarplanMeasureRecord> {
    const table = await this.createMaatregelTable();

    if (!metadata.editable) {
      throw new Error("Bewerken is niet ingeschakeld voor de maatregelentabel.");
    }

    const featureSet = await table.queryFeatures({
      where: `${FIELD_NAMES.globalId}='${globalId.replace(/'/g, "''")}'`,
      outFields: ["*"],
      returnGeometry: false,
    });
    const current = featureSet.features[0];

    if (!current) {
      throw new Error("Maatregel kon niet worden gevonden.");
    }

    const objectId = Number(current.attributes.OBJECTID);

    const result = await table.applyEdits({
      updateFeatures: [
        new Graphic({
          attributes: {
            OBJECTID: objectId,
            [FIELD_NAMES.trajectGuid]: values.trajectGuid,
            [FIELD_NAMES.regime]: toFieldValue(getField(table, FIELD_NAMES.regime), values.regimeValue),
            [FIELD_NAMES.werkzaamheden]: toFieldValue(
              getField(table, FIELD_NAMES.werkzaamheden),
              values.werkzaamhedenValue
            ),
            [FIELD_NAMES.toelichting]: toFieldValue(
              getField(table, FIELD_NAMES.toelichting),
              values.toelichtingValue
            ),
            [FIELD_NAMES.werkperiodeVan]: toFieldValue(
              getField(table, FIELD_NAMES.werkperiodeVan),
              values.werkperiodeVanValue
            ),
            [FIELD_NAMES.werkperiodeTot]: toFieldValue(
              getField(table, FIELD_NAMES.werkperiodeTot),
              values.werkperiodeTotValue
            ),
            [FIELD_NAMES.zijde]: toFieldValue(
              getField(table, FIELD_NAMES.zijde),
              values.zijdeValue
            ),
            [FIELD_NAMES.afvoeren]: toFieldValue(
              getField(table, FIELD_NAMES.afvoeren),
              values.afvoerenValue
            ),
            [FIELD_NAMES.soortspecifiekeMaat]: toFieldValue(
              getField(table, FIELD_NAMES.soortspecifiekeMaat),
              values.soortspecifiekeMaatValue
            ),
            [FIELD_NAMES.locatiebezoek]: toFieldValue(
              getField(table, FIELD_NAMES.locatiebezoek),
              values.locatiebezoekValue
            ),
          },
        }),
      ],
    });

    const updateResult = result.updateFeatureResults?.[0];
    if (updateResult?.error) {
      throw new Error(updateResult.error.message);
    }

    const refreshed = await table.queryFeatures({
      objectIds: [objectId],
      outFields: ["*"],
      returnGeometry: false,
    });
    const updated = refreshed.features[0];

    if (!updated) {
      throw new Error("Bijgewerkte maatregel kon niet opnieuw worden opgehaald.");
    }

    const trajectByGlobalId = new Map(trajecten.map((traject) => [traject.globalId, traject]));
    return toJaarplanMeasure(updated, metadata, trajectByGlobalId);
  }

  async deleteMeasure(globalId: string, metadata: JaarplanMetadata): Promise<void> {
    const table = await this.createMaatregelTable();

    if (!metadata.editable) {
      throw new Error("Bewerken is niet ingeschakeld voor de maatregelentabel.");
    }

    const featureSet = await table.queryFeatures({
      where: `${FIELD_NAMES.globalId}='${globalId.replace(/'/g, "''")}'`,
      outFields: ["OBJECTID", FIELD_NAMES.globalId],
      returnGeometry: false,
    });
    const current = featureSet.features[0];

    if (!current) {
      throw new Error("Maatregel kon niet worden gevonden.");
    }

    const objectId = Number(current.attributes.OBJECTID);
    const resolvedGlobalId = toMeasureGlobalId(current.attributes as Record<string, unknown>);

    const result = await table.applyEdits({
      deleteFeatures: [
        new Graphic({
          attributes: {
            OBJECTID: objectId,
          },
        }),
      ],
    });

    const deleteResult = result.deleteFeatureResults?.[0];
    if (deleteResult?.error) {
      throw new Error(deleteResult.error.message);
    }

    removePersistedLocalFields(resolvedGlobalId, objectId);
  }

  updateMeasureLocalFields(
    measure: JaarplanMeasureRecord,
    updates: Partial<JaarplanLocalFields>
  ): JaarplanMeasureRecord {
    const localFields = persistLocalFields(measure.globalId, measure.objectId, updates);

    return {
      ...measure,
      ...localFields,
    };
  }

  getSteekproefStatusLabel(value: SteekproefStatus): string {
    return (
      STEEKPROEF_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
    );
  }

  getMaatregelStatusLabel(value: MaatregelStatus): string {
    return (
      MAATREGEL_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
    );
  }

  getMeasureToelichtingLabel(
    metadata: JaarplanMetadata,
    regimeValue: string,
    toelichtingValue: string
  ): string {
    const subtypeConfig = metadata.subtypeConfigsByRegime[regimeValue];
    return getDomainLabel(subtypeConfig?.toelichtingOptions ?? [], toelichtingValue);
  }
}

export const arcgisJaarplanService = new ArcgisJaarplanService();

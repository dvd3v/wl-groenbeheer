import WebMap from "@arcgis/core/WebMap.js";
import Basemap from "@arcgis/core/Basemap.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import WMSLayer from "@arcgis/core/layers/WMSLayer.js";
import WMTSLayer from "@arcgis/core/layers/WMTSLayer.js";
import FeatureTemplate from "@arcgis/core/layers/support/FeatureTemplate.js";
import FormTemplate from "@arcgis/core/form/FormTemplate.js";
import FieldElement from "@arcgis/core/form/elements/FieldElement.js";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import PortalItem from "@arcgis/core/portal/PortalItem.js";
import Portal from "@arcgis/core/portal/Portal.js";
import esriRequest from "@arcgis/core/request.js";

const FEATURE_SERVICE_URL =
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/Jaarplan_Trajecten_2027/FeatureServer";
const GISIB_BOR_MAPSERVER_URL =
  "https://utility.arcgis.com/usrsvcs/servers/73fc6147aa1d457fa19f50598a9e1001/rest/services/Groenbeheer/GISIB_BOR/MapServer";
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
const TRAJECT_LAYER_OPACITY = 1;

const PORTAL_URL = "https://ws-limburg.maps.arcgis.com";
const PDOK_LUCHTFOTO_WMS_URL = "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0";
const PDOK_BGT_WMTS_URL = "https://service.pdok.nl/lv/bgt/wmts/v1_0";

export type BasemapOptionId = "default" | "pdokhr" | "bgt";

export interface BasemapOption {
  id: BasemapOptionId;
  label: string;
  basemap: Basemap;
}

// Status domain: numeric codes mapped to labels and colors
export interface StatusDomain {
  code: number;
  label: string;
  color: string;
}

export const STATUS_DOMAIN: StatusDomain[] = [
  { code: 1, label: "Controleren", color: "#f0ad4e" },
  { code: 2, label: "Correct", color: "#5cb85c" },
  { code: 3, label: "Afgekeurd", color: "#d9534f" },
  { code: 4, label: "Aanpassen", color: "#5bc0de" },
  { code: 5, label: "Anders", color: "#777777" },
];

// Lookup helpers
export function getStatusLabel(code: number | string): string {
  const entry = STATUS_DOMAIN.find((s) => s.code === Number(code));
  return entry?.label || "Onbekend";
}

export function getStatusColor(code: number | string): string {
  const entry = STATUS_DOMAIN.find((s) => s.code === Number(code));
  return entry?.color || "#999";
}

function createStatusRenderer(statusField: string): UniqueValueRenderer {
  const defaultSymbol = createTrajectorySymbol([95, 108, 114], [200, 200, 200, 0.12]);

  const uniqueValueInfos = STATUS_DOMAIN.map((s) => ({
    value: s.code,
    symbol: createTrajectorySymbol(hexToRgb(s.color), [...hexToRgb(s.color), 0.14]),
    label: s.label,
  }));

  return new UniqueValueRenderer({
    field: statusField,
    defaultSymbol,
    defaultLabel: "Onbekend",
    uniqueValueInfos,
  });
}

function createTrajectorySymbol(
  outlineRgb: [number, number, number],
  fillColor: [number, number, number, number]
): SimpleFillSymbol {
  return new SimpleFillSymbol({
    color: fillColor,
    outline: new SimpleLineSymbol({
      color: [...outlineRgb, 1],
      width: 3.2,
      style: "dash",
      cap: "round",
      join: "round",
    }),
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [128, 128, 128];
}

export interface MapContext {
  map: WebMap;
  layer: FeatureLayer;
  statusField: string;
  basemapOptions: BasemapOption[];
}

export async function initMap(): Promise<MapContext> {
  // Detect field names from service metadata
  const { statusField, remarkField } = await detectFields();

  console.log("Detected status field:", statusField);
  console.log("Detected remark field:", remarkField);

  // Build form elements for editing
  const formElements: FieldElement[] = [
    new FieldElement({
      fieldName: "hoofdobjec",
      label: "Hoofdobject",
      description: "Naam van het hoofdobject",
    }),
    new FieldElement({
      fieldName: statusField,
      label: "Status",
      description: "Controlestatus van het traject",
    }),
  ];

  if (remarkField) {
    formElements.push(
      new FieldElement({
        fieldName: remarkField,
        label: "Opmerking",
        description: "Eventuele opmerkingen",
      })
    );
  }

  const formTemplate = new FormTemplate({
    title: "Maaitraject bewerken",
    elements: formElements,
  });

  const configuredLayer = new FeatureLayer({
    url: FEATURE_SERVICE_URL,
    title: "Maaitrajecten 2027",
    opacity: TRAJECT_LAYER_OPACITY,
    listMode: "show",
    outFields: ["*"],
    renderer: createStatusRenderer(statusField),
    popupEnabled: true,
    popupTemplate: {
      title: "{hoofdobjec}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "hoofdobjec", label: "Hoofdobject" },
            { fieldName: "model_type", label: "Model type" },
            { fieldName: statusField, label: "Status" },
            { fieldName: remarkField || "", label: "Opmerking" },
            { fieldName: "EditDate", label: "Laatst bewerkt" },
            { fieldName: "Editor", label: "Bewerkt door" },
          ].filter((f) => f.fieldName),
        },
      ],
    },
    formTemplate,
    // Single template: removes the model_type grouping in the Editor
    templates: [
      new FeatureTemplate({
        name: "Maaitraject",
        description: "Nieuw maaitraject toevoegen",
        prototype: {
          attributes: {
            [statusField]: 1, // Default: Controleren
          },
        },
      }),
    ],
  });

  // Try to load existing WebMap from portal, or create a new one
  const map = await getOrCreateWebMap();
  const layer = attachConfiguredLayer(map, configuredLayer);
  attachReferenceLayers(map, layer);
  const basemapOptions = createBasemapOptions(map.basemap ?? createFallbackBasemap());

  return { map, layer, statusField, basemapOptions };
}

export function getConfiguredWebMapId(): string | null {
  const webMapId = import.meta.env.VITE_ARCGIS_WEBMAP_ID?.trim();
  return webMapId || null;
}

/**
 * Loads a configured WebMap from AGOL when available.
 * Falls back to a local in-memory WebMap when no item id is configured.
 */
async function getOrCreateWebMap(): Promise<WebMap> {
  const configuredWebMapId = getConfiguredWebMapId();

  if (configuredWebMapId) {
    const portal = new Portal({ url: PORTAL_URL });
    await portal.load();

    console.log("Loading configured WebMap:", configuredWebMapId);
    const map = new WebMap({
      portalItem: new PortalItem({ id: configuredWebMapId, portal }),
    });
    await map.load();

    return map;
  }

  console.log("Creating fallback WebMap without portal item...");
  return new WebMap({
    basemap: "topo-vector",
  });
}

function attachConfiguredLayer(map: WebMap, configuredLayer: FeatureLayer): FeatureLayer {
  const existingLayer = map.allLayers.find(
    (layer: any) => layer.url && layer.url.includes("Jaarplan_Trajecten_2027")
  ) as FeatureLayer | undefined;

  if (existingLayer) {
    applyLayerConfiguration(existingLayer, configuredLayer);
    return existingLayer;
  }

  map.add(configuredLayer);
  return configuredLayer;
}

function attachReferenceLayers(map: WebMap, trajectoryLayer: FeatureLayer): void {
  const existingBorMapLayer = map.allLayers.find((layer: any) => {
    if (layer?.title === "BOR objectlagen") return false;
    return typeof layer?.url === "string" && layer.url === GISIB_BOR_MAPSERVER_URL;
  }) as any | undefined;

  if (existingBorMapLayer) {
    existingBorMapLayer.listMode = "show";
    existingBorMapLayer.opacity = 1;
    map.reorder(existingBorMapLayer, Math.max(map.layers.indexOf(trajectoryLayer), 0));
    trajectoryLayer.opacity = TRAJECT_LAYER_OPACITY;
    map.reorder(trajectoryLayer, map.layers.length - 1);
    return;
  }

  let groupLayer = map.allLayers.find(
    (layer: any) => layer.type === "group" && layer.title === "BOR objectlagen"
  ) as GroupLayer | undefined;

  if (!groupLayer) {
    groupLayer = new GroupLayer({
      title: "BOR objectlagen",
      visibilityMode: "independent",
      listMode: "show",
    });
    map.add(groupLayer, Math.max(map.layers.indexOf(trajectoryLayer), 0));
  }

  GISIB_BOR_LAYER_DEFINITIONS.forEach(({ id, title }, offset) => {
    const layerUrl = `${GISIB_BOR_MAPSERVER_URL}/${id}`;
    const existingLayer = map.allLayers.find(
      (layer: any) => layer.url === layerUrl
    ) as FeatureLayer | undefined;

    if (existingLayer) {
      existingLayer.title = title;
      existingLayer.opacity = 1;
      existingLayer.listMode = "show";
      if (existingLayer.parent !== groupLayer) {
        groupLayer.add(existingLayer);
      }
      groupLayer.reorder(existingLayer, offset);
      return;
    }

    const referenceLayer = new FeatureLayer({
      url: layerUrl,
      title,
      listMode: "show",
      outFields: ["*"],
      popupEnabled: true,
    });

    groupLayer.add(referenceLayer, offset);
  });

  map.reorder(groupLayer, Math.max(map.layers.indexOf(trajectoryLayer), 0));
  trajectoryLayer.opacity = TRAJECT_LAYER_OPACITY;
  map.reorder(trajectoryLayer, map.layers.length - 1);
}

function createBasemapOptions(defaultBasemap: Basemap): BasemapOption[] {
  return [
    {
      id: "default",
      label: "Standaard",
      basemap: defaultBasemap,
    },
    {
      id: "pdokhr",
      label: "PDOK HR 8 cm",
      basemap: createPdokBasemap("Actueel_orthoHR", "PDOK Luchtfoto HR 8 cm"),
    },
    {
      id: "bgt",
      label: "BGT",
      basemap: createBgtBasemap(),
    },
  ];
}

function createFallbackBasemap(): Basemap {
  return Basemap.fromId("topo-vector") ?? new Basemap({ title: "Standaard" });
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
  const title = "PDOK BGT";

  return new Basemap({
    id: "pdok-bgt",
    title,
    baseLayers: [
      new WMTSLayer({
        url: PDOK_BGT_WMTS_URL,
        serviceMode: "KVP",
        activeLayer: {
          id: "achtergrondvisualisatie",
        },
      }),
    ],
  });
}

function applyLayerConfiguration(targetLayer: FeatureLayer, sourceLayer: FeatureLayer): void {
  targetLayer.title = sourceLayer.title;
  targetLayer.opacity = sourceLayer.opacity;
  targetLayer.outFields = sourceLayer.outFields;
  targetLayer.renderer = sourceLayer.renderer;
  targetLayer.popupEnabled = sourceLayer.popupEnabled;
  targetLayer.popupTemplate = sourceLayer.popupTemplate;
  targetLayer.formTemplate = sourceLayer.formTemplate;
  targetLayer.templates = sourceLayer.templates;
}

interface DetectResult {
  statusField: string;
  remarkField: string | null;
  allFields: any[];
}

async function detectFields(): Promise<DetectResult> {
  let statusField = "status";
  let remarkField: string | null = null;
  let allFields: any[] = [];

  try {
    const response = await esriRequest(`${FEATURE_SERVICE_URL}/0`, {
      query: { f: "json" },
      responseType: "json",
    });
    const metadata = response.data;
    allFields = metadata.fields || [];

    // Find status field: look for coded value domain with our status values
    for (const field of allFields) {
      if (field.domain?.type === "codedValue") {
        const domainValues = field.domain.codedValues.map(
          (cv: { name: string }) => cv.name
        );
        if (
          domainValues.includes("Controleren") ||
          domainValues.includes("Correct")
        ) {
          statusField = field.name;
          break;
        }
      }
    }

    // If not found by domain, try common names
    if (statusField === "status") {
      const statusNames = ["status", "Status", "STATUS", "controlestatus"];
      for (const name of statusNames) {
        if (allFields.some((f: any) => f.name === name)) {
          statusField = name;
          break;
        }
      }
    }

    // Find remark/opmerking field
    const remarkNames = [
      "opmerking", "Opmerking", "opmerkingen", "Opmerkingen",
      "remark", "remarks", "notitie", "comment", "comments",
      "toelichting", "Toelichting",
    ];
    for (const name of remarkNames) {
      if (allFields.some((f: any) => f.name === name)) {
        remarkField = name;
        break;
      }
    }

    if (!remarkField) {
      for (const field of allFields) {
        if (
          field.editable &&
          (field.type === "esriFieldTypeString" || field.type === "string") &&
          (field.alias?.toLowerCase().includes("opmerking") ||
            field.alias?.toLowerCase().includes("comment") ||
            field.name?.toLowerCase().includes("opmerking"))
        ) {
          remarkField = field.name;
          break;
        }
      }
    }
  } catch (e) {
    console.warn("Could not detect fields from service metadata:", e);
  }

  return { statusField, remarkField, allFields };
}

import Graphic from "@arcgis/core/Graphic.js";
import type Geometry from "@arcgis/core/geometry/Geometry.js";
import Map from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import WMTSLayer from "@arcgis/core/layers/WMTSLayer.js";
import WMSLayer from "@arcgis/core/layers/WMSLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import type Collection from "@arcgis/core/core/Collection.js";
import LayerListViewModel from "@arcgis/core/widgets/LayerList/LayerListViewModel.js";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem.js";
import LegendViewModel from "@arcgis/core/widgets/Legend/LegendViewModel.js";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import type {
  AttributeFormValues,
  LayerToggleItem,
  LegendItem,
  ModelTypeOption,
  SpatialTrajectFeature,
  StatusOption,
  TrajectRendererMode,
} from "../types/app";
import { FALLBACK_MODEL_TYPES, STATUS_OPTIONS } from "../data/datamodel";

const FEATURE_LAYER_URL =
  import.meta.env.VITE_FEATURE_LAYER_URL?.trim() ||
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/Jaarplan_Trajecten/FeatureServer/0";

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

const TYPE_CODERING_OPTIONS: ModelTypeOption[] = [
  { value: "WSL", label: "WSL" },
  { value: "watergang-segment", label: "watergang-segment" },
  { value: "waterkering", label: "waterkering" },
  { value: "onbekend", label: "onbekend" },
];

const TYPE_CODERING_COLORS: Record<string, string> = {
  WSL: "#0f766e",
  "watergang-segment": "#2563eb",
  waterkering: "#ca8a04",
  onbekend: "#dc2626",
};

export interface BasemapOption {
  id: string;
  label: string;
  basemap: Basemap;
}

export interface HeadlessMapContext {
  map: Map;
  view: MapView;
  trajectLayer: FeatureLayer;
  sketchLayer: GraphicsLayer;
  sketchViewModel: SketchViewModel;
  layerListViewModel: LayerListViewModel;
  legendViewModel: LegendViewModel;
  basemapOptions: BasemapOption[];
  statusOptions: StatusOption[];
  modelTypeOptions: ModelTypeOption[];
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

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [124, 58, 237];
}

function createStatusRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: "status",
    defaultSymbol: new SimpleFillSymbol({
      color: [200, 205, 214, 0.12],
      outline: new SimpleLineSymbol({
        color: [146, 152, 173, 1],
        width: 2,
        style: "short-dot",
      }),
    }),
    uniqueValueInfos: STATUS_OPTIONS.map((option) => {
      const [r, g, b] = hexToRgb(option.color);
      return {
        value: option.value,
        label: option.label,
        symbol: new SimpleFillSymbol({
          color: [r, g, b, 0.12],
          outline: new SimpleLineSymbol({
            color: [r, g, b, 1],
            width: option.value === 2 ? 3 : 2.4,
            style: option.value === 2 ? "solid" : "short-dot",
          }),
        }),
      };
    }),
  });
}

function createTypeCoderingRenderer(options: ModelTypeOption[]): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: "type_codering",
    defaultSymbol: new SimpleFillSymbol({
      color: [200, 205, 214, 0.12],
      outline: new SimpleLineSymbol({
        color: [146, 152, 173, 1],
        width: 2,
        style: "short-dot",
      }),
    }),
    uniqueValueInfos: options.map((option) => {
      const [r, g, b] = hexToRgb(TYPE_CODERING_COLORS[option.value] ?? "#9298ad");
      return {
        value: option.value,
        label: option.label,
        symbol: new SimpleFillSymbol({
          color: [r, g, b, 0.12],
          outline: new SimpleLineSymbol({
            color: [r, g, b, 1],
            width: 2.4,
            style: "solid",
          }),
        }),
      };
    }),
  });
}

function extractColor(symbol: Graphic["symbol"] | null | undefined): string | null {
  const candidate = symbol && "color" in symbol ? symbol.color : null;

  if (!candidate) {
    return null;
  }

  if (typeof candidate.toHex === "function") {
    return candidate.toHex();
  }

  if (Array.isArray(candidate)) {
    const [r, g, b] = candidate;
    return `rgb(${r}, ${g}, ${b})`;
  }

  return null;
}

function toTrajectGlobalId(attributes: Record<string, unknown>): string {
  const guid = String(attributes.guid ?? "").trim();
  if (guid) {
    return guid;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function toSpatialFeature(graphic: Graphic): SpatialTrajectFeature {
  const objectId = Number(graphic.attributes.OBJECTID);
  const guid = String(graphic.attributes.guid ?? "");
  const globalId = toTrajectGlobalId(graphic.attributes as Record<string, unknown>);

  return {
    objectId,
    globalId,
    guid,
    trajectCode: String(graphic.attributes.traject_code ?? ""),
    typeCodering: String(graphic.attributes.type_codering ?? ""),
    objectCount:
      typeof graphic.attributes.object_count === "number"
        ? graphic.attributes.object_count
        : null,
    bronlagen: String(graphic.attributes.bronlagen ?? ""),
    status: Number(graphic.attributes.status ?? 1),
    opmerking: String(graphic.attributes.opmerking ?? ""),
    shapeArea:
      typeof graphic.attributes.Shape__Area === "number"
        ? graphic.attributes.Shape__Area
        : null,
    shapeLength:
      typeof graphic.attributes.Shape__Length === "number"
        ? graphic.attributes.Shape__Length
        : null,
    geometry: graphic.geometry ?? null,
  };
}

function isLayerEditingEnabled(layer: FeatureLayer): boolean {
  return layer.editingEnabled && layer.capabilities?.operations?.supportsEditing !== false;
}

export class ArcgisTrajectService {
  isTrajectLayerEditable(layer: FeatureLayer): boolean {
    return isLayerEditingEnabled(layer);
  }

  async createTrajectLayer(): Promise<FeatureLayer> {
    const layer = new FeatureLayer({
      url: FEATURE_LAYER_URL,
      outFields: ["*"],
      title: "Jaarplan Trajecten",
      renderer: createStatusRenderer(),
    });

    await layer.load();
    return layer;
  }

  async setTrajectRenderer(
    layer: FeatureLayer,
    mode: TrajectRendererMode,
    modelTypeOptions?: ModelTypeOption[]
  ): Promise<void> {
    if (mode === "status") {
      layer.renderer = createStatusRenderer();
      layer.refresh();
      return;
    }

    const options = modelTypeOptions?.length ? modelTypeOptions : await this.getModelTypeOptions(layer);
    layer.renderer = createTypeCoderingRenderer(options);
    layer.refresh();
  }

  async getStatusOptions(layer?: FeatureLayer): Promise<StatusOption[]> {
    const candidateLayer = layer ?? (await this.createTrajectLayer());
    const statusField = candidateLayer.fields.find((field) => field.name === "status");
    const codedValues = statusField?.domain?.type === "coded-value"
      ? statusField.domain.codedValues
      : "codedValues" in (statusField?.domain ?? {})
        ? (statusField?.domain as { codedValues?: Array<{ code: number; name: string }> }).codedValues
        : undefined;

    if (!codedValues?.length) {
      return STATUS_OPTIONS;
    }

    return codedValues.map((codedValue, index) => ({
      value: Number(codedValue.code),
      label: codedValue.name,
      color: STATUS_OPTIONS[index]?.color ?? STATUS_OPTIONS[0].color,
    }));
  }

  async getModelTypeOptions(layer?: FeatureLayer): Promise<ModelTypeOption[]> {
    const candidateLayer = layer ?? (await this.createTrajectLayer());
    const existingValues = new Set(
      TYPE_CODERING_OPTIONS.map((option) => option.value.toLowerCase())
    );
    const typeField = candidateLayer.fields.find((field) => field.name === "type_codering");
    const codedValues =
      typeField?.domain?.type === "coded-value"
        ? typeField.domain.codedValues
        : "codedValues" in (typeField?.domain ?? {})
          ? (typeField?.domain as { codedValues?: Array<{ code: string; name: string }> })
              .codedValues
          : undefined;

    if (!codedValues?.length) {
      return TYPE_CODERING_OPTIONS;
    }

    return [
      ...TYPE_CODERING_OPTIONS,
      ...codedValues
        .map((codedValue) => ({
          value: String(codedValue.code),
          label: codedValue.name,
        }))
        .filter((option) => !existingValues.has(option.value.toLowerCase())),
    ];
  }

  async queryAllTrajecten(layer?: FeatureLayer): Promise<SpatialTrajectFeature[]> {
    const trajectLayer = layer ?? (await this.createTrajectLayer());
    const objectIds = (await trajectLayer.queryObjectIds()) ?? [];

    if (!objectIds.length) {
      return [];
    }

    const numericObjectIds = objectIds.map((objectId) => Number(objectId));
    const chunks: number[][] = [];
    for (let index = 0; index < numericObjectIds.length; index += 500) {
      chunks.push(numericObjectIds.slice(index, index + 500));
    }

    const results = await Promise.all(
      chunks.map((chunk) =>
        trajectLayer.queryFeatures({
          objectIds: chunk,
          outFields: ["*"],
          returnGeometry: true,
        })
      )
    );

    return results
      .flatMap((result) => result.features)
      .map((feature) => toSpatialFeature(feature))
      .sort((left, right) => left.trajectCode.localeCompare(right.trajectCode, "nl"));
  }

  async createHeadlessMap(container: HTMLDivElement): Promise<HeadlessMapContext> {
    const trajectLayer = await this.createTrajectLayer();
    const sketchLayer = new GraphicsLayer({
      title: "Tijdelijke geometrie",
      listMode: "hide",
    });
    const map = new Map({
      basemap: createBasemapOptions()[0].basemap,
      layers: [trajectLayer, sketchLayer],
    });

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

    const layerListViewModel = new LayerListViewModel({
      view,
      listItemCreatedFunction: ({ item }) => {
        item.open = false;
      },
    });
    const legendViewModel = new LegendViewModel({ view });
    const sketchViewModel = new SketchViewModel({
      view,
      layer: sketchLayer,
      defaultUpdateOptions: {
        tool: "reshape",
        toggleToolOnClick: false,
      },
      snappingOptions: {
        enabled: true,
      },
    });

    return {
      map,
      view,
      trajectLayer,
      sketchLayer,
      sketchViewModel,
      layerListViewModel,
      legendViewModel,
      basemapOptions: createBasemapOptions(),
      statusOptions: await this.getStatusOptions(trajectLayer),
      modelTypeOptions: await this.getModelTypeOptions(trajectLayer),
    };
  }

  async queryGraphicByGlobalId(
    layer: FeatureLayer,
    globalId: string
  ): Promise<Graphic | null> {
    if (globalId.startsWith("oid:")) {
      const objectId = Number(globalId.slice(4));
      if (!Number.isFinite(objectId)) {
        return null;
      }

      const featureSet = await layer.queryFeatures({
        objectIds: [objectId],
        outFields: ["*"],
        returnGeometry: true,
      });

      return featureSet.features[0] ?? null;
    }

    const featureSet = await layer.queryFeatures({
      where: `guid='${globalId.replace(/'/g, "''")}'`,
      outFields: ["*"],
      returnGeometry: true,
    });

    return featureSet.features[0] ?? null;
  }

  async saveNewTraject(
    layer: FeatureLayer,
    geometry: Geometry,
    values: AttributeFormValues
  ): Promise<SpatialTrajectFeature> {
    if (!this.isTrajectLayerEditable(layer)) {
      throw new Error("Bewerken is niet ingeschakeld voor deze trajectlaag.");
    }

    const normalizedStatus = Number(values.status);
    const graphic = new Graphic({
      geometry,
      attributes: {
        traject_code: values.trajectCode,
        type_codering: layer.types?.[0]?.id ?? FALLBACK_MODEL_TYPES[0].value,
        status: normalizedStatus,
        opmerking: values.opmerking,
      },
    });

    const result = await layer.applyEdits({
      addFeatures: [graphic],
    });
    const addResult = result.addFeatureResults?.[0];
    const objectId = addResult?.objectId;

    if (addResult?.error) {
      throw new Error(addResult.error.message);
    }

    if (!objectId) {
      throw new Error("ArcGIS gaf geen objectId terug voor het nieuwe traject.");
    }

    const featureSet = await layer.queryFeatures({
      objectIds: [objectId],
      outFields: ["*"],
      returnGeometry: true,
    });
    const createdFeature = featureSet.features[0];

    if (!createdFeature) {
      throw new Error("Nieuw traject kon niet opnieuw worden opgehaald.");
    }

    layer.refresh();
    return toSpatialFeature(createdFeature);
  }

  async updateTraject(
    layer: FeatureLayer,
    feature: SpatialTrajectFeature,
    values: AttributeFormValues,
    geometry?: Geometry
  ): Promise<SpatialTrajectFeature> {
    if (!this.isTrajectLayerEditable(layer)) {
      throw new Error("Bewerken is niet ingeschakeld voor deze trajectlaag.");
    }

    const normalizedStatus = Number(values.status);
    const graphic = new Graphic({
      geometry,
      attributes: {
        OBJECTID: feature.objectId,
        traject_code: values.trajectCode,
        status: normalizedStatus,
        opmerking: values.opmerking,
      },
    });

    const result = await layer.applyEdits({
      updateFeatures: [graphic],
    });
    const updateResult = result.updateFeatureResults?.[0];

    if (updateResult?.error) {
      throw new Error(updateResult.error.message);
    }

    if (!updateResult?.objectId) {
      throw new Error("ArcGIS gaf geen bevestiging terug voor de statuswijziging.");
    }

    layer.refresh();
    const refreshedFeature = await this.queryGraphicByGlobalId(layer, feature.globalId);

    if (!refreshedFeature) {
      throw new Error("Bijgewerkt traject kon niet opnieuw worden opgehaald.");
    }

    return toSpatialFeature(refreshedFeature);
  }

  async deleteTraject(
    layer: FeatureLayer,
    feature: SpatialTrajectFeature
  ): Promise<void> {
    const result = await layer.applyEdits({
      deleteFeatures: [
        new Graphic({
          attributes: {
            OBJECTID: feature.objectId,
          },
        }),
      ],
    });
    const deleteResult = result.deleteFeatureResults?.[0];

    if (deleteResult?.error) {
      throw new Error(deleteResult.error.message);
    }

    if (!deleteResult?.objectId) {
      throw new Error("ArcGIS gaf geen bevestiging terug voor het verwijderen van het traject.");
    }

    layer.refresh();
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

  extractLegendItems(
    legendViewModel: LegendViewModel,
    options?: {
      rendererMode?: TrajectRendererMode;
      trajectLayerId?: string;
      statusOptions?: StatusOption[];
      modelTypeOptions?: ModelTypeOption[];
    }
  ): LegendItem[] {
    const sections = legendViewModel.activeLayerInfos
      .toArray()
      .map((layerInfo) => ({
        id: layerInfo.layer.uid,
        title: layerInfo.title ?? layerInfo.layer.title ?? "Laag",
        entries:
          layerInfo.legendElements
            ?.flatMap((legendElement) =>
              "infos" in legendElement && legendElement.infos
                ? legendElement.infos.map((info) => ({
                  label: info.label || layerInfo.title || layerInfo.layer.title || "Legenda",
                  color: extractColor(info.symbol),
                }))
                : []
            )
            .filter((entry) => entry.label) ?? [],
      }));

    if (!options?.trajectLayerId || !options.rendererMode) {
      return sections;
    }

    const nonTrajectSections = sections.filter((section) => section.id !== options.trajectLayerId);
    const trajectSection: LegendItem = {
      id: options.trajectLayerId,
      title: "Jaarplan Trajecten",
      entries:
        options.rendererMode === "status"
          ? (options.statusOptions ?? STATUS_OPTIONS).map((option) => ({
              label: option.label,
              color: option.color,
            }))
          : (options.modelTypeOptions ?? TYPE_CODERING_OPTIONS).map((option) => ({
              label: option.label,
              color: TYPE_CODERING_COLORS[option.value] ?? "#9298ad",
            })),
    };

    return [trajectSection, ...nonTrajectSections];
  }
}

export const arcgisTrajectService = new ArcgisTrajectService();

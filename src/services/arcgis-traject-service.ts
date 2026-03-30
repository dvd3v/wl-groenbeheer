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
} from "../types/app";
import { FALLBACK_MODEL_TYPES, STATUS_OPTIONS } from "../data/datamodel";

const FEATURE_LAYER_URL =
  import.meta.env.VITE_FEATURE_LAYER_URL?.trim() ||
  "https://services.arcgis.com/pCDwdQn0AhSP66VA/arcgis/rest/services/Jaarplan_Trajecten_2027/FeatureServer/0";

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
    field: "Status",
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

function toSpatialFeature(graphic: Graphic): SpatialTrajectFeature {
  return {
    objectId: Number(graphic.attributes.OBJECTID),
    globalId: String(graphic.attributes.GlobalID),
    hoofdobjec: String(
      graphic.attributes.hoofdobjec ?? graphic.attributes.hoofdobject ?? ""
    ),
    modelType: String(graphic.attributes.model_type ?? ""),
    status: Number(graphic.attributes.Status ?? 1),
    opmerking: String(graphic.attributes.Opmerking ?? ""),
    shapeArea:
      typeof graphic.attributes.Shape__Area === "number"
        ? graphic.attributes.Shape__Area
        : null,
    shapeLength:
      typeof graphic.attributes.Shape__Length === "number"
        ? graphic.attributes.Shape__Length
        : null,
    creator: String(graphic.attributes.Creator ?? ""),
    creationDate:
      typeof graphic.attributes.CreationDate === "number"
        ? graphic.attributes.CreationDate
        : null,
    editor: String(graphic.attributes.Editor ?? ""),
    editDate:
      typeof graphic.attributes.EditDate === "number"
        ? graphic.attributes.EditDate
        : null,
    geometry: graphic.geometry ?? null,
  };
}

export class ArcgisTrajectService {
  async createTrajectLayer(): Promise<FeatureLayer> {
    const layer = new FeatureLayer({
      url: FEATURE_LAYER_URL,
      outFields: ["*"],
      title: "Jaarplan Trajecten 2027",
      renderer: createStatusRenderer(),
    });

    await layer.load();
    return layer;
  }

  async getStatusOptions(layer?: FeatureLayer): Promise<StatusOption[]> {
    const candidateLayer = layer ?? (await this.createTrajectLayer());
    const statusField = candidateLayer.fields.find((field) => field.name === "Status");
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
    const typeOptions = candidateLayer.types
      ?.map((typeInfo) => {
        const value = String(typeInfo.id ?? "").trim();
        const label = String(typeInfo.name ?? value).trim();
        return value ? { value, label } : null;
      })
      .filter(Boolean) as ModelTypeOption[] | undefined;

    return typeOptions?.length ? typeOptions : FALLBACK_MODEL_TYPES;
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
      .sort((left, right) => left.hoofdobjec.localeCompare(right.hoofdobjec, "nl"));
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
    const featureSet = await layer.queryFeatures({
      where: `GlobalID='${globalId.replace(/'/g, "''")}'`,
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
    const normalizedStatus = Number(values.status);
    const graphic = new Graphic({
      geometry,
      attributes: {
        hoofdobjec: values.hoofdobjec,
        model_type: layer.types?.[0]?.id ?? FALLBACK_MODEL_TYPES[0].value,
        Status: normalizedStatus,
        Opmerking: values.opmerking,
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
    const normalizedStatus = Number(values.status);
    const graphic = new Graphic({
      geometry,
      attributes: {
        OBJECTID: feature.objectId,
        hoofdobjec: values.hoofdobjec,
        Status: normalizedStatus,
        Opmerking: values.opmerking,
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

  extractLegendItems(legendViewModel: LegendViewModel): LegendItem[] {
    return legendViewModel.activeLayerInfos.toArray().map((layerInfo) => ({
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
  }
}

export const arcgisTrajectService = new ArcgisTrajectService();

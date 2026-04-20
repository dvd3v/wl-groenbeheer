import Basemap from "@arcgis/core/Basemap.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import WMTSLayer from "@arcgis/core/layers/WMTSLayer.js";
import WMSLayer from "@arcgis/core/layers/WMSLayer.js";

export interface BasemapOption {
  id: string;
  label: string;
  basemap: Basemap;
}

const GISIB_BOR_MAPSERVER_URL =
  "https://utility.arcgis.com/usrsvcs/servers/73fc6147aa1d457fa19f50598a9e1001/rest/services/Groenbeheer/GISIB_BOR/MapServer";
const PDOK_LUCHTFOTO_WMS_URL = "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0";
const PDOK_BGT_WMTS_URL = "https://service.pdok.nl/lv/bgt/wmts/v1_0";

export const GISIB_BOR_LAYER_DEFINITIONS = [
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

export function createBasemapOptions(): BasemapOption[] {
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

export function createBorObjectGroupLayer(): GroupLayer {
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

  return groupLayer;
}

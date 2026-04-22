import type Geometry from "@arcgis/core/geometry/Geometry.js";
import type Polygon from "@arcgis/core/geometry/Polygon.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import type { GeometryWithoutMeshUnion } from "@arcgis/core/geometry/types.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import type { SpatialTrajectFeature } from "../types/app";

const OVERLAP_AREA_EPSILON_SQM = 0.05;

export type TrajectNeighbourRelation = "overlap" | "contains" | "within" | "adjacent";

export interface TrajectNeighbourSummary {
  globalId: string;
  objectId: number;
  trajectCode: string;
  relation: TrajectNeighbourRelation;
  overlapAreaSqm: number;
  geometry: GeometryWithoutMeshUnion | null;
}

export interface TrajectReviewSummary {
  areaSqm: number | null;
  compactness: number | null;
  effectiveWidthM: number | null;
  objectDensityPerHectare: number | null;
  overlaps: TrajectNeighbourSummary[];
  adjacentTrajects: TrajectNeighbourSummary[];
}

export interface BuildTrajectReviewInput {
  trajectLayer: FeatureLayer;
  geometry: GeometryWithoutMeshUnion;
  selectedGlobalId?: string | null;
  referenceTraject?: SpatialTrajectFeature | null;
}

function toTrajectGlobalId(attributes: Record<string, unknown>): string {
  const guid = String(attributes.guid ?? "").trim();
  if (guid) {
    return guid;
  }

  const objectId = Number(attributes.OBJECTID);
  return Number.isFinite(objectId) ? `oid:${objectId}` : "";
}

function toTrajectCode(attributes: Record<string, unknown>, objectId: number): string {
  const code = String(attributes.traject_code ?? "").trim();
  return code || `Traject ${objectId}`;
}

function normalizeIntersectResult(
  result: Geometry | Geometry[] | null | undefined
): GeometryWithoutMeshUnion | null {
  if (!result) {
    return null;
  }

  return (Array.isArray(result) ? result[0] ?? null : result) as GeometryWithoutMeshUnion | null;
}

function getPolygonAreaSqm(geometry: Geometry | null | undefined): number | null {
  if (!geometry || geometry.type !== "polygon") {
    return null;
  }

  return geometryEngine.planarArea(geometry as Polygon, "square-meters");
}

async function queryFeaturesByObjectIds(
  layer: FeatureLayer,
  objectIds: number[]
): Promise<Graphic[]> {
  if (!objectIds.length) {
    return [];
  }

  const chunks: number[][] = [];
  for (let index = 0; index < objectIds.length; index += 250) {
    chunks.push(objectIds.slice(index, index + 250));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      layer.queryFeatures({
        objectIds: chunk,
        outFields: ["*"],
        returnGeometry: true,
      })
    )
  );

  return results.flatMap((result) => result.features);
}

async function queryNearbyTrajects(
  layer: FeatureLayer,
  geometry: GeometryWithoutMeshUnion
): Promise<Graphic[]> {
  await layer.load();

  const objectIds =
    (await layer.queryObjectIds({
      geometry,
      where: "1=1",
      spatialRelationship: "intersects",
    })) ?? [];

  return queryFeaturesByObjectIds(
    layer,
    objectIds.map((objectId) => Number(objectId)).filter((objectId) => Number.isFinite(objectId))
  );
}

function toNeighbourSummary(graphic: Graphic, relation: TrajectNeighbourRelation, overlapAreaSqm = 0) {
  const attributes = graphic.attributes as Record<string, unknown>;
  const objectId = Number(attributes.OBJECTID ?? 0);

  return {
    globalId: toTrajectGlobalId(attributes),
    objectId,
    trajectCode: toTrajectCode(attributes, objectId),
    relation,
    overlapAreaSqm,
    geometry: null,
  } satisfies TrajectNeighbourSummary;
}

export function createTrajectSelectionGraphics(
  geometry: GeometryWithoutMeshUnion,
  options?: { mode?: "selected" | "draft" }
): Graphic[] {
  const mode = options?.mode ?? "selected";

  if (mode === "draft") {
    return [
      new Graphic({
        geometry,
        symbol: new SimpleFillSymbol({
          color: [255, 255, 255, 0.03],
          outline: new SimpleLineSymbol({
            color: [255, 255, 255, 0.95],
            width: 8,
            style: "solid",
          }),
        }),
      }),
      new Graphic({
        geometry,
        symbol: new SimpleFillSymbol({
          color: [217, 119, 6, 0.08],
          outline: new SimpleLineSymbol({
            color: [217, 119, 6, 1],
            width: 3.6,
            style: "solid",
          }),
        }),
      }),
    ];
  }

  return [
    new Graphic({
      geometry,
      symbol: new SimpleFillSymbol({
        color: [14, 116, 144, 0.015],
        outline: new SimpleLineSymbol({
          color: [15, 23, 42, 0.5],
          width: 11,
          style: "solid",
        }),
      }),
    }),
    new Graphic({
      geometry,
      symbol: new SimpleFillSymbol({
        color: [14, 116, 144, 0],
        outline: new SimpleLineSymbol({
          color: [255, 255, 255, 0.98],
          width: 7.5,
          style: "solid",
        }),
      }),
    }),
    new Graphic({
      geometry,
      symbol: new SimpleFillSymbol({
        color: [14, 116, 144, 0],
        outline: new SimpleLineSymbol({
          color: [14, 116, 144, 1],
          width: 3.2,
          style: "solid",
        }),
      }),
    }),
  ];
}

export function createOverlapDiagnosticsGraphics(review: TrajectReviewSummary): Graphic[] {
  return review.overlaps
    .filter((overlap) => overlap.overlapAreaSqm > OVERLAP_AREA_EPSILON_SQM && overlap.geometry)
    .map(
      (overlap) =>
        new Graphic({
          geometry: overlap.geometry!,
          symbol: new SimpleFillSymbol({
            color: [220, 38, 38, 0.16],
            outline: new SimpleLineSymbol({
              color: [220, 38, 38, 0.95],
              width: 2.6,
              style: "dash",
            }),
          }),
          attributes: {
            trajectCode: overlap.trajectCode,
            relation: overlap.relation,
          },
        })
    );
}

export async function buildTrajectReview(
  input: BuildTrajectReviewInput
): Promise<TrajectReviewSummary> {
  const { trajectLayer, geometry, selectedGlobalId = null, referenceTraject = null } = input;

  const areaSqm = getPolygonAreaSqm(geometry);
  const perimeterM =
    geometry.type === "polygon" || geometry.type === "polyline"
      ? geometryEngine.planarLength(geometry, "meters")
      : null;
  const compactness =
    areaSqm && perimeterM && perimeterM > 0
      ? (4 * Math.PI * areaSqm) / (perimeterM * perimeterM)
      : null;
  const effectiveWidthM =
    areaSqm && perimeterM && perimeterM > 0 ? (2 * areaSqm) / perimeterM : null;
  const fallbackDensity =
    referenceTraject?.objectCount !== null &&
    referenceTraject?.objectCount !== undefined &&
    areaSqm &&
    areaSqm > 0
      ? referenceTraject.objectCount / (areaSqm / 10000)
      : null;
  const objectDensityPerHectare = fallbackDensity;

  const nearbyTrajects = await queryNearbyTrajects(trajectLayer, geometry);
  const overlaps: TrajectNeighbourSummary[] = [];
  const adjacentTrajects: TrajectNeighbourSummary[] = [];

  nearbyTrajects.forEach((candidate) => {
    if (!candidate.geometry) {
      return;
    }

    const candidateGeometry = candidate.geometry as GeometryWithoutMeshUnion;
    const attributes = candidate.attributes as Record<string, unknown>;
    const candidateGlobalId = toTrajectGlobalId(attributes);
    if (selectedGlobalId && candidateGlobalId === selectedGlobalId) {
      return;
    }

    if (geometryEngine.touches(geometry, candidateGeometry)) {
      adjacentTrajects.push(toNeighbourSummary(candidate, "adjacent"));
      return;
    }

    const overlapGeometry = normalizeIntersectResult(
      geometryEngine.intersect(geometry, candidateGeometry)
    );
    const overlapAreaSqm = getPolygonAreaSqm(overlapGeometry) ?? 0;

    if (overlapAreaSqm <= OVERLAP_AREA_EPSILON_SQM) {
      return;
    }

    const relation: TrajectNeighbourRelation = geometryEngine.contains(geometry, candidateGeometry)
      ? "contains"
      : geometryEngine.within(geometry, candidateGeometry)
        ? "within"
        : "overlap";

    overlaps.push({
      ...toNeighbourSummary(candidate, relation, overlapAreaSqm),
      geometry: overlapGeometry,
    });
  });

  return {
    areaSqm,
    compactness,
    effectiveWidthM,
    objectDensityPerHectare,
    overlaps: overlaps.sort(
      (left, right) =>
        right.overlapAreaSqm - left.overlapAreaSqm ||
        left.trajectCode.localeCompare(right.trajectCode, "nl")
    ),
    adjacentTrajects: adjacentTrajects.sort((left, right) =>
      left.trajectCode.localeCompare(right.trajectCode, "nl")
    ),
  };
}

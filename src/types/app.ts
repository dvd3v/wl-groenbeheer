import type Geometry from "@arcgis/core/geometry/Geometry.js";

export type EditingMode = "idle" | "create" | "reshape" | "attributes";
export type MapSelectionSource = "map" | "table" | null;
export type PlanningRegistrationStatus =
  | "gepland"
  | "in_uitvoering"
  | "uitgevoerd"
  | "afgekeurd";
export type WorkSide = "L" | "R" | "Beide" | "N.v.t.";

export interface StatusOption {
  value: number;
  label: string;
  color: string;
}

export interface ModelTypeOption {
  value: string;
  label: string;
}

export interface WorkPeriodOption {
  value: string;
  shortLabel: string;
  label: string;
}

export interface DescribedDomainOption {
  value: string;
  description: string;
}

export interface RegimeTemplateDefinition {
  regime: number;
  werkzaamheid: string;
  toelichting: string;
  bewerkingspercentage?: string;
  afvoeren?: string;
  werkperiodeCode?: string;
  werkperiodeLabel?: string;
}

export interface SpatialTrajectFeature {
  objectId: number;
  globalId: string;
  hoofdobjec: string;
  modelType: string;
  status: number;
  opmerking: string;
  shapeArea: number | null;
  shapeLength: number | null;
  creator: string;
  creationDate: number | null;
  editor: string;
  editDate: number | null;
  geometry: Geometry | null;
}

export interface TrajectRecord extends SpatialTrajectFeature {}

export interface PendingGeometryEdits {
  mode: "create" | "reshape";
  geometry: Geometry;
}

export interface LayerToggleItem {
  id: string;
  title: string;
  visible: boolean;
  type: string;
}

export interface LegendEntry {
  label: string;
  color: string | null;
}

export interface LegendItem {
  id: string;
  title: string;
  entries: LegendEntry[];
}

export interface PlanningWorkDefinition {
  workId: string;
  trajectGlobalId: string;
  trajectLabel: string;
  trajectCode: string;
  regime: number;
  werkzaamheid: string;
  toelichting: string;
  doel: string;
  zijde: WorkSide;
  bewerkingspercentage: string;
  afvoeren: string;
  werkperiodeCode: string;
  werkperiodeLabel: string;
}

export interface PlanningRegistration {
  workId: string;
  status: PlanningRegistrationStatus;
  datumGepland: string;
  datumUitgevoerd: string;
  opmerking: string;
}

export interface PlannedWorkItem extends PlanningWorkDefinition, PlanningRegistration {}

export interface PlanningWorkCreateInput {
  regime: number;
  werkzaamheid: string;
  toelichting: string;
  doel: string;
  zijde: WorkSide;
  bewerkingspercentage: string;
  afvoeren: string;
  werkperiodeCode: string;
  status?: PlanningRegistrationStatus;
  datumGepland?: string;
  datumUitgevoerd?: string;
  opmerking?: string;
}

export interface DatamodelFieldDefinition {
  name: string;
  label: string;
  type: string;
  description: string;
  status?: string;
  defaultValue?: string;
  domain?: string[];
}

export interface DatamodelSection {
  id: string;
  title: string;
  subtitle: string;
  tone: "accent" | "blue" | "violet";
  fields: DatamodelFieldDefinition[];
}

export interface MapViewState {
  centerX: number;
  centerY: number;
  zoom: number;
  scale: number;
  rotation: number;
  spatialReferenceWkid?: number;
}

export interface JaarplanFilters {
  trajectStatus: "all" | string;
  planningStatus: "all" | PlanningRegistrationStatus;
  werkzaamheid: "all" | string;
  werkperiode: "all" | string;
  search: string;
}

export interface AttributeFormValues {
  hoofdobjec: string;
  status: number;
  opmerking: string;
}

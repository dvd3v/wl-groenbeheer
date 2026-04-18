import type Geometry from "@arcgis/core/geometry/Geometry.js";

export type EditingMode = "idle" | "create" | "reshape" | "attributes";
export type MapSelectionSource = "map" | "table" | null;
export type TrajectRendererMode = "status" | "type_codering";
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
  guid: string;
  trajectCode: string;
  typeCodering: string;
  objectCount: number | null;
  bronlagen: string;
  status: number;
  opmerking: string;
  shapeArea: number | null;
  shapeLength: number | null;
  geometry: Geometry | null;
}

export interface TrajectRecord extends SpatialTrajectFeature {}

export interface BorFeatureSelection {
  layerId: string;
  layerTitle: string;
  displayTitle: string;
  attributes: Array<{
    key: string;
    label: string;
    value: string;
  }>;
}

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

export interface SharedJaarplanFilters {
  search: string;
  trajectCode: string;
  uitvoerderOnderhoud: string;
  regime: string;
  werkzaamheid: string;
  werkperiode: string;
  zijde: string;
  afvoeren: string;
  signal: string;
  statusMaatregel: string;
  datumGepland: string;
  datumUitgevoerd: string;
  steekproefStatus: string;
  hasMeasuresOnly: boolean;
}

export interface AttributeFormValues {
  trajectCode: string;
  status: number;
  opmerking: string;
}

export interface JaarplanTrajectRecord {
  objectId: number;
  globalId: string;
  guid: string;
  trajectCode: string;
  uitvoerderOnderhoud: string;
  geometry: Geometry | null;
}

export interface JaarplanDomainOption {
  value: string;
  label: string;
  rawValue: string | number;
}

export interface JaarplanSubtypeConfig {
  regimeValue: string;
  regimeLabel: string;
  werkzaamhedenOptions: JaarplanDomainOption[];
  toelichtingOptions: JaarplanDomainOption[];
  defaultWerkzaamheidValue: string | null;
  defaultToelichtingValue: string | null;
}

export interface JaarplanMetadata {
  editable: boolean;
  relationshipId: number | null;
  regimeOptions: JaarplanDomainOption[];
  subtypeField: string | null;
  regimeFieldName: string;
  werkzaamhedenFieldName: string;
  toelichtingFieldName: string;
  werkperiodeVanFieldName: string;
  werkperiodeTotFieldName: string;
  zijdeFieldName: string;
  afvoerenFieldName: string;
  soortspecifiekeMaatFieldName: string;
  locatiebezoekFieldName: string;
  subtypeConfigsByRegime: Record<string, JaarplanSubtypeConfig>;
  werkperiodeOptions: JaarplanDomainOption[];
  zijdeOptions: JaarplanDomainOption[];
  afvoerenOptions: JaarplanDomainOption[];
  jaNeeOptions: JaarplanDomainOption[];
  uitvoerderOptions: JaarplanDomainOption[];
}

export type SteekproefStatus =
  | "niet_beoordeeld"
  | "ingepland"
  | "goedgekeurd"
  | "afgekeurd";

export type MaatregelStatus =
  | "geen_status"
  | "gepland"
  | "uitgevoerd"
  | "deels_uitgevoerd"
  | "niet_uitgevoerd";

export interface JaarplanLocalFields {
  statusMaatregel: MaatregelStatus;
  datumGepland: string;
  datumUitgevoerd: string;
  steekproefStatus: SteekproefStatus;
  redenNietUitgevoerd: string;
  foto: string;
  opmerking: string;
}

export interface JaarplanMeasureRecord extends JaarplanLocalFields {
  objectId: number;
  globalId: string;
  trajectGuid: string;
  trajectGlobalId: string;
  trajectCode: string;
  regimeValue: string;
  regimeLabel: string;
  regimeNumber: number | null;
  werkzaamhedenValue: string;
  werkzaamheidLabel: string;
  toelichtingValue: string;
  toelichtingLabel: string;
  werkperiodeVanValue: string;
  werkperiodeVanLabel: string;
  werkperiodeTotValue: string;
  werkperiodeTotLabel: string;
  zijdeValue: string;
  zijdeLabel: string;
  afvoerenValue: string;
  afvoerenLabel: string;
  soortspecifiekeMaatValue: string;
  soortspecifiekeMaatLabel: string;
  soortspecifiekeMaat: boolean;
  locatiebezoekValue: string;
  locatiebezoekLabel: string;
  locatiebezoek: boolean;
}

export interface JaarplanMeasureServerInput {
  trajectGuid: string;
  trajectGlobalId: string;
  regimeValue: string;
  werkzaamhedenValue: string;
  toelichtingValue: string;
  werkperiodeVanValue: string;
  werkperiodeTotValue: string;
  zijdeValue: string;
  afvoerenValue: string;
  soortspecifiekeMaatValue: string;
  locatiebezoekValue: string;
}

export interface JaarplanMeasureFormValues extends JaarplanMeasureServerInput, JaarplanLocalFields {}

export interface JaarplanMapViewState extends MapViewState {}

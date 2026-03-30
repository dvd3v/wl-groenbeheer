import {
  PLANNING_STATUS_COLORS,
  REGIME_TEMPLATE_LIBRARY,
  WERKZAAMHEDEN_SCHEMA,
  WORK_PERIOD_OPTIONS,
  getWorkPeriodOption,
} from "../data/datamodel";
import type {
  PlannedWorkItem,
  PlanningWorkCreateInput,
  PlanningWorkDefinition,
  PlanningRegistration,
  PlanningRegistrationStatus,
  SpatialTrajectFeature,
  WorkSide,
} from "../types/app";

const STORAGE_KEY = "wl-groenbeheer.planning-registraties.v2";
const CUSTOM_WORKS_KEY = "wl-groenbeheer.planning-custom-works.v1";
const DEFAULT_REGISTRATION = {
  status: "gepland" as PlanningRegistrationStatus,
  datumGepland: "",
  datumUitgevoerd: "",
  opmerking: "",
};

interface SeededPlanningDefinition {
  definition: PlanningWorkDefinition;
  registration: Omit<PlanningRegistration, "workId">;
}

type StoredPlanningRegistration = Partial<Omit<PlanningRegistration, "workId">>;
type StoredCustomPlanningDefinition = PlanningWorkDefinition;

let volatileStorage: Record<string, StoredPlanningRegistration> = {};
let volatileCustomWorks: Record<string, StoredCustomPlanningDefinition> = {};

function createDefaultRegistration(
  workId: string,
  seedRegistration?: Partial<Omit<PlanningRegistration, "workId">>
): PlanningRegistration {
  return {
    workId,
    ...DEFAULT_REGISTRATION,
    ...seedRegistration,
  };
}

function toStoredRegistration(
  registration: Omit<PlanningRegistration, "workId">
): StoredPlanningRegistration {
  const stored: StoredPlanningRegistration = {};

  if (registration.status !== DEFAULT_REGISTRATION.status) {
    stored.status = registration.status;
  }
  if (registration.datumGepland !== DEFAULT_REGISTRATION.datumGepland) {
    stored.datumGepland = registration.datumGepland;
  }
  if (registration.datumUitgevoerd !== DEFAULT_REGISTRATION.datumUitgevoerd) {
    stored.datumUitgevoerd = registration.datumUitgevoerd;
  }
  if (registration.opmerking !== DEFAULT_REGISTRATION.opmerking) {
    stored.opmerking = registration.opmerking;
  }

  return stored;
}

function materializeRegistration(
  workId: string,
  stored?: StoredPlanningRegistration | null,
  seedRegistration?: Partial<Omit<PlanningRegistration, "workId">>
): PlanningRegistration {
  return {
    ...createDefaultRegistration(workId, seedRegistration),
    status: stored?.status ?? seedRegistration?.status ?? DEFAULT_REGISTRATION.status,
    datumGepland:
      stored?.datumGepland ?? seedRegistration?.datumGepland ?? DEFAULT_REGISTRATION.datumGepland,
    datumUitgevoerd:
      stored?.datumUitgevoerd ??
      seedRegistration?.datumUitgevoerd ??
      DEFAULT_REGISTRATION.datumUitgevoerd,
    opmerking: stored?.opmerking ?? seedRegistration?.opmerking ?? DEFAULT_REGISTRATION.opmerking,
  };
}

function readStorage(): Record<string, StoredPlanningRegistration> {
  if (typeof window === "undefined") {
    return { ...volatileStorage };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...volatileStorage };
  }

  try {
    return {
      ...(JSON.parse(raw) as Record<string, StoredPlanningRegistration>),
      ...volatileStorage,
    };
  } catch {
    return { ...volatileStorage };
  }
}

function readCustomWorks(): Record<string, StoredCustomPlanningDefinition> {
  if (typeof window === "undefined") {
    return { ...volatileCustomWorks };
  }

  const raw = window.localStorage.getItem(CUSTOM_WORKS_KEY);
  if (!raw) {
    return { ...volatileCustomWorks };
  }

  try {
    return {
      ...(JSON.parse(raw) as Record<string, StoredCustomPlanningDefinition>),
      ...volatileCustomWorks,
    };
  } catch {
    return { ...volatileCustomWorks };
  }
}

function writeStorage(records: Record<string, StoredPlanningRegistration>): void {
  const compacted = Object.fromEntries(
    Object.entries(records).filter(([, value]) => Object.keys(value).length > 0)
  );

  if (typeof window === "undefined") {
    volatileStorage = compacted;
    return;
  }

  volatileStorage = compacted;

  try {
    if (!Object.keys(compacted).length) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
  } catch (error) {
    console.warn("Planningregistraties konden niet volledig in localStorage worden bewaard.", error);
  }
}

function writeCustomWorks(records: Record<string, StoredCustomPlanningDefinition>): void {
  if (typeof window === "undefined") {
    volatileCustomWorks = records;
    return;
  }

  volatileCustomWorks = records;

  try {
    if (!Object.keys(records).length) {
      window.localStorage.removeItem(CUSTOM_WORKS_KEY);
      return;
    }

    window.localStorage.setItem(CUSTOM_WORKS_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn("Aangepaste werkzaamheden konden niet volledig in localStorage worden bewaard.", error);
  }
}

function hash(input: string): number {
  return Array.from(input).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function deriveTrajectCode(traject: SpatialTrajectFeature): string {
  return traject.trajectCode || `Traject ${traject.objectId}`;
}

function deriveDoel(werkzaamheid: string, typeCodering: string): string {
  const value = werkzaamheid.toLowerCase();

  if (value.includes("boom") || value.includes("knot") || value.includes("kandel")) {
    return "Boom";
  }
  if (value.includes("haag")) {
    return "Haag";
  }
  if (value.includes("houtsingel")) {
    return "Houtsingel";
  }
  if (value.includes("struweel")) {
    return "Struweel";
  }
  if (value.includes("bos")) {
    return "Bosplantsoen";
  }
  if (value.includes("poel")) {
    return "Natte Bodem";
  }
  if (value.includes("vispassage")) {
    return "Uitstroom Voorziening";
  }
  if (value.includes("asset") || value.includes("hekwerk") || value.includes("scheiding")) {
    return "Hekwerk";
  }
  if (value.includes("verhardingsobject")) {
    return "Verharding";
  }
  if (value.includes("waterkering")) {
    return "Kruin";
  }
  if (value.includes("regenwaterbuffer")) {
    return "Bodem";
  }
  if (value.includes("watergang")) {
    return typeCodering.includes("Waterkering") ? "Talud" : "Bodem";
  }
  if (value.includes("maaien")) {
    return typeCodering.includes("Netwerk") ? "Wegberm" : "Talud";
  }

  return "";
}

function deriveZijde(werkzaamheid: string, typeCodering: string, regime: number): WorkSide {
  const value = werkzaamheid.toLowerCase();

  if (
    value.includes("asset") ||
    value.includes("hekwerk") ||
    value.includes("poel") ||
    value.includes("vispassage") ||
    value.includes("boom") ||
    value.includes("haag") ||
    value.includes("bos") ||
    value.includes("struweel") ||
    value.includes("houtsingel") ||
    value.includes("verhardingsobject") ||
    value.includes("vervangingswerk")
  ) {
    return "N.v.t.";
  }

  if (value.includes("habitatbenadering")) {
    return regime % 2 === 0 ? "L" : "R";
  }

  if (value.includes("maaien")) {
    if (typeCodering.includes("Waterkering")) {
      return regime % 2 === 0 ? "L" : "R";
    }
    return "Beide";
  }

  return "N.v.t.";
}

function deriveBewerkingspercentage(werkzaamheid: string, templateValue?: string): string {
  if (templateValue?.trim()) {
    return templateValue.trim();
  }

  const value = werkzaamheid.toLowerCase();
  if (value.includes("maaien") || value.includes("begrazen")) {
    return "75%";
  }
  if (value.includes("scheren")) {
    return "100%";
  }
  return "N.v.t.";
}

function deriveAfvoeren(werkzaamheid: string, templateValue?: string): string {
  if (templateValue?.trim()) {
    return templateValue.trim();
  }

  const value = werkzaamheid.toLowerCase();
  if (value.includes("maaien") || value.includes("vrijmaaien") || value.includes("opschonen")) {
    return "Nee";
  }
  return "N.v.t.";
}

function resolveWorkPeriod(
  workIdSeed: number,
  templateCode?: string,
  templateLabel?: string
): { code: string; label: string } {
  if (templateCode && templateLabel) {
    return { code: templateCode, label: templateLabel };
  }

  const fallback = WORK_PERIOD_OPTIONS[workIdSeed % WORK_PERIOD_OPTIONS.length];
  return { code: fallback.value, label: fallback.label };
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function workPeriodToDate(workPeriodCode: string, offsetDays: number): string {
  const option = getWorkPeriodOption(workPeriodCode);
  const periodIndex = option ? Number(option.value) - 1 : 0;
  const startOfYear = new Date(Date.UTC(2026, 0, 5));
  startOfYear.setUTCDate(startOfYear.getUTCDate() + periodIndex * 14 + offsetDays);
  return formatIsoDate(startOfYear);
}

function createSeedRegistration(
  index: number,
  workPeriodCode: string,
  baseHash: number
): Omit<PlanningRegistration, "workId"> {
  const statusCycle: PlanningRegistrationStatus[] = [
    "gepland",
    "in_uitvoering",
    "uitgevoerd",
    "gepland",
  ];
  const status = statusCycle[(baseHash + index) % statusCycle.length];
  const datumGepland = workPeriodToDate(workPeriodCode, (index % 3) + 1);
  const datumUitgevoerd =
    status === "uitgevoerd" ? workPeriodToDate(workPeriodCode, (index % 3) + 5) : "";
  const opmerking =
    status === "uitgevoerd"
      ? "Dummy registratie in mock related table."
      : status === "in_uitvoering"
        ? "Werk is gestart en loopt mee in de proefplanning."
        : "";

  return {
    status,
    datumGepland,
    datumUitgevoerd,
    opmerking,
  };
}

function createWorkId(trajectGlobalId: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return `${trajectGlobalId}-C${randomPart}`;
}

function selectTemplates(baseHash: number) {
  const selectedIndexes: number[] = [];
  const step = 7;
  let candidate = baseHash % REGIME_TEMPLATE_LIBRARY.length;

  while (selectedIndexes.length < 4) {
    if (!selectedIndexes.includes(candidate)) {
      selectedIndexes.push(candidate);
    }
    candidate = (candidate + step) % REGIME_TEMPLATE_LIBRARY.length;
  }

  return selectedIndexes.map((index) => REGIME_TEMPLATE_LIBRARY[index]);
}

function buildSeedDefinitions(traject: SpatialTrajectFeature): SeededPlanningDefinition[] {
  const baseHash = hash(traject.globalId);
  const trajectCode = deriveTrajectCode(traject);

  return selectTemplates(baseHash).map((template, index) => {
    const { code, label } = resolveWorkPeriod(
      baseHash + index,
      template.werkperiodeCode,
      template.werkperiodeLabel
    );
    const werkzaamheid = template.werkzaamheid;
    const workId = `${traject.globalId}-R${template.regime}`;

    return {
      definition: {
        workId,
        trajectGlobalId: traject.globalId,
        trajectLabel: traject.trajectCode || `Traject ${traject.objectId}`,
        trajectCode,
        regime: template.regime,
        werkzaamheid,
        toelichting: template.toelichting,
        doel: deriveDoel(werkzaamheid, traject.typeCodering),
        zijde: deriveZijde(werkzaamheid, traject.typeCodering, template.regime),
        bewerkingspercentage: deriveBewerkingspercentage(
          werkzaamheid,
          template.bewerkingspercentage
        ),
        afvoeren: deriveAfvoeren(werkzaamheid, template.afvoeren),
        werkperiodeCode: code,
        werkperiodeLabel: label,
      },
      registration: createSeedRegistration(index, code, baseHash),
    };
  });
}

function ensureRegistration(
  workId: string,
  storage: Record<string, StoredPlanningRegistration>,
  seedRegistration?: Partial<Omit<PlanningRegistration, "workId">>
): PlanningRegistration {
  return materializeRegistration(workId, storage[workId], seedRegistration);
}

export class MockPlanningService {
  async getAll(seedTrajecten: SpatialTrajectFeature[]): Promise<PlannedWorkItem[]> {
    const storage = readStorage();
    const customWorks = Object.values(readCustomWorks());
    const seededItems = seedTrajecten.flatMap((traject) =>
      buildSeedDefinitions(traject).map(({ definition, registration }) => {
        const persisted = ensureRegistration(definition.workId, storage, registration);
        return {
          ...definition,
          ...persisted,
        };
      })
    );
    const customItems = customWorks.map((definition) => ({
      ...definition,
      ...ensureRegistration(definition.workId, storage),
    }));

    return [...seededItems, ...customItems];
  }

  async createWorkItem(
    traject: SpatialTrajectFeature,
    input: PlanningWorkCreateInput
  ): Promise<PlannedWorkItem> {
    const workId = createWorkId(traject.globalId);
    const workPeriod =
      getWorkPeriodOption(input.werkperiodeCode) ??
      WORK_PERIOD_OPTIONS.find((option) => option.value === "1")!;
    const definition: PlanningWorkDefinition = {
      workId,
      trajectGlobalId: traject.globalId,
      trajectLabel: traject.trajectCode || `Traject ${traject.objectId}`,
      trajectCode: deriveTrajectCode(traject),
      regime: input.regime,
      werkzaamheid: input.werkzaamheid,
      toelichting: input.toelichting,
      doel: input.doel,
      zijde: input.zijde,
      bewerkingspercentage: input.bewerkingspercentage,
      afvoeren: input.afvoeren,
      werkperiodeCode: workPeriod.value,
      werkperiodeLabel: workPeriod.label,
    };

    const customWorks = readCustomWorks();
    customWorks[workId] = definition;
    writeCustomWorks(customWorks);

    const registration = await this.saveRegistration(workId, {
      status: input.status ?? "gepland",
      datumGepland: input.datumGepland ?? "",
      datumUitgevoerd: input.datumUitgevoerd ?? "",
      opmerking: input.opmerking ?? "",
    });

    return {
      ...definition,
      ...registration,
    };
  }

  async saveRegistration(
    workId: string,
    updates: Omit<PlanningRegistration, "workId"> | Partial<Omit<PlanningRegistration, "workId">>
  ): Promise<PlanningRegistration> {
    const storage = readStorage();
    const next = {
      ...ensureRegistration(workId, storage),
      ...updates,
      workId,
    };
    storage[workId] = toStoredRegistration({
      status: next.status,
      datumGepland: next.datumGepland,
      datumUitgevoerd: next.datumUitgevoerd,
      opmerking: next.opmerking,
    });
    writeStorage(storage);
    return next;
  }

  getAggregateTrajectPlanningStatus(
    items: PlannedWorkItem[],
    trajectGlobalId: string
  ): PlanningRegistrationStatus {
    const matches = items.filter((item) => item.trajectGlobalId === trajectGlobalId);
    if (!matches.length) {
      return "gepland";
    }

    const statuses = matches.map((item) => item.status);
    if (statuses.some((status) => status === "afgekeurd")) {
      return "afgekeurd";
    }
    if (statuses.every((status) => status === "uitgevoerd")) {
      return "uitgevoerd";
    }
    if (statuses.some((status) => status === "in_uitvoering" || status === "uitgevoerd")) {
      return "in_uitvoering";
    }
    return "gepland";
  }

  getStatusColor(status: PlanningRegistrationStatus): string {
    return PLANNING_STATUS_COLORS[status];
  }
}

export const mockPlanningService = new MockPlanningService();

export const planningSchema = WERKZAAMHEDEN_SCHEMA;

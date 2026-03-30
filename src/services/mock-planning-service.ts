import {
  PLANNING_STATUS_COLORS,
  WERKZAAMHEDEN_SCHEMA,
} from "../data/datamodel";
import type {
  PlannedWorkItem,
  PlanningRegistration,
  PlanningRegistrationStatus,
  SpatialTrajectFeature,
} from "../types/app";

const STORAGE_KEY = "wl-groenbeheer.planning-registraties.v1";
const DEFAULT_REGISTRATION = {
  status: "gepland" as PlanningRegistrationStatus,
  datumGepland: "",
  datumUitgevoerd: "",
  opmerking: "",
};

type StoredPlanningRegistration = Partial<Omit<PlanningRegistration, "workId">>;

let volatileStorage: Record<string, StoredPlanningRegistration> = {};

function createDefaultRegistration(workId: string): PlanningRegistration {
  return {
    workId,
    ...DEFAULT_REGISTRATION,
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
  stored?: StoredPlanningRegistration | null
): PlanningRegistration {
  return {
    workId,
    status: stored?.status ?? DEFAULT_REGISTRATION.status,
    datumGepland: stored?.datumGepland ?? DEFAULT_REGISTRATION.datumGepland,
    datumUitgevoerd: stored?.datumUitgevoerd ?? DEFAULT_REGISTRATION.datumUitgevoerd,
    opmerking: stored?.opmerking ?? DEFAULT_REGISTRATION.opmerking,
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

function hash(input: string): number {
  return Array.from(input).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function deriveDoel(modelType: string): string {
  if (modelType.includes("Waterkering")) {
    return "Kruin";
  }
  if (modelType.includes("Netwerk")) {
    return "Berm";
  }
  if (modelType.includes("Afwijkend")) {
    return "Bodem";
  }
  return "Talud";
}

function buildSeedDefinitions(traject: SpatialTrajectFeature) {
  const baseHash = hash(traject.globalId);
  const doel = deriveDoel(traject.modelType);
  const periodA = (baseHash % 4) + 1;
  const periodB = ((baseHash + 2) % 4) + 5;
  const inspectPeriod = ((baseHash + 1) % 3) + 1;

  return [
    {
      workId: `${traject.globalId}-W1`,
      trajectGlobalId: traject.globalId,
      trajectLabel: traject.hoofdobjec || `Traject ${traject.objectId}`,
      handeling: "Inspecteren",
      werkwijze: "Standaard",
      doel: "N.v.t.",
      zijde: "N.v.t.",
      periode: inspectPeriod,
      percentage: 100,
      ruimen: "Nee",
    },
    {
      workId: `${traject.globalId}-W2`,
      trajectGlobalId: traject.globalId,
      trajectLabel: traject.hoofdobjec || `Traject ${traject.objectId}`,
      handeling: "Maaien",
      werkwijze:
        traject.modelType.includes("P1") || traject.modelType.includes("Waterkering")
          ? "Sinusbeheer"
          : "Klepelen",
      doel,
      zijde: traject.modelType.includes("P1") ? "Links" : "Beide",
      periode: periodA,
      percentage: traject.modelType.includes("P1") ? 50 : 100,
      ruimen: traject.modelType.includes("Afwijkend") ? "Direct" : "Nee",
    },
    {
      workId: `${traject.globalId}-W3`,
      trajectGlobalId: traject.globalId,
      trajectLabel: traject.hoofdobjec || `Traject ${traject.objectId}`,
      handeling: traject.modelType.includes("Waterkering") ? "Opschonen" : "Snoeien",
      werkwijze:
        traject.modelType.includes("Waterkering")
          ? "Standaard"
          : "Onderhoudssnoei",
      doel,
      zijde: traject.modelType.includes("P1") ? "Rechts" : "N.v.t.",
      periode: periodB,
      percentage: traject.modelType.includes("P1") ? 50 : 100,
      ruimen: traject.modelType.includes("Waterkering") ? "Na 24 uur" : "Nee",
    },
  ];
}

function ensureRegistration(
  workId: string,
  storage: Record<string, StoredPlanningRegistration>
): PlanningRegistration {
  return materializeRegistration(workId, storage[workId]);
}

export class MockPlanningService {
  async getAll(seedTrajecten: SpatialTrajectFeature[]): Promise<PlannedWorkItem[]> {
    const storage = readStorage();
    return seedTrajecten.flatMap((traject) =>
      buildSeedDefinitions(traject).map((definition) => {
        const registration = ensureRegistration(definition.workId, storage);
        return {
          ...definition,
          ...registration,
        };
      })
    );
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

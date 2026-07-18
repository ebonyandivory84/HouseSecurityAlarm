export type ZoneMode = "unscharf" | "perimeter" | "aussenhaut" | "vollschutz";

export type ZoneCommand = "armPerimeter" | "armAussenhaut" | "armVollschutz" | "disarm";

export interface AlarmCenterStatus {
  mode: ZoneMode;
  alarmActive: boolean;
  panicActive: boolean;
  countdownActive: boolean;
  countdownRemainingSec: number;
  alarmCenterOnline: boolean;
  triggerReason: string | null;
  triggerZone: string | null;
  triggeredDatapointIds: string[];
}

export interface DerivedZoneState {
  perimeterActive: boolean;
  aussenhautActive: boolean;
  innenraumActive: boolean;
}

export function deriveZoneState(mode: ZoneMode): DerivedZoneState {
  return {
    perimeterActive: mode !== "unscharf",
    aussenhautActive: mode === "aussenhaut" || mode === "vollschutz",
    innenraumActive: mode === "vollschutz",
  };
}

export const ZONE_MODE_LABELS: Record<ZoneMode, string> = {
  unscharf: "Unscharf",
  perimeter: "Perimeterschutz",
  aussenhaut: "Außenhautschutz",
  vollschutz: "Vollschutz",
};

export type DatapointCategory = "camera" | "motion" | "door" | "presence" | "brightness" | "custom";

export interface CameraCapabilities {
  personDetectionId?: string;
  animalDetectionId?: string;
  objectDetectionId?: string;
  ledId?: string;
  sirenId?: string;
  isIndoor?: boolean;
  snapshotStateId?: string;
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface DatapointConfig {
  id: string;
  category: DatapointCategory;
  label: string;
  valueType: "boolean" | "string";
  triggerString?: string;
  zone?: "perimeter" | "aussenhaut" | "innenraum" | null;
  cameraCapabilities?: CameraCapabilities;
  enabled: boolean;
}

export const DEFAULT_ZONE_BY_CATEGORY: Record<DatapointCategory, DatapointConfig["zone"]> = {
  camera: "perimeter",
  motion: "innenraum",
  door: "aussenhaut",
  presence: null,
  brightness: null,
  custom: null,
};

export function createDefaultDatapointConfig(
  id: string,
  category: DatapointCategory,
  label: string
): DatapointConfig {
  return {
    id,
    category,
    label,
    valueType: "boolean",
    zone: DEFAULT_ZONE_BY_CATEGORY[category],
    enabled: true,
  };
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface AlarmCenterMapping {
  armedStateId: string;
  perimeterStateId: string;
  countdownStateId: string;
  sirenStateId: string;
  triggerStateId: string;
  displayStateId: string;
  buzzerStateId: string;
  ledRedStateId: string;
  ledYellowStateId: string;
  fingerprintStateId: string;
}

export type DayNightMode = "day" | "dusk" | "night";

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface DayNightConfig {
  duskOffsetMin: number;
  dawnOffsetMin: number;
  brightnessDatapointId?: string;
  brightnessNightThreshold?: number;
  useBrightnessOverride: boolean;
}

export const DAY_NIGHT_MODE_LABELS: Record<DayNightMode, string> = {
  day: "Tag",
  dusk: "Dämmerung",
  night: "Nacht",
};

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface PresenceConfig {
  datapointIds: string[];
  autoDisarmOnPresence: boolean;
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface AlarmTimingConfig {
  exitDelaySec: number;
  entryDelaySec: number;
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface FloorplanRoom {
  id: string;
  name: string;
  zone: "perimeter" | "aussenhaut" | "innenraum" | null;
  x: number;
  y: number;
  width: number;
  height: number;
  datapointIds: string[];
}

export interface FloorplanConfig {
  rooms: FloorplanRoom[];
}

export function createDefaultFloorplanRoom(): FloorplanRoom {
  return {
    id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Neuer Raum",
    zone: null,
    x: 10,
    y: 10,
    width: 30,
    height: 30,
    datapointIds: [],
  };
}

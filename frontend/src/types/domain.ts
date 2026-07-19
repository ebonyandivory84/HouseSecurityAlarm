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
export type FloorplanItemType =
  | "door" | "window" | "garagedoor" | "garage"
  | "pavingDriveway" | "pavingTerrace" | "cameraZone" | "pirZone"
  | "stairs" | "wc" | "washbasin" | "bathtub" | "shower" | "sink"
  | "kitchen" | "stove" | "cabinet" | "sofa" | "tableRect" | "tableRound"
  | "chair" | "beam";

export interface FloorplanPoint {
  x: number;
  y: number;
}

export interface FloorplanCoverageAnchor {
  edge: "top" | "bottom" | "left" | "right";
  t: number;
}

export interface FloorplanItem {
  id: number;
  type: FloorplanItemType;
  x: number;
  y: number;
  r: number;
  w: number;
  h: number;
  mirrorX: boolean;
  coverageAnchor?: FloorplanCoverageAnchor;
  alarmBindingType?: "contact" | "pir" | "camera";
  alarmBindingKey?: string;
  alarmBindingId?: string;
}

export interface FloorplanWall {
  id: number;
  points: FloorplanPoint[];
  autoBeamLink?: boolean;
  beamAId?: number;
  beamBId?: number;
}

export interface FloorplanFloor {
  items: FloorplanItem[];
  walls: FloorplanWall[];
  outerWallIds: number[];
  perimeter: { x: number; y: number; w: number; h: number } | null;
  nextId: number;
  lastBeamItemId: number | null;
}

export interface FloorplanFloorView {
  showBg: boolean;
  useInOverviewOnly: boolean;
  workspaceScale: number;
  bgOffsetX: number;
  bgOffsetY: number;
}

export type FloorplanLevel = "EG" | "OG";

export interface FloorplanDesignerData {
  version: number;
  EG: FloorplanFloor;
  OG: FloorplanFloor;
  settings: {
    snap: boolean;
    grid: number;
    floorView: { EG: FloorplanFloorView; OG: FloorplanFloorView };
    showSensorsPreview: boolean;
  };
}

export interface FloorplanImagesConfig {
  egImageDataUri: string | null;
  ogImageDataUri: string | null;
  published: boolean;
}

export const FLOORPLAN_ITEM_ALARM_TYPES: Record<FloorplanItemType, FloorplanItem["alarmBindingType"] | null> = {
  door: "contact",
  window: "contact",
  garagedoor: "contact",
  garage: "contact",
  pavingDriveway: null,
  pavingTerrace: null,
  cameraZone: "camera",
  pirZone: "pir",
  stairs: null,
  wc: null,
  washbasin: null,
  bathtub: null,
  shower: null,
  sink: null,
  kitchen: null,
  stove: null,
  cabinet: null,
  sofa: null,
  tableRect: null,
  tableRound: null,
  chair: null,
  beam: null,
};

export const FLOORPLAN_ITEM_DEFAULT_SIZE: Record<FloorplanItemType, { w: number; h: number }> = {
  door: { w: 48, h: 48 },
  window: { w: 62, h: 24 },
  garagedoor: { w: 150, h: 34 },
  garage: { w: 150, h: 70 },
  pavingDriveway: { w: 220, h: 120 },
  pavingTerrace: { w: 180, h: 110 },
  cameraZone: { w: 180, h: 110 },
  pirZone: { w: 140, h: 90 },
  stairs: { w: 160, h: 56 },
  wc: { w: 42, h: 34 },
  washbasin: { w: 54, h: 36 },
  bathtub: { w: 130, h: 54 },
  shower: { w: 72, h: 72 },
  sink: { w: 88, h: 42 },
  kitchen: { w: 160, h: 60 },
  stove: { w: 70, h: 50 },
  cabinet: { w: 80, h: 40 },
  sofa: { w: 110, h: 56 },
  tableRect: { w: 130, h: 78 },
  tableRound: { w: 96, h: 96 },
  chair: { w: 28, h: 28 },
  beam: { w: 22, h: 22 },
};

export function createEmptyFloorplanFloor(): FloorplanFloor {
  return {
    items: [],
    walls: [],
    outerWallIds: [],
    perimeter: null,
    nextId: 1,
    lastBeamItemId: null,
  };
}

export function createDefaultFloorplanFloorView(): FloorplanFloorView {
  return {
    showBg: true,
    useInOverviewOnly: false,
    workspaceScale: 1,
    bgOffsetX: 0,
    bgOffsetY: 0,
  };
}

export function createDefaultFloorplanDesigner(): FloorplanDesignerData {
  return {
    version: 1,
    EG: createEmptyFloorplanFloor(),
    OG: createEmptyFloorplanFloor(),
    settings: {
      snap: true,
      grid: 4,
      floorView: {
        EG: createDefaultFloorplanFloorView(),
        OG: createDefaultFloorplanFloorView(),
      },
      showSensorsPreview: true,
    },
  };
}

export function createDefaultFloorplanImages(): FloorplanImagesConfig {
  return {
    egImageDataUri: null,
    ogImageDataUri: null,
    published: false,
  };
}

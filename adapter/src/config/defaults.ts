import type {
  AlarmCenterMapping,
  AlarmTimingConfig,
  DatapointConfig,
  DayNightConfig,
  FloorplanDesignerData,
  FloorplanFloor,
  FloorplanFloorView,
  FloorplanImagesConfig,
  PresenceConfig,
} from "./types";

export const DEFAULT_DAY_NIGHT_CONFIG: DayNightConfig = {
  duskOffsetMin: 30,
  dawnOffsetMin: 30,
  useBrightnessOverride: false,
};

export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  datapointIds: [],
  autoDisarmOnPresence: false,
};

export const DEFAULT_ALARM_CENTER_MAPPING: AlarmCenterMapping = {
  armedStateId: "",
  perimeterStateId: "",
  countdownStateId: "",
  sirenStateId: "",
  triggerStateId: "",
  displayStateId: "",
  buzzerStateId: "",
  ledRedStateId: "",
  ledYellowStateId: "",
  fingerprintStateId: "",
};

export const DEFAULT_ALARM_TIMING_CONFIG: AlarmTimingConfig = {
  exitDelaySec: 30,
  entryDelaySec: 30,
};

function createEmptyFloorplanFloor(): FloorplanFloor {
  return {
    items: [],
    walls: [],
    outerWallIds: [],
    perimeter: null,
    nextId: 1,
    lastBeamItemId: null,
  };
}

function createDefaultFloorplanFloorView(): FloorplanFloorView {
  return {
    showBg: true,
    useInOverviewOnly: false,
    workspaceScale: 1,
    bgOffsetX: 0,
    bgOffsetY: 0,
  };
}

export const DEFAULT_FLOORPLAN_DESIGNER: FloorplanDesignerData = {
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

export const DEFAULT_FLOORPLAN_IMAGES: FloorplanImagesConfig = {
  egImageDataUri: null,
  ogImageDataUri: null,
  published: false,
};

export const DEFAULT_ZONE_BY_CATEGORY: Record<DatapointConfig["category"], DatapointConfig["zone"]> = {
  camera: "perimeter",
  motion: "innenraum",
  door: "aussenhaut",
  presence: null,
  brightness: null,
  custom: null,
};

export function createDefaultDatapointConfig(
  id: string,
  category: DatapointConfig["category"],
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

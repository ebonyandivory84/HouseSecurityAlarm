import type {
  AlarmCenterMapping,
  AlarmTimingConfig,
  DatapointConfig,
  DayNightConfig,
  FloorplanConfig,
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

export const DEFAULT_FLOORPLAN_CONFIG: FloorplanConfig = {
  rooms: [],
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

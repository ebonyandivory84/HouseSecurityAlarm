import type { DatapointConfig, DayNightConfig, PresenceConfig } from "./types";

export const DEFAULT_DAY_NIGHT_CONFIG: DayNightConfig = {
  duskOffsetMin: 30,
  dawnOffsetMin: 30,
  useBrightnessOverride: false,
};

export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  datapointIds: [],
  autoDisarmOnPresence: false,
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

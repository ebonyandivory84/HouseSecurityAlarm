// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/domain.ts — bei Änderung beide Seiten pflegen
export interface DatapointConfig {
  id: string;
  category: "camera" | "motion" | "door" | "presence" | "brightness" | "custom";
  label: string;
  valueType: "boolean" | "string";
  triggerString?: string;
  zone?: "perimeter" | "aussenhaut" | "innenraum" | null;
  cameraCapabilities?: {
    personDetectionId?: string;
    animalDetectionId?: string;
    objectDetectionId?: string;
    ledId?: string;
    sirenId?: string;
    isIndoor?: boolean;
    snapshotStateId?: string;
  };
  enabled: boolean;
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/logic.ts — bei Änderung beide Seiten pflegen
export type ConditionLeaf = {
  kind: "leaf";
  datapointId: string;
  comparator?: "triggered" | "equals" | "above" | "below";
  value?: unknown;
};

export type ConditionGroup = {
  kind: "group";
  op: "AND" | "OR";
  children: (ConditionLeaf | ConditionGroup)[];
};

export type RuleAction =
  | { type: "setState"; stateId: string; value: unknown }
  | { type: "telegram"; templateId: string; withSnapshot?: string }
  | { type: "cameraLed" | "cameraSiren"; cameraId: string; value: boolean };

export interface LogicRule {
  id: string;
  name: string;
  enabled: boolean;
  scopeModes: Array<"perimeter" | "aussenhaut" | "vollschutz">;
  when: ConditionGroup;
  then: RuleAction[];
}

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/telegram.ts — bei Änderung beide Seiten pflegen
export interface TelegramTemplate {
  id: string;
  triggerId: string;
  messageText: string;
  includeSnapshot: boolean;
  snapshotCameraId?: string;
  caption?: string;
}

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

export interface DayNightConfig {
  duskOffsetMin: number;
  dawnOffsetMin: number;
  brightnessDatapointId?: string;
  brightnessNightThreshold?: number;
  useBrightnessOverride: boolean;
}

export interface PresenceConfig {
  datapointIds: string[];
  autoDisarmOnPresence: boolean;
}

export interface AlarmTimingConfig {
  exitDelaySec: number;
  entryDelaySec: number;
}

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

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
  };
  enabled: boolean;
}

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

export interface TelegramTemplate {
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

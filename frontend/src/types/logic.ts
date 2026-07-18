export type ConditionComparator = "triggered" | "equals" | "above" | "below";

// SYNC: adapter/src/config/types.ts ↔ frontend/src/types/logic.ts — bei Änderung beide Seiten pflegen
export interface ConditionLeaf {
  kind: "leaf";
  datapointId: string;
  comparator?: ConditionComparator;
  value?: unknown;
}

export interface ConditionGroup {
  kind: "group";
  op: "AND" | "OR";
  children: (ConditionLeaf | ConditionGroup)[];
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export type RuleActionType = "setState" | "telegram" | "cameraLed" | "cameraSiren";

export type RuleAction =
  | { type: "setState"; stateId: string; value: unknown }
  | { type: "telegram"; templateId: string; withSnapshot?: string }
  | { type: "cameraLed" | "cameraSiren"; cameraId: string; value: boolean };

export type ScopeMode = "perimeter" | "aussenhaut" | "vollschutz";

export interface LogicRule {
  id: string;
  name: string;
  enabled: boolean;
  scopeModes: ScopeMode[];
  when: ConditionGroup;
  then: RuleAction[];
}

export const SCOPE_MODE_LABELS: Record<ScopeMode, string> = {
  perimeter: "Perimeterschutz",
  aussenhaut: "Außenhautschutz",
  vollschutz: "Vollschutz",
};

export const COMPARATOR_LABELS: Record<ConditionComparator, string> = {
  triggered: "ausgelöst",
  equals: "gleich",
  above: "größer als",
  below: "kleiner als",
};

export const ACTION_TYPE_LABELS: Record<RuleActionType, string> = {
  setState: "Zustand setzen",
  telegram: "Telegram",
  cameraLed: "Kamera-LED",
  cameraSiren: "Kamera-Sirene",
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyConditionGroup(op: "AND" | "OR" = "AND"): ConditionGroup {
  return { kind: "group", op, children: [] };
}

export function createDefaultConditionLeaf(): ConditionLeaf {
  return { kind: "leaf", datapointId: "", comparator: "triggered" };
}

export function createDefaultAction(type: RuleActionType): RuleAction {
  switch (type) {
    case "setState":
      return { type: "setState", stateId: "", value: true };
    case "telegram":
      return { type: "telegram", templateId: "" };
    case "cameraLed":
      return { type: "cameraLed", cameraId: "", value: true };
    case "cameraSiren":
      return { type: "cameraSiren", cameraId: "", value: true };
  }
}

export function createDefaultLogicRule(): LogicRule {
  return {
    id: generateId("rule"),
    name: "Neue Regel",
    enabled: true,
    scopeModes: ["vollschutz"],
    when: createEmptyConditionGroup(),
    then: [],
  };
}

export function coerceInputValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export function formatInputValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}
